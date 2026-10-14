import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { keylessFindingsFromDiff } from "./keyless.ts";
import {
  type Finding,
  parseOcrStdout,
  parseSeverity,
  type Severity,
  severityAtLeast,
  toMarkdown,
} from "./normalize.ts";
import { ocrBinaryExists, runOcr } from "./ocr.ts";
import { detectAnyProvider, type ProviderName, requireProviderKey } from "./providers.ts";

export type ReviewOptions = {
  base: string;
  head: string;
  provider?: ProviderName;
  failOn: Severity;
  repo?: string;
  outJson?: string;
  outMd?: string;
  root?: string;
  /** Force keyless even when a provider key exists. */
  forceKeyless?: boolean;
};

export type ReviewResult = {
  mode: "keyless" | "llm";
  findings: Finding[];
  exitCode: number;
  diff: string;
};

async function gitDiff(repo: string, base: string, head: string): Promise<string> {
  const proc = Bun.spawn(["git", "diff", "--unified=0", `${base}...${head}`], {
    cwd: repo,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`git diff failed (${code}): ${stderr.trim()}`);
  }
  return stdout;
}

export async function runReview(opts: ReviewOptions): Promise<ReviewResult> {
  const repo = opts.repo ?? process.cwd();
  const root = opts.root;
  if (!ocrBinaryExists(root)) {
    return {
      mode: "keyless",
      findings: [],
      exitCode: 2,
      diff: "",
    };
  }

  const diff = await gitDiff(repo, opts.base, opts.head);
  const provider = opts.forceKeyless ? undefined : (opts.provider ?? detectAnyProvider());

  let findings: Finding[];
  let mode: "keyless" | "llm";

  if (provider) {
    requireProviderKey(provider);
    mode = "llm";
    const result = await runOcr(
      [
        "review",
        "--from",
        opts.base,
        "--to",
        opts.head,
        "--repo",
        repo,
        "--provider",
        provider,
        "--format",
        "json",
        "--audience",
        "agent",
      ],
      { root },
    );
    try {
      findings = parseOcrStdout(result.stdout);
    } catch (err) {
      console.error(String(err));
      if (result.stderr.trim()) console.error(result.stderr.trim());
      return { mode, findings: [], exitCode: 2, diff };
    }
  } else {
    mode = "keyless";
    // Deterministic OCR path: delegate preview/rule (no LLM), then local scanners.
    const preview = await runOcr(
      [
        "delegate",
        "preview",
        "--format",
        "json",
        "--from",
        opts.base,
        "--to",
        opts.head,
        "--repo",
        repo,
      ],
      { root },
    );
    if (preview.exitCode !== 0) {
      console.error(preview.stderr.trim() || preview.stdout.trim() || "delegate preview failed");
      return { mode, findings: [], exitCode: 2, diff };
    }
    try {
      JSON.parse(preview.stdout.trim());
    } catch {
      console.error("OCR delegate preview returned non-JSON");
      return { mode, findings: [], exitCode: 2, diff };
    }
    findings = keylessFindingsFromDiff(diff);
  }

  const outJson = opts.outJson ?? join(repo, "review.json");
  const outMd = opts.outMd ?? join(repo, "review.md");
  writeFileSync(outJson, `${JSON.stringify({ mode, findings }, null, 2)}\n`);
  writeFileSync(outMd, toMarkdown(findings));

  const blocking = findings.some((f) => severityAtLeast(f.severity, opts.failOn));
  return {
    mode,
    findings,
    exitCode: blocking ? 1 : 0,
    diff,
  };
}

export function parseFailOn(raw: string | undefined): Severity {
  return parseSeverity(raw ?? "high");
}
