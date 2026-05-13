use std::path::PathBuf;

use tauri::Emitter;
use std::sync::Arc;

use anyhow::Result;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, Notify};
use tokio::time::sleep;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

// ─── Public types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UploadStatus {
    Pending,
    Uploading,
    Done,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadTask {
    pub id:         String,
    pub path:       PathBuf,
    pub filename:   String,
    pub size:       u64,
    pub attempts:   u8,
    pub status:     UploadStatus,
    pub error:      Option<String>,
    pub queued_at:  DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadResponse {
    pub ok:            bool,
    pub session_id:    Option<String>,
    pub lap_time_ms:   Option<u64>,
    pub error:         Option<String>,
}

// ─── Upload queue ─────────────────────────────────────────────────────────────

const MAX_ATTEMPTS:    u8  = 4;
const BASE_BACKOFF_MS: u64 = 2_000;   // doubles each retry
const UPLOAD_TIMEOUT:  u64 = 30;      // seconds

pub struct UploadQueue {
    tasks:  Mutex<Vec<UploadTask>>,
    notify: Notify,
}

impl UploadQueue {
    pub fn new() -> Self {
        Self { tasks: Mutex::new(Vec::new()), notify: Notify::new() }
    }

    pub async fn enqueue(&self, task: UploadTask) {
        self.tasks.lock().await.push(task);
        self.notify.notify_one();
    }

    pub async fn get_all(&self) -> Vec<UploadTask> {
        self.tasks.lock().await.clone()
    }

    pub async fn retry_failed(&self) {
        let mut tasks = self.tasks.lock().await;
        for t in tasks.iter_mut() {
            if t.status == UploadStatus::Failed {
                t.status   = UploadStatus::Pending;
                t.attempts = 0;
                t.error    = None;
            }
        }
        self.notify.notify_one();
    }
}

// ─── Upload worker ────────────────────────────────────────────────────────────

/// Spawns a background task that drains the upload queue.
/// Must be called once during app startup.
pub fn spawn_upload_worker(
    queue:     Arc<UploadQueue>,
    api_url:   Arc<Mutex<String>>,
    api_token: Arc<Mutex<Option<String>>>,
    app:       tauri::AppHandle,
) {
    tauri::async_runtime::spawn(async move {
        let client = match Client::builder()
            .timeout(Duration::from_secs(UPLOAD_TIMEOUT))
            .build() {
            Ok(c)  => c,
            Err(e) => {
                tracing::error!("Failed to build HTTP client: {e}");
                Client::new() // fallback to default client
            }
        };

        loop {
            // Wait for work
            queue.notify.notified().await;

            loop {
                // Find next pending task
                let task_id = {
                    let tasks = queue.tasks.lock().await;
                    tasks.iter()
                        .find(|t| t.status == UploadStatus::Pending)
                        .map(|t| t.id.clone())
                };

                let task_id = match task_id {
                    Some(id) => id,
                    None => break,   // nothing pending — back to waiting
                };

                // Mark as uploading
                {
                    let mut tasks = queue.tasks.lock().await;
                    if let Some(t) = tasks.iter_mut().find(|t| t.id == task_id) {
                        t.status = UploadStatus::Uploading;
                    }
                }
                emit_queue_update(&app, &queue).await;

                // Get current config
                let url   = api_url.lock().await.clone();
                let token = api_token.lock().await.clone();

                // Get task details (clone what we need)
                let task_data = {
                    let tasks = queue.tasks.lock().await;
                    tasks.iter().find(|t| t.id == task_id)
                        .map(|t| (t.path.clone(), t.filename.clone(), t.attempts))
                };
                let (path, filename, attempts) = match task_data {
                    Some(d) => d,
                    None => continue, // task was removed, skip
                };

                info!("Uploading {} (attempt {})", filename, attempts + 1);

                match upload_file(&client, &url, token.as_deref(), &path, &filename).await {
                    Ok(resp) => {
                        info!("Upload succeeded: {} -> session {:?}", filename, resp.session_id);
                        let mut tasks = queue.tasks.lock().await;
                        if let Some(t) = tasks.iter_mut().find(|t| t.id == task_id) {
                            t.status = UploadStatus::Done;
                            t.attempts += 1;
                        }
                        let _ = app.emit("upload-complete", serde_json::json!({
                            "filename": filename,
                            "sessionId": resp.session_id,
                            "lapTimeMs": resp.lap_time_ms,
                        }));
                    }
                    Err(e) => {
                        warn!("Upload failed for {}: {}", filename, e);
                        let mut tasks = queue.tasks.lock().await;
                        if let Some(t) = tasks.iter_mut().find(|t| t.id == task_id) {
                            t.attempts += 1;
                            if t.attempts >= MAX_ATTEMPTS {
                                t.status = UploadStatus::Failed;
                                t.error  = Some(e.to_string());
                                error!("Giving up on {} after {} attempts", filename, MAX_ATTEMPTS);
                            } else {
                                t.status = UploadStatus::Pending;
                                // Exponential backoff
                                let delay = BASE_BACKOFF_MS * (2u64.pow(t.attempts as u32));
                                drop(tasks);
                                sleep(Duration::from_millis(delay)).await;
                                continue;
                            }
                        }
                    }
                }

                emit_queue_update(&app, &queue).await;
            }
        }
    });
}

async fn emit_queue_update(app: &tauri::AppHandle, queue: &Arc<UploadQueue>) {
    let tasks = queue.get_all().await;
    let _ = app.emit("queue-update", &tasks);
}

/// Perform the actual HTTP multipart upload.
async fn upload_file(
    client:   &Client,
    api_url:  &str,
    token:    Option<&str>,
    path:     &PathBuf,
    filename: &str,
) -> Result<UploadResponse> {
    let bytes = tokio::fs::read(path).await?;

    let file_part = reqwest::multipart::Part::bytes(bytes)
        .file_name(filename.to_string())
        .mime_str(guess_mime(filename))?;

    let form = reqwest::multipart::Form::new()
        .part("file", file_part)
        .text("source", "desktop")
        .text("filename", filename.to_string());

    let endpoint = format!("{}/api/telemetry/upload", api_url.trim_end_matches('/'));

    let mut req = client.post(&endpoint).multipart(form);
    if let Some(tok) = token {
        req = req.header("X-Api-Token", tok);
    }

    let resp = req.send().await?;
    let status = resp.status();

    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("HTTP {}: {}", status, body);
    }

    let upload_resp: UploadResponse = resp.json().await?;
    if !upload_resp.ok {
        anyhow::bail!("{}", upload_resp.error.unwrap_or_else(|| "Unknown error".to_string()));
    }

    Ok(upload_resp)
}

fn guess_mime(filename: &str) -> &'static str {
    match filename.split('.').last().unwrap_or("") {
        "json" => "application/json",
        "csv" | "txt" => "text/csv",
        _ => "application/octet-stream",
    }
}
