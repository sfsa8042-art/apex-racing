import { useState, useEffect } from "react";
import { Download, ExternalLink, Github, CheckCircle, Loader2, AlertCircle, Monitor } from "lucide-react";

// Replace with your real GitHub repo
const GITHUB_REPO = "your-username/apex-racing";
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
const API_URL      = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

interface Release {
  tag_name:     string;
  name:         string;
  published_at: string;
  prerelease:   boolean;
  assets: Array<{
    name:                 string;
    browser_download_url: string;
    size:                 number;
  }>;
}

function fmt(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

interface Props { apiUrl?: string | null }

export function DownloadPage({ apiUrl }: Props) {
  const [release,  setRelease]  = useState<Release | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Current version embedded at build time
  const currentVersion = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_VERSION) ?? "0.1.0";

  useEffect(() => {
    fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((releases: Release[]) => {
        const best = releases.find(r => !r.prerelease && r.assets.length > 0)
          ?? releases.find(r => r.assets.length > 0)
          ?? null;
        setRelease(best);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const exe = release?.assets.find(a => a.name.endsWith(".exe") && !a.name.includes("debug"));
  const msi = release?.assets.find(a => a.name.endsWith(".msi"));

  const isUpToDate = release?.tag_name === `v${currentVersion}`;

  const webUrl = apiUrl
    ? `${apiUrl.replace(/\/$/, "")}/dashboard`
    : "http://localhost:3000/dashboard";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Current version */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
            <Monitor size={18} className="text-lime-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Установленная версия</p>
            <p className="text-base font-semibold text-zinc-100 font-mono">v{currentVersion}</p>
          </div>
          {!loading && isUpToDate && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lime-400/10 border border-lime-400/20">
              <CheckCircle size={11} className="text-lime-400" />
              <span className="text-[10px] font-mono text-lime-400">Актуально</span>
            </div>
          )}
          {!loading && !isUpToDate && release && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
              <AlertCircle size={11} className="text-yellow-400" />
              <span className="text-[10px] font-mono text-yellow-400">Доступно {release.tag_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Latest release */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <Github size={13} className="text-zinc-500" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Последний релиз</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={16} className="animate-spin text-zinc-600" />
            <p className="text-xs text-zinc-600 font-mono">Проверка обновлений…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 text-xs text-red-400 font-mono">
            <AlertCircle size={13} />
            Нет подключения к GitHub
          </div>
        )}

        {release && !loading && (
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-zinc-200">{release.name || release.tag_name}</p>
              <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{fmtDate(release.published_at)}</p>
            </div>

            {/* Installer buttons */}
            <div className="space-y-2">
              {exe && (
                <a href={exe.browser_download_url}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-lime-400/30 bg-lime-400/8 hover:bg-lime-400/15 transition-all group">
                  <Download size={14} className="text-lime-400 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold text-lime-400">NSIS Installer (.exe)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{exe.name} · {fmt(exe.size)}</p>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide">Рекомендуется</span>
                </a>
              )}

              {msi && (
                <a href={msi.browser_download_url}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-all">
                  <Download size={13} className="text-zinc-400 shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-zinc-300">MSI Installer</p>
                    <p className="text-[10px] text-zinc-600 font-mono">{msi.name} · {fmt(msi.size)}</p>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">IT-деплой</span>
                </a>
              )}

              {!exe && !msi && (
                <p className="text-xs text-zinc-600 font-mono text-center py-2">
                  Установщики не найдены в этом релизе
                </p>
              )}
            </div>

            {/* GitHub link */}
            <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 font-mono transition-colors">
              <ExternalLink size={11} />
              Все релизы на GitHub
            </a>
          </div>
        )}
      </div>

      {/* Web platform */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3">Веб-платформа</p>
        <div className="space-y-2">
          <a href={webUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-all">
            <ExternalLink size={13} className="text-zinc-400 shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-xs text-zinc-300">Открыть дашборд</p>
              <p className="text-[10px] text-zinc-600 font-mono truncate">{webUrl}</p>
            </div>
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-zinc-700 font-mono text-center pb-2">
        APEX Desktop v{currentVersion} · Windows 10/11
      </p>
    </div>
  );
}
