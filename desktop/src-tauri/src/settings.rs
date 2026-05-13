use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub watch_folder: Option<String>,
    pub api_url:      String,
    pub api_token:    Option<String>,
    pub simulator:    Simulator,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Simulator { Iracing, Acc, Generic }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            watch_folder: None,
            api_url:      "https://www.apex-racing.online".to_string(),
            api_token:    None,
            simulator:    Simulator::Generic,
        }
    }
}

impl AppSettings {
    /// No-op load — always returns defaults (settings live in UI state).
    pub fn load(_app: &AppHandle) -> Result<Self> {
        Ok(Self::default())
    }
    /// No-op save — settings are updated via shared Arc in AppState.
    pub fn save(&self, _app: &AppHandle) -> Result<()> {
        Ok(())
    }
}
