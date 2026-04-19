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

export function extractPromptIntent(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  const appNameMatch = prompt.match(/called\s+"([^"]+)"|called\s+([a-zA-Z0-9 ]+)/i);
  const appName = appNameMatch?.[1] || appNameMatch?.[2]?.trim() || "Generated App";

  return {
    appName,
    wantsAuth: /(sign in|login|account|profile)/i.test(lowerPrompt),
    wantsPayments: /(subscription|paid|billing|premium|stripe)/i.test(lowerPrompt),
    wantsSync: /(sync|cloud|supabase|firebase)/i.test(lowerPrompt),
    domain: inferDomain(lowerPrompt)
  };
}

function inferDomain(prompt) {
  if (/fitness|workout|nutrition/.test(prompt)) return "fitness";
  if (/crm|sales|leads|pipeline/.test(prompt)) return "sales";
  if (/travel|trip|itinerary/.test(prompt)) return "travel";
  if (/budget|expense|finance/.test(prompt)) return "finance";
  return "general";
}
