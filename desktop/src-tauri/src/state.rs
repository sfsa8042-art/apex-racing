use std::sync::Arc;
use tokio::sync::Mutex;

use crate::settings::AppSettings;
use crate::uploader::UploadQueue;
use crate::watcher::WatchHandle;

pub struct AppState {
    pub settings:      Arc<Mutex<AppSettings>>,
    pub watcher:       Arc<Mutex<Option<WatchHandle>>>,
    pub upload_queue:  Arc<UploadQueue>,
    /// Shared with upload worker — update these when settings change
    pub api_url_arc:   Arc<Mutex<String>>,
    pub api_token_arc: Arc<Mutex<Option<String>>>,
}
