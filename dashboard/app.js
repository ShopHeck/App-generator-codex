const promptForm = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt-input");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");
const previewTitle = document.getElementById("preview-title");
const previewDescription = document.getElementById("preview-description");
const appSpecViewer = document.getElementById("appspec-viewer");

const state = {
  promptHistory: [],
};

function buildAppSpec(prompt) {
  const trimmedPrompt = prompt.trim();
  const appName = trimmedPrompt.split(" ").slice(0, 4).join(" ") || "New App";

  return {
    appName,
    createdAt: new Date().toISOString(),
    overview: trimmedPrompt,
    screens: [
      {
        name: "Dashboard",
        goal: "Provide an internal operator overview and generation controls",
      },
    ],
    monetizationPotential: [
      "Team subscription tiers for higher generation volume",
      "Paid automation packs for integrations",
    ],
  };
}

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
      minute: "2-digit",
    });

    listItem.innerHTML = `
      <strong>${item.title}</strong>
      <p>${item.prompt}</p>
      <p>${date}</p>
    `;

    historyList.appendChild(listItem);
  });
}

function renderDraft(prompt) {
  const appSpec = buildAppSpec(prompt);
  previewTitle.textContent = appSpec.appName;
  previewDescription.textContent = appSpec.overview;
  appSpecViewer.textContent = JSON.stringify(appSpec, null, 2);
}

function addPromptToHistory(prompt) {
  const title = prompt
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ")
    .replace(/[.!?]$/, "");

  state.promptHistory.unshift({
    title: title || "Untitled prompt",
    prompt,
    timestamp: Date.now(),
  });

  state.promptHistory = state.promptHistory.slice(0, 20);
  renderHistory();
}

promptForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    return;
  }

  addPromptToHistory(prompt);
  renderDraft(prompt);
  promptInput.value = "";
});

clearHistoryButton.addEventListener("click", () => {
  state.promptHistory = [];
  renderHistory();
});

renderHistory();
renderDraft("Internal app builder for high-velocity team operations");
