/**
 * ESSUGGEST — chatbot.js
 * A rule-based help bot for students. No backend and no API key: it matches
 * keywords in the student's message to the answers in KB below, then replies
 * with a short answer plus links to the right page.
 *
 * To teach it something new, add an entry to KB. To change an answer, edit
 * its `answer`. Keep answers to what the site really does.
 *
 * It builds its own widget, so the homepage only needs the stylesheet and
 * this script. If nothing matches, it offers to run the site search
 * (#site-search-input from dotted.js) with the student's words.
 */
(function essuBot() {
  if (document.getElementById("essu-bot")) return;

  /* ------------------------------------------------------------------
     KNOWLEDGE BASE
     keys: single words match the START of a word ("anonym" -> anonymous);
           words under 4 letters must match exactly; phrases (with a space)
           match anywhere. Filipino/Taglish keywords are included.
  ------------------------------------------------------------------- */
  const KB = [
    {
      id: "greet",
      keys: ["hi", "hello", "hey", "kumusta", "musta", "good morning", "good afternoon", "good evening"],
      answer: "Hi! I can answer questions about signing up, posting suggestions, polls, anonymity, and reporting. What do you need?",
      chips: ["How do I sign up?", "Can I post anonymously?", "How do polls work?"],
    },
    {
      id: "help",
      keys: ["help", "what can you do", "tulong", "options"],
      answer: "I can help with:\n• Creating and verifying your account\n• Posting suggestions\n• Anonymous or named posts\n• Polls and voting\n• Upvotes and comments\n• Reporting content\n• Policies and contact info",
      chips: ["How do I sign up?", "How do I post a suggestion?", "How do I report a post?"],
    },
    {
      id: "signup",
      keys: ["sign up", "signup", "register", "registration", "create account", "create an account", "verify", "verification", "join", "student number", "credentials", "gumawa", "mag-sign up", "magpa-register"],
      answer: "Sign up with your ESSU credentials: student number, course, year, section, and college. You need a verified account before you can post, comment, vote, or upvote.",
      links: [{ label: "Create account", href: "/auth/SignUp.html" }, { label: "User Guide", href: "/pages/UserGuides.html" }],
      chips: ["I forgot my password", "Can I post anonymously?"],
    },
    {
      id: "login",
      keys: ["log in", "login", "sign in", "password", "forgot", "nakalimutan", "can't log", "cannot log"],
      answer: "Go to the log in page and use your verified ESSUGGEST account. If you forgot your password, use the \"Forgot password?\" link on that page.",
      links: [{ label: "Log in", href: "/auth/LogIn.html" }],
      chips: ["How do I sign up?", "Contact support"],
    },
    {
      id: "post",
      keys: ["post", "suggest", "suggestion", "submit", "idea", "write", "magpost", "mag-suggest", "feedback"],
      answer: "Log in, write up your idea, tag it, and choose whether your name shows. Other students can then upvote and comment on it. The suggestions with the most support rise to the top.",
      links: [{ label: "How it works", href: "#conarea" }, { label: "Community Guidelines", href: "/pages/ComGuide.html" }],
      chips: ["Can I post anonymously?", "How do upvotes work?"],
    },
    {
      id: "anonymous",
      keys: ["anonym", "identity", "hide", "hidden", "my name", "show my name", "who can see", "pangalan", "alias"],
      answer: "When you post a suggestion, you choose whether your name shows (anonymous or named). For how your information is handled, check the Data Privacy Policy.",
      links: [{ label: "Data Privacy Policy", href: "/pages/PrivacyPolicy.html" }],
      chips: ["How do I post a suggestion?", "How do I report a post?"],
    },
    {
      id: "polls",
      keys: ["poll", "polls", "vote", "voting", "boto", "results"],
      answer: "Students can post polls. Each student gets one vote, voting stays open for 24 hours, and results update live. Polls stay visible after voting ends.",
      links: [{ label: "User Guide", href: "/pages/UserGuides.html" }],
      chips: ["How do upvotes work?", "How do I sign up?"],
    },
    {
      id: "upvote",
      keys: ["upvote", "upvotes", "downvote", "comment", "comments", "reply", "discussion", "thread", "threaded", "rise", "trending", "top"],
      answer: "Students upvote suggestions they agree with and reply in threaded discussions. The suggestions with the most support rise to the top.",
      chips: ["How do I post a suggestion?", "How do polls work?"],
    },
    {
      id: "report",
      keys: ["report", "inappropriate", "abuse", "bully", "bullying", "harass", "offensive", "spam", "flag", "guidelines", "rules", "bawal"],
      answer: "If you see inappropriate content, you can report it. The Reporting Handbook explains how reports work, and the Community Guidelines list what is not allowed.",
      links: [{ label: "Reporting Handbook", href: "/pages/ReportHandB.html" }, { label: "Community Guidelines", href: "/pages/ComGuide.html" }],
      chips: ["Policies", "Contact support"],
    },
    {
      id: "status",
      keys: ["status", "resolved", "resolve", "answered", "response", "respond", "track", "follow up", "follow-up", "ignored", "seen by"],
      answer: "ESSUGGEST doesn't have a resolved/unresolved status on suggestions yet. You can see how much support a suggestion has through its upvotes and discussion, and poll results are published for everyone.",
      chips: ["How do upvotes work?", "Contact support"],
    },
    {
      id: "policies",
      keys: ["privacy policy", "data privacy", "security", "secure", "terms", "ip rights", "intellectual", "policy", "policies", "safe"],
      answer: "You can read our policies here:",
      links: [
        { label: "Data Privacy", href: "/pages/PrivacyPolicy.html" },
        { label: "Security", href: "/pages/SecurityPolicy.html" },
        { label: "IP Rights", href: "/pages/IPrightsPolicy.html" },
        { label: "Terms of Use", href: "/pages/TermsofUse.html" },
      ],
    },
    {
      id: "contact",
      keys: ["contact", "email", "reach", "human", "hrmo", "human resources", "gmail", "message you"],
      answer: "You can email the ESSUGGEST team at essuggest@gmail.com or visit the Contact Us page.",
      links: [{ label: "Contact Us", href: "/pages/contactus.html" }, { label: "Email us", href: "mailto:essuggest@gmail.com" }],
    },
    {
      id: "about",
      keys: ["about", "team", "who made", "developers", "creator", "capstone", "who are you"],
      answer: "ESSUGGEST is an online suggestion box for Eastern Samar State University, made by BSIT students. You can meet the team on the About Us page.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
    },
    {
      id: "guides",
      keys: ["guide", "guides", "tutorial", "how to use", "how does", "how it works", "how it work", "steps", "faq", "question", "questions"],
      answer: "These pages cover the basics:",
      links: [{ label: "User Guide", href: "/pages/UserGuides.html" }, { label: "FAQ", href: "/pages/faq.html" }, { label: "How it works", href: "#conarea" }],
    },
    {
      id: "thanks",
      keys: ["thanks", "thank you", "salamat", "ty"],
      answer: "You're welcome! Ask me anything else about ESSUGGEST.",
    },
  ];

  const STARTERS = ["How do I sign up?", "Can I post anonymously?", "How do polls work?", "How do I report a post?"];
  const MAX_LEN = 200;

  /* ------------------------------------------------------------------
     PRIVACY
     Personal details are removed here, in the browser, before a message is
     sent to /api/chat. The server filters again as a second layer. This is
     best-effort (it can't catch every name), so the chat window also asks
     students not to share personal details.
  ------------------------------------------------------------------- */
  const NAME_RE =
    /\b(My name is|my name is|I am|I'm|This is|this is|Ako si|ako si|Ako po si|ako po si|Pangalan ko(?: po)? ay|pangalan ko(?: po)? ay|Name ko|name ko)\s+[A-Z][\p{L}'.-]*(?:\s+[A-Z][\p{L}'.-]*){0,3}/gu;

  function scrubPII(text) {
    return text
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]")
      .replace(/(?:\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, "[number removed]")
      .replace(/\b\d[\d-]{5,}\d\b/g, "[number removed]")
      .replace(NAME_RE, "$1 [name removed]");
  }

  /* ------------------------------------------------------------------
     MATCHING
  ------------------------------------------------------------------- */
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();

  function findAnswer(raw) {
    const text = clean(raw);
    const padded = " " + text + " ";
    const words = text.split(" ");
    let best = null;
    let bestScore = 0;

    for (const entry of KB) {
      let score = 0;
      for (const key of entry.keys) {
        if (key.includes(" ")) {
          if (padded.includes(" " + key)) score += 3;
        } else if (key.length < 4) {
          if (words.includes(key)) score += 2;
        } else if (words.some((w) => w.startsWith(key))) {
          score += 2;
        }
      }
      if (score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }
    return bestScore >= 2 ? best : null;
  }

  /* ------------------------------------------------------------------
     DOM
  ------------------------------------------------------------------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  const ICON_CLOSE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_SEND =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function logo() {
    const box = el("span", "essu-bot-logo");
    const img = document.createElement("img");
    img.src = "/assets/LOGO.png";
    img.alt = "";
    box.appendChild(img);
    return box;
  }

  const root = el("div", "essu-bot font-dm");
  root.id = "essu-bot";
  root.setAttribute("data-chatbot", ""); // dotted.js skips the dot shockwave on clicks inside

  const panel = el("section", "essu-bot-panel");
  panel.id = "essu-bot-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "ESSUGGEST help chat");
  panel.hidden = true;

  const head = el("div", "essu-bot-head");
  const headText = el("div");
  headText.append(el("p", "essu-bot-title", "ESSUGGEST Helper"), el("p", "essu-bot-sub", "Quick answers for students"));
  const closeBtn = el("button", "essu-bot-close");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close chat");
  closeBtn.innerHTML = ICON_CLOSE;
  head.append(logo(), headText, closeBtn);

  const log = el("div", "essu-bot-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  const form = el("form", "essu-bot-form");
  form.setAttribute("autocomplete", "off");
  const input = el("input", "essu-bot-input");
  input.type = "text";
  input.maxLength = MAX_LEN;
  input.placeholder = "Ask about ESSUGGEST";
  input.setAttribute("aria-label", "Type your question");
  const sendBtn = el("button", "essu-bot-send");
  sendBtn.type = "submit";
  sendBtn.setAttribute("aria-label", "Send message");
  sendBtn.innerHTML = ICON_SEND;
  form.append(input, sendBtn);

  const privacyNote = el("p", "essu-bot-note", "Don't share personal details. AI answers can be wrong.");
  panel.append(head, log, form, privacyNote);

  const launch = el("button", "essu-bot-launch");
  launch.type = "button";
  launch.setAttribute("aria-expanded", "false");
  launch.setAttribute("aria-controls", "essu-bot-panel");
  launch.setAttribute("aria-label", "Open help chat");
  launch.append(logo(), el("span", "essu-bot-launch-text", "Need help?"));

  root.append(panel, launch);
  document.body.appendChild(root);

  /* ------------------------------------------------------------------
     CHAT BEHAVIOUR
  ------------------------------------------------------------------- */
  let started = false;
  let busy = false;

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function clearChips() {
    log.querySelectorAll(".essu-bot-chips").forEach((c) => c.remove());
  }

  function addUser(text) {
    log.appendChild(el("div", "essu-bot-msg is-user", text));
    scrollDown();
  }

  function addBot({ answer, links, chips, searchTerm }) {
    const msg = el("div", "essu-bot-msg is-bot");
    msg.appendChild(document.createTextNode(answer));

    const linkItems = (links || []).slice();
    if (linkItems.length || searchTerm) {
      const row = el("div", "essu-bot-links");
      linkItems.forEach((l) => {
        const a = el("a", "essu-bot-link", l.label);
        a.href = l.href;
        if (l.href.startsWith("#")) a.addEventListener("click", closePanel);
        row.appendChild(a);
      });
      if (searchTerm) {
        const b = el("button", "essu-bot-link", "Search the site");
        b.type = "button";
        b.addEventListener("click", () => searchSite(searchTerm));
        row.appendChild(b);
      }
      msg.appendChild(row);
    }
    log.appendChild(msg);

    if (chips && chips.length) addChips(chips);
    scrollDown();
  }

  function addChips(list) {
    const wrap = el("div", "essu-bot-chips");
    list.forEach((label) => {
      const c = el("button", "essu-bot-chip", label);
      c.type = "button";
      c.addEventListener("click", () => ask(label));
      wrap.appendChild(c);
    });
    log.appendChild(wrap);
  }

  function searchSite(term) {
    const box = document.getElementById("site-search-input");
    if (!box) return;
    closePanel();
    box.value = term;
    box.focus();
    box.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* ------------------------------------------------------------------
     AI MODE
     Questions the knowledge base can't answer (and requests to draft or
     reword a suggestion) go to /api/chat, a Cloudflare Pages Function that
     calls Workers AI. If that endpoint is missing, rate-limited, or out of
     free quota, askAI() returns null and the rule-based reply is used, so
     the bot never breaks.
  ------------------------------------------------------------------- */
  const AI_ENDPOINT = "/api/chat";
  const AI_SESSION_CAP = 12; // soft cap per page visit; the server enforces the real limit
  const DRAFT_RE = /\b(draft|rewrite|reword|improve|polish|proofread|help me write|ayusin)\b/i;
  const AI_NOTE = "\n\nThis answer is AI-generated, so double-check important details in the guides.";
  let aiCalls = 0;
  let aiNoted = false;
  const aiHistory = [];

  async function askAI(text) {
    if (aiCalls >= AI_SESSION_CAP) return null;
    aiCalls++;
    const safeText = scrubPII(text);
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: safeText, history: aiHistory.slice(-4) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) return null;
      aiHistory.push({ role: "user", content: safeText }, { role: "assistant", content: reply });
      return reply;
    } catch (_) {
      return null;
    }
  }

  function fallbackReply(text) {
    return {
      answer: "I'm not sure about that one. You can search the site for it, or email the team at essuggest@gmail.com.",
      links: [{ label: "Email us", href: "mailto:essuggest@gmail.com" }],
      searchTerm: text,
      chips: STARTERS.slice(0, 3),
    };
  }

  function finish(typing, render) {
    typing.remove();
    render();
    busy = false;
  }

  function ask(raw) {
    const text = raw.trim().slice(0, MAX_LEN);
    if (!text || busy) return;
    busy = true;
    clearChips();
    addUser(text);

    const typing = el("div", "essu-bot-msg is-bot essu-bot-typing");
    typing.setAttribute("aria-hidden", "true");
    typing.append(el("span"), el("span"), el("span"));
    log.appendChild(typing);
    scrollDown();

    const hit = findAnswer(text);

    // Known questions get an instant rule-based answer.
    if (hit && !DRAFT_RE.test(text)) {
      setTimeout(() => finish(typing, () => addBot(hit)), 450);
      return;
    }

    // Everything else goes to the AI, with the rule-based reply as backup.
    askAI(text).then((reply) => {
      finish(typing, () => {
        if (!reply) return addBot(hit || fallbackReply(text));
        const note = aiNoted ? "" : AI_NOTE;
        aiNoted = true;
        addBot({ answer: reply + note });
      });
    });
  }

  function openPanel() {
    panel.hidden = false;
    panel.classList.add("is-opening");
    launch.setAttribute("aria-expanded", "true");
    launch.setAttribute("aria-label", "Close help chat");
    if (!started) {
      started = true;
      addBot({
        answer: "Hi! I'm the ESSUGGEST helper. Ask me how things work, or pick a question below. Please don't share your name, student number, or other personal details here.",
        links: [{ label: "Data Privacy Policy", href: "/pages/PrivacyPolicy.html" }],
        chips: STARTERS,
      });
    }
    input.focus();
  }

  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    panel.classList.remove("is-opening");
    launch.setAttribute("aria-expanded", "false");
    launch.setAttribute("aria-label", "Open help chat");
  }

  launch.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
  closeBtn.addEventListener("click", () => {
    closePanel();
    launch.focus();
  });
  panel.addEventListener("animationend", () => panel.classList.remove("is-opening"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    ask(v);
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      closePanel();
      launch.focus();
    }
  });
})();