import { extractPromptIntent } from "./prompt-intake.js";

const INTENT_JSON_SCHEMA = {
  type: "object",
  required: ["appName", "domain", "features", "monetization", "integrations", "constraints"],
  properties: {
    appName: { type: "string", minLength: 1 },
    domain: { type: "string", enum: ["fitness", "sales", "travel", "finance", "general"] },
    features: { type: "array", items: { type: "string", minLength: 1 } },
    monetization: {
      type: "object",
      required: ["model", "notes"],
      properties: {
        model: { type: "string", enum: ["subscription", "freemium", "one_time", "ads", "none"] },
        notes: { type: "string" }
      }
    },
    integrations: {
      type: "array",
      items: {
        type: "string",
        enum: ["rest_api", "supabase", "firebase", "stripe", "zapier", "webhooks"]
      }
    },
    constraints: {
      type: "object",
      required: ["requiresAuth", "requiresPayments", "requiresSync"],
      properties: {
        requiresAuth: { type: "boolean" },
        requiresPayments: { type: "boolean" },
        requiresSync: { type: "boolean" },
        timeline: { type: "string" },
        budget: { type: "string" }
      }
    }
  }
};

export class IntentValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "IntentValidationError";
    this.details = details;
  }
}

export function parseIntentFromPrompt(rawPromptText, { modelOutput } = {}) {
  if (typeof rawPromptText !== "string" || rawPromptText.trim().length === 0) {
    throw new IntentValidationError("Prompt text is required for intent parsing.");
  }

  const candidateIntent = modelOutput ?? inferIntentWithModelHeuristics(rawPromptText);
  const validationErrors = validateSchema(candidateIntent, INTENT_JSON_SCHEMA);

  if (validationErrors.length > 0) {
    throw new IntentValidationError("LLM intent output failed schema validation.", validationErrors);
  }

  return normalizeIntent(candidateIntent);
}

function inferIntentWithModelHeuristics(prompt) {
  const heuristicIntent = extractPromptIntent(prompt);
  const features = extractFeatures(prompt, heuristicIntent);

  return {
    appName: heuristicIntent.appName,
    domain: heuristicIntent.domain,
    features,
    monetization: {
      model: heuristicIntent.wantsPayments ? "subscription" : "freemium",
      notes: heuristicIntent.wantsPayments
        ? "Premium conversion through recurring subscriptions."
        : "Free tier first; upsell premium automations later."
    },
    integrations: buildIntegrations(heuristicIntent),
    constraints: {
      requiresAuth: heuristicIntent.wantsAuth,
      requiresPayments: heuristicIntent.wantsPayments,
      requiresSync: heuristicIntent.wantsSync,
      timeline: "mvp",
      budget: "bootstrap"
    }
  };
}

function normalizeIntent(intent) {
  const sanitizedAppName = intent.appName.trim() || "Generated App";

  return {
    appName: sanitizedAppName,
    domain: intent.domain,
    features: uniqueValues(intent.features),
    monetization: intent.monetization,
    integrations: uniqueValues(intent.integrations),
    constraints: intent.constraints,
    wantsAuth: intent.constraints.requiresAuth,
    wantsPayments: intent.constraints.requiresPayments,
    wantsSync: intent.constraints.requiresSync
  };
}

function validateSchema(value, schema, path = "$") {
  const errors = [];

  if (schema.type === "object") {
    if (!isPlainObject(value)) {
      return [`${path} must be an object.`];
    }

    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push(`${path}.${key} is required.`);
      }
    }

    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        errors.push(...validateSchema(value[key], propertySchema, `${path}.${key}`));
      }
    }

    return errors;
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      return [`${path} must be an array.`];
    }

    value.forEach((item, index) => {
      errors.push(...validateSchema(item, schema.items, `${path}[${index}]`));
    });

    return errors;
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      return [`${path} must be a string.`];
    }

    if (schema.minLength && value.trim().length < schema.minLength) {
      errors.push(`${path} must be at least ${schema.minLength} characters.`);
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path} must be one of: ${schema.enum.join(", ")}.`);
    }

    return errors;
  }

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      return [`${path} must be a boolean.`];
    }

    return errors;
  }

  return errors;
}

function extractFeatures(prompt, heuristicIntent) {
  const featureKeywords = [
    "analytics",
    "automation",
    "notifications",
    "reporting",
    "crm",
    "itinerary",
    "workouts",
    "budgets",
    "insights"
  ];

  const lowerPrompt = prompt.toLowerCase();
  const matchedFeatures = featureKeywords.filter((keyword) => lowerPrompt.includes(keyword));

  if (heuristicIntent.wantsAuth) {
    matchedFeatures.push("authentication");
  }

  if (heuristicIntent.wantsSync) {
    matchedFeatures.push("cloud sync");
  }

  if (heuristicIntent.wantsPayments) {
    matchedFeatures.push("subscription billing");
  }

  return matchedFeatures.length > 0 ? uniqueValues(matchedFeatures) : ["core workflow"];
}

function buildIntegrations(heuristicIntent) {
  const integrations = ["rest_api"];

  if (heuristicIntent.wantsSync) {
    integrations.push("supabase");
  }

  if (heuristicIntent.wantsPayments) {
    integrations.push("stripe");
  }

  return integrations;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
