import appSpecSchema from "./app-spec.schema.json" with { type: "json" };
import { CURRENT_APP_SPEC_VERSION } from "./app-spec-versioning.js";

export const SUPPORTED_INTEGRATIONS = ["rest_api", "supabase", "firebase", "stripe"];

export function createBaseAppSpec({ appName, platform = "ios", targetDevice = "iphone", platformTargets }) {
  const resolvedPlatformTargets = platformTargets?.length ? platformTargets : [platform];

  return {
    specVersion: CURRENT_APP_SPEC_VERSION,
    metadata: {
      appName,
      platform,
      targetDevice,
      createdAt: new Date().toISOString()
    },
    capabilities: ["authentication", "analytics", "automation"],
    platformTargets: resolvedPlatformTargets,
    product: {
      valueProposition: "",
      monetization: {
        model: "subscription",
        notes: ""
      }
    },
    designSystem: {
      style: "modern",
      colorPalette: {
        primary: "#2563EB",
        secondary: "#111827",
        accent: "#14B8A6",
        background: "#F8FAFC"
      },
      typography: {
        fontFamily: "SF Pro",
        baseSize: 16
      }
    },
    navigation: {
      type: "tab",
      tabs: []
    },
    dataModels: [],
    screens: [],
    integrations: [],
    export: {
      xcodeProjectName: `${appName.replace(/\s+/g, "")}`,
      minimumIOSVersion: "17.0"
    }
  };
}

export function validateAppSpec(spec) {
  const errors = validateAgainstSchema(spec, appSpecSchema);

  const unsupportedIntegrations = (spec?.integrations ?? [])
    .map((integration, index) => ({ index, type: integration?.type }))
    .filter(({ type }) => type && !SUPPORTED_INTEGRATIONS.includes(type))
    .map(({ index, type }) => ({
      code: "UNSUPPORTED_INTEGRATION",
      message: `Integration type '${type}' is not supported.`,
      path: `/integrations/${index}/type`,
      expected: SUPPORTED_INTEGRATIONS
    }));

  const allErrors = [...errors, ...unsupportedIntegrations];

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

function validateAgainstSchema(value, schema, path = "") {
  const errors = [];

  if (schema.type && !isExpectedType(value, schema.type)) {
    return [
      {
        code: "INVALID_TYPE",
        message: `Expected ${schema.type} but received ${readableType(value)}.`,
        path: path || "/",
        expected: schema.type,
        received: readableType(value)
      }
    ];
  }

  if (schema.required && value && typeof value === "object" && !Array.isArray(value)) {
    for (const requiredProperty of schema.required) {
      if (!(requiredProperty in value)) {
        errors.push({
          code: "MISSING_REQUIRED_PROPERTY",
          message: `Required property '${requiredProperty}' is missing.`,
          path: `${path || ""}/${requiredProperty}`,
          expected: "present"
        });
      }
    }
  }

  if (schema.type === "object" && schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      if (value[propertyName] !== undefined) {
        errors.push(...validateAgainstSchema(value[propertyName], propertySchema, `${path}/${propertyName}`));
      }
    }
  }

  if (schema.type === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        code: "ARRAY_MIN_ITEMS",
        message: `Expected at least ${schema.minItems} items but received ${value.length}.`,
        path: path || "/",
        expected: schema.minItems,
        received: value.length
      });
    }

    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(item, schema.items, `${path}/${index}`));
      });
    }
  }

  if (schema.minLength !== undefined && typeof value === "string" && value.length < schema.minLength) {
    errors.push({
      code: "STRING_MIN_LENGTH",
      message: `Expected at least ${schema.minLength} characters but received ${value.length}.`,
      path: path || "/",
      expected: schema.minLength,
      received: value.length
    });
  }

  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push({
      code: "STRING_PATTERN_MISMATCH",
      message: `Value does not match expected pattern '${schema.pattern}'.`,
      path: path || "/",
      expected: schema.pattern,
      received: value
    });
  }

  return errors;
}

function isExpectedType(value, expectedType) {
  if (expectedType === "array") {
    return Array.isArray(value);
  }

  if (expectedType === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  return typeof value === expectedType;
}

function readableType(value) {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}
