export const CURRENT_APP_SPEC_VERSION = "1.0.0";

export function compareSpecVersions(leftVersion, rightVersion) {
  const left = leftVersion.split(".").map((part) => Number.parseInt(part, 10));
  const right = rightVersion.split(".").map((part) => Number.parseInt(part, 10));

  for (let index = 0; index < 3; index += 1) {
    if ((left[index] ?? 0) > (right[index] ?? 0)) {
      return 1;
    }

    if ((left[index] ?? 0) < (right[index] ?? 0)) {
      return -1;
    }
  }

  return 0;
}

export function migrate_1_0_0_to_1_1_0(spec) {
  return {
    ...spec,
    specVersion: "1.1.0"
  };
}

export function migrateAppSpecToVersion(spec, targetVersion) {
  if (!spec?.specVersion) {
    throw new Error("Cannot migrate spec without specVersion.");
  }

  if (compareSpecVersions(spec.specVersion, targetVersion) > 0) {
    throw new Error(`Cannot downgrade spec from ${spec.specVersion} to ${targetVersion}.`);
  }

  if (spec.specVersion === targetVersion) {
    return spec;
  }

  if (spec.specVersion === "1.0.0" && targetVersion === "1.1.0") {
    return migrate_1_0_0_to_1_1_0(spec);
  }

  throw new Error(`No migration path found from ${spec.specVersion} to ${targetVersion}.`);
}
