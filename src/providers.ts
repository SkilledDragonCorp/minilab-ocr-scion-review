export type ProviderName =
  | "gemini"
  | "anthropic"
  | "openai"
  | "openrouter"
  | "dashscope"
  | "bedrock";

export type ProviderSpec = {
  name: ProviderName;
  envVars: string[];
  /** Extra env vars required together (Bedrock). */
  requireAll?: boolean;
};

export const PROVIDERS: Record<ProviderName, ProviderSpec> = {
  gemini: { name: "gemini", envVars: ["GEMINI_API_KEY"] },
  anthropic: { name: "anthropic", envVars: ["ANTHROPIC_API_KEY"] },
  openai: { name: "openai", envVars: ["OPENAI_API_KEY", "OPENAI_RESPONSES_API_KEY"] },
  openrouter: { name: "openrouter", envVars: ["OPENROUTER_API_KEY"] },
  dashscope: { name: "dashscope", envVars: ["DASHSCOPE_API_KEY"] },
  bedrock: {
    name: "bedrock",
    envVars: ["AWS_REGION", "AWS_PROFILE"],
    requireAll: true,
  },
};

export function isProviderName(value: string): value is ProviderName {
  return value in PROVIDERS;
}

export function resolveProviderKey(provider: ProviderName): string | undefined {
  const spec = PROVIDERS[provider];
  if (spec.requireAll) {
    const ok = spec.envVars.every((k) => {
      const v = process.env[k];
      return typeof v === "string" && v.trim() !== "";
    });
    return ok ? "configured" : undefined;
  }
  for (const key of spec.envVars) {
    const v = process.env[key];
    if (typeof v === "string" && v.trim() !== "") return key;
  }
  return undefined;
}

export function requireProviderKey(provider: ProviderName): string {
  const key = resolveProviderKey(provider);
  if (!key) {
    const spec = PROVIDERS[provider];
    const listed = spec.envVars.join(" / ");
    throw new Error(`LLM mode for --provider ${provider} requires ${listed} in the environment`);
  }
  return key;
}

export function detectAnyProvider(): ProviderName | undefined {
  for (const name of Object.keys(PROVIDERS) as ProviderName[]) {
    if (resolveProviderKey(name)) return name;
  }
  return undefined;
}
