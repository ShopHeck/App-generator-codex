import { createBaseAppSpec } from "../domain/app-spec.js";

const DOMAIN_SCREEN_MAP = {
  fitness: ["Home", "Workouts", "Progress", "Profile"],
  sales: ["Dashboard", "Leads", "Pipeline", "Settings"],
  travel: ["Trips", "Explore", "Itinerary", "Profile"],
  finance: ["Overview", "Transactions", "Budgets", "Settings"],
  general: ["Home", "Tasks", "Insights", "Settings"]
};

const DOMAIN_MODELS = {
  fitness: ["WorkoutPlan", "WorkoutSession", "Metric"],
  sales: ["Lead", "Deal", "Activity"],
  travel: ["Trip", "Destination", "Booking"],
  finance: ["Account", "Transaction", "Budget"],
  general: ["UserItem", "Project", "Event"]
};

export function buildStructuredSpec(intent) {
  const spec = createBaseAppSpec({ appName: intent.appName });

  spec.product.valueProposition = `${capitalize(intent.domain)} workflow automation with a mobile-first experience.`;
  spec.product.monetization.notes = intent.wantsPayments
    ? "Enable premium tier with Stripe-managed subscriptions."
    : "Start freemium; unlock premium analytics with a future subscription plan.";

  const screenNames = DOMAIN_SCREEN_MAP[intent.domain] ?? DOMAIN_SCREEN_MAP.general;
  spec.navigation.tabs = screenNames.map((name) => ({ name, route: slugify(name) }));
  spec.screens = screenNames.map((name, index) => ({
    id: `screen_${index + 1}`,
    name,
    route: slugify(name),
    widgets: defaultWidgetsFor(name)
  }));

  spec.dataModels = (DOMAIN_MODELS[intent.domain] ?? DOMAIN_MODELS.general).map((modelName) => ({
    name: modelName,
    fields: defaultFieldsFor(modelName)
  }));

  spec.integrations = [
    intent.wantsSync ? { type: "supabase", purpose: "Cloud sync + auth" } : null,
    intent.wantsPayments ? { type: "stripe", purpose: "Subscription billing" } : null,
    { type: "rest_api", purpose: "External data and automation endpoints" }
  ].filter(Boolean);

  return spec;
}

function defaultWidgetsFor(screenName) {
  if (screenName === "Dashboard" || screenName === "Overview" || screenName === "Home") {
    return ["kpi_cards", "activity_feed", "quick_actions"];
  }
  if (screenName === "Settings" || screenName === "Profile") {
    return ["account_settings", "preferences", "billing_status"];
  }
  return ["list", "filters", "detail_sheet"];
}

function defaultFieldsFor(modelName) {
  return [
    { name: "id", type: "uuid", required: true },
    { name: "title", type: "string", required: true },
    { name: "createdAt", type: "datetime", required: true },
    { name: `${modelName.toLowerCase()}Metadata`, type: "json", required: false }
  ];
}

function slugify(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function capitalize(value) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
