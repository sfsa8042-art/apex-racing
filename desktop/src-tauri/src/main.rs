#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod acc_reader;
mod commands;
mod settings;
mod state;
mod uploader;
mod watcher;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;
use tracing::info;

use crate::settings::AppSettings;
use crate::state::AppState;
use crate::uploader::{UploadQueue, spawn_upload_worker};
use crate::watcher::WatchHandle;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let settings = AppSettings::default();

            // Shared arcs — the upload worker holds references to these.
            // Update them via set_api_url / set_api_token commands.
            let api_url_arc   = Arc::new(Mutex::new(settings.api_url.clone()));
            let api_token_arc = Arc::new(Mutex::new(settings.api_token.clone()));

            let upload_queue = Arc::new(UploadQueue::new());

            // ── Auto-start upload worker ───────────────────────────────────────
            // Runs in background, picks up tasks from queue regardless of
            // whether the file-watcher is active. This means ACC shared-memory
            // uploads work without the user clicking "Старт".
            spawn_upload_worker(
                upload_queue.clone(),
                api_url_arc.clone(),
                api_token_arc.clone(),
                app.handle().clone(),
            );

            // ── Start ACC shared-memory reader ─────────────────────────────────
            acc_reader::start_acc_reader(upload_queue.clone(), app.handle().clone());

            app.manage(AppState {
                settings:      Arc::new(Mutex::new(settings)),
                watcher:       Arc::new(Mutex::new(None::<WatchHandle>)),
                upload_queue,
                api_url_arc,
                api_token_arc,
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
            commands::check_acc,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
