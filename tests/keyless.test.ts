import { describe, expect, test } from "bun:test";
import { keylessFindingsFromDiff, parseUnifiedDiffAdded } from "../src/keyless.ts";

describe("keyless scanners", () => {
  test("parses unified=0 added lines", () => {
    const diff = [
      "diff --git a/app.ts b/app.ts",
      "--- a/app.ts",
      "+++ b/app.ts",
      "@@ -1 +1,3 @@",
      "-export function ok(): number { return 1 }",
      '+export const API_KEY = "sk-live-abcdefghijklmnopqrstuvwxyz123456";',
      "+export function query(userId: string): string {",
      '+  return "SELECT * FROM users WHERE id = " + userId;',
      "",
    ].join("\n");
    const map = parseUnifiedDiffAdded(diff);
    expect(map.get("app.ts")?.length).toBe(3);
    const findings = keylessFindingsFromDiff(diff);
    expect(findings.some((f) => f.rule === "hardcoded-secret" && f.line === 1)).toBe(true);
    expect(findings.some((f) => f.rule === "sql-string-concat" && f.line === 3)).toBe(true);
  });
});
