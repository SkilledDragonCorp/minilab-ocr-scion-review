---
name: ocr-merge-gate
description: Run the Open Code Review merge gate on agent-authored diffs before merge; fix high findings until exit 0.
---

# OCR merge gate

When you finish a change that may be merged:

1. Ensure the OCR binary exists: `bun run ensure:ocr`
2. Run:

```bash
bun run review --base origin/main --head HEAD --fail-on high
```

3. Read `review.json` (and `review.md`).
4. Fix every finding with severity `high` or `critical`.
5. Re-run the command until exit code is `0`.
6. Never merge on exit code `1` (blocking findings) or `2` (missing binary / non-JSON OCR output).

Keyless mode (no LLM API keys) uses OCR `delegate` plus deterministic secret/SQL scanners. When `GEMINI_API_KEY` or another supported provider key is set, the gate runs `ocr review` in LLM mode.
