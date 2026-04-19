import type { PromptParserOutput } from './promptParser';

export type SpecGeneratorInput = {
  parsedPrompt: PromptParserOutput;
  productContext?: {
    appName?: string;
    targetPlatform?: 'ios' | 'android' | 'web';
  };
};

export type ProductSpec = {
  appName: string;
  platform: 'ios' | 'android' | 'web';
  modules: string[];
  acceptanceCriteria: string[];
  monetizationModel: 'none' | 'subscription' | 'one-time' | 'usage-based';
};

export function generateSpec(input: SpecGeneratorInput): ProductSpec {
  if (!input || !input.parsedPrompt) {
    throw new Error('generateSpec requires parsedPrompt.');
  }

  return {
    appName: input.productContext?.appName ?? 'Generated App',
    platform: input.productContext?.targetPlatform ?? 'ios',
    modules: input.parsedPrompt.features,
    acceptanceCriteria: [],
    monetizationModel: input.parsedPrompt.monetizationHints.includes('subscription')
      ? 'subscription'
      : 'none',
  };
}
