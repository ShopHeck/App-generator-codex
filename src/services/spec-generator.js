import { createBaseAppSpec } from "../domain/app-spec.js";

const DOMAIN_BLUEPRINTS = {
  fitness: {
    tabs: ["Home", "Plans", "Progress", "Profile"],
    models: ["WorkoutPlan", "WorkoutSession", "Goal"]
  },
  sales: {
    tabs: ["Dashboard", "Leads", "Pipeline", "Settings"],
    models: ["Lead", "Deal", "Activity"]
  },
  travel: {
    tabs: ["Trips", "Explore", "Itinerary", "Profile"],
    models: ["Trip", "Destination", "Booking"]
  },
  finance: {
    tabs: ["Overview", "Transactions", "Budgets", "Settings"],
    models: ["Account", "Transaction", "Budget"]
  },
  ecommerce: {
    tabs: ["Home", "Catalog", "Cart", "Account"],
    models: ["Product", "Order", "Customer"]
  },
  general: {
    tabs: ["Home", "Tasks", "Insights", "Settings"],
    models: ["Workspace", "Item", "Event"]
  }
};

function normalizeIntent(intent) {
  // Support both LLM-service intents (wantsAuth/wantsPayments/wantsSync) and
  // promptParser intents (requestedFeatures object). Merge into a unified shape.
  const rf = intent.requestedFeatures ?? {};
  return {
    ...intent,
    requestedFeatures: {
      auth: rf.auth ?? intent.wantsAuth ?? false,
      payments: rf.payments ?? intent.wantsPayments ?? false,
      sync: rf.sync ?? intent.wantsSync ?? false,
      analytics: rf.analytics ?? false,
      automation: rf.automation ?? false,
      notifications: rf.notifications ?? false
    },
    monetizationHint: intent.monetizationHint ?? (intent.wantsPayments ? "subscription" : "freemium"),
    userProblem: intent.userProblem ?? `${intent.domain ?? "general"} workflow management`
  };
}

export function specGenerator(rawIntent) {
  if (!rawIntent?.appName) {
    throw new Error("specGenerator requires parsed intent with appName.");
  }

  const intent = normalizeIntent(rawIntent);
  const spec = createBaseAppSpec({ appName: intent.appName });
  const blueprint = DOMAIN_BLUEPRINTS[intent.domain] ?? DOMAIN_BLUEPRINTS.general;

  spec.product.valueProposition = buildValueProposition(intent);
  spec.product.monetization.model = intent.monetizationHint === "freemium" ? "freemium" : "subscription";
  spec.product.monetization.notes = buildMonetizationNotes(intent);

  spec.navigation.tabs = blueprint.tabs.map((name) => ({ name, route: slugify(name) }));
  spec.screens = blueprint.tabs.map((name, index) => ({
    id: `screen_${index + 1}`,
    name,
    route: slugify(name),
    widgets: inferWidgetsForScreen(name, intent)
  }));

  spec.dataModels = blueprint.models.map((modelName) => ({
    name: modelName,
    fields: buildModelFields(modelName, intent)
  }));

  spec.integrations = inferIntegrations(intent);

  return spec;
}

export function buildStructuredSpec(intent) {
  return specGenerator(intent);
}

function inferWidgetsForScreen(screenName, intent) {
  const normalizedName = screenName.toLowerCase();

  if (["dashboard", "overview", "home"].includes(normalizedName)) {
    return [
      "kpi_cards",
      intent.requestedFeatures.analytics ? "trend_chart" : "activity_feed",
      "quick_actions"
    ];
  }

  if (["profile", "settings", "account"].includes(normalizedName)) {
    const widgets = ["account_settings", "preferences"];
    if (intent.requestedFeatures.payments) {
      widgets.push("billing_status");
    }
    return widgets;
  }

  return ["search", "filter_chips", "list", "detail_sheet"];
}

function buildModelFields(modelName, intent) {
  const fields = [
    { name: "id", type: "uuid", required: true },
    { name: "createdAt", type: "datetime", required: true },
    { name: "updatedAt", type: "datetime", required: true },
    { name: "title", type: "string", required: true },
    { name: "status", type: "string", required: true }
  ];

  if (intent.requestedFeatures.sync) {
    fields.push({ name: "lastSyncedAt", type: "datetime", required: false });
  }

  if (intent.requestedFeatures.analytics) {
    fields.push({ name: "metrics", type: "json", required: false });
  }

  fields.push({ name: `${modelName.toLowerCase()}Metadata`, type: "json", required: false });

  return fields;
}

function inferIntegrations(intent) {
  const integrations = [{ type: "rest_api", purpose: "Core app data + automation endpoints" }];

  if (intent.requestedFeatures.sync || intent.requestedFeatures.auth) {
    integrations.push({ type: "supabase", purpose: "Authentication + cloud data sync" });
  }

  if (intent.requestedFeatures.payments) {
    integrations.push({ type: "stripe", purpose: "Subscription billing and paywall events" });
  }

  return integrations;
}

function buildValueProposition(intent) {
  const domainLabel = intent.domain[0].toUpperCase() + intent.domain.slice(1);
  const automationSuffix = intent.requestedFeatures.automation
    ? " with automation-first workflows"
    : " with a mobile-first experience";
  return `${domainLabel} productivity app focused on ${intent.userProblem.toLowerCase()}${automationSuffix}.`;
}

function buildMonetizationNotes(intent) {
  if (intent.monetizationHint === "subscription") {
    return "Launch with monthly and annual subscription plans, plus a 7-day trial to maximize conversion.";
  }
  if (intent.monetizationHint === "transaction_fee") {
    return "Monetize through transaction fees and upsell automation add-ons for power users.";
  }
  return "Ship freemium first, then unlock premium analytics and automation in paid tiers.";
}

function slugify(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
