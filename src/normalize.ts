export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Finding = {
  file: string;
  line: number;
  severity: Severity;
  rule: string;
  message: string;
};

export type OcrComment = {
  path?: string;
  content?: string;
  start_line?: number;
  end_line?: number;
  category?: string;
  severity?: string;
  existing_code?: string;
  suggestion_code?: string;
  thinking?: string;
};

export type OcrReviewJson = {
  status?: string;
  comments?: OcrComment[] | null;
  message?: string;
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function parseSeverity(raw: string | undefined): Severity {
  const s = (raw ?? "medium").toLowerCase();
  if (s === "critical" || s === "high" || s === "medium" || s === "low" || s === "info") {
    return s;
  }
  if (s === "minor") return "low";
  return "medium";
}

export function severityAtLeast(finding: Severity, threshold: Severity): boolean {
  return SEVERITY_RANK[finding] >= SEVERITY_RANK[threshold];
}

export function normalizeOcrJson(raw: unknown): Finding[] {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("OCR output is not a JSON object");
  }
  const doc = raw as OcrReviewJson;
  const comments = Array.isArray(doc.comments) ? doc.comments : [];
  const findings: Finding[] = [];
  for (const c of comments) {
    const file = typeof c.path === "string" && c.path.length > 0 ? c.path : "unknown";
    const line =
      typeof c.start_line === "number" && c.start_line > 0
        ? c.start_line
        : typeof c.end_line === "number" && c.end_line > 0
          ? c.end_line
          : 0;
    const severity = parseSeverity(c.severity);
    const rule =
      typeof c.category === "string" && c.category.length > 0 ? c.category : "ocr-review";
    const message =
      typeof c.content === "string" && c.content.length > 0 ? c.content : "(no message)";
    findings.push({ file, line, severity, rule, message });
  }
  return findings;
}

export function parseOcrStdout(stdout: string): Finding[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("OCR returned empty stdout (expected JSON)");
  }
  // Prefer the last JSON object on stdout (progress may precede it).
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const start = trimmed.lastIndexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("OCR returned non-JSON stdout");
    }
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  }
  return normalizeOcrJson(parsed);
}

export function toMarkdown(findings: Finding[]): string {
  const lines = ["# OCR Scion Review", "", `Findings: ${findings.length}`, ""];
  if (findings.length === 0) {
    lines.push("No findings.");
    return `${lines.join("\n")}\n`;
  }
  for (const f of findings) {
    lines.push(`- \`${f.file}:${f.line}\` **${f.severity}** (${f.rule}) — ${f.message}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
