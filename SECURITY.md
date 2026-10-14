# Security Policy

## Supported versions

This minilab is educational and is not regularly maintained. The `main` branch is the only supported line.

## Reporting a concern

Email **hello@skilleddragon.com**. This repository is not a vulnerability bounty program.

## Secret handling

- Secrets come from environment variables only (`process.env` / local `.env`, GitHub Actions secrets in CI).
- Never commit `.env`, keys, tokens, or credentials.
- `.env.example` lists variable names with empty values.
- Upstream Open Code Review has no root `SECURITY.md`; report upstream issues via their GitHub repository.
- Telemetry opt-out for OCR: leave `OCR_ENABLE_TELEMETRY` unset or any value other than `1`. Lab CI sets `OCR_ENABLE_TELEMETRY=0` and `DO_NOT_TRACK=1`.

## Tools

| Tool | Version / command |
| --- | --- |
| gitleaks | **v8.30.1** (pre-commit hook + CI binary with SHA256 verify) |
| Dependency audit | `bun audit --audit-level=high` |

## Upstream

| Item | Value |
| --- | --- |
| Repository | https://github.com/alibaba/open-code-review |
| Pin | `1672852136fc87748249d22bce0819f33419ea79` (tag `v1.13.0`) |
| License | Apache-2.0 |
| npm package | `@alibaba-group/open-code-review@1.13.0` |
| Go toolchain (upstream CI) | `golang:1.26.9` |
