import { useState } from "react";
import { Layers, Settings2, ExternalLink, Radio, Disc } from "lucide-react";
import { UploadQueue }   from "./components/UploadQueue";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAppState }   from "./hooks/useAppState";

type Tab = "queue" | "settings";

// в”Ђв”Ђв”Ђ Status badge colours в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function statusConfig(watcherActive: boolean, connected: boolean | null) {
  if (watcherActive)          return { dot: "bg-lime-400",  ring: true,  label: "LIVE",    cls: "text-lime-400 border-lime-400/25 bg-lime-400/8" };
  if (connected === false)    return { dot: "bg-red-400",   ring: false, label: "OFFLINE", cls: "text-red-400 border-red-400/25 bg-red-400/8" };
  return                             { dot: "bg-zinc-600",  ring: false, label: "IDLE",    cls: "text-zinc-500 border-zinc-700/60 bg-zinc-800/50" };
}

export default function App() {
  const { state, actions } = useAppState();
  const [tab, setTab] = useState<Tab>("queue");

  // в”Ђв”Ђ Splash в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  if (state.loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--surface)" }}>
        <div className="relative w-12 h-12">
          <div className="w-12 h-12 rounded-2xl bg-lime-400 flex items-center justify-center">
            <span className="text-zinc-950 text-sm font-black tracking-tight">AP</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950 bg-lime-400/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
          </div>
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--text-3)" }}>Р·Р°РїСѓСЃРєвЂ¦</p>
      </div>
    );
  }

  const pending = state.queue.filter(t => t.status === "pending" || t.status === "uploading").length;
  const failed  = state.queue.filter(t => t.status === "failed").length;
  const { dot, ring, label, cls } = statusConfig(state.watcherActive, state.connected);

  const folderName = state.settings?.watch_folder
    ? state.settings.watch_folder.replace(/\\/g, "/").split("/").pop()
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--surface)" }}>

      {/* в”Ђв”Ђ Top bar в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>

        {/* Logo */}
        <div className="w-8 h-8 rounded-xl bg-lime-400 flex items-center justify-center shrink-0 shadow-lg shadow-lime-400/20">
          <span className="text-zinc-950 text-[11px] font-black tracking-tight">AP</span>
        </div>

        {/* App name + folder */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none" style={{ color: "var(--text-1)" }}>
            APEX Desktop
          </p>
          <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
            {folderName ?? "РїР°РїРєР° РЅРµ РІС‹Р±СЂР°РЅР°"}
          </p>
        </div>

        {/* Status pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold tracking-widest ${cls}`}>
          <div className={`relative w-1.5 h-1.5 rounded-full ${dot} ${ring ? "ring-pulse" : ""}`}/>
          {label}
        </div>

        {/* Open dashboard */}
        <button onClick={actions.openDashboard}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: "var(--text-3)" }} title="РћС‚РєСЂС‹С‚СЊ РґР°С€Р±РѕСЂРґ">
          <ExternalLink size={13}/>
        </button>
      </header>

      {/* в”Ђв”Ђ Content в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <main className="flex-1 overflow-hidden min-h-0">
        {tab === "queue" && (
          <UploadQueue
            tasks={state.queue}
            settings={state.settings}
            watcherActive={state.watcherActive}
            lastDetected={state.lastDetected ?? null}
            onRetry={actions.retryFailed}
            onSelectFolder={actions.selectFolder}
            onStartWatching={actions.startWatching}
            onStopWatching={actions.stopWatching}
          />
        )}
        {tab === "settings" && state.settings && (
          <SettingsPanel
            settings={state.settings}
            watcherActive={state.watcherActive}
            connected={state.connected}
            onSelectFolder={actions.selectFolder}
            onSaveApiUrl={actions.saveApiUrl}
            onSaveToken={actions.saveToken}
            onStartWatching={actions.startWatching}
            onStopWatching={actions.stopWatching}
            onTestConn={actions.testConnection}
          />
        )}
      </main>

      {/* в”Ђв”Ђ Bottom tab bar в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <nav className="flex items-stretch shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
        {([
          { id: "queue"    as Tab, icon: Layers,   label: "РњРѕРЅРёС‚РѕСЂРёРЅРі", badge: (pending + failed) || 0 },
          { id: "settings" as Tab, icon: Settings2, label: "РќР°СЃС‚СЂРѕР№РєРё",  badge: 0 },
        ]).map(({ id, icon: Icon, label, badge }) => (
          <button key={id} onClick={() => setTab(id)}
            className="relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            style={{ color: tab === id ? "var(--lime)" : "var(--text-3)" }}>
            <Icon size={16} strokeWidth={tab === id ? 2.5 : 1.8}/>
            <span className="text-[10px] font-mono">{label}</span>

            {/* Badge */}
            {badge > 0 && (
              <span className="absolute top-2 right-[22%] min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5 leading-none">
                {badge > 9 ? "9+" : badge}
              </span>
            )}

            {/* Active indicator */}
            {tab === id && (
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-lime-400 rounded-b"/>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

