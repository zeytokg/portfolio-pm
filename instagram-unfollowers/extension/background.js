const instagramRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        hostEquals: "www.instagram.com",
        schemes: ["https"]
      }
    })
  ],
  actions: [new chrome.declarativeContent.ShowAction()]
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([instagramRule]);
  });
});

function isInstagram(url = "") {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "www.instagram.com";
  } catch {
    return false;
  }
}

async function isPanelOpen(tabId) {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => Boolean(document.getElementById("igu-root"))
  });
  return Boolean(result?.[0]?.result);
}

async function closePanel(tabId) {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      if (typeof window.__iguCleanup === "function") {
        window.__iguCleanup();
        return true;
      }

      document.getElementById("igu-root")?.remove();
      document.getElementById("igu-style")?.remove();
      return false;
    }
  });
  return Boolean(result?.[0]?.result);
}

async function openPanel(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["instagram-unfollowers.js"],
    world: "MAIN"
  });
  return true;
}

async function togglePanel(tabId) {
  if (await isPanelOpen(tabId)) {
    await closePanel(tabId);
    return { open: false };
  }

  await openPanel(tabId);
  return { open: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab?.id) return;

  if (message?.type === "IGU_TOGGLE_PANEL") {
    togglePanel(sender.tab.id)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        console.error("IGU toggle failed", error);
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
    return true;
  }

  if (message?.type === "IGU_CLOSE_PANEL") {
    closePanel(sender.tab.id)
      .then(() => sendResponse({ ok: true, open: false }))
      .catch((error) => {
        console.error("IGU close failed", error);
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
    return true;
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !isInstagram(tab.url)) return;
  try {
    await togglePanel(tab.id);
  } catch (error) {
    console.error("IGU toolbar toggle failed", error);
  }
});
