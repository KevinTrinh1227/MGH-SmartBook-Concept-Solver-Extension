let botEnabled = null;
let responseMap = {};

let API_ENDPOINT =
  "https://k59op4dxx4.execute-api.us-west-1" +
  ".amazonaws.com" +
  "/" +
  "questions";

window.botEnabled = botEnabled;

window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "START_SOLVER") {
    console.log("Solver activated from popup");
    activateBot();
  }
  if (event.data.type === "STOP_SOLVER") {
    console.log("Solver deactivated from popup");
    deactivateBot();
  }
});

async function incrementStat(statKey) {
  try {
    if (!chrome?.storage?.local) {
      console.warn("incrementStat: chrome.storage.local not available.");
      return;
    }

    chrome.storage.local.get(["stats", "allTime"], (data) => {
      try {
        const stats = data?.stats || { solved: 0, stored: 0 };
        const allTime = data?.allTime || { solved: 0, stored: 0 };

        stats[statKey] = (stats[statKey] || 0) + 1;
        allTime[statKey] = (allTime[statKey] || 0) + 1;

        chrome.storage.local.set({ stats, allTime }, () => {
          console.log(`incrementStat: updated "${statKey}" successfully.`);
        });
      } catch (err) {
        console.error("incrementStat: failed to update storage:", err);
      }
    });
  } catch (err) {
    console.error("incrementStat: unexpected error:", err);
  }
}

function safeQuery(selector) {
  try {
    return document.querySelector(selector);
  } catch (e) {
    console.warn("safeQuery failed:", selector, e);
    return null;
  }
}

function updateMapData(question, answers, storeAPI) {
  return new Promise((resolve) => {
    try {
      // Validate input
      if (!question || !answers) {
        console.warn("updateMapData: Missing question or answers");
        return resolve();
      }

      // Skip if question already stored
      if (responseMap && question in responseMap) {
        return resolve();
      }

      // Optionally send to API
      if (storeAPI) {
        try {
          storeQuestionToAPI(question, answers);
        } catch (apiErr) {
          console.error("updateMapData → storeQuestionToAPI error:", apiErr);
        }
      }

      // Check if chrome.storage is available
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.local
      ) {
        console.warn("updateMapData: chrome.storage.local not available.");
        return resolve();
      }

      // Safely get and update the response map
      chrome.storage.local.get("responseMap", (result) => {
        try {
          const tempResponseMap = result?.responseMap || {};
          tempResponseMap[question] = answers;

          chrome.storage.local.set({ responseMap: tempResponseMap }, () => {
            responseMap = tempResponseMap; // Update the cached copy
            console.log("updateMapData: Updated responseMap successfully.");
            resolve();
          });
        } catch (storageErr) {
          console.error("updateMapData: Error writing to storage:", storageErr);
          resolve();
        }
      });
    } catch (err) {
      console.error("updateMapData: Unexpected error:", err);
      resolve();
    }
  });
}

// given the question and answers, store it
async function storeQuestionToAPI(question, answers) {
  console.log("Storing question", question, "to API");
  try {
    // Create fetch options
    const fetchOptions = {
      method: "POST",
      body: JSON.stringify({
        question: question,
        answer: answers,
      }),
    };

    // Make request
    const response = await fetch(
      API_ENDPOINT + "/store-question",
      fetchOptions
    );
    const jsonResponse = await response.json().catch(() => ({}));
    console.log("STORING RESPONSE:", jsonResponse);

    if (!response.ok) {
      console.log("Error storing during fetch");
      return null;
    }
  } catch (error) {
    console.error("storeQuestionToAPI error:", error);
  }
}

// given a question, it will attempt to get the answer from the API. if the answer is stored, it will return the answer text.
// will return null if there is any sort of error, or if it times out ()
async function getAnswerFromAPI(question) {
  try {
    // Promise that resolves after 2 seconds
    const timeout = new Promise((resolve) => setTimeout(resolve, 2500, null));

    // API call Promise
    const apiCall = fetch(API_ENDPOINT + "/get-answer", {
      method: "POST",
      body: JSON.stringify({
        question: question,
      }),
    }).then(async (response) => {
      if (!response.ok || response.status === 204) {
        console.log("Could not retrieve answer: " + response.status);
        return null;
      }
      // Check if the response has a body
      const responseBody = await response.text();
      if (!responseBody) {
        console.log("Response body is empty.");
        return null;
      }
      return JSON.parse(responseBody);
    });

    // Returns the promise that resolves first
    const result = await Promise.race([timeout, apiCall]);

    if (result === null) {
      console.log(
        "Fetching the answer from the API timed out or returned null."
      );
      return;
    }
    const answer = result?.answer || null;
    await updateMapData(question, answer, false);
    return;
  } catch (error) {
    console.log("Failed to fetch from API:", error);
    return;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// drag and drop section
async function simulateDragAndDrop(source, target) {
  const rect1 = source.getBoundingClientRect();
  const rect2 = target.getBoundingClientRect();

  const mousedown = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect1.left + rect1.width / 2,
    clientY: rect1.top + rect1.height / 2,
  });

  const mouseup = new MouseEvent("mouseup", {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect2.left + rect2.width / 2,
    clientY: rect2.top + rect2.height / 2,
  });

  source.dispatchEvent(mousedown);
  await sleep(800);

  for (let i = 1; i <= 50; i++) {
    const intermediateX =
      rect1.left + (rect2.left - rect1.left) * (i / 50) + rect1.width / 2;
    const intermediateY =
      rect1.top + (rect2.top - rect1.top) * (i / 50) + rect1.height / 2;

    const mousemove = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: intermediateX,
      clientY: intermediateY,
    });

    source.dispatchEvent(mousemove);
    await sleep(10);
  }
  const finalMouseMove = new MouseEvent("mousemove", {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect2.left + rect2.width / 2,
    clientY: rect2.top + rect2.height / 2,
  });
  source.dispatchEvent(finalMouseMove);
  await sleep(500);
  target.dispatchEvent(mouseup);
  await sleep(200);
}

// begin solver.js

function readQuestionAndResponses() {
  let question = "";
  let responses = [];

  // Find the question
  let questionElement = document.getElementsByClassName("prompt");

  // ✅ Safely handle missing prompt or question
  if (!questionElement || questionElement.length === 0) {
    console.warn(
      "readQuestionAndResponses: No question element found — likely on reading page."
    );
    return { question: "", responses: [], responseElements: [] };
  }

  const paragraphElement = questionElement[0]?.querySelector("p");
  if (!paragraphElement) {
    console.warn(
      "readQuestionAndResponses: No <p> tag inside prompt — skipping."
    );
    return { question: "", responses: [], responseElements: [] };
  }

  const textNodes = [...paragraphElement.childNodes].filter(
    (node) => node.nodeType === Node.TEXT_NODE
  );
  question = textNodes.map((node) => node.textContent).join("_____");

  // Find the potential responses
  let responseElements = document
    .getElementsByClassName("air-item-container")[0]
    .getElementsByClassName("choiceText rs_preserve");
  if (responseElements.length) {
    for (let i = 0; i < responseElements.length; i++) {
      responses.push(responseElements[i].textContent);
    }
  }

  return { question, responses, responseElements };
}

async function selectCorrectResponse(question, responses, responseElements) {
  await sleep(100);
  let checkIfNextButton = document.getElementsByClassName(
    "next-button-container"
  )[0];
  if (checkIfNextButton != null) {
    // Handle the standard next/review flow
    const nextContainer = document.getElementsByClassName(
      "next-button-container"
    )[0];
    const nextButtonCheck = nextContainer
      ? nextContainer.getElementsByTagName("button")[0]
      : null;

    if (nextButtonCheck && nextButtonCheck.hasAttribute("disabled")) {
      reviewConceptButtonCheck?.click();
      await sleep(1000);
      let continueButton = document
        .getElementsByClassName("button-bar-wrapper")[0]
        ?.getElementsByTagName("button")[0];
      continueButton?.click();
    }

    await sleep(1000);
    nextButtonCheck?.click();

    // --- New logic: detect if on reading/concept page ---
    // Basically if were on reading concept page.... we click back to questions button to continue solving....
    await sleep(1000);
    const toQuestionsButton = safeQuery(
      'button[data-automation-id="reading-questions-button"]'
    );
    if (toQuestionsButton) {
      console.log("Detected reading page — clicking 'To Questions'...");
      await sleep(1000);
      toQuestionsButton.click();
      await sleep(3000);
    } else {
      console.log(
        "Reading page detected, but 'To Questions' button not found — skipping."
      );
    }

    if (toQuestionsButton) {
      console.log("Detected reading page — clicking 'To Questions'...");
      await sleep(1000);
      if (toQuestionsButton) {
        toQuestionsButton.click();
      }

      await sleep(3000); // give time for next question to load
    }

    return;
  }

  let answerButton = document
    .getElementsByClassName("confidence-buttons-container")[0]
    .getElementsByTagName("button")[0];

  // if answer not stored, try to fetch from api
  if (!responseMap[question]) {
    await getAnswerFromAPI(question);
  } else {
    console.log("Already stored locally");
  }

  // if answer is already stored
  if (responseMap[question]) {
    let correctResponse = responseMap[question];
    console.log("Answer found:", correctResponse);
    // if fill in the blank
    if (responseElements.length == 0) {
      let blanks = document.getElementsByClassName(
        "input-container span-to-div"
      );
      for (let x = 0; x < blanks.length; x++) {
        let inputTag = blanks[x].getElementsByTagName("input")[0];
        inputTag.focus();
        document.execCommand("insertText", false, correctResponse[x]);
      }
    }

    // if multiple choice
    let clicked = false;
    for (let i = 0; i < responses.length; i++) {
      if (correctResponse.includes(responses[i])) {
        responseElements[i].click();
        clicked = true;
      }
      if (!clicked) {
        responseElements[0].click();
      }
    }
    await sleep(Math.random() * 200 + 500);
    answerButton.click();

    // answer is not already stored -> guess
  } else {
    let isFillInBlankQuestion = false;
    let isDragAndDrop = false;

    // is fill in the blank question or drag and drop
    if (responseElements[0] == null) {
      // if drag and drop, end
      if (
        document.getElementsByClassName("match-single-response-wrapper")[0] !=
        null
      ) {
        //TODO: implement drag and drop
        isDragAndDrop = true;
        // console.log("Trying to solve drag and drop question")
        await sleep(500);
        let choices = document.querySelectorAll(
          ".choices-container .choice-item-wrapper .content p"
        );
        let drop = document.querySelectorAll(
          ".-placeholder.choice-item-wrapper"
        );
        let numDrops = 0;
        while (drop.length > 0) {
          console.log("Executing drag and drop: ", numDrops);
          await simulateDragAndDrop(choices[0], drop[0]);
          await sleep(1000);
          choices = document.querySelectorAll(
            ".choices-container .choice-item-wrapper .content p"
          );
          drop = document.querySelectorAll(".-placeholder.choice-item-wrapper");
          await sleep(2000);
          numDrops += 1;
          if (numDrops > 6) {
            console.log("Giving up drag and drop");
            return;
          }
        }
      } else {
        isFillInBlankQuestion = true;
        let blanks = document.getElementsByClassName(
          "input-container span-to-div"
        );
        for (let x = 0; x < blanks.length; x++) {
          let inputTag = blanks[x].getElementsByTagName("input")[0];
          inputTag.focus();
          document.execCommand("insertText", false, "Guess-Answer");
        }
      }
    } else {
      responseElements[0].click();
    }

    // submit answer
    await sleep(Math.random() * 200 + 500);
    safeQuery("button.btn-confidence").removeAttribute("disabled");
    answerButton.click();

    await sleep(Math.random() * 100 + 800);
    // store the correct answer into the responseMap
    let answers = [];
    if (isFillInBlankQuestion) {
      let answerElements = document.getElementsByClassName("correct-answers");

      for (let x = 0; x < answerElements.length; x++) {
        const correctEl =
          answerElements[x].getElementsByClassName("correct-answer")[0];
        if (correctEl && correctEl.textContent) {
          answers.push(correctEl.textContent.replace(/,/g, "").split(" ")[0]);
        } else {
          console.warn("No correct-answer element found for index", x);
        }
      }

      // not fill in the blank question
    } else {
      if (isDragAndDrop) {
        //TODO: store answers for drag and drop.
        return;
      }
      let answerElements = document
        .getElementsByClassName("answer-container")[0]
        .getElementsByClassName("choiceText rs_preserve");
      // if true/false
      if (answerElements.length == 0) {
        answerElements = document.getElementsByClassName("answer-container");
      }
      for (let i = 0; i < answerElements.length; i++) {
        answers.push(answerElements[i].textContent);
      }
    }
    // responseMap[question] = answers;
    updateMapData(question, answers, true);
    await incrementStat("stored");
  }

  // move on to next question
  await incrementStat("solved");
  await sleep(Math.random() * 200 + 600);
  let nextButton = document
    .getElementsByClassName("next-button-container")[0]
    .getElementsByTagName("button")[0];
  let reviewConceptButton = document.getElementsByClassName(
    "btn btn-tertiary lr-tray-button"
  )[0];
  if (nextButton.hasAttribute("disabled")) {
    reviewConceptButton.click();
    await sleep(1000);
    let continueButton = document
      .getElementsByClassName("button-bar-wrapper")[0]
      .getElementsByTagName("button")[0];
    continueButton.click();
  }
  await sleep(500);
  nextButton.click();
}

// Main function that reads the question and responses and selects the correct response
async function answerQuestion() {
  let { question, responses, responseElements } = readQuestionAndResponses();
  await selectCorrectResponse(question, responses, responseElements);
}

let answerQuestionRunning = false;
async function activateBot() {
  console.log("S: Activating Bot");

  if (botEnabled === null) {
    botEnabled = true;

    await sleep(1000); // slight delay to stabilize DOM before starting
    let errorCount = 0; // track consecutive errors to avoid infinite loops

    while (botEnabled) {
      if (!answerQuestionRunning) {
        answerQuestionRunning = true;

        try {
          // detect if we're on a reading page instead of a question
          const isReadingPage =
            !document.querySelector(".prompt") &&
            !!document.querySelector(
              'button[data-automation-id="reading-questions-button"]'
            );

          if (isReadingPage) {
            console.log(
              "Detected reading page — pausing solver until back on questions."
            );

            const toQuestionsButton = safeQuery(
              'button[data-automation-id="reading-questions-button"]'
            );

            if (toQuestionsButton) {
              console.log("Clicking 'To Questions' button...");
              toQuestionsButton.click();
              await sleep(2000); // allow page to load
            } else {
              console.warn("No 'To Questions' button found, waiting...");
              await sleep(1000);
            }
          } else {
            // main question solving
            await answerQuestion();
          }

          errorCount = 0; // reset error counter on successful iteration
        } catch (error) {
          errorCount++;
          console.error("Error while answering question:", error);

          if (errorCount > 5) {
            console.warn(
              "⚠️ Too many consecutive errors — auto-pausing solver for safety."
            );
            deactivateBot();
            break;
          }
        }

        answerQuestionRunning = false;
      }

      // randomized wait to mimic human timing between actions
      await sleep(Math.random() * 200 + 600);
    }
  }
}

function deactivateBot() {
  console.log("S: Deactivating Bot");
  botEnabled = null;
}

// listen for messages from the popup to enable/disable the bot
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("the request:", request, "done");
  if (request == "activate") {
    activateBot();
  }
  if (request == "deactivate") {
    deactivateBot();
  }
});

//listen for messages from highlighter.js to update responseMap
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateMapData") {
    const receivedData = message.data;
    console.log("S: Received data from H:", receivedData);
  }
});
