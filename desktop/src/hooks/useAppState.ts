import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type {
  AppSettings, UploadTask, FileDetectedEvent,
  WatcherStatusEvent, UploadCompleteEvent,
} from "../types";
import * as tauri from "../lib/tauri";

export interface AppState {
  settings:      AppSettings | null;
  watcherActive: boolean;
  queue:         UploadTask[];
  connected:     boolean | null;
  loading:       boolean;
  lastDetected:  FileDetectedEvent | null;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    settings:      null,
    watcherActive: false,
    queue:         [],
    connected:     null,
    loading:       true,
    lastDetected:  null,
  });

  // ── Initial load ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [settings, watcherActive, queue] = await Promise.all([
        tauri.getSettings(),
        tauri.getWatcherStatus(),
        tauri.getUploadQueue(),
      ]);
      setState(s => ({ ...s, settings, watcherActive, queue, loading: false }));
    } catch (e) {
      console.error("Init failed:", e);
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  // ── Subscribe to backend events ──────────────────────────────────────────
  useEffect(() => {
    refresh();

    const unlisten: Array<() => void> = [];

    (async () => {
      unlisten.push(await listen<FileDetectedEvent>("file-detected", ({ payload }) => {
        setState(s => ({ ...s, lastDetected: payload }));
      }));

      unlisten.push(await listen<WatcherStatusEvent>("watcher-status", ({ payload }) => {
        setState(s => ({ ...s, watcherActive: payload.active }));
      }));

      unlisten.push(await listen<UploadTask[]>("queue-update", ({ payload }) => {
        setState(s => ({ ...s, queue: payload }));
      }));

      unlisten.push(await listen<UploadCompleteEvent>("upload-complete", () => {
        tauri.getUploadQueue().then(queue => setState(s => ({ ...s, queue })));
      }));
    })();

    // Poll queue every 3s as fallback
    const poll = setInterval(async () => {
      const queue = await tauri.getUploadQueue();
      setState(s => ({ ...s, queue }));
    }, 3_000);

    return () => {
      unlisten.forEach(fn => fn());
      clearInterval(poll);
    };
  }, [refresh]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions = {
    selectFolder: async () => {
      const folder = await tauri.selectWatchFolder();
      if (folder) {
        setState(s => ({
          ...s,
          settings: s.settings ? { ...s.settings, watch_folder: folder } : null,
        }));
      }
    },

    saveApiUrl: async (url: string) => {
      await tauri.setApiUrl(url);
      setState(s => ({
        ...s,
        settings: s.settings ? { ...s.settings, api_url: url } : null,
      }));
    },

    saveToken: async (token: string) => {
      await tauri.setApiToken(token);
      setState(s => ({
        ...s,
        settings: s.settings ? { ...s.settings, api_token: token || null } : null,
      }));
    },

    startWatching: async () => {
      const ok = await tauri.startWatching();
      if (ok) setState(s => ({ ...s, watcherActive: true }));
    },

    stopWatching: async () => {
      await tauri.stopWatching();
      setState(s => ({ ...s, watcherActive: false }));
    },

    retryFailed: async () => {
      await tauri.retryFailedUploads();
      const queue = await tauri.getUploadQueue();
      setState(s => ({ ...s, queue }));
    },

    openDashboard: () => tauri.openWebDashboard(),

    testConnection: async () => {
      try {
        const ok = await tauri.testConnection();
        setState(s => ({ ...s, connected: ok }));
        // Reset after 3s
        setTimeout(() => setState(s => ({ ...s, connected: null })), 3000);
      } catch {
        setState(s => ({ ...s, connected: false }));
      }
    },
  };

  return { state, actions };
}
