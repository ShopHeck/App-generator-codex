import type { ProductSpec } from './specGenerator';

export type IntegrationGeneratorInput = {
  spec: ProductSpec;
  providers?: Array<'stripe' | 'supabase' | 'firebase' | 'zapier'>;
};

export type IntegrationPlan = {
  provider: 'stripe' | 'supabase' | 'firebase' | 'zapier';
  purpose: string;
  requiredEnvVars: string[];
};

export type IntegrationGeneratorOutput = {
  integrations: IntegrationPlan[];
};

export function generateIntegrations(input: IntegrationGeneratorInput): IntegrationGeneratorOutput {
  if (!input || !input.spec) {
    throw new Error('generateIntegrations requires spec.');
  }

  const providers = input.providers ?? [];
  const integrations: IntegrationPlan[] = providers.map((provider) => {
    if (provider === 'stripe') {
      return {
        provider,
        purpose: 'Billing and subscriptions',
        requiredEnvVars: ['STRIPE_SECRET_KEY'],
      };
    }

    if (provider === 'supabase') {
      return {
        provider,
        purpose: 'Database and auth backend',
        requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
      };
    }

    if (provider === 'firebase') {
      return {
        provider,
        purpose: 'Realtime backend services',
        requiredEnvVars: ['FIREBASE_PROJECT_ID'],
      };
    }

    return {
      provider,
      purpose: 'Automation triggers and webhooks',
      requiredEnvVars: ['ZAPIER_WEBHOOK_URL'],
    };
  });

  return { integrations };
}
