"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";

type TabKey = "overview" | "files" | "actions" | "output";

type GitSummary = {
  branch: string | null;
  commitShort: string | null;
  commitMessage: string | null;
  upstream: string | null;
  remoteOrigin: string | null;
  ahead: number | null;
  behind: number | null;
  changedFiles: string[];
  dirty: boolean;
};

type ApiPayload = {
  ok: boolean;
  summary?: GitSummary;
  result?: { output?: string; updated?: boolean; updatedFiles?: string[] };
  error?: string;
};

const TABS: TabKey[] = ["overview", "files", "actions", "output"];

export default function GitHubOpsClient({ locale }: { locale: AdminLocale }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<GitSummary | null>(null);
  const [output, setOutput] = useState("");
  const [lastUpdatedFiles, setLastUpdatedFiles] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState("main");
  const [commitMessageInput, setCommitMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            title: "GitHub Control",
            subtitle: "ตรวจสอบ repo, อัปเดตโค้ด, รัน build, และ sync ขึ้น GitHub",
            tabs: {
              overview: "ภาพรวม",
              files: "ไฟล์ที่เปลี่ยน",
              actions: "คำสั่ง",
              output: "ผลลัพธ์",
            },
            refresh: "ตรวจสอบล่าสุด",
            update: "อัปเดตโค้ด",
            build: "รัน build",
            commitPush: "Commit + Push",
            syncScript: "Sync to GitHub",
            runAll: "รัน 1+2+3+4",
            branchInput: "Branch",
            commitMessageInput: "Commit message",
            running: "กำลังทำงาน...",
            branch: "Branch",
            commit: "Commit",
            upstream: "Upstream",
            remote: "Remote",
            ahead: "Ahead",
            behind: "Behind",
            dirty: "สถานะไฟล์",
            changed: "มีไฟล์ค้าง",
            clean: "สะอาด",
            changedFiles: "ไฟล์ที่เปลี่ยนในเครื่อง",
            updatedFiles: "ไฟล์ที่อัปเดตล่าสุด",
            noData: "ไม่มีข้อมูล",
          }
        : {
            title: "GitHub Control",
            subtitle: "Inspect repo, pull updates, run build, and sync to GitHub",
            tabs: {
              overview: "Overview",
              files: "Changed Files",
              actions: "Actions",
              output: "Output",
            },
            refresh: "Refresh",
            update: "Update Code",
            build: "Run Build",
            commitPush: "Commit + Push",
            syncScript: "Sync to GitHub",
            runAll: "Run 1+2+3+4",
            branchInput: "Branch",
            commitMessageInput: "Commit message",
            running: "Running...",
            branch: "Branch",
            commit: "Commit",
            upstream: "Upstream",
            remote: "Remote",
            ahead: "Ahead",
            behind: "Behind",
            dirty: "Workspace",
            changed: "Dirty",
            clean: "Clean",
            changedFiles: "Local changed files",
            updatedFiles: "Recently updated files",
            noData: "No data",
          },
    [locale],
  );

  const tabLabel: Record<TabKey, string> = {
    overview: t.tabs.overview,
    files: t.tabs.files,
    actions: t.tabs.actions,
    output: t.tabs.output,
  };

  const scanSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/developer/github", { cache: "no-store" });
      const json = (await response.json()) as ApiPayload;
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Scan failed");
      setSummary(json.summary ?? null);
      if (json.summary?.branch) {
        setBranchInput(json.summary.branch);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  async function callAction(action: "update" | "build" | "commit_push" | "sync_script" | "run_all_1234") {
    setLoading(true);
    setError(null);
    try {

      const response = await fetch("/api/admin/developer/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, branch: branchInput, message: commitMessageInput }),
      });
      const json = (await response.json()) as ApiPayload;
      if (!response.ok || !json.ok) throw new Error(json.error ?? `${action} failed`);
      setSummary(json.summary ?? null);
      setOutput(json.result?.output ?? "");
      if (action === "update" || action === "commit_push" || action === "sync_script" || action === "run_all_1234") {
        setLastUpdatedFiles(json.result?.updatedFiles ?? []);
      }
      setTab("output");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void scanSummary();
  }, [scanSummary]);

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.title}</p>
          <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void scanSummary()}
          disabled={loading}
          className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-60"
        >
          {loading ? t.running : t.refresh}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === item ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {tabLabel[item]}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 rounded-lg bg-rose-900/40 p-2 text-xs text-rose-100">{error}</p> : null}

      {tab === "overview" && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <Info label={t.branch} value={summary?.branch ?? t.noData} />
          <Info label={t.commit} value={summary?.commitShort ? `${summary.commitShort} - ${summary.commitMessage ?? ""}` : t.noData} />
          <Info label={t.upstream} value={summary?.upstream ?? t.noData} />
          <Info label={t.remote} value={summary?.remoteOrigin ?? t.noData} />
          <Info label={t.ahead} value={summary?.ahead != null ? `${summary.ahead}` : t.noData} />
          <Info label={t.behind} value={summary?.behind != null ? `${summary.behind}` : t.noData} />
          <Info label={t.dirty} value={summary?.dirty ? t.changed : t.clean} />
        </div>
      )}

      {tab === "files" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <FileList title={t.changedFiles} files={summary?.changedFiles ?? []} empty={t.noData} />
          <FileList title={t.updatedFiles} files={lastUpdatedFiles} empty={t.noData} />
        </div>
      )}

      {tab === "actions" && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-300">
              <span>{t.branchInput}</span>
              <input
                value={branchInput}
                onChange={(event) => setBranchInput(event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none"
                placeholder="main"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-300">
              <span>{t.commitMessageInput}</span>
              <input
                value={commitMessageInput}
                onChange={(event) => setCommitMessageInput(event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none"
                placeholder="chore: update"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void callAction("update")}
              disabled={loading}
              className="rounded-lg border border-emerald-300/70 bg-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
            >
              {loading ? t.running : t.update}
            </button>
            <button
              type="button"
              onClick={() => void callAction("build")}
              disabled={loading}
              className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60"
            >
              {loading ? t.running : t.build}
            </button>
            <button
              type="button"
              onClick={() => void callAction("commit_push")}
              disabled={loading}
              className="rounded-lg border border-fuchsia-300/70 bg-fuchsia-400/20 px-3 py-2 text-sm font-semibold text-fuchsia-100 disabled:opacity-60"
            >
              {loading ? t.running : t.commitPush}
            </button>
            <button
              type="button"
              onClick={() => void callAction("sync_script")}
              disabled={loading}
              className="rounded-lg border border-violet-300/70 bg-violet-400/20 px-3 py-2 text-sm font-semibold text-violet-100 disabled:opacity-60"
            >
              {loading ? t.running : t.syncScript}
            </button>
            <button
              type="button"
              onClick={() => void callAction("run_all_1234")}
              disabled={loading}
              className="rounded-lg border border-orange-300/70 bg-orange-400/20 px-3 py-2 text-sm font-semibold text-orange-100 disabled:opacity-60"
            >
              {loading ? t.running : t.runAll}
            </button>
          </div>
        </div>
      )}

      {tab === "output" && (
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
          {output || t.noData}
        </pre>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </p>
  );
}

function FileList({ title, files, empty }: { title: string; files: string[]; empty: string }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
      <p className="text-sm font-semibold text-cyan-200">{title}</p>
      <div className="mt-2 max-h-56 overflow-auto space-y-1">
        {files.length === 0 ? (
          <p className="text-xs text-slate-400">{empty}</p>
        ) : (
          files.map((item) => (
            <p key={`${title}-${item}`} className="rounded-md bg-slate-900/70 px-2 py-1 text-xs text-slate-200">
              {item}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
