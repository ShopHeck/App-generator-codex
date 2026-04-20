import type { ProductSpec } from './specGenerator';

export type ScreenGeneratorInput = {
  spec: ProductSpec;
};

export type ScreenDefinition = {
  id: string;
  name: string;
  purpose: string;
  components: string[];
};

export type ScreenGeneratorOutput = {
  screens: ScreenDefinition[];
};

export function generateScreens(input: ScreenGeneratorInput): ScreenGeneratorOutput {
  if (!input || !input.spec) {
    throw new Error('generateScreens requires spec.');
  }

  const defaultScreens: ScreenDefinition[] = [
    {
      id: 'home',
      name: 'Home',
      purpose: 'Primary entry point for user actions.',
      components: ['header', 'primary-cta', 'module-list'],
    },
  ];

  return { screens: defaultScreens };
}
