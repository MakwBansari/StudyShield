const WHITELIST_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'nptel.ac.in',
  'gateoverflow.in',
  'geeksforgeeks.org',
  'youtube.com',
  'drive.google.com',
  'ankiweb.net',
  'brilliant.org',
  'github.com',
  // Extension internal pages
  chrome.runtime.id
];

async function updateBlockingRules(isStudying: boolean) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(r => r.id);

  if (!isStudying) {
    // Clear rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });
    return;
  }

  // Set up block all rule except whitelist
  const blockRule = {
    id: 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        extensionPath: '/blocked.html'
      }
    },
    condition: {
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      excludedRequestDomains: WHITELIST_DOMAINS
    }
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: [blockRule]
  });
}

// Track escapes via webNavigation when redirect happens
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) {
    // If navigation is to blocked.html, it's an intercepted request
    if (details.url.includes(chrome.runtime.id) && details.url.includes('blocked.html')) {
      const data = await chrome.storage.local.get(['studying', 'escapeCount', 'subject', 'escapeLog']);
      if (data.studying) {
        const count = (data.escapeCount || 0) + 1;
        const log = data.escapeLog || [];
        log.push({ timestamp: Date.now(), subject: data.subject || 'Unknown' });
        
        await chrome.storage.local.set({ escapeCount: count, escapeLog: log });
      }
    }
  }
});

// Listen to studying state change from the web app
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.studying) {
    updateBlockingRules(changes.studying.newValue);
  }
});
