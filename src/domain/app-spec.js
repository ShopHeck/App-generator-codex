export const SUPPORTED_INTEGRATIONS = ["rest_api", "supabase", "firebase", "stripe"];

export function createBaseAppSpec({ appName, platform = "ios", targetDevice = "iphone" }) {
  return {
    metadata: {
      appName,
      platform,
      targetDevice,
      createdAt: new Date().toISOString()
    },
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
  if (!spec?.metadata?.appName) {
    throw new Error("App spec validation failed: metadata.appName is required.");
  }

  if (!Array.isArray(spec.screens) || spec.screens.length === 0) {
    throw new Error("App spec validation failed: at least one screen is required.");
  }

  if (!Array.isArray(spec.navigation?.tabs) || spec.navigation.tabs.length === 0) {
    throw new Error("App spec validation failed: navigation tabs are required.");
  }

  const unsupportedIntegrations = (spec.integrations ?? [])
    .map((integration) => integration.type)
    .filter((type) => !SUPPORTED_INTEGRATIONS.includes(type));

  if (unsupportedIntegrations.length > 0) {
    throw new Error(
      `App spec validation failed: unsupported integrations (${unsupportedIntegrations.join(", ")}).`
    );
  }

  return true;
}
