<p align="center">
  <img src="https://raw.githubusercontent.com/KevinTrinh1227/McGrawHill-SmartBook-Solver/refs/heads/main/src/assets/logo.png" alt="McGraw-Hill SmartBook Solver Logo" width="120" height="120">
</p>

<h1 align="center">McGraw-Hill SmartBook Solver</h1>

<p align="center">
  <em>A lightweight educational browser extension that demonstrates ethical automation by detecting and solving SmartBook concept questions — built for learning, research, and software development exploration.</em>
</p>

<p align="center">
  <img src="src/assets/demo_2.gif" alt="Demo of McGraw-Hill SmartBook Solver">
</p>

<details>
  <summary align="center">CLICK TO SEE MORE DEMO EXAMPLES</summary>
    <a href="https://www.kevintrinh.dev" target="_blank">
      <img src="src/assets/demo_1.gif" alt="Demo of McGraw-Hill SmartBook Solver">
    </a>
</details>

## 📌 Important Notice & Disclaimer

This project is built **strictly for educational and demonstration purposes only.** I **highly discourage** using this tool to cheat or violate any form of **academic integrity policies**.

By using this extension, you acknowledge and agree to the following:

- This tool should **not** be used on graded coursework, quizzes, or exams.
- You are **solely responsible** for how you use this extension.
- The developer (**Kevin Trinh**) is **not affiliated** with McGraw-Hill Education or any educational institution.
- The developer assumes **no liability** for misuse, academic consequences, or policy violations.

This project serves as an **educational exploration** of web automation and browser extension development — **not** as a cheating tool.

---

## 🧠 Overview / About

The **McGraw-Hill SmartBook Solver** is a lightweight browser extension that demonstrates how automation can interact with educational web platforms. It automatically identifies and highlights correct SmartBook concept answers — while tracking your progress through the session and all-time statistics.

This project was **never published publicly** because I would never encourage academic dishonesty, etc. It exists as an educational exercise in DOM automation, browser scripting, and ethical programming.

---

## ✨ Browser Extension Features

- **Auto-solves SmartBook concept questions** intelligently and efficiently
- Supports **multiple question types** — including drag & drop, fill-in-the-blank, and multiple-choice
- Clean, intuitive, and **user-friendly popup interface**
- Tracks both **session and all-time statistics**
- Displays **uptime counter** and **real-time activity status**
- Built-in **Terms of Service acknowledgment** for ethical use
- **Lightweight and secure** — runs locally with no external data collection
- Compatible with **all Chromium-based browsers**, including (but not limited to):  
  Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Arc Browser, Chromium (open-source), Opera GX, Samsung Internet (Desktop Beta), Iron Browser, Blisk Developer Browser, Kiwi Browser (Android), Yandex Browser, and many more.

All of these browsers support the **same Chromium extension system**, ensuring smooth and reliable performance across platforms without modification.

---

## ⚙️ Installation / Setup Guide <a id="setup-guide"></a>

### Option 1 — Manual Install (Recommended)

1. **Download the latest stable release**

   - Visit the [📦 Releases Page](https://github.com/KevinTrinh1227/McGrawHill-SmartBook-Solver/releases)
   - Download the `.zip` file (e.g. `McGraw-Hill-SmartBook-Solver.zip`)
   - Extract it anywhere on your computer

2. **Open the Chrome Extensions page**

   - Go to:
     ```
     chrome://extensions
     ```
   - Or click **⋮ Menu → More Tools → Extensions**

3. **Enable Developer Mode**

   - Toggle the switch at the top right

4. **Load the Unpacked Extension**

   - Click **Load unpacked**
   - Select your extracted folder (e.g., `McGraw-Hill-SmartBook-Solver/`)

5. **Done!**
   - The 📘 icon should now appear in your toolbar
   - Pin it for faster access if desired

---

### Option 2 — Clone via Git & Open Directory

If you prefer direct source installation:

```bash
git clone https://github.com/KevinTrinh1227/McGraw-Hill-SmartBook-Solver.git
```

```bash
cd McGraw-Hill-SmartBook-Solver
```

---

## 🧭 How to Use the Browser Extension <a id="how-to-use"></a>

1. **Open A McGraw-Hill SmartBook** chapter concepts assignment and click begin questions.
2. Click browser extensions toolbar and click on the Solver Extension. (Pin it for easy access)
3. Read and acknowledge the one-time liability disclaimer:
   - Type your full name.
   - Check “I agree to the terms above.”
   - Click **I Agree & Understand**.
4. In the pop-up, toggle the switch to **ON**.  
   The solver will automatically start detecting and solving concept questions.

> You can always stop it at any time by switching it back **OFF**. Stats like total solved, attempts, and uptime are tracked automatically.

---

## ⚙️ How It Works (Under the Hood)

McGraw-Hill SmartBook “Concepts” assignments are designed as **participation-based learning activities** — not exams.  
You don’t earn points for getting every question correct; instead, you “master” each concept over time through practice and repetition.

This extension was built with that philosophy in mind.  
Rather than aiming for high accuracy through AI or answer scraping, it works through **progressive learning automation**:

- The bot **selects answers randomly** on the first attempt.
- If it gets a question **wrong**, it quietly **stores the correct answer** for that concept locally (offline).
- When that same question reappears later, the bot **answers it correctly** the next time.
- Over time, the extension builds a **local cache of mastered questions**, completing concepts more efficiently.

Because all logic runs **entirely offline**, it makes no API calls or external requests — ensuring privacy, performance, and reliability.

If SmartBook redirects you to a reading section after too many missed attempts, the extension will **automatically navigate back to the question screen** and continue working.

**Supported Question Types:**

- Multiple Choice
- Fill in the Blank
- Drag and Drop

In short — this tool simulates the natural learning cycle of “trial and improvement,” making SmartBook sessions smoother, faster, and more focused on completion efficiency rather than accuracy chasing.

---

## ⚖️ Legal Disclaimer

This project is an independent educational tool and is not affiliated with McGraw-Hill Education or any academic institution.
All trademarks, product names, and logos belong to their respective owners.

By using this software, you agree that:

- You use it at your own risk.

- The author assumes no responsibility or liability for misuse.

- This tool is strictly for ethical learning, research, and software development purposes.
