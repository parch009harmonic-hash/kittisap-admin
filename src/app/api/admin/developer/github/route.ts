import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { NextRequest, NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

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

function safeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function run(cmd: string, args: string[], timeoutMs = 20000) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    cwd: process.cwd(),
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 4,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function runSafe(cmd: string, args: string[], fallback = "") {
  try {
    return await run(cmd, args);
  } catch {
    return { stdout: fallback, stderr: "" };
  }
}

function parseChangedFiles(statusPorcelain: string) {
  if (!statusPorcelain) return [];
  return statusPorcelain
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

async function getGitSummary(): Promise<GitSummary> {
  const branch = (await runSafe("git", ["rev-parse", "--abbrev-ref", "HEAD"])).stdout || null;
  const commitShort = (await runSafe("git", ["rev-parse", "--short", "HEAD"])).stdout || null;
  const commitMessage = (await runSafe("git", ["log", "-1", "--pretty=%s"])).stdout || null;
  const upstream = (await runSafe("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])).stdout || null;
  const remoteOrigin = (await runSafe("git", ["remote", "get-url", "origin"])).stdout || null;
  const statusPorcelain = (await runSafe("git", ["status", "--porcelain"])).stdout;
  const changedFiles = parseChangedFiles(statusPorcelain);
  const dirty = changedFiles.length > 0;

  let ahead: number | null = null;
  let behind: number | null = null;
  if (upstream) {
    const counts = (await runSafe("git", ["rev-list", "--left-right", "--count", `HEAD...${upstream}`])).stdout;
    const [behindStr, aheadStr] = counts.split("\t");
    const behindParsed = Number.parseInt(behindStr ?? "", 10);
    const aheadParsed = Number.parseInt(aheadStr ?? "", 10);
    ahead = Number.isFinite(aheadParsed) ? aheadParsed : null;
    behind = Number.isFinite(behindParsed) ? behindParsed : null;
  }

  return {
    branch,
    commitShort,
    commitMessage,
    upstream,
    remoteOrigin,
    ahead,
    behind,
    changedFiles,
    dirty,
  };
}

async function runUpdateAction() {
  const beforeHead = (await runSafe("git", ["rev-parse", "HEAD"])).stdout;
  const fetchResult = await run("git", ["fetch", "--prune"], 40000);
  const pullResult = await run("git", ["pull", "--ff-only"], 60000);
  const afterHead = (await runSafe("git", ["rev-parse", "HEAD"])).stdout;
  const updatedFiles =
    beforeHead && afterHead && beforeHead !== afterHead
      ? (await runSafe("git", ["diff", "--name-only", `${beforeHead}..${afterHead}`])).stdout.split("\n").map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    beforeHead: beforeHead || null,
    afterHead: afterHead || null,
    updated: beforeHead !== afterHead,
    updatedFiles,
    output: [fetchResult.stdout, pullResult.stdout].filter(Boolean).join("\n"),
  };
}

async function runBuildAction() {
  const result = await run("cmd", ["/c", "npm run build"], 10 * 60 * 1000);
  return { output: [result.stdout, result.stderr].filter(Boolean).join("\n") };
}

async function runCommitPushAction(message: string | undefined, branchFromBody: string | undefined) {
  const branch =
    branchFromBody?.trim() ||
    (await runSafe("git", ["rev-parse", "--abbrev-ref", "HEAD"])).stdout ||
    "main";
  const commitMessage =
    message?.trim() || `chore: quick sync ${new Date().toISOString().replace("T", " ").slice(0, 19)}`;

  const staged = await run("git", ["add", "-A"]);
  const pending = (await runSafe("git", ["status", "--porcelain"])).stdout;
  if (!pending) {
    const pushResult = await run("git", ["push", "origin", branch], 60000);
    return {
      output: [staged.stdout, "No changes to commit.", pushResult.stdout, pushResult.stderr].filter(Boolean).join("\n"),
      branch,
      message: commitMessage,
      committed: false,
    };
  }

  const commitResult = await run("git", ["commit", "-m", commitMessage], 60000);
  const pushResult = await run("git", ["push", "origin", branch], 60000);
  return {
    output: [staged.stdout, commitResult.stdout, commitResult.stderr, pushResult.stdout, pushResult.stderr].filter(Boolean).join("\n"),
    branch,
    message: commitMessage,
    committed: true,
  };
}

async function runSyncScriptAction(message: string | undefined, branchFromBody: string | undefined) {
  const branch =
    branchFromBody?.trim() ||
    (await runSafe("git", ["rev-parse", "--abbrev-ref", "HEAD"])).stdout ||
    "main";
  const commitMessage = message?.trim() ?? "";

  const result = await run(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ".\\scripts\\sync-github.ps1", "-Branch", branch, "-Message", commitMessage],
    15 * 60 * 1000,
  );

  return {
    output: [result.stdout, result.stderr].filter(Boolean).join("\n"),
    branch,
    message: commitMessage,
  };
}

async function runAllOneToFourAction(message: string | undefined, branchFromBody: string | undefined) {
  const outputChunks: string[] = [];
  const before = await getGitSummary();

  outputChunks.push("[1/4] scan");
  outputChunks.push(`branch=${before.branch ?? "-"}, dirty=${before.dirty ? "yes" : "no"}`);

  outputChunks.push("[2/4] update");
  const update = await runUpdateAction();
  outputChunks.push(update.output ?? "");

  outputChunks.push("[3/4] build");
  const build = await runBuildAction();
  outputChunks.push(build.output ?? "");

  outputChunks.push("[4/4] commit + push");
  const commitPush = await runCommitPushAction(message, branchFromBody);
  outputChunks.push(commitPush.output ?? "");

  return {
    output: outputChunks.filter(Boolean).join("\n\n"),
    updatedFiles: update.updatedFiles ?? [],
    committed: commitPush.committed,
    branch: commitPush.branch,
    commitMessage: commitPush.message,
  };
}

export async function GET() {
  try {
    await requireDeveloperApi();
    const summary = await getGitSummary();
    return NextResponse.json({ ok: true, summary }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = safeError(error);
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireDeveloperApi();
    const body = (await request.json()) as { action?: string; message?: string; branch?: string };
    const action = body.action ?? "scan";

    if (action === "scan") {
      const summary = await getGitSummary();
      return NextResponse.json({ ok: true, summary });
    }

    if (action === "update") {
      const result = await runUpdateAction();
      const summary = await getGitSummary();
      return NextResponse.json({ ok: true, action: "update", result, summary });
    }

    if (action === "build") {
      const result = await runBuildAction();
      const summary = await getGitSummary();
      return NextResponse.json({ ok: true, action: "build", result, summary });
    }

    if (action === "commit_push") {
      const result = await runCommitPushAction(body.message, body.branch);
      const summary = await getGitSummary();
      return NextResponse.json({ ok: true, action: "commit_push", result, summary });
    }

    if (action === "sync_script") {
      const result = await runSyncScriptAction(body.message, body.branch);
      const summary = await getGitSummary();
      return NextResponse.json({ ok: true, action: "sync_script", result, summary });
    }

    if (action === "run_all_1234") {
      const result = await runAllOneToFourAction(body.message, body.branch);
      const summary = await getGitSummary();
      return NextResponse.json({ ok: true, action: "run_all_1234", result, summary });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = safeError(error);
    const status =
      message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

