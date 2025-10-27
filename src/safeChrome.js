// src/safeChrome.js
export const safeChrome = {
  sendMessage: (msg, cb) => {
    if (!chrome?.runtime?.id) return; // extension reloaded
    try {
      chrome.runtime.sendMessage(msg, cb);
    } catch (err) {
      if (!err.message.includes("Extension context invalidated")) {
        console.error("[safeChrome.sendMessage]", err);
      }
    }
  },

  setStorage: (data) => {
    if (!chrome?.storage?.local) return;
    try {
      chrome.storage.local.set(data);
    } catch (err) {
      console.error("[safeChrome.setStorage]", err);
    }
  },

  getStorage: (keys, cb) => {
    if (!chrome?.storage?.local) {
      cb({});
      return;
    }
    try {
      chrome.storage.local.get(keys, cb);
    } catch (err) {
      console.error("[safeChrome.getStorage]", err);
      cb({});
    }
  },
};
