import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function pickGit(): string {
  if (process.env.OCR_GIT_BIN) {
    return join(process.env.OCR_GIT_BIN, "git");
  }
  for (const p of ["/usr/local/Cellar/git/2.39.0/bin/git", "/opt/homebrew/bin/git", "git"]) {
    try {
      const r = Bun.spawnSync([p, "--version"], { stdout: "pipe" });
      if (r.exitCode === 0) return p;
    } catch {
      // try next
    }
  }
  return "git";
}

const GIT = pickGit();

export function gitBin(): string {
  return GIT;
}

export async function git(
  repo: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  const proc = Bun.spawn([gitBin(), ...args], {
    cwd: repo,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "lab",
      GIT_AUTHOR_EMAIL: "lab@skilleddragon.com",
      GIT_COMMITTER_NAME: "lab",
      GIT_COMMITTER_EMAIL: "lab@skilleddragon.com",
      PATH: `${join(gitBin(), "..")}:${process.env.PATH ?? ""}`,
    },
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { stdout, stderr, code };
}

export async function makeFixtureRepo(kind: "bad" | "clean"): Promise<{
  repo: string;
  base: string;
  head: string;
}> {
  const repo = join(
    tmpdir(),
    `ocr-scion-${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(repo, { recursive: true });
  let r = await git(repo, ["init"]);
  if (r.code !== 0) throw new Error(r.stderr);
  await git(repo, ["config", "user.email", "lab@skilleddragon.com"]);
  await git(repo, ["config", "user.name", "lab"]);
  writeFileSync(join(repo, "app.ts"), "export function ok(): number { return 1 }\n");
  await git(repo, ["add", "app.ts"]);
  r = await git(repo, ["-c", "commit.gpgsign=false", "commit", "-m", "clean"]);
  if (r.code !== 0) throw new Error(r.stderr);
  const base = (await git(repo, ["rev-parse", "HEAD"])).stdout.trim();

  if (kind === "bad") {
    writeFileSync(
      join(repo, "app.ts"),
      [
        'export const API_KEY = "sk-live-abcdefghijklmnopqrstuvwxyz123456";',
        "export function query(userId: string): string {",
        '  return "SELECT * FROM users WHERE id = " + userId;',
        "}",
        "",
      ].join("\n"),
    );
  } else {
    writeFileSync(
      join(repo, "app.ts"),
      "export function ok(): number { return 1 }\nexport function alsoOk(): number { return 2 }\n",
    );
  }
  await git(repo, ["add", "app.ts"]);
  r = await git(repo, ["-c", "commit.gpgsign=false", "commit", "-m", kind]);
  if (r.code !== 0) throw new Error(r.stderr);
  const head = (await git(repo, ["rev-parse", "HEAD"])).stdout.trim();
  return { repo, base, head };
}
