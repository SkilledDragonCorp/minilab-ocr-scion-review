#!/usr/bin/env bun
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PIN = "1672852136fc87748249d22bce0819f33419ea79";
const VERSION = "1.13.0";

function platformTriple(): { os: string; arch: string; ext: string } {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin" && arch === "arm64") return { os: "darwin", arch: "arm64", ext: "" };
  if (platform === "darwin" && arch === "x64") return { os: "darwin", arch: "amd64", ext: "" };
  if (platform === "linux" && arch === "arm64") return { os: "linux", arch: "arm64", ext: "" };
  if (platform === "linux" && arch === "x64") return { os: "linux", arch: "amd64", ext: "" };
  if (platform === "win32" && arch === "arm64")
    return { os: "windows", arch: "arm64", ext: ".exe" };
  if (platform === "win32" && arch === "x64") return { os: "windows", arch: "amd64", ext: ".exe" };
  throw new Error(`Unsupported platform ${platform}/${arch}`);
}

async function main(): Promise<void> {
  const { os, arch, ext } = platformTriple();
  const out = join(ROOT, "upstream", `opencodereview${ext}`);
  if (existsSync(out) && !process.argv.includes("--force")) {
    console.log(`OCR binary already present: ${out}`);
    return;
  }
  mkdirSync(join(ROOT, "upstream"), { recursive: true });
  const url = `https://github.com/alibaba/open-code-review/releases/download/v${VERSION}/opencodereview-${os}-${arch}${ext}`;
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  if (ext === "") chmodSync(out, 0o755);
  const proc = Bun.spawn([out, "--version"], { stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;
  if (!stdout.includes("open-code-review") || !stdout.includes(VERSION.slice(0, 4))) {
    // version string is v1.13.0
  }
  if (!stdout.includes("open-code-review")) {
    throw new Error(`unexpected --version output: ${stdout}`);
  }
  console.log(stdout.trim());
  console.log(`Wrote ${out} (release v${VERSION}, pin ${PIN})`);
}

await main();
