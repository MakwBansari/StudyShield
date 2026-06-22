let isUpdatingRules = false;
let pendingUpdate: { isStudying: boolean } | null = null;

async function updateBlockingRules(isStudying: boolean) {
  if (isUpdatingRules) {
    pendingUpdate = { isStudying };
    return;
  }
  isUpdatingRules = true;

  try {
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

    const defaultWhitelist = ["localhost", "127.0.0.1", "nptel.ac.in", "gateoverflow.in", "geeksforgeeks.org", "youtube.com", "drive.google.com", "ankiweb.net", "github.com"];
    const defaultBlacklist = ["facebook.com", "instagram.com", "twitter.com", "reddit.com", "netflix.com"];

    const data = await chrome.storage.local.get(["whitelist", "blacklist", "activeStudyDomain"]);
    const userWhitelist = ((data.whitelist as string[]) || defaultWhitelist).map(sanitizeDomain).filter(Boolean) as string[];
    const userBlacklist = ((data.blacklist as string[]) || defaultBlacklist).map(sanitizeDomain).filter(Boolean) as string[];

    // Always allow the app itself and essential tools
    const internalWhitelist = ["localhost", "127.0.0.1", chrome.runtime.id];
    if (data.activeStudyDomain) {
      internalWhitelist.push(data.activeStudyDomain);
    }
    const combinedWhitelist = [...new Set([...internalWhitelist, ...userWhitelist])];

    const rules: chrome.declarativeNetRequest.Rule[] = [];

    if (isStudying) {
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
    }

    // RULE 3: EXPLICIT BLACKLIST (Priority 20) - Always block blacklisted sites (even if not actively studying)
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

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    // Atomically swap the rules in a single update call
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: rules
    });
    console.log("Blocking rules updated successfully.");
  } catch (err) {
    console.error("Error updating blocking rules:", err);
  } finally {
    isUpdatingRules = false;
    if (pendingUpdate !== null) {
      const next = pendingUpdate;
      pendingUpdate = null;
      updateBlockingRules(next.isStudying);
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "START_STUDYING" && sender.tab?.id) {
    chrome.storage.local.set({ activeStudyTabId: sender.tab.id });
  } else if (message.action === "STOP_STUDYING") {
    chrome.storage.local.remove("activeStudyTabId");
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get("activeStudyTabId").then((data) => {
    if (tabId === data.activeStudyTabId) {
      chrome.storage.local.set({ studying: false });
      chrome.storage.local.remove(["activeStudyDomain", "activeStudyTabId"]);
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ studying: false });
});

chrome.runtime.onStartup.addListener(async () => {
  // Safe check on startup: only clear studying state if no timer tabs are restored
  const tabs = await chrome.tabs.query({ url: ["*://localhost/*/timer*", "*://127.0.0.1/*/timer*"] });
  if (tabs.length === 0) {
    chrome.storage.local.set({ studying: false });
  }
});

// Guard checks on startup/wakeup to prevent redundant rule writes
chrome.storage.local.get(["studying", "blacklist"]).then(async (data) => {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const hasRule1 = existingRules.some(r => r.id === 1);
  const hasRule3 = existingRules.some(r => r.id === 3);

  const needsRule1 = !!data.studying;
  const needsRule3 = Array.isArray(data.blacklist) && data.blacklist.length > 0;

  if (hasRule1 !== needsRule1 || hasRule3 !== needsRule3) {
    updateBlockingRules(!!data.studying);
  }
});

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

