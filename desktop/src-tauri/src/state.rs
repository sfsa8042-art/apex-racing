use std::sync::Arc;
use tokio::sync::Mutex;

use crate::settings::AppSettings;
use crate::uploader::UploadQueue;
use crate::watcher::WatchHandle;

/// Global application state shared across Tauri commands.
pub struct AppState {
    pub settings:     Arc<Mutex<AppSettings>>,
    pub watcher:      Arc<Mutex<Option<WatchHandle>>>,
    pub upload_queue: Arc<UploadQueue>,
}
