import type { ScreenDefinition } from './screenGenerator';

export type NavigationGeneratorInput = {
  screens: ScreenDefinition[];
  navigationStyle?: 'stack' | 'tabs';
};

export type NavigationRoute = {
  from: string;
  to: string;
  condition?: string;
};

export type NavigationGeneratorOutput = {
  style: 'stack' | 'tabs';
  routes: NavigationRoute[];
};

export function generateNavigation(input: NavigationGeneratorInput): NavigationGeneratorOutput {
  if (!input || !Array.isArray(input.screens) || input.screens.length === 0) {
    throw new Error('generateNavigation requires at least one screen.');
  }

  const routes: NavigationRoute[] = input.screens.slice(1).map((screen) => ({
    from: input.screens[0].id,
    to: screen.id,
  }));

  return {
    style: input.navigationStyle ?? 'stack',
    routes,
  };
}
