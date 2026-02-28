import { ChatOpenAI } from "@langchain/openai";

export interface LlmConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  temperature: number;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getLlmConfigFromEnv(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  if (!apiKey.trim()) return null;

  const baseURL = process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL;
  const model = process.env.LLM_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const temperature = toNumber(process.env.LLM_TEMPERATURE, 0.4);

  return {
    apiKey: apiKey.trim(),
    baseURL: baseURL?.trim() || undefined,
    model: model.trim(),
    temperature,
  };
}

export function createChatModelFromEnv(): ChatOpenAI | null {
  const cfg = getLlmConfigFromEnv();
  if (!cfg) return null;

  return new ChatOpenAI({
    apiKey: cfg.apiKey,
    configuration: cfg.baseURL ? { baseURL: cfg.baseURL } : undefined,
    model: cfg.model,
    temperature: cfg.temperature,
  });
}

