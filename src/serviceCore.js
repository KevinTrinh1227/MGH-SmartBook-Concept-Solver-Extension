// background.js
// ---------------------------------------------------------------------------
// This script runs persistently (as a service worker in Manifest V3).
// It listens for messages sent from other parts of the extension
// (e.g., content scripts, popup, etc.) and sends a response back.
//
// In this extension, it's primarily used to handle background communication
// — returning or forwarding data when requested.
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Background] Message received:", request);

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

  return true;
});
