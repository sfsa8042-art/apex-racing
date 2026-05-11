#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod settings;
mod state;
mod uploader;
mod watcher;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

use crate::settings::AppSettings;
use crate::state::AppState;
use crate::uploader::UploadQueue;
use crate::watcher::WatchHandle;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Load settings — use defaults if anything fails
            let settings = AppSettings::load(app.handle())
                .unwrap_or_default();

            let settings     = Arc::new(Mutex::new(settings));
            let upload_queue = Arc::new(UploadQueue::new());
            let watcher      = Arc::new(Mutex::new(None::<WatchHandle>));

            app.manage(AppState {
                settings,
                watcher,
                upload_queue,
            });

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
        .expect("error running app");
}
