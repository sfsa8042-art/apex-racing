use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub watch_folder: Option<String>,
    pub api_url:      String,
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
            api_url:      "https://apex-racing.netlify.app".to_string(),
            api_token:    None,
            simulator:    Simulator::Generic,
        }
    }
}

fn settings_path(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    dir.join("settings.json")
}

impl AppSettings {
    pub fn load(app: &AppHandle) -> Result<Self> {
        let path = settings_path(app);
        if !path.exists() {
            return Ok(Self::default());
        }
        let text = fs::read_to_string(&path)?;
        let s = serde_json::from_str(&text)
            .unwrap_or_else(|_| Self::default());
        Ok(s)
    }

    pub fn save(&self, app: &AppHandle) -> Result<()> {
        let path = settings_path(app);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let text = serde_json::to_string_pretty(self)?;
        fs::write(&path, text)?;
        Ok(())
    }
}
