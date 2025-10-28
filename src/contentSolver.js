// contentSolver.js (MV3-safe)
// ------------------------------------------------------------------
let botEnabled = false;
let responseMap = {};
let runToken = 0; // invalidates any in-flight loop immediately

// ---------- helpers: extension & storage guards ----------
function extAlive() {
  return !!(globalThis.chrome && chrome.runtime && chrome.runtime.id);
}

function storageGet(keys) {
  return new Promise((resolve) => {
    if (!extAlive() || !chrome.storage?.local) return resolve({});
    try {
      chrome.storage.local.get(keys, (res) => {
        if (chrome.runtime.lastError) return resolve({});
        resolve(res || {});
      });
    } catch {
      resolve({});
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    if (!extAlive() || !chrome.storage?.local) return resolve(false);
    try {
      chrome.storage.local.set(obj, () => {
        if (chrome.runtime.lastError) return resolve(false);
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeQuery(sel) {
  try {
    return document.querySelector(sel);
  } catch {
    return null;
  }
}

// ---------- bootstrap local cache ----------
(async () => {
  const { responseMap: saved } = await storageGet(["responseMap"]);
  responseMap = saved || {};
})();

// ---------- stats ----------
async function incrementStat(key) {
  try {
    if (!extAlive()) return;
    const {
      stats = { solved: 0, attempted: 0 },
      allTime = { solved: 0, attempted: 0 },
    } = await storageGet(["stats", "allTime"]);
    stats[key] = (stats[key] || 0) + 1;
    allTime[key] = (allTime[key] || 0) + 1;
    await storageSet({ stats, allTime });
  } catch {}
}

// ---------- map data & API ----------
async function updateMapData(question, answers, alsoStoreToAPI) {
  try {
    if (!question || !answers) return;
    if (responseMap && question in responseMap) return;

    // write locally first
    const { responseMap: existing = {} } = await storageGet(["responseMap"]);
    existing[question] = answers;
    responseMap = existing;
    await storageSet({ responseMap: existing });

    // send to API via background (CORS-safe)
    if (alsoStoreToAPI && extAlive()) {
      try {
        await chrome.runtime.sendMessage({
          type: "STORE_QUESTION",
          question,
          answers,
        });
      } catch {}
    }
  } catch {}
}

async function getAnswerFromAPI(question) {
  try {
    if (!extAlive()) return null;
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve(null), 2500)
    );
    const api = chrome.runtime.sendMessage({ type: "GET_ANSWER", question });
    const res = await Promise.race([timeout, api]);
    if (!res || !res.ok || !res.data) return null;
    const answer = res.data?.answer ?? null;
    if (answer) await updateMapData(question, answer, false);
    return answer;
  } catch {
    return null;
  }
}

// ---------- reading utilities ----------
function readQuestionAndResponses() {
  let question = "";
  let responses = [];

  const promptEls = document.getElementsByClassName("prompt");
  if (!promptEls || promptEls.length === 0) {
    return { question: "", responses: [], responseElements: [] };
  }

  const p = promptEls[0]?.querySelector("p");
  if (!p) return { question: "", responses: [], responseElements: [] };

  const textNodes = [...p.childNodes].filter(
    (n) => n.nodeType === Node.TEXT_NODE
  );
  question = textNodes.map((n) => n.textContent).join("_____");

  const container = document.getElementsByClassName("air-item-container")[0];
  let responseElements = container
    ? container.getElementsByClassName("choiceText rs_preserve")
    : [];
  if (responseElements.length) {
    for (let i = 0; i < responseElements.length; i++) {
      responses.push(responseElements[i].textContent);
    }
  }

  return { question, responses, responseElements };
}

// ---------- core solver ----------
async function selectCorrectResponse(
  question,
  responses,
  responseElements,
  token
) {
  await sleep(100);
  if (!botEnabled || token !== runToken) return;

  // Next/Review screen handling
  const nextContainer = document.querySelector(".next-button-container");
  if (nextContainer) {
    const nextButton = nextContainer.querySelector("button");
    const reviewButton = document.querySelector(
      ".btn.btn-tertiary.lr-tray-button"
    );

    if (nextButton?.hasAttribute("disabled")) {
      reviewButton?.click();
      await sleep(1000);
      if (!botEnabled || token !== runToken) return;
      const continueButton = document.querySelector(
        ".button-bar-wrapper button"
      );
      continueButton?.click();
      await sleep(1000);
    }

    nextButton?.click();
    await sleep(1000);
    if (!botEnabled || token !== runToken) return;

    const toQuestionsButton = safeQuery(
      'button[data-automation-id="reading-questions-button"]'
    );
    if (toQuestionsButton) {
      toQuestionsButton.click();
      await sleep(1500);
    }
    return;
  }

  // Confidence button presence
  const confidenceContainer = document.querySelector(
    ".confidence-buttons-container"
  );
  const answerButton = confidenceContainer?.querySelector("button");
  if (!answerButton) return;

  // Try to load answer
  if (!responseMap[question]) await getAnswerFromAPI(question);

  if (responseMap[question]) {
    const correct = responseMap[question];

    if (responseElements.length === 0) {
      // fill in the blank
      const blanks = document.querySelectorAll(
        ".input-container span-to-div input"
      );
      blanks.forEach((input, idx) => {
        input.focus();
        document.execCommand(
          "insertText",
          false,
          (correct[idx] || "").toString()
        );
      });
    } else {
      // multiple choice
      let clicked = false;
      responses.forEach((res, i) => {
        if (Array.isArray(correct) ? correct.includes(res) : correct === res) {
          responseElements[i]?.click();
          clicked = true;
        }
      });
      if (!clicked && responseElements.length > 0) responseElements[0].click();
    }

    await sleep(400 + Math.random() * 300);
    if (!botEnabled || token !== runToken) return;
    answerButton.click();
  } else {
    // guess, then learn from feedback
    let isFillInBlank = false;
    let isDragDrop = false;

    if (!responseElements[0]) {
      if (document.querySelector(".match-single-response-wrapper")) {
        isDragDrop = true;
        return; // skip drag/drop for now
      } else {
        isFillInBlank = true;
        const blanks = document.querySelectorAll(
          ".input-container span-to-div input"
        );
        blanks.forEach((input) => {
          input.focus();
          document.execCommand("insertText", false, "Guess-Answer");
        });
      }
    } else {
      responseElements[0].click();
    }

    await sleep(400 + Math.random() * 300);
    if (!botEnabled || token !== runToken) return;
    safeQuery("button.btn-confidence")?.removeAttribute("disabled");
    answerButton.click();

    await sleep(600 + Math.random() * 300);
    if (!botEnabled || token !== runToken) return;

    const answers = [];
    if (isFillInBlank) {
      const correctEls = document.querySelectorAll(
        ".correct-answers .correct-answer"
      );
      correctEls.forEach((el) => {
        const text = el.textContent?.replace(/,/g, "").split(" ")[0];
        if (text) answers.push(text);
      });
    } else if (!isDragDrop) {
      const answerEls =
        document.querySelectorAll(
          ".answer-container .choiceText.rs_preserve"
        ) || document.querySelectorAll(".answer-container");
      answerEls.forEach((el) => answers.push(el.textContent));
    }

    await updateMapData(question, answers, true);
    await incrementStat("attempted");
  }

  await incrementStat("solved");
  await sleep(400 + Math.random() * 300);
  if (!botEnabled || token !== runToken) return;

  const nextBtn = document.querySelector(".next-button-container button");
  const reviewBtn = document.querySelector(".btn.btn-tertiary.lr-tray-button");
  if (nextBtn?.hasAttribute("disabled")) {
    reviewBtn?.click();
    await sleep(1000);
    if (!botEnabled || token !== runToken) return;
    const continueBtn = document.querySelector(".button-bar-wrapper button");
    continueBtn?.click();
  }

  await sleep(500);
  if (!botEnabled || token !== runToken) return;
  nextBtn?.click();
}

async function answerQuestion(token) {
  const { question, responses, responseElements } = readQuestionAndResponses();
  if (!question) return;
  await selectCorrectResponse(question, responses, responseElements, token);
}

// ---------- start/stop ----------
let answering = false;

async function activateBot() {
  if (botEnabled) return;
  botEnabled = true;
  const token = ++runToken;

  await sleep(300);

  let errorCount = 0;
  while (botEnabled && token === runToken) {
    if (answering) {
      await sleep(100);
      continue;
    }
    answering = true;
    try {
      const isReadingPage =
        !document.querySelector(".prompt") &&
        !!document.querySelector(
          'button[data-automation-id="reading-questions-button"]'
        );

      if (isReadingPage) {
        safeQuery(
          'button[data-automation-id="reading-questions-button"]'
        )?.click();
        await sleep(1000);
      } else {
        await answerQuestion(token);
      }
      errorCount = 0;
    } catch (e) {
      if (++errorCount > 5) {
        deactivateBot();
        break;
      }
    } finally {
      answering = false;
    }
    await sleep(400 + Math.random() * 100);
  }
}

function deactivateBot() {
  botEnabled = false;
  runToken++; // cancels any pending awaits instantly
  answering = false;
  console.log("Bot deactivated.");
}

// ---------- popup messages ----------
window.addEventListener("message", (event) => {
  if (!event?.data) return;
  if (event.data.type === "START_SOLVER") activateBot();
  if (event.data.type === "STOP_SOLVER") deactivateBot();
});

// (optional) legacy runtime messages from older popup code
chrome.runtime.onMessage.addListener((msg) => {
  if (msg === "activate") activateBot();
  if (msg === "deactivate") deactivateBot();
});
