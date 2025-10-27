/**
 * McGrawHill Concepts Bot - Popup Script
 * ---------------------------------------
 * Handles popup UI logic for the Chrome extension.
 * Features:
 *  - Disclaimer only reappears when bot is OFF
 *  - Persistent ON/OFF state across popup openings
 *  - Session start time + live uptime tracker
 *  - Session & all-time stats updated in real-time
 */

document.addEventListener("DOMContentLoaded", async () => {
  // ---------- ELEMENT REFERENCES ----------
  const disclaimerScreen = document.getElementById("disclaimerScreen");
  const mainScreen = document.getElementById("mainScreen");
  const agreeCheckbox = document.getElementById("agreeCheckbox");
  const agreeBtn = document.getElementById("agreeBtn");
  const statusText = document.getElementById("statusText");

  const statAllTimeSolved = document.getElementById("statAllTimeSolved");
  const statAllTimeStored = document.getElementById("statAllTimeStored");
  const statSolved = document.getElementById("statSolved");
  const statStored = document.getElementById("statStored");

  // session info container
  const sessionInfoBox = document.createElement("div");
  sessionInfoBox.className = "session-info";
  const sessionStartElem = document.createElement("p");
  const sessionUptimeElem = document.createElement("p");
  sessionInfoBox.appendChild(sessionStartElem);
  sessionInfoBox.appendChild(sessionUptimeElem);

  const statsBox = document.getElementById("statsBox");
  statsBox.after(sessionInfoBox);

  let uptimeInterval = null;

  // ---------- HELPERS ----------
  const formatNumber = (num) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "k";
    return num.toString();
  };

  const updateStatsUI = (stats, allTime) => {
    statSolved.textContent = stats.solved;
    statStored.textContent = stats.stored;
    statAllTimeSolved.textContent = formatNumber(allTime.solved);
    statAllTimeStored.textContent = formatNumber(allTime.stored);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const startUptimeTimer = (startTime) => {
    clearInterval(uptimeInterval);
    const start = new Date(startTime);
    sessionStartElem.textContent = `Session started at: ${start.toLocaleTimeString()}`;
    const update = () => {
      const diff = Date.now() - start.getTime();
      sessionUptimeElem.textContent = `Uptime: ${formatTime(diff)}`;
    };
    update();
    uptimeInterval = setInterval(update, 1000);
  };

  const stopUptimeTimer = () => {
    clearInterval(uptimeInterval);
    sessionStartElem.textContent = "";
    sessionUptimeElem.textContent = "";
  };

  // ---------- LOAD STATE ----------
  chrome.storage.local.get(
    ["stats", "allTime", "botEnabled", "sessionStart"],
    (result) => {
      const stats = result.stats || { solved: 0, stored: 0 };
      const allTime = result.allTime || { solved: 0, stored: 0 };
      const botEnabled = result.botEnabled || false;
      const sessionStart = result.sessionStart || null;

      updateStatsUI(stats, allTime);

      // if bot currently ON → skip disclaimer
      if (botEnabled) {
        disclaimerScreen.style.display = "none";
        mainScreen.style.display = "flex";
        const toggle = document.getElementById("botToggle");
        toggle.checked = true;
        statusText.innerHTML = "Status: <b style='color:#64b5f6'>ON</b>";
        if (sessionStart) startUptimeTimer(sessionStart);
        attachToggleListener(toggle);
      }
    }
  );

  // ---------- DISCLAIMER ----------
  agreeCheckbox.addEventListener("change", () => {
    agreeBtn.disabled = !agreeCheckbox.checked;
  });

  agreeBtn.addEventListener("click", () => {
    disclaimerScreen.style.display = "none";
    mainScreen.style.display = "flex";
    const toggle = document.getElementById("botToggle");
    attachToggleListener(toggle);
  });

  // ---------- ATTACH TOGGLE LISTENER ----------
  function attachToggleListener(toggle) {
    if (!toggle) return;

    toggle.addEventListener("change", () => {
      const isOn = toggle.checked;
      const color = isOn ? "#64b5f6" : "#888";
      statusText.innerHTML = `Status: <b style="color:${color}">${
        isOn ? "ON" : "OFF"
      }</b>`;

      // persist ON/OFF
      chrome.storage.local.set({ botEnabled: isOn });

      if (isOn) {
        const sessionStart = Date.now();
        chrome.storage.local.set({ sessionStart });

        startUptimeTimer(sessionStart);

        chrome.storage.local.get(["allTime"], (res) => {
          const allTime = res.allTime || { solved: 0, stored: 0 };
          chrome.storage.local.set({
            stats: { solved: 0, stored: 0 },
            allTime,
          });
        });

        statSolved.textContent = "0";
        statStored.textContent = "0";
      } else {
        stopUptimeTimer();
        chrome.storage.local.remove("sessionStart");
      }

      // Send message to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length) return;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (isOn) => {
            window.postMessage(
              { type: isOn ? "START_SOLVER" : "STOP_SOLVER" },
              "*"
            );
          },
          args: [isOn],
        });
      });
    });
  }

  // ---------- LIVE STATS UPDATE ----------
  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(["stats", "allTime"], (res) => {
      const stats = res.stats || { solved: 0, stored: 0 };
      const allTime = res.allTime || { solved: 0, stored: 0 };
      updateStatsUI(stats, allTime);
    });
  });
});
