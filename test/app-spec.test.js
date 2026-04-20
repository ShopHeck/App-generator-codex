import test from "node:test";
import assert from "node:assert/strict";
import { createBaseAppSpec, validateAppSpec } from "../src/domain/app-spec.js";
import { migrate_1_0_0_to_1_1_0 } from "../src/domain/app-spec-versioning.js";

test("createBaseAppSpec includes versioning and platform targets", () => {
  const spec = createBaseAppSpec({ appName: "Revenue Pilot", platform: "ios" });

  assert.equal(spec.specVersion, "1.0.0");
  assert.deepEqual(spec.platformTargets, ["ios"]);
  assert.ok(Array.isArray(spec.capabilities));
});

test("validateAppSpec returns machine-readable errors", () => {
  const result = validateAppSpec({});

  assert.equal(result.valid, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.some((error) => error.code === "MISSING_REQUIRED_PROPERTY"));
  assert.ok(result.errors.every((error) => typeof error.path === "string"));
});

test("migrate_1_0_0_to_1_1_0 updates spec version", () => {
  const migrated = migrate_1_0_0_to_1_1_0({ specVersion: "1.0.0", metadata: { appName: "App" } });

  assert.equal(migrated.specVersion, "1.1.0");
});
