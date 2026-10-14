#!/usr/bin/env bun
import { ocrBinaryExists, resolveOcrBinary } from "./ocr.ts";
import { isProviderName, type ProviderName } from "./providers.ts";
import { parseFailOn, runReview } from "./review.ts";

function usage(exitCode = 0): never {
  const text = `ocr-scion-review — Scion-scale PR review gate (Open Code Review)

Usage:
  bun run review --base <ref> --head <ref> [--provider gemini|anthropic|openai|openrouter|dashscope|bedrock] [--fail-on high] [--repo <path>] [--keyless]

Exit codes:
  0  pass (no finding >= --fail-on)
  1  fail (blocking finding)
  2  fail closed (missing OCR binary or non-JSON OCR output)
`;
  if (exitCode === 0) console.log(text);
  else console.error(text);
  process.exit(exitCode);
}

function flagValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx < 0) return undefined;
  return argv[idx + 1];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    usage(0);
  }
  if (argv.length === 0) usage(2);

  // Support `bun run review --base ...` and `bun run src/cli.ts review --base ...`
  const rest = argv[0] === "review" ? argv.slice(1) : argv;

  const base = flagValue(rest, "--base");
  const head = flagValue(rest, "--head");
  if (!base || !head) usage(2);

  const providerRaw = flagValue(rest, "--provider");
  let provider: ProviderName | undefined;
  if (providerRaw) {
    if (!isProviderName(providerRaw)) {
      console.error(`Unknown --provider ${providerRaw}`);
      process.exit(2);
    }
    provider = providerRaw;
  }

  const failOn = parseFailOn(flagValue(rest, "--fail-on"));
  const repo = flagValue(rest, "--repo");
  const forceKeyless = rest.includes("--keyless");

  if (!ocrBinaryExists()) {
    console.error(`OCR binary missing at ${resolveOcrBinary()}. Run: bun run ensure:ocr`);
    process.exit(2);
  }

  try {
    const result = await runReview({
      base,
      head,
      provider,
      failOn,
      repo,
      forceKeyless,
    });
    console.log(
      JSON.stringify(
        {
          mode: result.mode,
          findings: result.findings.length,
          exitCode: result.exitCode,
        },
        null,
        2,
      ),
    );
    process.exit(result.exitCode);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}

await main();
