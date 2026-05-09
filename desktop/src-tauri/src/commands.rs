use tauri::{command, AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tracing::info;

use crate::{
    uploader::{UploadTask, spawn_upload_worker},
    settings::AppSettings,
    state::AppState,
    watcher,
};

#[command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().await.clone())
}

#[command]
pub async fn set_api_url(url: String, state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let mut s = state.settings.lock().await;
    s.api_url = url;
    s.save(&app).map_err(|e| e.to_string())
}

#[command]
pub async fn set_api_token(token: String, state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let mut s = state.settings.lock().await;
    s.api_token = if token.is_empty() { None } else { Some(token) };
    s.save(&app).map_err(|e| e.to_string())
}

#[command]
pub async fn select_watch_folder(app: AppHandle, state: State<'_, AppState>) -> Result<Option<String>, String> {
    let selected = app.dialog().file().blocking_pick_folder();
    if let Some(path) = selected {
        let path_str = path.to_string();
        let mut s = state.settings.lock().await;
        s.watch_folder = Some(path_str.clone());
        s.save(&app).map_err(|e| e.to_string())?;
        info!("Watch folder set: {}", path_str);
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[command]
pub async fn start_watching(state: State<'_, AppState>, app: AppHandle) -> Result<bool, String> {
    let folder = {
        let s = state.settings.lock().await;
        s.watch_folder.clone()
    };
    let folder = folder.ok_or_else(|| "Папка не выбрана".to_string())?;
    let path = std::path::PathBuf::from(&folder);
    if !path.exists() {
        return Err(format!("Папка не существует: {}", folder));
    }
    *state.watcher.lock().await = None;
    let handle = watcher::start_watching(path, state.upload_queue.clone(), app.clone())
        .await
        .map_err(|e| e.to_string())?;
    *state.watcher.lock().await = Some(handle);
    let (api_url, api_token) = {
        let s = state.settings.lock().await;
        (
            std::sync::Arc::new(tokio::sync::Mutex::new(s.api_url.clone())),
            std::sync::Arc::new(tokio::sync::Mutex::new(s.api_token.clone())),
        )
    };
    spawn_upload_worker(state.upload_queue.clone(), api_url, api_token, app);
    info!("Watcher started for: {}", folder);
    Ok(true)
}

#[command]
pub async fn stop_watching(state: State<'_, AppState>) -> Result<(), String> {
    *state.watcher.lock().await = None;
    Ok(())
}

#[command]
pub async fn get_watcher_status(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.watcher.lock().await.is_some())
}

#[command]
pub async fn get_upload_queue(state: State<'_, AppState>) -> Result<Vec<UploadTask>, String> {
    Ok(state.upload_queue.get_all().await)
}

#[command]
pub async fn retry_failed_uploads(state: State<'_, AppState>) -> Result<(), String> {
    state.upload_queue.retry_failed().await;
    Ok(())
}

#[command]
pub async fn open_web_dashboard(state: State<'_, AppState>, _app: AppHandle) -> Result<(), String> {
    let url = {
        let s = state.settings.lock().await;
        format!("{}/dashboard", s.api_url.trim_end_matches('/'))
    };
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &url])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn test_connection(state: State<'_, AppState>) -> Result<bool, String> {
    let (url, token) = {
        let s = state.settings.lock().await;
        (s.api_url.clone(), s.api_token.clone())
    };
    let endpoint = format!("{}/api/telemetry/upload", url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = client.get(&endpoint);
    if let Some(tok) = token {
        req = req.header("X-Api-Token", tok);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.status().is_success() || resp.status().as_u16() == 405)
}

#[command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
