import { IosSwiftUiGenerator } from "./ios-swiftui-generator.js";

const GENERATOR_FACTORIES = {
  ios_swiftui: () => new IosSwiftUiGenerator()
};

export function getGenerator(target = "ios_swiftui") {
  const createGenerator = GENERATOR_FACTORIES[target];

  if (!createGenerator) {
    throw new Error(
      `Unsupported generation target: ${target}. Available targets: ${Object.keys(GENERATOR_FACTORIES).join(", ")}`
    );
  }

  return createGenerator();
}

export function listAvailableTargets() {
  return Object.keys(GENERATOR_FACTORIES);
}
