// Prevents a console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod settings;
mod uploader;
mod watcher;

use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;
use tracing::info;

use crate::uploader::UploadQueue;
use crate::settings::AppSettings;
use crate::watcher::WatchHandle;

/// Global application state shared across all Tauri commands
pub struct AppState {
    pub settings:     Arc<Mutex<AppSettings>>,
    pub watcher:      Arc<Mutex<Option<WatchHandle>>>,
    pub upload_queue: Arc<UploadQueue>,
}

fn main() {
    // Structured logging — readable in Windows Event Viewer and VS Code terminal
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "apex_desktop=debug,warn".to_string())
        )
        .init();

    info!("APEX Desktop v{} starting", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let settings     = Arc::new(Mutex::new(AppSettings::load(app.handle())?));
            let upload_queue = Arc::new(UploadQueue::new());
            let watcher      = Arc::new(Mutex::new(None::<WatchHandle>));

            // Auto-restart watcher on launch if a folder is already configured
            {
                let settings_clone = settings.clone();
                let watcher_clone  = watcher.clone();
                let queue_clone    = upload_queue.clone();
                let handle         = app.handle().clone();

                tauri::async_runtime::spawn(async move {
                    let folder = {
                        let s = settings_clone.lock().await;
                        s.watch_folder.clone()
                    };

                    if let Some(folder) = folder {
                        let path = std::path::PathBuf::from(&folder);
                        if path.exists() {
                            info!("Auto-starting watcher on {:?}", path);
                            match watcher::start_watching(path, queue_clone, handle).await {
                                Ok(h)  => *watcher_clone.lock().await = Some(h),
                                Err(e) => tracing::warn!("Auto-start watcher failed: {e}"),
                            }
                        }
                    }
                });
            }

            app.manage(AppState { settings, watcher, upload_queue });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::set_api_url,
            commands::set_api_token,
            commands::select_watch_folder,
            commands::start_watching,
            commands::stop_watching,
            commands::get_watcher_status,
            commands::get_upload_queue,
            commands::retry_failed_uploads,
            commands::open_web_dashboard,
            commands::test_connection,
            commands::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("Error running APEX Desktop");
}
