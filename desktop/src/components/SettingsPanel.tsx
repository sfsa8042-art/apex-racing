"use client";
import { useCopy } from "../../../shared/i18n/react";
import { useState } from "react";
import {
  FolderOpen, Eye, EyeOff, Wifi, Play, Square, Activity,
  CheckCircle2, XCircle, ChevronRight, Loader2, Save,
} from "lucide-react";
import type { AppSettings } from "../types";
import { checkAcc } from "../lib/tauri";

interface Props {
  settings:        AppSettings;
  watcherActive:   boolean;
  connected:       boolean | null;
  onSelectFolder:  () => void;
  onSaveApiUrl:    (url: string) => Promise<void>;
  onSaveToken:     (token: string) => Promise<void>;
  onStartWatching: () => Promise<void>;
  onStopWatching:  () => Promise<void>;
  onTestConn:      () => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>
      {children}
    </p>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-strong)", background: "var(--surface-3)" }}>
      {children}
    </div>
  );
}

export function SettingsPanel({
  settings, watcherActive, connected, onSelectFolder, onSaveApiUrl,
  onSaveToken, onStartWatching, onStopWatching, onTestConn,
}: Props) {
  const copy = useCopy();
  const [apiUrl,    setApiUrl]    = useState(settings.api_url);
  const [token,     setToken]     = useState(settings.api_token ?? "");
  const [showToken, setShowToken] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const [accCheck,  setAccCheck]  = useState('');
  const [checking,  setChecking]  = useState(false);
  const [saved,     setSaved]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveApiUrl(apiUrl);
      await onSaveToken(token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
} finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (watcherActive) await onStopWatching();
      else await onStartWatching();
    } finally {
      setToggling(false);
    }
  };

  const connIcon = connected === true  ? <CheckCircle2 size={11} className="text-lime-400"/>
                 : connected === false ? <XCircle      size={11} className="text-red-400"/>
                 : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-5">

        {/* ── Watcher state card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{
            background: watcherActive ? "var(--lime-dim)" : "var(--surface-3)",
            border: `1px solid ${watcherActive ? "var(--lime-border)" : "var(--border)"}`,
          }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{ color: watcherActive ? "var(--lime)" : "var(--text-1)" }}>
                {copy(watcherActive ? "Мониторинг активен" : "Мониторинг выключен")}
              </p>
              <p className="text-[11px] font-mono mt-0.5 truncate max-w-[220px]"
                style={{ color: "var(--text-3)" }}>
                {settings.watch_folder ? settings.watch_folder.split(/[/\\]/).pop() : copy("папка не выбрана")}
              </p>
            </div>
            <button onClick={handleToggle} disabled={!settings.watch_folder || toggling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
              style={watcherActive
                ? { background: "rgba(255,255,255,0.08)", color: "var(--text-1)" }
                : { background: "var(--lime)", color: "#09090b", boxShadow: "0 2px 12px rgba(163,230,53,0.3)" }
              }>
              {toggling ? <Loader2 size={11} className="animate-spin"/> :
               watcherActive ? <Square size={11} fill="currentColor"/> : <Play size={11} fill="currentColor"/>}
              {copy(watcherActive ? "Стоп" : "Старт")}
            </button>
          </div>
        </div>

        {/* ── Folder ────────────────────────────────────────────────────────── */}
        <div>
          <Label>{copy("desktop.023")}</Label>
          <button onClick={onSelectFolder}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors hover:bg-white/3"
            style={{ border: "1px solid var(--border-strong)", background: "var(--surface-3)" }}>
            <FolderOpen size={15} style={{ color: "var(--lime)", flexShrink: 0 }}/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate"
                style={{ color: settings.watch_folder ? "var(--text-1)" : "var(--text-3)" }}>
                {settings.watch_folder ?? copy("Нажми чтобы выбрать…")}
              </p>
              {!settings.watch_folder && (
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-3)" }}>
                  {copy("desktop.025")}</p>
              )}
            </div>
            <ChevronRight size={13} style={{ color: "var(--text-3)", flexShrink: 0 }}/>
          </button>
        </div>

        {/* ── Server URL ────────────────────────────────────────────────────── */}
        <div>
          <Label>{copy("desktop.026")}</Label>
          <Field>
            <div className="flex items-center">
              <input
                type="url"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder={copy("https://your-site.netlify.app")}
                className="flex-1 px-3.5 py-2.5 bg-transparent text-xs font-mono outline-none"
                style={{ color: "var(--text-1)" }}
              />
              <button onClick={onTestConn}
                className="flex items-center gap-1.5 px-3 h-full border-l text-[11px] font-mono transition-colors hover:bg-white/4"
                style={{ color: "var(--text-2)", borderColor: "var(--border-strong)" }}>
                {connIcon ?? <Wifi size={11}/>}
                {copy("desktop.027")}</button>
            </div>
          </Field>
          {connected === false && (
            <p className="text-[10px] font-mono mt-1 text-red-400">{copy("desktop.028")}</p>
          )}
          {connected === true && (
            <p className="text-[10px] font-mono mt-1" style={{ color: "var(--lime)" }}>{copy("desktop.029")}</p>
          )}
        </div>

        {/* ── Token ─────────────────────────────────────────────────────────── */}
        <div>
          <Label>{copy("desktop.030")}</Label>
          <Field>
            <div className="flex items-center">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={copy("apex_tok_…")}
                className="flex-1 px-3.5 py-2.5 bg-transparent text-xs font-mono outline-none"
                style={{ color: "var(--text-1)" }}
              />
              <button onClick={() => setShowToken(v => !v)}
                className="flex items-center justify-center px-3 h-full border-l transition-colors hover:bg-white/4"
                style={{ color: "var(--text-3)", borderColor: "var(--border-strong)" }}>
                {showToken ? <EyeOff size={12}/> : <Eye size={12}/>}
              </button>
            </div>
          </Field>
          <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-3)" }}>
            {copy("desktop.031")}</p>
        </div>

        {/* ── ACC Diagnostic ─────────────────────────────────────────────────── */}
        <section>
          <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 block mb-2">
            {copy("desktop.032")}</label>
          <button
            onClick={async () => {
              setChecking(true);
              try { setAccCheck(await checkAcc()); }
              catch (e) { setAccCheck(String(e)); }
              finally { setChecking(false); }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-400 transition-colors">
            <Activity size={11}/>
            {copy(checking ? "Проверка…" : "Проверить ACC")}
          </button>
          {accCheck && (
            <pre className="mt-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {copy(accCheck)}
            </pre>
          )}
          <p className="text-[10px] text-zinc-700 font-mono mt-1">
            {copy("desktop.035")}</p>
        </section>

        {/* ── Save ──────────────────────────────────────────────────────────── */}
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-98 disabled:opacity-50"
          style={{
            background: saved ? "rgba(163,230,53,0.15)" : "var(--lime)",
            color: saved ? "var(--lime)" : "#09090b",
            border: saved ? "1px solid var(--lime-border)" : "none",
            boxShadow: saved ? "none" : "0 2px 16px rgba(163,230,53,0.25)",
          }}>
          {saving
            ? <Loader2 size={14} className="animate-spin"/>
            : saved
            ? <CheckCircle2 size={14}/>
            : <Save size={14}/>
          }
          {copy(saving ? "Сохранение…" : saved ? "Сохранено" : "Сохранить")}
        </button>

        {/* ── Version ───────────────────────────────────────────────────────── */}
        <p className="text-center text-[10px] font-mono pb-2" style={{ color: "var(--text-3)" }}>
          {copy("desktop.039")}</p>
      </div>
    </div>
  );
}
