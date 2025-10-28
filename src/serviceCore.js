// serviceCore.js
// ---------------------------------------------------------------------------
// Persistent service worker for the McGrawHill SmartBook Concept Solver.
// Handles background communication, safe message passing, auto-reinjection,
// and secure external API relay to bypass CORS/content-script restrictions.
// ---------------------------------------------------------------------------

// -------------------- 1. Auto Reinjection --------------------
chrome.runtime.onInstalled.addListener(() => {
  console.log(
    "[Background] Extension installed/updated → reinjecting scripts..."
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
        console.log(
          "[Background] No McGraw-Hill tabs open — skipping reinjection."
        );
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

// -------------------- 2. Background Message Handling --------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // --- A) Generic relay (you already had this) ---
    if (request.type === "FETCH_API") {
      (async () => {
        try {
          const r = await fetch(request.url, {
            method: request.method || "POST",
            headers: { "Content-Type": "application/json" },
            body: request.body ? JSON.stringify(request.body) : undefined,
          });
          const data = await r.json().catch(() => ({}));
          sendResponse({ ok: r.ok, status: r.status, data });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }

    // --- B) Convenience endpoints for content script ---
    if (request.type === "STORE_QUESTION") {
      (async () => {
        try {
          const r = await fetch(
            "https://k59op4dxx4.execute-api.us-west-1.amazonaws.com/questions/store-question",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: request.question,
                answer: request.answers,
              }),
            }
          );
          const data = await r.json().catch(() => ({}));
          sendResponse({ ok: r.ok, data });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }

    if (request.type === "GET_ANSWER") {
      (async () => {
        try {
          const r = await fetch(
            "https://k59op4dxx4.execute-api.us-west-1.amazonaws.com/questions/get-answer",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: request.question }),
            }
          );
          if (!r.ok || r.status === 204)
            return sendResponse({ ok: false, data: null });
          const data = await r.json().catch(() => null);
          sendResponse({ ok: true, data });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }

    // default
    sendResponse({ success: false, error: "Unknown message type" });
  } catch (err) {
    sendResponse({ success: false, error: err?.message || String(err) });
  }
  return true;
});

// -------------------- 3. Optional Safety Watchdog --------------------
chrome.runtime.onSuspend?.addListener(() => {
  console.log(
    "[Background] Service worker suspended (Chrome reloading or sleeping)."
  );
});

// -------------------- 4. Heartbeat Logging (Dev Only) --------------------
// Uncomment if you want to verify the service worker stays alive.
// setInterval(() => console.log("[Background] heartbeat OK"), 60000);
