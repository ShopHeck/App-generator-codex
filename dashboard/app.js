/**
 * Internal App Builder Dashboard
 *
 * Connects to the generation API at API_BASE (injected via <script> tag or
 * window.API_BASE fallback). Submits prompts, polls for completion, and
 * renders the full AppSpec + preview in real time.
 */

const API_BASE = window.API_BASE ?? "http://127.0.0.1:3001";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // 2-minute timeout

const promptForm = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt-input");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");
const previewTitle = document.getElementById("preview-title");
const previewDescription = document.getElementById("preview-description");
const appSpecViewer = document.getElementById("appspec-viewer");
const submitButton = promptForm.querySelector("button[type='submit']");

const state = {
  promptHistory: [],
  currentProjectId: null,
  pollTimer: null
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

// ─── History ─────────────────────────────────────────────────────────────────

function renderHistory() {
  historyList.innerHTML = "";

  if (!state.promptHistory.length) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<p>No prompts yet. Submit your first app idea.</p>";
    historyList.appendChild(emptyItem);
    return;
  }

  state.promptHistory.forEach((item) => {
    const listItem = document.createElement("li");
    const date = new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    const badge =
      item.status === "running"
        ? '<span class="badge badge-running">Generating…</span>'
        : item.status === "failed"
          ? '<span class="badge badge-failed">Failed</span>'
          : '<span class="badge badge-done">Done</span>';

    listItem.innerHTML = `
      <strong>${item.title}</strong>
      ${badge}
      <p>${item.prompt}</p>
      <p>${date}</p>
    `;
    historyList.appendChild(listItem);
  });
}

function addPromptToHistory(prompt, projectId) {
  const title = prompt
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ")
    .replace(/[.!?]$/, "");

  state.promptHistory.unshift({
    title: title || "Untitled prompt",
    prompt,
    projectId,
    timestamp: Date.now(),
    status: "running"
  });

  state.promptHistory = state.promptHistory.slice(0, 20);
  renderHistory();
}

function updateHistoryStatus(projectId, status) {
  const item = state.promptHistory.find((h) => h.projectId === projectId);
  if (item) {
    item.status = status;
    renderHistory();
  }
}

// ─── Preview rendering ────────────────────────────────────────────────────────

function renderRunning(projectName) {
  previewTitle.textContent = projectName ?? "Generating…";
  previewDescription.textContent = "Generation in progress. This usually takes a few seconds.";
  appSpecViewer.textContent = "…";
}

function renderSpec(artifact) {
  const spec = artifact?.spec;
  if (!spec) return;

  previewTitle.textContent = spec.metadata?.appName ?? "App";
  previewDescription.textContent = spec.product?.valueProposition ?? "";
  appSpecViewer.textContent = JSON.stringify(spec, null, 2);
}

function renderError(message) {
  previewTitle.textContent = "Generation failed";
  previewDescription.textContent = message ?? "An unexpected error occurred.";
  appSpecViewer.textContent = "";
}

// ─── Polling ─────────────────────────────────────────────────────────────────

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

function startPolling(projectId, projectName) {
  stopPolling();

  let polls = 0;

  state.pollTimer = setInterval(async () => {
    polls++;

    if (polls > MAX_POLLS) {
      stopPolling();
      updateHistoryStatus(projectId, "failed");
      renderError("Generation timed out. Please try again.");
      setButtonEnabled(true);
      return;
    }

    try {
      const data = await apiGet(`/projects/${projectId}/preview`);
      const project = data.project;

      if (project.status === "completed") {
        stopPolling();
        updateHistoryStatus(projectId, "completed");
        renderSpec(data.artifact);
        setButtonEnabled(true);
      } else if (project.status === "failed") {
        stopPolling();
        updateHistoryStatus(projectId, "failed");
        renderError(project.lastError ?? "Generation failed.");
        setButtonEnabled(true);
      }
      // status === "running" → keep polling
    } catch {
      // 409 = not ready yet → keep polling; other errors stop
      if (polls > 5) {
        stopPolling();
        updateHistoryStatus(projectId, "failed");
        renderError("Could not reach the API. Is the server running?");
        setButtonEnabled(true);
      }
    }
  }, POLL_INTERVAL_MS);
}

// ─── Form submission ──────────────────────────────────────────────────────────

function setButtonEnabled(enabled) {
  submitButton.disabled = !enabled;
  submitButton.textContent = enabled ? "Generate" : "Generating…";
}

promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    return;
  }

  setButtonEnabled(false);
  promptInput.value = "";

  let projectId;
  let projectName;

  try {
    // 1. Create project
    const createData = await apiPost("/projects", { name: prompt.split(" ").slice(0, 4).join(" ") });
    projectId = createData.project.id;
    projectName = createData.project.name;

    // 2. Add to history and show running state
    addPromptToHistory(prompt, projectId);
    renderRunning(projectName);

    // 3. Trigger generation
    await apiPost(`/projects/${projectId}/generate`, { prompt });

    // 4. Start polling for result
    state.currentProjectId = projectId;
    startPolling(projectId, projectName);
  } catch (err) {
    setButtonEnabled(true);
    if (projectId) {
      updateHistoryStatus(projectId, "failed");
    }
    renderError(err.message);
  }
});

clearHistoryButton.addEventListener("click", () => {
  stopPolling();
  state.promptHistory = [];
  renderHistory();
});

// ─── Init ─────────────────────────────────────────────────────────────────────

renderHistory();

