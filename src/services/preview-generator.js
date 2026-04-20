import { validatePreviewBundle } from "../domain/preview-bundle.js";

export function generatePreviewBundle(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("Preview generation failed: spec must be an object.");
  }

  const screens = (spec.screens ?? []).map((screen) => ({
    id: screen.id,
    name: screen.name,
    route: screen.route,
    widgets: Array.isArray(screen.widgets) ? screen.widgets : []
  }));

  const components = buildComponentsFromScreens(screens);
  const routes = buildRoutes(spec, screens);
  const sampleData = buildSampleData(spec.dataModels ?? []);

  const previewBundle = {
    screens,
    components,
    routes,
    sampleData
  };

  validatePreviewBundle(previewBundle);
  return previewBundle;
}

function buildComponentsFromScreens(screens) {
  const componentsByWidget = new Map();

  for (const screen of screens) {
    for (const widget of screen.widgets) {
      const existing = componentsByWidget.get(widget) ?? {
        id: `component_${componentsByWidget.size + 1}`,
        name: widget,
        type: inferComponentType(widget),
        screenIds: []
      };

      existing.screenIds.push(screen.id);
      componentsByWidget.set(widget, existing);
    }
  }

  return Array.from(componentsByWidget.values());
}

function buildRoutes(spec, screens) {
  const screenIdByRoute = new Map(screens.map((screen) => [screen.route, screen.id]));

  return (spec.navigation?.tabs ?? []).map((tab) => ({
    name: tab.name,
    path: `/${tab.route}`,
    screenId: screenIdByRoute.get(tab.route) ?? ""
  }));
}

function buildSampleData(dataModels) {
  return dataModels.map((model) => ({
    model: model.name,
    records: [buildRecord(model, 1), buildRecord(model, 2)]
  }));
}

function buildRecord(model, index) {
  const record = {};

  for (const field of model.fields ?? []) {
    record[field.name] = sampleValueForField(field, model.name, index);
  }

  return record;
}

function sampleValueForField(field, modelName, index) {
  if (field.type === "uuid") {
    return `${modelName.toLowerCase()}-${index}`;
  }
  if (field.type === "datetime") {
    return new Date(Date.UTC(2026, 0, index)).toISOString();
  }
  if (field.type === "json") {
    return { generated: true, version: 1 };
  }
  return `${field.name}-${index}`;
}

function inferComponentType(widgetName) {
  if (widgetName.includes("list")) {
    return "list";
  }
  if (widgetName.includes("card") || widgetName.includes("kpi")) {
    return "summary";
  }
  if (widgetName.includes("settings") || widgetName.includes("preferences")) {
    return "settings";
  }
  return "content";
}
