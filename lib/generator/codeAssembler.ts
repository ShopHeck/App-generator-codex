import type { ProductSpec } from './specGenerator';
import type { ScreenDefinition } from './screenGenerator';
import type { NavigationGeneratorOutput } from './navigationGenerator';
import type { DataModelGeneratorOutput } from './dataModelGenerator';
import type { IntegrationGeneratorOutput } from './integrationGenerator';

export type CodeAssemblerInput = {
  spec: ProductSpec;
  screens: ScreenDefinition[];
  navigation: NavigationGeneratorOutput;
  dataModel: DataModelGeneratorOutput;
  integrations: IntegrationGeneratorOutput;
};

export type GeneratedFile = {
  path: string;
  content: string;
};

export type CodeAssemblerOutput = {
  files: GeneratedFile[];
  summary: {
    appName: string;
    moduleCount: number;
    screenCount: number;
    integrationCount: number;
  };
};

export function assembleCode(input: CodeAssemblerInput): CodeAssemblerOutput {
  if (!input || !input.spec) {
    throw new Error('assembleCode requires spec and generation artifacts.');
  }

  return {
    files: [
      {
        path: 'README.generated.md',
        content: `# ${input.spec.appName}\n\nScaffold generated successfully.`,
      },
    ],
    summary: {
      appName: input.spec.appName,
      moduleCount: input.spec.modules.length,
      screenCount: input.screens.length,
      integrationCount: input.integrations.integrations.length,
    },
  };
}
