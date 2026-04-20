export const PREVIEW_BUNDLE_REQUIRED_KEYS = ["screens", "components", "routes", "sampleData"];

export function validatePreviewBundle(previewBundle) {
  if (!previewBundle || typeof previewBundle !== "object") {
    throw new Error("Preview bundle validation failed: previewBundle must be an object.");
  }

  for (const key of PREVIEW_BUNDLE_REQUIRED_KEYS) {
    if (!Array.isArray(previewBundle[key])) {
      throw new Error(`Preview bundle validation failed: ${key} must be an array.`);
    }
  }

  for (const screen of previewBundle.screens) {
    if (!isNonEmptyString(screen.id) || !isNonEmptyString(screen.name) || !isNonEmptyString(screen.route)) {
      throw new Error("Preview bundle validation failed: each screen requires id, name, and route.");
    }
  }

  for (const component of previewBundle.components) {
    if (!isNonEmptyString(component.id) || !isNonEmptyString(component.name) || !isNonEmptyString(component.type)) {
      throw new Error("Preview bundle validation failed: each component requires id, name, and type.");
    }
  }

  for (const route of previewBundle.routes) {
    if (!isNonEmptyString(route.name) || !isNonEmptyString(route.path) || !isNonEmptyString(route.screenId)) {
      throw new Error("Preview bundle validation failed: each route requires name, path, and screenId.");
    }
  }

  for (const dataSet of previewBundle.sampleData) {
    if (!isNonEmptyString(dataSet.model) || !Array.isArray(dataSet.records)) {
      throw new Error("Preview bundle validation failed: each sampleData entry requires model and records.");
    }
  }

  return true;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
