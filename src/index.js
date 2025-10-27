/**
 * McGrawHill Concepts Bot - Popup Script
 * ---------------------------------------
 * Handles popup UI logic for the Chrome extension.
 * Features:
 *  - One-time disclaimer with full name + signature
 *  - Persistent ON/OFF state across popup openings
 *  - Session start time + live uptime tracker (inline)
 *  - Session & all-time stats updated in real-time
 */

document.addEventListener("DOMContentLoaded", async () => {
  // ---------- ELEMENT REFERENCES ----------
  const disclaimerScreen = document.getElementById("disclaimerScreen");
  const mainScreen = document.getElementById("mainScreen");
  const agreeCheckbox = document.getElementById("agreeCheckbox");
  const agreeBtn = document.getElementById("agreeBtn");
  const statusText = document.getElementById("statusText");
  const nameInput = document.getElementById("fullName");
  const infoIcon = document.getElementById("infoIcon");

  const statAllTimeSolved = document.getElementById("statAllTimeSolved");
  const statAllTimeStored = document.getElementById("statAllTimeStored");
  const statSolved = document.getElementById("statSolved");
  const statStored = document.getElementById("statStored");

  // ---------- CREATE INLINE SESSION INFO ----------
  const sessionInfoBox = document.createElement("div");
  sessionInfoBox.className = "session-info-inline";
  const sessionStartElem = document.createElement("span");
  const divider = document.createElement("span");
  const sessionUptimeElem = document.createElement("span");

  divider.style.margin = "0 6px";
  divider.style.opacity = "0.6";

  sessionInfoBox.appendChild(sessionStartElem);
  sessionInfoBox.appendChild(divider);
  sessionInfoBox.appendChild(sessionUptimeElem);

  infoIcon.removeAttribute("title");

  const statusBox = document.getElementById("statusBox");
  statusBox.after(sessionInfoBox);

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

    const update = () => {
      const diff = Date.now() - start.getTime();
      sessionStartElem.textContent = `Start Time: ${start.toLocaleTimeString()}`;
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
    [
      "stats",
      "allTime",
      "botEnabled",
      "sessionStart",
      "userAcceptedDisclaimer",
    ],
    (result) => {
      const stats = result.stats || { solved: 0, stored: 0 };
      const allTime = result.allTime || { solved: 0, stored: 0 };
      const botEnabled = result.botEnabled || false;
      const sessionStart = result.sessionStart || null;
      const accepted = result.userAcceptedDisclaimer || null;

      updateStatsUI(stats, allTime);

      // if disclaimer was already signed → skip permanently
      if (accepted && accepted.name) {
        disclaimerScreen.style.display = "none";
        mainScreen.style.display = "flex";
        const toggle = document.getElementById("botToggle");
        attachToggleListener(toggle);

        const { name: aName, agreed: aAgreed, timestamp: aTs } = accepted;
        infoIcon.setAttribute(
          "data-tooltip",
          `Signed User: ${aName}\nAgreed to TOS: ${
            aAgreed ? "True" : "False"
          }\nSigned: ${new Date(aTs).toLocaleString()}`
        );
      }

      // if bot currently ON → restore
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

  // ---------- DISCLAIMER HANDLING ----------
  function validateDisclaimerInputs() {
    const nameFilled = nameInput.value.trim().length > 1;
    const checked = agreeCheckbox.checked;
    agreeBtn.disabled = !(nameFilled && checked);
  }

  nameInput.addEventListener("input", validateDisclaimerInputs);
  agreeCheckbox.addEventListener("change", validateDisclaimerInputs);

  agreeBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const agreed = agreeCheckbox.checked;
    if (!name || !agreed) return;

    const timestamp = new Date().toISOString();

    // Save one-time consent
    chrome.storage.local.set({
      userAcceptedDisclaimer: { name, agreed, timestamp },
    });

    // Tooltip setup immediately
    infoIcon.setAttribute(
      "data-tooltip",
      `User: ${name}\nAgreed to TOS: ${
        agreed ? "True" : "False"
      }\nSigned: ${new Date(timestamp).toLocaleString()}`
    );

    // Hide disclaimer permanently
    disclaimerScreen.style.display = "none";
    mainScreen.style.display = "flex";

    const toggle = document.getElementById("botToggle");
    attachToggleListener(toggle);
  });

  // ---------- TOGGLE HANDLER ----------
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
