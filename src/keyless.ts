import type { Finding } from "./normalize.ts";

/** Deterministic scanners used when OCR runs in delegate (no-LLM) mode. */

const SECRET_RE = /(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD)\s*[:=]\s*["'`]([A-Za-z0-9_-]{16,})["'`]/i;
const SK_LIVE_RE = /sk-(?:live|test|proj)-[A-Za-z0-9]{16,}/;
const SQL_CONCAT_RE = /(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]*["'`]\s*\+/i;

export function scanAddedLines(
  file: string,
  addedLines: Array<{ line: number; text: string }>,
): Finding[] {
  const out: Finding[] = [];
  for (const { line, text } of addedLines) {
    if (SECRET_RE.test(text) || SK_LIVE_RE.test(text)) {
      out.push({
        file,
        line,
        severity: "high",
        rule: "hardcoded-secret",
        message: "Hard-coded secret or API key literal in added code.",
      });
    }
    if (SQL_CONCAT_RE.test(text)) {
      out.push({
        file,
        line,
        severity: "high",
        rule: "sql-string-concat",
        message: "SQL built via string concatenation; injection risk.",
      });
    }
  }
  return out;
}

/** Parse unified diff (git diff --unified=0) into added lines per file. */
export function parseUnifiedDiffAdded(
  diff: string,
): Map<string, Array<{ line: number; text: string }>> {
  const map = new Map<string, Array<{ line: number; text: string }>>();
  let file = "";
  let newLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ b/")) {
      file = raw.slice("+++ b/".length);
      if (!map.has(file)) map.set(file, []);
      continue;
    }
    if (raw.startsWith("+++ /dev/null")) {
      file = "";
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      const text = raw.slice(1);
      map.get(file)?.push({ line: newLine, text });
      newLine += 1;
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      // deletion only — do not advance newLine
    } else if (raw.startsWith("\\")) {
      // "\ No newline at end of file"
    } else if (raw.startsWith(" ")) {
      newLine += 1;
    }
  }
  return map;
}

export function keylessFindingsFromDiff(diff: string): Finding[] {
  const findings: Finding[] = [];
  for (const [file, lines] of parseUnifiedDiffAdded(diff)) {
    findings.push(...scanAddedLines(file, lines));
  }
  return findings;
}
