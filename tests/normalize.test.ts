import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeOcrJson, parseOcrStdout } from "../src/normalize.ts";

const fixtures = join(import.meta.dir, "fixtures");

describe("normalize OCR JSON", () => {
  test("normalizes captured comments fixture", () => {
    const raw = JSON.parse(readFileSync(join(fixtures, "ocr-review-comments.json"), "utf8"));
    const findings = normalizeOcrJson(raw);
    expect(findings.length).toBe(2);
    expect(findings[0]).toMatchObject({
      file: "app.ts",
      line: 1,
      severity: "high",
      rule: "security",
    });
    expect(findings[1]?.line).toBe(3);
  });

  test("handles failed review with null comments", () => {
    const raw = JSON.parse(readFileSync(join(fixtures, "ocr-review-failed.json"), "utf8"));
    const findings = normalizeOcrJson(raw);
    expect(findings).toEqual([]);
  });

  test("parseOcrStdout rejects non-JSON", () => {
    expect(() => parseOcrStdout("not json at all")).toThrow();
  });
});
