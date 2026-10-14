# RESULTS

| Check | Result | Notes |
| --- | --- | --- |
| `bun test` (local) | 8 pass / 0 fail | ~4.5s; keyless + normalizer |
| `bun run lint` | pass | Biome 2.5.15 |
| `bun run typecheck` | pass | TypeScript 5.9.3 |
| CI `lint` | pass | [ci run](https://github.com/SkilledDragonCorp/minilab-ocr-scion-review/actions/runs/38523170737) |
| CI `test` | pass | includes `bun run ensure:ocr` |
| CI `skills-layout` | pass | `ocr-merge-gate` |
| CI `secrets` | pass | gitleaks v8.30.1 |
| CI `audit` | pass | `bun audit --audit-level=high` |
| CI `upstream-parity` | pass | regenerated `upstream-test.sh` |
| CI `node24-compat` | pass | `node dist/cli.js --help` exit 0 |
| CI `live-review` | pass | no provider secrets → slice no-ops |
| Workflow `upstream-ci` | pass | [upstream-ci run](https://github.com/SkilledDragonCorp/minilab-ocr-scion-review/actions/runs/38523170847) |
| Upstream SHA | `1672852136fc87748249d22bce0819f33419ea79` | `git -C upstream rev-parse HEAD` |
| Lab HEAD | `e9b4aa64f3d2727e97f9ef06f4d510a66ea1154f` | |

Local Docker upstream suite: skipped (Docker Desktop down); GH Actions `upstream-ci` ran the verbatim Go 1.26.9 container jobs instead.

CI run URL (lab): https://github.com/SkilledDragonCorp/minilab-ocr-scion-review/actions/runs/38523170737

CI run URL (upstream): https://github.com/SkilledDragonCorp/minilab-ocr-scion-review/actions/runs/38523170847
