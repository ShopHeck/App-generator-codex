const DOMAIN_KEYWORDS = {
  fitness: ["fitness", "workout", "nutrition", "coach", "training", "habit"],
  sales: ["crm", "sales", "lead", "pipeline", "prospect", "deal"],
  travel: ["travel", "trip", "itinerary", "vacation", "booking", "destination"],
  finance: ["budget", "expense", "finance", "spending", "savings", "invoice"],
  ecommerce: ["store", "shop", "catalog", "checkout", "order", "inventory"]
};

const FEATURE_PATTERNS = {
  auth: /(sign in|login|log in|account|profile|oauth|authentication)/i,
  payments: /(subscription|paid|billing|premium|stripe|checkout|paywall)/i,
  sync: /(sync|cloud|supabase|firebase|backup|real[- ]?time)/i,
  analytics: /(analytics|insights|reporting|dashboard|metrics|kpi)/i,
  automation: /(automation|automate|workflow|webhook|zapier|trigger)/i,
  notifications: /(notification|reminder|push)/i
};

export function normalizePrompt(input) {
  if (typeof input !== "string") {
    throw new Error("Prompt must be a string.");
  }

  const prompt = input.trim();
  if (prompt.length < 20) {
    throw new Error("Prompt is too short. Provide at least 20 characters for useful app generation.");
  }

  return prompt.replace(/\s+/g, " ");
}

export function promptParser(prompt) {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("promptParser requires a non-empty prompt string.");
  }

  const normalizedPrompt = normalizePrompt(prompt);
  const lowerPrompt = normalizedPrompt.toLowerCase();
  const appName = extractAppName(normalizedPrompt);
  const domain = inferDomain(lowerPrompt);
  const requestedFeatures = inferRequestedFeatures(normalizedPrompt);

  return {
    appName,
    domain,
    requestedFeatures,
    userProblem: inferUserProblem(normalizedPrompt, domain),
    monetizationHint: inferMonetizationHint(normalizedPrompt),
    complexity: inferComplexity(requestedFeatures)
  };
}

export function extractPromptIntent(prompt) {
  const intent = promptParser(prompt);

  return {
    ...intent,
    wantsAuth: intent.requestedFeatures.auth,
    wantsPayments: intent.requestedFeatures.payments,
    wantsSync: intent.requestedFeatures.sync
  };
}

function extractAppName(prompt) {
  const explicitName = prompt.match(/called\s+"([^"]+)"|called\s+([a-zA-Z0-9][a-zA-Z0-9 ]+)/i);
  if (explicitName?.[1]) return explicitName[1].trim();
  if (explicitName?.[2]) return explicitName[2].trim();

  const titleCaseTokens = prompt
    .split(/[^a-zA-Z0-9]+/)
    .filter((token) => /^[A-Z][a-zA-Z0-9]+$/.test(token));

  if (titleCaseTokens.length >= 2) {
    return titleCaseTokens.slice(0, 3).join(" ");
  }

  return "Generated App";
}

function inferRequestedFeatures(prompt) {
  return Object.entries(FEATURE_PATTERNS).reduce((accumulator, [featureName, pattern]) => {
    accumulator[featureName] = pattern.test(prompt);
    return accumulator;
  }, {});
}

function inferDomain(prompt) {
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => prompt.includes(keyword))) {
      return domain;
    }
  }

  return "general";
}

function inferUserProblem(prompt, domain) {
  const shortPrompt = prompt.length > 180 ? `${prompt.slice(0, 177)}...` : prompt;
  if (/(manage|organize|track|plan|improve|automate)/i.test(prompt)) {
    return `Users need a faster way to ${extractActionPhrase(prompt)} in the ${domain} workflow.`;
  }

  return `Users need a reliable mobile workflow for ${domain} use cases. Source intent: ${shortPrompt}`;
}

function extractActionPhrase(prompt) {
  const actionMatch = prompt.match(/(manage|organize|track|plan|improve|automate)\s+([^.,]+)/i);
  if (!actionMatch) return "execute daily tasks";

  const verb = actionMatch[1].toLowerCase();
  const subject = actionMatch[2].trim();
  return `${verb} ${subject}`;
}

function inferMonetizationHint(prompt) {
  if (/(subscription|premium|paid|billing|stripe)/i.test(prompt)) {
    return "subscription";
  }
  if (/(marketplace|commission|transaction fee)/i.test(prompt)) {
    return "transaction_fee";
  }
  return "freemium";
}

function inferComplexity(requestedFeatures) {
  const featureCount = Object.values(requestedFeatures).filter(Boolean).length;
  if (featureCount >= 4) return "high";
  if (featureCount >= 2) return "medium";
  return "low";
}
