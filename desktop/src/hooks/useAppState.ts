import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type {
  AppSettings, UploadTask, FileDetectedEvent,
  WatcherStatusEvent, UploadCompleteEvent,
} from "../types";
import * as tauri from "../lib/tauri";

export interface AppState {
  settings:     AppSettings | null;
  watcherActive: boolean;
  queue:         UploadTask[];
  connected:     boolean | null;
  loading:       boolean;
  lastDetected:  FileDetectedEvent | null;
}

const DEFAULT_STATE: AppState = {
  settings:      null,
  watcherActive: false,
  queue:         [],
  connected:     null,
  loading:       true,
  lastDetected:  null,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);

  // ── Initial load — все вызовы защищены try/catch ─────────────────────────
  const refresh = useCallback(async () => {
    try {
      const settings      = await tauri.getSettings().catch(() => null);
      const watcherActive = await tauri.getWatcherStatus().catch(() => false);
      const queue         = await tauri.getUploadQueue().catch(() => [] as UploadTask[]);
      setState(s => ({ ...s, settings, watcherActive, queue, loading: false }));
    } catch {
      // Если всё упало — показываем пустой UI, не краш
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();

    // Подписки на события — каждая в отдельном try/catch
    const unlisteners: Array<() => void> = [];

    const subscribe = async () => {
      try {
        unlisteners.push(await listen<FileDetectedEvent>("file-detected", ({ payload }) => {
          setState(s => ({ ...s, lastDetected: payload }));
        }));
      } catch { /* event not available */ }

      try {
        unlisteners.push(await listen<WatcherStatusEvent>("watcher-status", ({ payload }) => {
          setState(s => ({ ...s, watcherActive: payload.active }));
        }));
      } catch { /* event not available */ }

      try {
        unlisteners.push(await listen<UploadTask[]>("queue-update", ({ payload }) => {
          setState(s => ({ ...s, queue: payload }));
        }));
      } catch { /* event not available */ }

      try {
        unlisteners.push(await listen<UploadCompleteEvent>("upload-complete", () => {
          tauri.getUploadQueue()
            .then(queue => setState(s => ({ ...s, queue })))
            .catch(() => {});
        }));
      } catch { /* event not available */ }
    };

    subscribe();

    // Опрос очереди каждые 3с
    const poll = setInterval(() => {
      tauri.getUploadQueue()
        .then(queue => setState(s => ({ ...s, queue })))
        .catch(() => {});
    }, 3_000);

    return () => {
      unlisteners.forEach(fn => { try { fn(); } catch {} });
      clearInterval(poll);
    };
  }, [refresh]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions = {
    selectFolder: async () => {
      try {
        const folder = await tauri.selectWatchFolder();
        if (folder) setState(s => ({
          ...s,
          settings: s.settings ? { ...s.settings, watch_folder: folder } : null,
        }));
      } catch { /* dialog cancelled */ }
    },

    saveApiUrl: async (url: string) => {
      await tauri.setApiUrl(url).catch(() => {});
      setState(s => ({
        ...s,
        settings: s.settings ? { ...s.settings, api_url: url } : null,
      }));
    },

    saveToken: async (token: string) => {
      await tauri.setApiToken(token).catch(() => {});
      setState(s => ({
        ...s,
        settings: s.settings ? { ...s.settings, api_token: token || null } : null,
      }));
    },

    startWatching: async () => {
      try {
        const ok = await tauri.startWatching();
        if (ok) setState(s => ({ ...s, watcherActive: true }));
      } catch { /* handle silently */ }
    },

    stopWatching: async () => {
      await tauri.stopWatching().catch(() => {});
      setState(s => ({ ...s, watcherActive: false }));
    },

    retryFailed: async () => {
      await tauri.retryFailedUploads().catch(() => {});
      const queue = await tauri.getUploadQueue().catch(() => [] as UploadTask[]);
      setState(s => ({ ...s, queue }));
    },

    openDashboard: () => tauri.openWebDashboard().catch(() => {}),

    testConnection: async () => {
      try {
        const ok = await tauri.testConnection();
        setState(s => ({ ...s, connected: ok }));
        setTimeout(() => setState(s => ({ ...s, connected: null })), 3000);
      } catch {
        setState(s => ({ ...s, connected: false }));
      }
    },
  };

  return { state, actions };
}
