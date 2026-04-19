export type PromptParserInput = {
  rawPrompt: string;
  metadata?: {
    tenantId?: string;
    locale?: string;
    source?: 'web' | 'api' | 'cli';
  };
};

export type PromptParserOutput = {
  intent: string;
  features: string[];
  monetizationHints: string[];
  constraints: string[];
  metadata: {
    tenantId: string | null;
    locale: string;
    source: 'web' | 'api' | 'cli' | 'unknown';
  };
};

export function parsePrompt(input: PromptParserInput): PromptParserOutput {
  if (!input || typeof input.rawPrompt !== 'string' || input.rawPrompt.trim().length === 0) {
    throw new Error('parsePrompt requires a non-empty rawPrompt string.');
  }

  const normalizedPrompt = input.rawPrompt.trim();
  const lowerPrompt = normalizedPrompt.toLowerCase();

  return {
    intent: normalizedPrompt,
    features: [],
    monetizationHints: lowerPrompt.includes('subscription') ? ['subscription'] : [],
    constraints: [],
    metadata: {
      tenantId: input.metadata?.tenantId ?? null,
      locale: input.metadata?.locale ?? 'en-US',
      source: input.metadata?.source ?? 'unknown',
    },
  };
}
