#!/usr/bin/env bun
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseFrontmatter(text: string): Record<string, string> | null {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const block = text.slice(4, end);
  const out: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

async function walkSkills(dir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === "SKILL.md") found.push(path);
    }
  }
  if (await exists(dir)) await walk(dir);
  return found;
}

async function main(): Promise<void> {
  const errors: string[] = [];

  if (await exists(join(root, ".cursor", "skills"))) {
    errors.push(".cursor/skills must not exist");
  }

  const outside = (await walkSkills(root)).filter(
    (p) => !p.includes(`${join(root, ".claude", "skills")}`),
  );
  const labOutside = outside.filter(
    (p) => !p.includes(`${join(root, "upstream")}`) && !p.includes("node_modules"),
  );
  for (const p of labOutside) {
    errors.push(`SKILL.md outside .claude/skills/: ${p}`);
  }

  const skillsRoot = join(root, ".claude", "skills");
  if (!(await exists(skillsRoot))) {
    errors.push(".claude/skills is missing");
  } else {
    const dirs = (await readdir(skillsRoot, { withFileTypes: true })).filter((d) =>
      d.isDirectory(),
    );
    for (const d of dirs) {
      const skillPath = join(skillsRoot, d.name, "SKILL.md");
      if (!(await exists(skillPath))) {
        errors.push(`missing SKILL.md in ${d.name}`);
        continue;
      }
      const text = await readFile(skillPath, "utf8");
      const fm = parseFrontmatter(text);
      if (!fm) {
        errors.push(`${skillPath}: missing YAML frontmatter`);
        continue;
      }
      if (fm.name !== d.name) {
        errors.push(`${skillPath}: name "${fm.name}" != folder "${d.name}"`);
      }
      if (!fm.description || fm.description.trim() === "") {
        errors.push(`${skillPath}: empty description`);
      }
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("skills-layout ok");
}

await main();
