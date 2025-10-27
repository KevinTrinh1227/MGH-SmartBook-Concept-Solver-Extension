// serviceCore.js
// ---------------------------------------------------------------------------
// Persistent service worker for the McGrawHill SmartBook Concept Solver.
// Handles background communication, message passing, and auto-reinjection
// of content scripts when the extension or browser restarts.
// ---------------------------------------------------------------------------

// -------------------- 1. Auto Reinjection --------------------
chrome.runtime.onInstalled.addListener(() => {
  console.log(
    "[Background] Extension installed or updated → reinjecting scripts..."
  );
  reinjectScripts();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[Background] Browser started → reinjecting scripts...");
  reinjectScripts();
});

function reinjectScripts() {
  try {
    chrome.tabs.query({ url: "*://learning.mheducation.com/*" }, (tabs) => {
      if (!tabs.length) {
        console.log("[Background] No matching tabs open — skipping reinject.");
        return;
      }

      for (const tab of tabs) {
        try {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["contentSolver.js", "answerOverlay.js"],
          });
          console.log(`[Background] Scripts reinjected into tab ${tab.id}`);
        } catch (err) {
          console.warn(
            `[Background] Reinjection failed for tab ${tab.id}:`,
            err
          );
        }
      }
    });
  } catch (err) {
    console.error("[Background] reinjectScripts() top-level error:", err);
  }
}

// -------------------- 2. Safe Message Handling --------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log("[Background] Message received:", request);

    // Simple echo-back handler for extension-wide communication
    if (request?.data) {
      sendResponse({
        success: true,
        data: request.data,
        source: "background.js",
      });
    } else {
      sendResponse({
        success: false,
        error: "No data field found in request.",
      });
    }
  } catch (err) {
    console.error("[Background] onMessage error:", err);
    sendResponse({ success: false, error: err.message });
  }

  // Keep the channel open for async responses (future-proof)
  return true;
});

// -------------------- 3. Optional Safety Watchdog --------------------
// Detect context invalidation (useful during dev reloads)
chrome.runtime.onSuspend?.addListener(() => {
  console.log(
    "[Background] Service worker suspended (Chrome reloading or sleeping)."
  );
});

// -------------------- 4. Heartbeat Logging (debug mode only) --------------------
// Uncomment if you ever need to verify persistent background operation.
// setInterval(() => console.log("[Background] heartbeat OK"), 60000);
