use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use std::collections::HashMap;

use anyhow::Result;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex};
use tracing::{debug, info, warn};

use crate::uploader::{UploadQueue, UploadTask};

// ─── File extensions we accept ────────────────────────────────────────────────

const ACCEPTED_EXTS: &[&str] = &["csv", "json", "ibt", "ld", "ldx", "motec"];

/// Minimum file size to consider (skip empty/partial writes)
const MIN_FILE_SIZE_BYTES: u64 = 512;

/// Debounce: ignore subsequent events for the same file within this window
const DEBOUNCE_MS: u128 = 2_000;

// ─── Event emitted to the frontend ───────────────────────────────────────────

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDetectedEvent {
    pub path:       String,
    pub filename:   String,
    pub size_bytes: u64,
    pub detected_at: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatcherStatusEvent {
    pub active:      bool,
    pub folder:      Option<String>,
    pub files_seen:  u32,
}

/// Opaque handle — dropping this stops the watcher thread
pub struct WatchHandle {
    _watcher: RecommendedWatcher,
    pub folder: PathBuf,
}

// ─── Core watch logic ─────────────────────────────────────────────────────────

pub async fn start_watching(
    folder: PathBuf,
    queue:  Arc<UploadQueue>,
    app:    AppHandle,
) -> Result<WatchHandle> {
    if !folder.exists() {
        anyhow::bail!("Folder does not exist: {:?}", folder);
    }

    info!("Starting watcher on {:?}", folder);

    // Notify sends synchronous events; we bridge them to an async channel
    let (tx, mut rx) = mpsc::channel::<Event>(256);

    let mut watcher = RecommendedWatcher::new(
        move |result: notify::Result<Event>| {
            if let Ok(event) = result {
                let _ = tx.blocking_send(event);
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(1)),
    )?;

    watcher.watch(&folder, RecursiveMode::Recursive)?;

    // Debounce map: path -> last seen Instant
    let debounce: Arc<Mutex<HashMap<PathBuf, Instant>>> = Arc::new(Mutex::new(HashMap::new()));

    let folder_clone  = folder.clone();
    let app_clone     = app.clone();
    let queue_clone   = queue.clone();

    // Spawn async task that consumes events from the channel
    tokio::spawn(async move {
        let mut files_seen: u32 = 0;

        while let Some(event) = rx.recv().await {
            // We only care about file creation and modifications
            let is_relevant = matches!(
                event.kind,
                EventKind::Create(_) | EventKind::Modify(_)
            );
            if !is_relevant { continue; }

            for path in event.paths {
                if !path.is_file() { continue; }

                // Check extension
                let ext = path.extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_lowercase());

                if !matches!(ext.as_deref(), Some(e) if ACCEPTED_EXTS.contains(&e)) {
                    continue;
                }

                // Debounce: skip if we saw this file recently
                let now = Instant::now();
                {
                    let mut db = debounce.lock().await;
                    if let Some(&last) = db.get(&path) {
                        if now.duration_since(last).as_millis() < DEBOUNCE_MS {
                            debug!("Debounced {:?}", path);
                            continue;
                        }
                    }
                    db.insert(path.clone(), now);
                }

                // Wait briefly to let the sim finish writing the file
                tokio::time::sleep(Duration::from_millis(800)).await;

                // Check file is complete (readable, minimum size)
                let size = match std::fs::metadata(&path) {
                    Ok(m) => m.len(),
                    Err(e) => { warn!("Cannot stat {:?}: {e}", path); continue; }
                };

                if size < MIN_FILE_SIZE_BYTES {
                    debug!("Skipping tiny file {:?} ({} bytes)", path, size);
                    continue;
                }

                let filename = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown.csv")
                    .to_string();

                info!("New telemetry file detected: {} ({} bytes)", filename, size);
                files_seen += 1;

                // Emit to frontend
                let event_payload = FileDetectedEvent {
                    path:        path.to_string_lossy().to_string(),
                    filename:    filename.clone(),
                    size_bytes:  size,
                    detected_at: chrono::Utc::now().to_rfc3339(),
                };
                let _ = app_clone.emit("file-detected", &event_payload);

                // Enqueue upload
                queue_clone.enqueue(UploadTask {
                    id:       uuid::Uuid::new_v4().to_string(),
                    path:     path.clone(),
                    filename: filename,
                    size:     size,
                    attempts: 0,
                    status:   crate::uploader::UploadStatus::Pending,
                    error:    None,
                    queued_at: chrono::Utc::now(),
                }).await;

                // Update status
                let _ = app_clone.emit("watcher-status", WatcherStatusEvent {
                    active:     true,
                    folder:     Some(folder_clone.to_string_lossy().to_string()),
                    files_seen,
                });
            }
        }

        info!("Watcher event loop exited");
    });

    Ok(WatchHandle { _watcher: watcher, folder })
}
