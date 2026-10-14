#!/usr/bin/env bun
/**
 * Diffs lab-authored upstream-ci run: lines against ci/upstream/ci.yml.
 * Allowed deviations: A1 runs-on ubuntu-24.04; A2 submodules + working-directory;
 * A3 paths-ignore / branches unchanged.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const root = join(import.meta.dir, "..");
const PIN = "1672852136fc87748249d22bce0819f33419ea79";

type Step = {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  "working-directory"?: string;
  env?: Record<string, string>;
};
type Job = {
  steps?: Step[];
  "runs-on"?: string;
  container?: unknown;
  timeout?: number;
  "timeout-minutes"?: number;
};
type Workflow = { jobs?: Record<string, Job>; on?: unknown };

function normalizeRun(run: string): string {
  return run
    .replaceAll("${{ matrix.goos }}", "MATRIX_GOOS")
    .replaceAll("${{ matrix.goarch }}", "MATRIX_GOARCH")
    .trimEnd();
}

async function main(): Promise<void> {
  const upstreamText = await readFile(join(root, "ci", "upstream", "ci.yml"), "utf8");
  const labText = await readFile(join(root, ".github", "workflows", "upstream-ci.yml"), "utf8");
  const upstream = parseYaml(upstreamText) as Workflow;
  const lab = parseYaml(labText) as Workflow;
  const errors: string[] = [];

  for (const jobName of ["test", "windows", "cross-compile"] as const) {
    const uJob = upstream.jobs?.[jobName];
    const lJob = lab.jobs?.[jobName];
    if (!uJob || !lJob) {
      errors.push(`missing job ${jobName}`);
      continue;
    }
    if (lJob["runs-on"] !== "ubuntu-24.04" && lJob["runs-on"] !== "windows-latest") {
      errors.push(`${jobName}: unexpected runs-on ${lJob["runs-on"]}`);
    }
    if (jobName !== "windows" && lJob["runs-on"] !== "ubuntu-24.04") {
      errors.push(`${jobName}: runs-on must be ubuntu-24.04 (A1)`);
    }
    if (jobName === "windows" && lJob["runs-on"] !== "windows-latest") {
      errors.push("windows: runs-on must stay windows-latest");
    }

    const uRuns = (uJob.steps ?? []).filter((s) => s.run).map((s) => normalizeRun(s.run ?? ""));
    const lRuns = (lJob.steps ?? []).filter((s) => s.run).map((s) => normalizeRun(s.run ?? ""));
    if (uRuns.length !== lRuns.length) {
      errors.push(`${jobName}: run step count ${lRuns.length} != upstream ${uRuns.length}`);
    } else {
      for (let i = 0; i < uRuns.length; i++) {
        if (uRuns[i] !== lRuns[i]) {
          errors.push(`${jobName}: run step ${i} differs from upstream`);
          errors.push(`  upstream: ${uRuns[i]?.slice(0, 160)}`);
          errors.push(`  lab:      ${lRuns[i]?.slice(0, 160)}`);
        }
      }
    }

    for (const step of lJob.steps ?? []) {
      if (step.uses?.includes("actions/checkout") && step.with?.submodules !== true) {
        errors.push(`${jobName}: checkout must set submodules: true (A2)`);
      }
      if (step.run && step["working-directory"] !== "upstream") {
        errors.push(
          `${jobName}: run step "${step.name ?? "?"}" must set working-directory: upstream (A2)`,
        );
      }
    }
  }

  const pinMention =
    labText.includes(PIN) ||
    (await readFile(join(root, ".github", "workflows", "ci.yml"), "utf8")).includes(PIN);
  if (!pinMention) {
    errors.push(`CI must mention upstream pin ${PIN}`);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("upstream-parity ok");
}

await main();
