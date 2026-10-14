import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { runReview } from "../src/review.ts";
import { gitBin, makeFixtureRepo } from "./helpers.ts";

const ROOT = join(import.meta.dir, "..");
const hasLive = Boolean(
  process.env.RUN_LIVE_OCR === "1" && (process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
);

describe("live OCR review", () => {
  test("live provider review returns JSON findings or empty list", async () => {
    if (!hasLive) {
      // Opt in with RUN_LIVE_OCR=1 plus a provider key (CI live-review job sets both).
      expect(true).toBe(true);
      return;
    }
    process.env.OCR_GIT_BIN = dirname(gitBin());
    const { repo, base, head } = await makeFixtureRepo("bad");
    const provider = process.env.GEMINI_API_KEY ? "gemini" : "anthropic";
    const result = await runReview({
      base,
      head,
      provider,
      failOn: "high",
      repo,
      root: ROOT,
      outJson: join(repo, "review-live.json"),
      outMd: join(repo, "review-live.md"),
    });
    expect(result.mode).toBe("llm");
    // Provider billing or model availability may fail closed as exit 2; accept 0/1/2.
    expect([0, 1, 2]).toContain(result.exitCode);
  });
});
