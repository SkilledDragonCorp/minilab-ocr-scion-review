#!/usr/bin/env bun
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

// Built at runtime so this file does not contain the banned literals as contiguous text.
const banned = [
  ["e", ".", "g", "."].join(""),
  ["if", " present"].join(""),
  ["or", " npm", " install"].join(""),
  ["or", " similar"].join(""),
  ["something", " like"].join(""),
];

const skipDirs = new Set([
  "node_modules",
  "upstream",
  ".git",
  "dist",
  ".bun",
  "coverage",
  "fixtures",
]);

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, files);
    else if (/\.(md|ts|tsx|js|yml|yaml|sh|json)$/.test(entry.name)) files.push(path);
  }
  return files;
}

async function main(): Promise<void> {
  const files = await walk(root);
  const exempt = new Set([
    join(root, "ci", "upstream", "ci.yml"),
    join(root, "scripts", "upstream-test.sh"),
    join(root, "scripts", "check-banned.ts"),
  ]);
  const hits: string[] = [];
  for (const file of files) {
    if (exempt.has(file)) continue;
    if (file.includes(`${join(root, "ci", "upstream")}`)) continue;
    const text = await readFile(file, "utf8");
    for (const phrase of banned) {
      if (text.includes(phrase)) hits.push(`${file}: contains banned phrase`);
    }
  }
  if (hits.length > 0) {
    for (const h of hits) console.error(h);
    process.exit(1);
  }
  console.log("banned-phrase check ok");
}

await main();
