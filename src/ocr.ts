import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

export function resolveOcrBinary(root: string = ROOT): string {
  const fromEnv = process.env.OCR_BINARY?.trim();
  if (fromEnv) return fromEnv;
  const candidates = [
    join(root, "upstream", "opencodereview"),
    join(root, "upstream", "opencodereview.exe"),
    join(root, "node_modules", "@alibaba-group", "open-code-review", "bin", "ocr.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return join(root, "upstream", "opencodereview");
}

export function ocrBinaryExists(root: string = ROOT): boolean {
  const bin = resolveOcrBinary(root);
  return existsSync(bin);
}

export type OcrRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export async function runOcr(
  args: string[],
  opts: { cwd?: string; env?: Record<string, string | undefined>; root?: string } = {},
): Promise<OcrRunResult> {
  const root = opts.root ?? ROOT;
  const bin = resolveOcrBinary(root);
  if (!existsSync(bin)) {
    throw new Error(`OCR binary missing at ${bin}`);
  }
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") env[k] = v;
  }
  if (opts.env) {
    for (const [k, v] of Object.entries(opts.env)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
  // Prefer a modern git on PATH when available (OCR warns below 2.41).
  const preferGit = process.env.OCR_GIT_BIN?.trim();
  if (preferGit) {
    env.PATH = `${preferGit}:${env.PATH ?? ""}`;
  }

  const proc = Bun.spawn([bin, ...args], {
    cwd: opts.cwd ?? root,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}
