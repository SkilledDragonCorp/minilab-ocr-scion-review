import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { runReview } from "../src/review.ts";
import { gitBin, makeFixtureRepo } from "./helpers.ts";

const ROOT = join(import.meta.dir, "..");

function preferModernGit(): void {
  process.env.OCR_GIT_BIN = dirname(gitBin());
}

describe("review gate", () => {
  test("bad fixture keyless reports secret and SQL lines and exits 1", async () => {
    preferModernGit();
    const { repo, base, head } = await makeFixtureRepo("bad");
    const result = await runReview({
      base,
      head,
      failOn: "high",
      repo,
      root: ROOT,
      forceKeyless: true,
      outJson: join(repo, "review.json"),
      outMd: join(repo, "review.md"),
    });
    expect(result.mode).toBe("keyless");
    expect(result.exitCode).toBe(1);
    const secret = result.findings.find((f) => f.rule === "hardcoded-secret");
    const sql = result.findings.find((f) => f.rule === "sql-string-concat");
    expect(secret?.file).toBe("app.ts");
    expect(secret?.line).toBe(1);
    expect(sql?.file).toBe("app.ts");
    expect(sql?.line).toBe(3);
  });

  test("clean diff exits 0", async () => {
    preferModernGit();
    const { repo, base, head } = await makeFixtureRepo("clean");
    const result = await runReview({
      base,
      head,
      failOn: "high",
      repo,
      root: ROOT,
      forceKeyless: true,
      outJson: join(repo, "review.json"),
      outMd: join(repo, "review.md"),
    });
    expect(result.exitCode).toBe(0);
    expect(result.findings.length).toBe(0);
  });

  test("missing binary exits 2", async () => {
    const { repo, base, head } = await makeFixtureRepo("clean");
    const prev = process.env.OCR_BINARY;
    process.env.OCR_BINARY = join(repo, "definitely-missing-ocr-binary");
    try {
      const result = await runReview({
        base,
        head,
        failOn: "high",
        repo,
        root: ROOT,
        forceKeyless: true,
        outJson: join(repo, "review.json"),
        outMd: join(repo, "review.md"),
      });
      expect(result.exitCode).toBe(2);
    } finally {
      if (prev === undefined) delete process.env.OCR_BINARY;
      else process.env.OCR_BINARY = prev;
    }
  });
});
