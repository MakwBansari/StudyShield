async function updateBlockingRules(isStudying: boolean) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    // Always clear existing rules first to avoid conflicts
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });

    if (!isStudying) {
      console.log("Timer stopped. Blocking rules cleared.");
      return;
    }

    const sanitizeDomain = (url: string) => {
      try {
        let str = url.trim().toLowerCase();
        if (!str) return null;
        if (!str.startsWith("http://") && !str.startsWith("https://")) {
          str = "https://" + str;
        }
        const u = new URL(str);
        return u.hostname.replace(/^www\./, "");
      } catch (e) {
        return url.trim().toLowerCase().replace(/^www\./, "").split("/")[0] || null;
      }
    };

    const data = await chrome.storage.local.get(["whitelist", "blacklist", "activeStudyDomain"]);
    const userWhitelist = ((data.whitelist as string[]) || []).map(sanitizeDomain).filter(Boolean) as string[];
    const userBlacklist = ((data.blacklist as string[]) || []).map(sanitizeDomain).filter(Boolean) as string[];

    // Always allow the app itself and essential tools
    const internalWhitelist = ["localhost", "127.0.0.1", chrome.runtime.id];
    if (data.activeStudyDomain) {
      internalWhitelist.push(data.activeStudyDomain);
    }
    const combinedWhitelist = [...new Set([...internalWhitelist, ...userWhitelist])];

    const rules: chrome.declarativeNetRequest.Rule[] = [];

    // RULE 1: BLOCK ALL (Priority 1) - Redirect everything not in whitelist
    rules.push({
      id: 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { extensionPath: "/blocked.html" }
      },
      condition: {
        urlFilter: "*",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        excludedRequestDomains: combinedWhitelist
      }
    });

    // RULE 2: EXPLICIT ALLOW (Priority 10) - Just to be doubly sure whitelist works
    if (combinedWhitelist.length > 0) {
      rules.push({
        id: 2,
        priority: 10,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.ALLOW
        },
        condition: {
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
          requestDomains: combinedWhitelist
        }
      });
    }

    // RULE 3: EXPLICIT BLACKLIST (Priority 20) - Ensure blacklisted sites are blocked even if they were accidentally whitelisted
    if (userBlacklist.length > 0) {
      rules.push({
        id: 3,
        priority: 20,
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

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
    console.log("Blocking rules updated successfully.");
  } catch (err) {
    console.error("Error updating blocking rules:", err);
  }
}

let activeStudyTabId: number | null = null;

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "START_STUDYING" && sender.tab?.id) {
    activeStudyTabId = sender.tab.id;
  } else if (message.action === "STOP_STUDYING") {
    activeStudyTabId = null;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeStudyTabId) {
    activeStudyTabId = null;
    chrome.storage.local.set({ studying: false });
    chrome.storage.local.remove("activeStudyDomain");
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ studying: false });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ studying: false });
});

// Clear rules immediately on service worker startup to avoid stuck rules
updateBlockingRules(false);

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) {
    if (details.url.includes(chrome.runtime.id) && details.url.includes("blocked.html")) {
      const data = await chrome.storage.local.get(["studying", "escapeCount", "subject", "escapeLog"]);
      if (data.studying) {
        const count = ((data.escapeCount as number) || 0) + 1;
        const log = (data.escapeLog as any[]) || [];
        log.push({ timestamp: Date.now(), subject: (data.subject as string) || "Unknown" });
        await chrome.storage.local.set({ escapeCount: count, escapeLog: log });
      }
    }
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local") {
    if (changes.studying || changes.whitelist || changes.blacklist || changes.activeStudyDomain) {
      const data = await chrome.storage.local.get("studying");
      updateBlockingRules(!!data.studying);
    }
  }
});
