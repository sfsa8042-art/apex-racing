// Types that mirror the Rust structs in src-tauri/src/

export type UploadStatus = "pending" | "uploading" | "done" | "failed";
export type Simulator    = "iracing" | "acc" | "generic";

export interface AppSettings {
  watch_folder: string | null;
  api_url:      string;
  api_token:    string | null;
  simulator:    Simulator;
}

export interface UploadTask {
  id:         string;
  path:       string;
  filename:   string;
  size:       number;         // bytes
  attempts:   number;
  progress?:  number;   // 0-100 for uploading state
  status:     UploadStatus;
  error:      string | null;
  queued_at:  string;         // ISO 8601
}

// Event payloads emitted by the Rust backend
export interface FileDetectedEvent {
  path:        string;
  filename:    string;
  sizeBytes:   number;
  detectedAt:  string;
}

export interface WatcherStatusEvent {
  active:      boolean;
  folder:      string | null;
  filesSeen:   number;
}

export interface UploadCompleteEvent {
  filename:    string;
  sessionId:   string | null;
  lapTimeMs:   number | null;
}

export interface AccStatusEvent {
  running:   boolean;
  recording: boolean;
  lap:       number;
  car:       string;
  track:     string;
}
