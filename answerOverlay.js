// highlighter.js
// ------------------------------------------------------------
// This script scans McGrawHill SmartBook pages, saves answers
// locally, and highlights previously stored correct responses.
//
// It runs continuously to check if new questions or answers appear,
// storing them into Chrome storage for reuse.
// ------------------------------------------------------------

let storedAnswers = {}; // In-memory cache of all known Q&A pairs

// 🧠 Check if a question already exists in memory
const questionExists = (questionText) =>
  Object.hasOwn(storedAnswers, questionText);

// 💾 Save answers to Chrome local storage and update memory
const saveAnswers = (questionText, answersArray) => {
  if (questionExists(questionText)) return; // Skip duplicates

  chrome.storage.local.get(["responseMap"], (data) => {
    const currentMap = data.responseMap || {};
    currentMap[questionText] = answersArray;

    chrome.storage.local.set({ responseMap: currentMap }, () => {
      console.log("[Highlighter] Stored answers:", currentMap);
      storedAnswers = currentMap;
    });
  });
};

// ✨ Visually highlight correct answers on the page
const paintAnswers = (questionText) => {
  const correct = storedAnswers[questionText];
  if (!correct) return;

  insertDisplayText(correct);

  const container = document.querySelector(".air-item-container");
  if (!container) return;

  const options = container.querySelectorAll(".choice-row");
  options.forEach((opt) => {
    const text = opt.textContent.trim();
    if (correct.includes(text) && opt.style.backgroundColor !== "lightgreen") {
      opt.style.backgroundColor = "#c8f7c5";
      opt.style.border = "1px solid #000";
      opt.style.borderRadius = "10px";
    }
  });
};

// 📝 Display an answer box below the question area
const insertDisplayText = (answers) => {
  if (document.getElementById("solver-note")) return; // Prevent duplicates

  console.log("[Highlighter] Displaying:", answers);

  const wrapper = document.createElement("div");
  wrapper.id = "solver-note";
  wrapper.style.cssText = `
    border: 2px solid black;
    border-radius: 10px;
    color: black;
    text-align: left;
    margin-top: 1rem;
    padding: 0.5rem;
    background: #fefefe;
  `;

  wrapper.innerHTML = `
    <p style="font-weight:bold;">Answer:</p>
    <div>${answers.map((a) => `<p>${a}</p>`).join("")}</div>
  `;

  const container =
    document.querySelector(".responses-container") ||
    document.querySelector(".dlc_question");

  if (!container) {
    console.warn("[Highlighter] No valid container found for answer box.");
    return;
  }

  container.appendChild(wrapper);
};

// 🔍 Main function to find and process questions/answers
const highlightLoop = () => {
  const prompt = document.querySelector(".prompt p");
  if (!prompt) return;

  // Extract only text (no <span> nodes)
  const textNodes = Array.from(prompt.childNodes).filter(
    (n) => n.nodeType === Node.TEXT_NODE
  );
  const questionText = textNodes.map((n) => n.textContent.trim()).join("_____");

  // If already answered, just highlight it
  if (
    questionExists(questionText) &&
    !document.querySelector(".answer-container")
  ) {
    paintAnswers(questionText);
    return;
  }

  // Try to find answers and save them
  const answerContainer = document.querySelector(".answer-container");
  if (!answerContainer) {
    // For drag/drop or temporary states
    const correctEls = document.querySelectorAll(
      ".correct-answers .correct-answer"
    );
    if (correctEls.length > 0) {
      const collected = Array.from(correctEls).map(
        (el) => el.textContent.replace(/,/g, "").split(" ")[0]
      );
      saveAnswers(questionText, collected);
      return;
    }

    insertDisplayText([
      "This tool is still learning and may fetch correct answers automatically.",
      "You can view stored answers later from the popup flashcard tab.",
      "Remember: for educational and testing use only.",
    ]);
    return;
  }

  // Extract answer choices from the answer container
  let choiceElements = answerContainer.querySelectorAll(
    ".choiceText.rs_preserve"
  );
  if (choiceElements.length === 0)
    choiceElements = answerContainer.querySelectorAll(".answer-container");

  const answerTexts = Array.from(choiceElements).map((el) =>
    el.textContent.trim()
  );
  saveAnswers(questionText, answerTexts);
};

setInterval(highlightLoop, 500);
