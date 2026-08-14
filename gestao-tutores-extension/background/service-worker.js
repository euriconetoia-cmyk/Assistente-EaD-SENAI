"use strict";

const DASHBOARD_URL = chrome.runtime.getURL("dashboard/index.html");

async function openDashboard() {
  const existing = await chrome.tabs.query({ url: DASHBOARD_URL });
  if (existing.length) {
    await chrome.tabs.update(existing[0].id, { active: true });
    return;
  }

  await chrome.tabs.create({ url: DASHBOARD_URL });
}

chrome.action.onClicked.addListener(() => {
  openDashboard().catch((error) => console.error("Falha ao abrir dashboard", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GESTAO_TUTORES_OPEN_DASHBOARD") return false;

  openDashboard()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
