import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, UploadTask } from "../types";

export const getSettings         = ()             : Promise<AppSettings>         => invoke("get_settings");
export const setApiUrl           = (url: string)  : Promise<void>                => invoke("set_api_url",         { url });
export const setApiToken         = (token: string): Promise<void>                => invoke("set_api_token",       { token });
export const selectWatchFolder   = ()             : Promise<string | null>       => invoke("select_watch_folder");
export const startWatching       = ()             : Promise<boolean>             => invoke("start_watching");
export const stopWatching        = ()             : Promise<void>                => invoke("stop_watching");
export const getWatcherStatus    = ()             : Promise<boolean>             => invoke("get_watcher_status");
export const getUploadQueue      = ()             : Promise<UploadTask[]>        => invoke("get_upload_queue");
export const retryFailedUploads  = ()             : Promise<void>                => invoke("retry_failed_uploads");
export const openWebDashboard    = ()             : Promise<void>                => invoke("open_web_dashboard");
export const testConnection      = ()             : Promise<boolean>             => invoke("test_connection");
export const getAppVersion       = ()             : Promise<string>              => invoke("get_app_version");
export const checkAcc = (): Promise<string> => invoke('check_acc');
