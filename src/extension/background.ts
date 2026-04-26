async function updateBlockingRules(isStudying: boolean) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(r => r.id);

  if (!isStudying) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });
    return;
  }

  const data = await chrome.storage.local.get(["whitelist", "blacklist"]);
  const userWhitelist = data.whitelist || [];
  const userBlacklist = data.blacklist || [];

  const internalWhitelist = ["localhost", "127.0.0.1", chrome.runtime.id];
  const combinedWhitelist = [...new Set([...internalWhitelist, ...userWhitelist])];

  const rules: chrome.declarativeNetRequest.Rule[] = [];

  if (userBlacklist.length > 0) {
    rules.push({
      id: 1,
      priority: 2,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { extensionPath: "/blocked.html" }
      },
      condition: {
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        requestDomains: userBlacklist
      }
    });
  }

  rules.push({
    id: 2,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { extensionPath: "/blocked.html" }
    },
    condition: {
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      excludedRequestDomains: combinedWhitelist
    }
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: rules
  });
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) {
    if (details.url.includes(chrome.runtime.id) && details.url.includes("blocked.html")) {
      const data = await chrome.storage.local.get(["studying", "escapeCount", "subject", "escapeLog"]);
      if (data.studying) {
        const count = (data.escapeCount || 0) + 1;
        const log = data.escapeLog || [];
        log.push({ timestamp: Date.now(), subject: data.subject || "Unknown" });
        await chrome.storage.local.set({ escapeCount: count, escapeLog: log });
      }
    }
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.studying) {
    updateBlockingRules(changes.studying.newValue);
  }
});
