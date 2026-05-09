use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use tracing::warn;

const STORE_FILE:        &str = "apex-settings.bin";
const KEY_FOLDER:        &str = "watch_folder";
const KEY_API_URL:       &str = "api_url";
const KEY_TOKEN:         &str = "api_token";
const KEY_SIM:           &str = "simulator";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub watch_folder: Option<String>,
    pub api_url:      String,
    /// Stored only in the Tauri secure store — never logged
    pub api_token:    Option<String>,
    pub simulator:    Simulator,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Simulator {
    Iracing,
    Acc,
    Generic,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            watch_folder: None,
            api_url:      "http://localhost:3000".to_string(),
            api_token:    None,
            simulator:    Simulator::Generic,
        }
    }
}

impl AppSettings {
    /// Load from persistent store. Returns defaults on any error.
    pub fn load(app: &AppHandle) -> Result<Self> {
        let store = match app.store(STORE_FILE) {
            Ok(s) => s,
            Err(e) => {
                warn!("Could not open settings store: {e} — using defaults");
                return Ok(Self::default());
            }
        };

        let watch_folder = store
            .get(KEY_FOLDER)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        let api_url = store
            .get(KEY_API_URL)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| "http://localhost:3000".to_string());

        let api_token = store
            .get(KEY_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        let simulator = store
            .get(KEY_SIM)
            .and_then(|v| serde_json::from_value::<Simulator>(v).ok())
            .unwrap_or(Simulator::Generic);

        Ok(Self { watch_folder, api_url, api_token, simulator })
    }

    /// Persist to store. Creates the file if it doesn't exist.
    pub fn save(&self, app: &AppHandle) -> Result<()> {
        let store = app.store(STORE_FILE)?;

        match &self.watch_folder {
            Some(folder) => store.set(KEY_FOLDER, serde_json::Value::String(folder.clone())),
            None         => { store.delete(KEY_FOLDER); }
        }

        store.set(KEY_API_URL, serde_json::Value::String(self.api_url.clone()));

        match &self.api_token {
            Some(token) => store.set(KEY_TOKEN, serde_json::Value::String(token.clone())),
            None        => { store.delete(KEY_TOKEN); }
        }

        store.set(KEY_SIM, serde_json::to_value(&self.simulator)?);
        store.save()?;
        Ok(())
    }
}
