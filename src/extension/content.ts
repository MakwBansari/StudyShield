window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_PAGE") return;

  if (event.data.action === "SET_STUDYING") {
    const p = event.data.payload;
    if (p.isStudying) {
      chrome.storage.local.set({ 
        studying: true, 
        subject: p.subject, 
        startTime: p.startTime, 
        escapeCount: 0,
        whitelist: p.whitelist || [],
        blacklist: p.blacklist || []
      });
    } else {
      chrome.storage.local.set({ studying: false });
    }
  } else if (event.data.action === "UPDATE_TOTAL_TIME") {
    chrome.storage.local.get(["todayTotalMinutes"], (res) => {
      chrome.storage.local.set({ todayTotalMinutes: (res.todayTotalMinutes || 0) + event.data.payload.minutes });
    });
  } else if (event.data.action === "GET_ESCAPES") {
    chrome.storage.local.get(["escapeLog"], (res) => {
      window.postMessage({ type: "FROM_EXTENSION", action: "ESCAPES_DATA", payload: res.escapeLog || [] }, "*");
    });
  } else if (event.data.action === "GET_TOTAL_TIME") {
    chrome.storage.local.get(["todayTotalMinutes"], (res) => {
      window.postMessage({ type: "FROM_EXTENSION", action: "TOTAL_TIME_DATA", payload: res.todayTotalMinutes || 0 }, "*");
    });
  }
});
