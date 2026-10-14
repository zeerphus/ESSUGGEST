/**
 * ESSUGGEST — chatbot.js
 * A rule-based help bot for students. No backend and no API key: it matches
 * keywords in the student's message to the answers in KB below, then replies
 * with a short answer plus links to the right page.
 *
 * PERSONALITY: Sugi is soft, warm, and a little Gen Z (light slang, Taglish,
 * gentle humor). She calls students "ESSUdyante". Keep the facts exact and the
 * jokes light; sensitive topics (reports, bullying) get a softer, serious tone.
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
      answer: [
        "Hiii, ESSUdyante! I'm Sugi. Need help with signing up, posting, polls, or reports? I got you.",
        "Hello hello, ESSUdyante! Ask me anything about ESSUGGEST, no question is too small, promise.",
        "Heyyy, welcome! What can Sugi help you with today?",
      ],
      chips: ["How do I sign up?", "Can I post anonymously?", "How do polls work?"],
    },
    {
      id: "help",
      keys: ["help", "what can you do", "tulong", "options"],
      answer: "Okay so here's what I can help with, ESSUdyante:\n• Making and verifying your account\n• Posting suggestions\n• Anonymous or named posts\n• Polls and voting\n• Upvotes and comments\n• Reporting stuff\n• Policies and contact info\n• About ESSUGGEST and the team behind it\n• Where to reach support or the HR office\nJust ask, I'm all ears (well, I'm a box, but you get it).",
      chips: ["How do I sign up?", "How do I post a suggestion?", "How do I report a post?"],
    },
    {
      id: "signup",
      keys: ["sign up", "signup", "register", "registration", "create account", "create an account", "verify", "verification", "join", "student number", "credentials", "gumawa", "mag-sign up", "magpa-register"],
      answer: "Easy peasy, ESSUdyante. Sign up with your ESSU credentials: student number, course, year, section, and college. Once your account's verified, you can post, comment, vote, and upvote. Welcome to the fam!",
      links: [{ label: "Create account", href: "/auth/SignUp.html" }, { label: "User Guide", href: "/pages/UserGuides.html" }],
      chips: ["I forgot my password", "Can I post anonymously?"],
    },
    {
      id: "login",
      keys: ["log in", "login", "sign in", "password", "forgot", "nakalimutan", "can't log", "cannot log"],
      answer: "Just head to the log in page with your verified account. Forgot your password? Totally happens, hehe. Tap the \"Forgot password?\" link on that page and you're good.",
      links: [{ label: "Log in", href: "/auth/LogIn.html" }],
      chips: ["How do I sign up?", "Contact support"],
    },
    {
      id: "post",
      keys: ["post", "suggest", "suggestion", "submit", "idea", "write", "magpost", "mag-suggest", "feedback"],
      answer: "Got an idea? Love that for you. Log in, write it out, tag it, and pick if your name shows or not. Then other ESSUdyante can upvote and comment, and the ones with the most support rise to the top.",
      links: [{ label: "How it works", href: "#conarea" }, { label: "Community Guidelines", href: "/pages/ComGuide.html" }],
      chips: ["Can I post anonymously?", "How do upvotes work?"],
    },
    {
      id: "anonymous",
      keys: ["anonym", "post anonymously", "identity", "hide", "hidden", "my name", "show my name", "who can see", "pangalan", "alias"],
      answer: "It's your call, ESSUdyante! When you post a suggestion, you decide if your name shows (anonymous or named). Wanna know how your info is handled? The Data Privacy Policy has the full story.",
      links: [{ label: "Data Privacy Policy", href: "/pages/PrivacyPolicy.html" }],
      chips: ["How do I post a suggestion?", "How do I report a post?"],
    },
    {
      id: "polls",
      keys: ["poll", "polls", "vote", "voting", "boto", "results"],
      answer: "ESSUdyante can make polls! Everyone gets one vote, voting stays open for 24 hours, results update live, and the poll stays visible after voting ends. Democracy, but make it cute.",
      links: [{ label: "User Guide", href: "/pages/UserGuides.html" }],
      chips: ["How do upvotes work?", "How do I sign up?"],
    },
    {
      id: "upvote",
      keys: ["upvote", "upvotes", "downvote", "comment", "comments", "reply", "discussion", "thread", "threaded", "rise", "trending", "top"],
      answer: "ESSUdyante upvote the suggestions they agree with and reply in threaded discussions. The ones with the most support rise to the top. It's giving main character energy.",
      chips: ["How do I post a suggestion?", "How do polls work?"],
    },
    {
      id: "report",
      keys: ["report", "report a post", "report post", "inappropriate", "abuse", "bully", "bullying", "harass", "offensive", "spam", "flag", "guidelines", "rules", "bawal"],
      answer: "I'm sorry you ran into that, ESSUdyante. You can report it, and you don't have to deal with it alone. The Reporting Handbook explains how it works, and the Community Guidelines cover what's not allowed.",
      links: [{ label: "Reporting Handbook", href: "/pages/ReportHandB.html" }, { label: "Community Guidelines", href: "/pages/ComGuide.html" }],
      chips: ["Policies", "Contact support"],
    },
    {
      id: "status",
      keys: ["status", "resolved", "resolve", "answered", "response", "respond", "track", "follow up", "follow-up", "ignored", "seen by"],
      answer: "Okay, real talk (gently): there's no resolved/unresolved status on suggestions yet. You can still see how much support one has through its upvotes and discussion, and poll results get published for everyone.",
      chips: ["How do upvotes work?", "Contact support"],
    },
    {
      id: "policies",
      keys: ["privacy policy", "data privacy", "security", "secure", "terms", "ip rights", "intellectual", "policy", "policies", "safe"],
      answer: "Your safety matters to me, ESSUdyante! Here are our policies:",
      links: [
        { label: "Data Privacy", href: "/pages/PrivacyPolicy.html" },
        { label: "Security", href: "/pages/SecurityPolicy.html" },
        { label: "IP Rights", href: "/pages/IPrightsPolicy.html" },
        { label: "Terms of Use", href: "/pages/TermsofUse.html" },
      ],
    },
    {
      id: "contact",
      keys: ["contact", "email", "reach", "gmail", "message you", "support", "human"],
      answer: "Need a real human? Valid! There are two places to go, ESSUdyante: ESSUGGEST Support at essuggest@gmail.com for bugs, account issues, or how the platform works, and the Human Resources Management Office for official, university-level concerns. Details are on the Contact Us page.",
      links: [{ label: "Contact Us", href: "/pages/contactus.html" }, { label: "Email us", href: "mailto:essuggest@gmail.com" }],
      chips: ["Who do I contact for bugs?", "What does the HR office do?"],
    },
    {
      id: "name",
      keys: ["your name", "what's your name", "whats your name", "sugi", "mascot", "who are you", "ano pangalan mo"],
      answer: [
        "I'm Sugi, the ESSUGGEST suggestion box! I answer questions about the site and wiggle a lot. Hehe.",
        "Name's Sugi! I'm the little suggestion box living on this page. Ask me anything about ESSUGGEST, ESSUdyante.",
      ],
      chips: ["How do I sign up?", "How do polls work?"],
    },
    {
      id: "about",
      keys: ["about us", "about essuggest", "what is essuggest", "what's essuggest", "whats essuggest", "ano ang essuggest"],
      answer: "ESSUGGEST is Eastern Samar State University's online suggestion and polling platform, ESSUdyante. It's built so student feedback stops disappearing into a locked box and starts moving: posted, voted on, and discussed in the open.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Why was it built?", "Who made ESSUGGEST?"],
    },
    {
      id: "guides",
      keys: ["guide", "guides", "tutorial", "how to use", "how does", "how it works", "how it work", "steps", "faq", "question", "questions"],
      answer: "Don't worry, ESSUdyante, these pages got you covered:",
      links: [{ label: "User Guide", href: "/pages/UserGuides.html" }, { label: "FAQ", href: "/pages/faq.html" }, { label: "How it works", href: "#conarea" }],
    },
    {
      id: "why",
      keys: ["why was it built", "why was this built", "why was essuggest made", "why did you build", "why we built", "why essuggest", "paper box", "locked box", "mission", "purpose", "bakit ginawa"],
      answer: "Because the paper suggestion box only works one way, ESSUdyante. You drop in a note, and then nobody else sees it, nobody can back it up, and there's rarely a way to know if anything happened next. ESSUGGEST makes it visible: suggestions get upvoted and discussed by other students, and polls show live results instead of a single silent tally.",
      links: [{ label: "How it works", href: "#conarea" }],
      chips: ["Who made ESSUGGEST?", "How do I sign up?"],
    },
    {
      id: "team",
      keys: ["team", "who made", "who built", "who created", "who developed", "developers", "creator", "capstone", "bsit", "bsit 3a", "3a", "members"],
      answer: "ESSUGGEST is built and maintained by BSIT 3A. Here's the team:\n• Jay Anne E. Alcido, Database Manager\n• Janica Michi A. Aquino, Backend Developer\n• Kaiser Benedict A. Coles, Frontend Developer\n• Zoe C. Palce, Co-Backend Developer\n• John Benedict A. Villaflor, Co-Frontend Developer\nTap a card on the About Us page to see what each of them worked on.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      more: "That's the full list I have, ESSUdyante. Ask me about any of them by name, or tap a card on the About Us page to see what each one worked on.",
      chips: ["Who handles the backend?", "Who did the design?"],
    },
    {
      id: "dev_database",
      keys: ["alcido", "jay anne", "database manager", "database"],
      answer: "Jay Anne E. Alcido is the Database Manager. They designed and maintain the database that stores suggestions, votes, polls, comments, and student accounts.",
      more: "That's everything I have on that from the About Us page, ESSUdyante. I don't know the tools or the step-by-step behind the database. For that, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who made ESSUGGEST?"],
    },
    {
      id: "dev_aquino",
      keys: ["aquino", "janica"],
      answer: "Janica Michi A. Aquino is the Backend Developer. They built the server logic behind posting, upvoting, discussions, polls, and secure log in.",
      more: "That's all I have on Janica from the About Us page, ESSUdyante. I don't know the tools or the step-by-step of how it was built. For that, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who made ESSUGGEST?", "Who handles the backend?"],
    },
    {
      id: "dev_palce",
      keys: ["palce", "zoe"],
      answer: "Zoe C. Palce is the Co-Backend Developer. They supported the backend with API features, testing, and connecting the server to the database.",
      more: "That's all I have on Zoe from the About Us page, ESSUdyante. I don't know the tools or the step-by-step of how it was built. For that, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who made ESSUGGEST?", "Who handles the backend?"],
    },
    {
      id: "dev_backend",
      keys: ["backend", "back-end", "back end", "server", "api"],
      answer: "Janica Michi A. Aquino (Backend Developer) built the server logic behind posting, upvoting, discussions, polls, and secure log in. Zoe C. Palce (Co-Backend Developer) supported the backend with API features, testing, and connecting the server to the database.",
      more: "That's all I have on the backend from the About Us page, ESSUdyante. For the technical details, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who did the design?", "Who made ESSUGGEST?"],
    },
    {
      id: "dev_kaiser",
      keys: ["coles", "kaiser"],
      answer: "Kaiser Benedict A. Coles is the Frontend Developer. Kaiser designed and built the page layouts and the interface students use, from the landing page to the suggestion wall.",
      more: "That's all I have on Kaiser from the About Us page, ESSUdyante: the page layouts and interface, from the landing page to the suggestion wall. I don't know the tools or the step-by-step of how it was made. For that, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who did the design?", "Who made ESSUGGEST?"],
    },
    {
      id: "dev_john",
      keys: ["villaflor", "john benedict"],
      answer: "John Benedict A. Villaflor is the Co-Frontend Developer. John supports the interface with creative motion graphics, responsive design, and interactive features for a smooth user experience.",
      more: "That's all I have on John from the About Us page, ESSUdyante. I don't know the tools or the step-by-step of how the motion graphics and features were made. For that, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who did the design?", "Who made ESSUGGEST?"],
    },
    {
      id: "dev_frontend",
      keys: ["frontend", "front-end", "front end", "motion graphics", "design"],
      answer: "Kaiser Benedict A. Coles (Frontend Developer) designed and built the page layouts and interface students use, from the landing page to the suggestion wall. John Benedict A. Villaflor (Co-Frontend Developer) supports the interface with creative motion graphics, responsive design, and interactive features for a smooth experience.",
      more: "That's all I have on the frontend from the About Us page, ESSUdyante. For the technical details, email the team at essuggest@gmail.com.",
      links: [{ label: "About Us", href: "/pages/aboutus.html" }],
      chips: ["Who handles the backend?", "Who made ESSUGGEST?"],
    },
    {
      id: "bug",
      keys: ["bug", "bugs", "glitch", "glitchy", "error", "broken", "crash", "report a bug", "for bugs", "account issue", "account issues", "account problem"],
      answer: "Ugh, bugs are the worst, sorry about that, ESSUdyante. ESSUGGEST Support handles bugs, account issues, and anything about how the platform itself works. Email essuggest@gmail.com, it's maintained by BSIT 3A.",
      links: [{ label: "Email us", href: "mailto:essuggest@gmail.com" }, { label: "Contact Us", href: "/pages/contactus.html" }],
      chips: ["What does the HR office do?", "I forgot my password"],
    },
    {
      id: "hr",
      keys: ["hrmo", "hr", "human resources", "human resource", "official concern", "official concerns", "university-level", "university level"],
      answer: "The Human Resources Management Office handles official concerns and university-level matters raised through ESSUGGEST. You can find their contact details on the Contact Us page.",
      links: [{ label: "Contact Us", href: "/pages/contactus.html" }],
      chips: ["Where is the HR office?", "Contact support"],
    },
    {
      id: "location",
      keys: ["address", "location", "located", "saan", "maypangdan", "borongan", "directions", "visit", "where is the office", "where is the hr office", "where's the hr office", "wheres the hr office", "where are you"],
      answer: "The Human Resources Management Office is at Brgy. Maypangdan, Borongan City, Eastern Samar, 6800. ESSUGGEST Support is reached by email at essuggest@gmail.com.",
      links: [{ label: "Contact Us", href: "/pages/contactus.html" }, { label: "Email us", href: "mailto:essuggest@gmail.com" }],
      chips: ["What does the HR office do?", "Who do I contact for bugs?"],
    },
    {
      id: "post_or_email",
      keys: ["question or suggestion", "or suggestion", "not a suggestion", "email or post", "post or email", "should i email"],
      answer: "Good question, ESSUdyante. If it's about a specific suggestion or poll, post it directly on ESSUGGEST so the whole campus can weigh in. If it's a platform question, an office you need to reach, or a bug, that's what Contact Us is for.",
      links: [{ label: "Log in", href: "/auth/LogIn.html" }, { label: "Contact Us", href: "/pages/contactus.html" }],
      chips: ["How do I post a suggestion?", "Who do I contact for bugs?"],
    },
    {
      id: "thanks",
      keys: ["thanks", "thank you", "salamat", "ty"],
      answer: [
        "Aww, you're welcome, ESSUdyante! Ask me anything else about ESSUGGEST.",
        "No problem at all! I'm right here if you need anything else, hehe.",
        "Anytime! You made my day. Let me know if you have more questions.",
      ],
    },
  ];

  // Some answers have several wordings; pick one at random so small talk doesn't repeat.
  const pick = (x) => (Array.isArray(x) ? x[Math.floor(Math.random() * x.length)] : x);

  /* Follow-ups. The matcher has no memory, so asking about the same topic twice
     (or asking "how did they do it?" after "who is X?") used to return the same
     card again. Now: ask("how did...") on a person gets that entry's `more` reply,
     and the same topic twice in a row gets a gentle "already shared that". */
  const DETAIL_RE = /\b(how (did|does|was|were)|tools?|tech(nology)?|stack|framework|libraries|language|process|explain|elaborate|tell me more|more about|details?|step by step|why did)\b/i;
  const REPEAT_REPLIES = [
    "I already shared that one just above, ESSUdyante. For more detail, the FAQ is a good next stop, or you can email the team at essuggest@gmail.com.",
    "That's all I have on that one, hehe. Check the FAQ for more, or email essuggest@gmail.com and the team can help.",
    "Hmm, I'd just be repeating myself! The FAQ might have more, or you can email the team at essuggest@gmail.com.",
  ];
  let lastId = null;

  // Starter chips change with the page the bot is on (homepage is the default).
  const PAGE_STARTERS = {
    aboutus: ["What is ESSUGGEST?", "Why was it built?", "Who made ESSUGGEST?", "How do I sign up?"],
    contactus: ["Who do I contact for bugs?", "What does the HR office do?", "Where is the HR office?", "How do I post a suggestion?"],
  };
  const pageKey = Object.keys(PAGE_STARTERS).find((k) => location.pathname.toLowerCase().includes(k));
  const STARTERS = PAGE_STARTERS[pageKey] || ["How do I sign up?", "Can I post anonymously?", "How do polls work?", "How do I report a post?"];
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

  /* ------------------------------------------------------------------
     MASCOT
     "Sugi", the suggestion-box mascot (pages/mascot.js), sits in the
     launcher and the chat header and changes mood with the conversation:
       happy -> thinking (waiting on a reply) -> happy, or confused when
       the bot has no answer. Falls back to the plain logo if mascot.js
       didn't load.
  ------------------------------------------------------------------- */
  const mascots = [];
  let moodTimer;

  function setMood(mood, revertAfterMs) {
    mascots.forEach((m) => m.setMood(mood));
    clearTimeout(moodTimer);
    if (revertAfterMs) moodTimer = setTimeout(() => setMood("happy"), revertAfterMs);
    // when Sugi has no answer, she shakes her head a little
    if (mood === "confused") mascots.forEach((m) => playMove(m, null, true, "shake"));
  }

  /* ------------------------------------------------------------------
     MASCOT MOTION
     Three kinds of movement, all on top of the mood faces above:
       1. hover:  a random move when the cursor reaches Sugi (hop, wiggle, ...)
       2. click:  a random bigger move (spin, big jump, heart-beat, shake);
                  poke the header Sugi 5 times fast and she gets dizzy
       3. follow: her eyes and body lean toward the cursor, look down while
                  you type, and she nods when you send / hops when she replies
     Moves are CSS keyframes (.mv-* in chatbot.css); this code only picks which
     one to play. Everything is skipped for prefers-reduced-motion.
  ------------------------------------------------------------------- */
  const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const HOVER_MOVES = ["hop", "wiggle", "jelly", "tilt", "nod"];
  const CLICK_MOVES = ["spin", "bigjump", "heart", "shake"];
  const ALL_MOVES = HOVER_MOVES.concat(CLICK_MOVES);
  let lastMove = "";
  let headMascot = null;
  let launchMascot = null;

  // Play one move on a mascot. `force` interrupts a move still playing (clicks do, hovers don't).
  // Pass `name` to play a specific move, or `list` to pick randomly (never the same one twice in a row).
  function playMove(m, list, force, name) {
    if (reduceMotion || !m || !m.isConnected) return;
    if (!m.getBoundingClientRect().width) return; // hidden (e.g. panel closed), nothing to animate
    if (m.dataset.moving && !force) return;

    let move = name;
    if (!move) {
      do move = list[Math.floor(Math.random() * list.length)];
      while (move === lastMove && list.length > 1);
    }
    lastMove = move;

    if (m._moveDone) m.removeEventListener("animationend", m._moveDone);
    clearTimeout(m._moveTimer);
    ALL_MOVES.forEach((n) => m.classList.remove("mv-" + n));
    void m.getBoundingClientRect(); // restart the animation if the same move plays again
    m.dataset.moving = move;
    m.classList.add("mv-" + move);

    const end = () => {
      m.classList.remove("mv-" + move);
      delete m.dataset.moving;
      m.removeEventListener("animationend", m._moveDone);
      clearTimeout(m._moveTimer);
    };
    m._moveDone = (e) => {
      if (e.target === m && e.animationName === "essu-mv-" + move) end();
    };
    m.addEventListener("animationend", m._moveDone);
    m._moveTimer = setTimeout(end, 1500); // safety net so a mascot can never get stuck "busy"
  }

  // Cursor following: sets --look-x / --look-y (-1..1) on each mascot; CSS turns them into movement.
  let pointerX = 0;
  let pointerY = 0;
  let hasPointer = false;
  let lastPointerAt = 0;
  let lookFrame = 0;
  let lookOverride = null;
  let lookTimer;

  function updateLook() {
    lookFrame = 0;
    mascots.forEach((m) => {
      if (!m.isConnected) return;
      const r = m.getBoundingClientRect();
      if (!r.width) return;
      let nx = 0;
      let ny = 0;
      if (lookOverride) {
        nx = lookOverride.x;
        ny = lookOverride.y;
      } else if (hasPointer) {
        const dx = pointerX - (r.left + r.width / 2);
        const dy = pointerY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, dist / 140); // glance harder the farther the cursor is
        nx = (dx / dist) * k;
        ny = (dy / dist) * k;
      }
      m.style.setProperty("--look-x", nx.toFixed(3));
      m.style.setProperty("--look-y", ny.toFixed(3));
    });
  }

  function queueLook() {
    if (!lookFrame) lookFrame = requestAnimationFrame(updateLook);
  }

  // Look somewhere specific for a moment (used for "looking down at the input while you type").
  function lookAt(x, y, ms) {
    lookOverride = { x, y };
    queueLook();
    clearTimeout(lookTimer);
    lookTimer = setTimeout(() => {
      lookOverride = null;
      queueLook();
    }, ms);
  }

  function wireMascotMotion() {
    if (!mascots.length) return;
    headMascot = mascots[0];
    launchMascot = mascots[1] || mascots[0];
    if (reduceMotion) return;

    // follow the cursor (mouse/pen only; touch has no cursor to follow)
    if (window.matchMedia && matchMedia("(pointer: fine)").matches) {
      document.addEventListener(
        "pointermove",
        (e) => {
          if (e.pointerType === "touch") return;
          pointerX = e.clientX;
          pointerY = e.clientY;
          hasPointer = true;
          lastPointerAt = Date.now();
          queueLook();
        },
        { passive: true }
      );
      document.documentElement.addEventListener("mouseleave", () => {
        hasPointer = false;
        queueLook();
      });
    }

    // hover + click on the launcher
    launch.addEventListener("mouseenter", () => playMove(launchMascot, HOVER_MOVES, false));
    launch.addEventListener("click", () => playMove(launchMascot, CLICK_MOVES, true));

    // hover + click (poke) on the header Sugi; 5 quick pokes make her dizzy
    const headBox = headMascot.parentElement;
    let pokes = 0;
    let pokeTimer;
    headBox.addEventListener("mouseenter", () => playMove(headMascot, HOVER_MOVES, false));
    headBox.addEventListener("click", () => {
      pokes++;
      clearTimeout(pokeTimer);
      pokeTimer = setTimeout(() => (pokes = 0), 2500);
      if (pokes >= 5) {
        pokes = 0;
        setMood("confused", 2500);
        playMove(headMascot, null, true, "spin");
      } else {
        playMove(headMascot, CLICK_MOVES, true);
      }
    });

    // eyes drop to the input while the student types
    input.addEventListener("input", () => lookAt(0, 0.9, 1400));

    // when nobody is around, the launcher Sugi does a little something every so often
    (function idle() {
      setTimeout(() => {
        const calm = panel.hidden && !document.hidden && Date.now() - lastPointerAt > 4000;
        if (calm) playMove(launchMascot, ["wiggle", "hop", "tilt", "nod"], false);
        idle();
      }, 9000 + Math.random() * 7000);
    })();
  }

  function logo() {
    const box = el("span", "essu-bot-logo");
    if (window.EssuMascot) {
      box.classList.add("has-mascot");
      const m = window.EssuMascot.create({ mood: "happy", size: 44 });
      mascots.push(m);
      box.appendChild(m);
      return box;
    }
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
  const SUB_IDLE = "Online · usually replies instantly";
  const subStatus = el("p", "essu-bot-sub", SUB_IDLE);
  headText.append(el("p", "essu-bot-title", "Sugi"), subStatus);
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
  input.placeholder = "Ask Sugi anything, ESSUdyante";
  input.setAttribute("aria-label", "Type your question");
  const sendBtn = el("button", "essu-bot-send");
  sendBtn.type = "submit";
  sendBtn.setAttribute("aria-label", "Send message");
  sendBtn.innerHTML = ICON_SEND;
  form.append(input, sendBtn);

  const privacyNote = el("p", "essu-bot-note", "Pls don't share personal info. Sugi's AI can be wrong sometimes, hehe.");
  panel.append(head, log, form, privacyNote);

  const launch = el("button", "essu-bot-launch");
  launch.type = "button";
  launch.setAttribute("aria-expanded", "false");
  launch.setAttribute("aria-controls", "essu-bot-panel");
  launch.setAttribute("aria-label", "Open help chat");
  launch.append(logo(), el("span", "essu-bot-launch-text", "Ask Sugi"));

  root.append(panel, launch);
  document.body.appendChild(root);
  wireMascotMotion();

  /* ------------------------------------------------------------------
     SUGI INTRO
     First time the chat opens: a big Sugi drops in, introduces herself,
     then shrinks and flies into the header badge before the greeting shows.
     Skippable (click, Skip, typing, sending, closing the panel).
  ------------------------------------------------------------------- */
  const INTRO_KEY = "essu-sugi-intro";
  const INTRO_ONCE_PER_SESSION = true; // set false while demoing to see it every time
  const INTRO_HOLD_MS = 3300; // how long she stays centered before flying to the header

  let introEl = null;
  let introStage = null;
  let introBig = null;
  let introTimers = [];

  function introSeen() {
    try {
      return INTRO_ONCE_PER_SESSION && sessionStorage.getItem(INTRO_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function introLater(fn, ms) {
    introTimers.push(setTimeout(fn, ms));
  }

  function canIntro() {
    return !!(window.EssuMascot && headMascot && !reduceMotion && !introSeen());
  }

  function runIntro() {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch (_) {}

    introBig = window.EssuMascot.create({ mood: "happy", size: 112 });

    introEl = el("div", "essu-intro");
    // cover just the chat-log area, so the header and input row stay visible
    introEl.style.top = log.offsetTop + "px";
    introEl.style.height = log.offsetHeight + "px";

    introStage = el("div", "essu-intro-stage");
    introStage.appendChild(introBig);

    const copy = el("div", "essu-intro-copy");
    const name = el("p", "essu-intro-name");
    name.setAttribute("aria-label", "Sugi");
    "Sugi".split("").forEach((ch, i) => {
      const s = el("span", "", ch);
      s.style.setProperty("--i", i);
      s.setAttribute("aria-hidden", "true");
      name.appendChild(s);
    });
    copy.append(el("p", "essu-intro-hello", "Hi, I'm"), name, el("p", "essu-intro-tag", "Your ESSUGGEST helper"));

    const skip = el("button", "essu-intro-skip", "Skip");
    skip.type = "button";

    introEl.append(introStage, copy, skip);
    panel.appendChild(introEl);
    panel.classList.add("is-intro");

    introEl.addEventListener("click", () => exitIntro(true));

    // choreography (the drop-in itself is CSS; these are Sugi's own reactions)
    introLater(() => {
      introBig.hop();
      introBig.wave();
    }, 1150);
    introLater(() => introBig.celebrate(), 2500);
    introLater(() => exitIntro(false), INTRO_HOLD_MS);
  }

  // instant = true: skip straight to the greeting. Otherwise Sugi flies into the header badge.
  function exitIntro(instant) {
    if (!introEl) return;
    introTimers.forEach(clearTimeout);
    introTimers = [];

    const overlay = introEl;
    const stage = introStage;
    const big = introBig;
    introEl = introStage = introBig = null;

    const finish = () => {
      overlay.remove();
      big.destroy();
      panel.classList.remove("is-intro");
      greet();
    };

    const to = headMascot.getBoundingClientRect();
    if (instant || !to.width || panel.hidden) {
      finish();
      return;
    }

    const from = big.getBoundingClientRect();
    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    overlay.classList.add("is-leaving");
    overlay.style.pointerEvents = "none";
    stage.style.transition = "transform 0.65s cubic-bezier(0.5, 0, 0.2, 1)";
    stage.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    setTimeout(() => {
      // she's arrived: reveal the real header badge with a pop, then show the greeting
      const badge = headMascot.parentElement;
      panel.classList.remove("is-intro");
      badge.classList.add("is-landed");
      badge.addEventListener("animationend", () => badge.classList.remove("is-landed"), { once: true });
      overlay.remove();
      big.destroy();
      playMove(headMascot, null, true, "hop");
      greet();
    }, 680);
  }

  function greet() {
    addBot({
      answer: "Hiii, ESSUdyante! I'm Sugi, your ESSUGGEST helper. Ask me how things work, or tap a question below. Pls don't share your name, student number, or other personal details here, okay?",
      links: [{ label: "Data Privacy Policy", href: "/pages/PrivacyPolicy.html" }],
      chips: STARTERS,
    });
  }

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
    const shown = pick(answer);
    msg.appendChild(document.createTextNode(shown));

    const linkItems = (links || []).slice();
    if (linkItems.length || searchTerm) {
      const row = el("div", "essu-bot-links");
      linkItems.forEach((l) => {
        const a = el("a", "essu-bot-link", l.label);
        // "#section" links only work if that section is on this page; otherwise go to the homepage.
        const onPage = l.href.startsWith("#") && document.querySelector(l.href);
        a.href = l.href.startsWith("#") && !onPage ? "/pages/homepage.html" + l.href : l.href;
        if (onPage) a.addEventListener("click", closePanel);
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
    return shown;
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

     NOTE: Sugi's voice for AI replies lives in the system prompt inside
     functions/api/chat.js. Keep it in sync with the personality here.
  ------------------------------------------------------------------- */
  const AI_ENDPOINT = "/api/chat";
  const AI_SESSION_CAP = 12; // soft cap per page visit; the server enforces the real limit
  const DRAFT_RE = /\b(draft|rewrite|reword|improve|polish|proofread|help me write|ayusin)\b/i;
  const AI_NOTE = "\n\nSmall heads up, ESSUdyante: this one's AI-generated, so double-check the important stuff in the guides, okay?";
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
      answer: [
        "Hala, ESSUdyante, blanking ako on that one. You can search the site for it or email the team at essuggest@gmail.com.",
        "Ooh, that's beyond my little box brain. Try searching the site, or email the team at essuggest@gmail.com. Sorry po!",
        "Ngl, I'm lost on that one, hehe. Search the site or email essuggest@gmail.com, they'll help you out.",
      ],
      links: [{ label: "Email us", href: "mailto:essuggest@gmail.com" }],
      searchTerm: text,
      chips: STARTERS.slice(0, 3),
    };
  }

  /* ------------------------------------------------------------------
     TYPING INDICATOR
     Shows the thinking orb (pages/orbs.js, a vanilla port of thinking-orbs)
     while the bot is "typing". If orbs.js didn't load, it falls back to the
     three bouncing dots, so the chat never breaks.
     Orb sizes are only tuned for 20 (inline), 32 and 64 (avatar).

     DYNAMIC: the label and the orb animation change together every
     THINK_SWAP_MS. Each phrase is paired with one of the orb's nine states
     (working, searching, solving, listening, connecting, weaving, composing,
     breathing, shaping), so the orb visibly changes shape as Sugi "thinks".
     The phrase pool depends on the question (known / draft / ai), and after
     THINK_SLOW_AFTER_MS it switches to "thanks for waiting" lines.

     INDICATORS: step pips light up one per phrase, a progress bar fills over
     the planned think time (then becomes a "still working" sweep), the header
     status says "Sugi is thinking…", and the input row dims while she works.
     The npm package (thinking-orbs) is NOT needed: orbs.js already contains
     all nine states for this vanilla site.
  ------------------------------------------------------------------- */
  // How long the orb stays on screen before the reply shows (a random time in the range, per question kind).
  // Real AI latency still counts: if the AI is slower than this, the reply shows when it arrives.
  const THINK_RANGE = {
    known: [2400, 3200],
    draft: [3200, 4200],
    ai: [3000, 4000],
  };
  const thinkTime = (kind) => {
    const [a, b] = THINK_RANGE[kind] || THINK_RANGE.ai;
    return Math.round(a + Math.random() * (b - a));
  };
  const THINK_PIPS = 5; // step dots under the label

  const THINK_FIRST = { state: "solving", text: "Sugi is thinking…" };
  const THINK_POOLS = {
    // a rule matched: quick, "looking it up" phrasing
    known: [
      { state: "searching", text: "Checking the suggestion box…" },
      { state: "listening", text: "Got it, finding that for you…" },
      { state: "connecting", text: "Connecting the dots…" },
      { state: "working", text: "On it, ESSUdyante…" },
      { state: "breathing", text: "One sec, hehe…" },
    ],
    // draft / reword requests
    draft: [
      { state: "listening", text: "Reading your draft…" },
      { state: "composing", text: "Polishing your words…" },
      { state: "shaping", text: "Shaping it up…" },
      { state: "weaving", text: "Finding the right tone…" },
      { state: "working", text: "Fixing the little things…" },
    ],
    // everything else goes to the AI
    ai: [
      { state: "listening", text: "Reading your question…" },
      { state: "searching", text: "Digging through the guides…" },
      { state: "connecting", text: "Connecting the dots…" },
      { state: "weaving", text: "Weaving an answer…" },
      { state: "composing", text: "Composing a reply…" },
      { state: "breathing", text: "Hmm, let me think…" },
      { state: "shaping", text: "Shaping my thoughts…" },
      { state: "working", text: "Working on it…" },
      { state: "solving", text: "Solving the puzzle…" },
    ],
  };
  // shown once the wait gets long
  const THINK_SLOW = [
    { state: "working", text: "Still on it, thanks for waiting…" },
    { state: "breathing", text: "Almost there, promise…" },
    { state: "connecting", text: "Hang tight, ESSUdyante…" },
    { state: "working", text: "Sugi's working extra hard…" },
  ];
  const THINK_SWAP_MS = 1400; // how often the phrase + orb change
  const THINK_SLOW_AFTER_MS = 6000; // after this, switch to the "thanks for waiting" lines

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeTyping(kind, totalMs) {
    const box = el("div", "essu-bot-msg is-bot essu-bot-typing");
    box.setAttribute("aria-hidden", "true");

    if (window.EssuOrb) {
      box.classList.add("has-orb");
      box.style.setProperty("--think-ms", totalMs + "ms");
      box._orb = window.EssuOrb.create({ state: THINK_FIRST.state, size: 32, color: "#15803d" });

      const body = el("div", "essu-bot-typing-body");
      const label = el("p", "essu-bot-typing-text", THINK_FIRST.text);

      const pips = el("div", "essu-bot-pips");
      for (let i = 0; i < THINK_PIPS; i++) pips.appendChild(el("span"));
      pips.firstChild.classList.add("is-on");

      const meter = el("div", "essu-bot-meter");
      meter.appendChild(el("span"));

      body.append(label, pips, meter);
      box.append(box._orb, body);

      // after the planned time, the bar switches to a "still working" sweep
      box._long = setTimeout(() => box.classList.add("is-long"), totalMs);

      // shuffled so each wait looks different; cycles without repeating back to back
      const queue = shuffle(THINK_POOLS[kind] || THINK_POOLS.ai);
      const slow = shuffle(THINK_SLOW);
      const born = Date.now();
      let qi = 0;
      let si = 0;
      let step = 0;

      box._timer = setInterval(() => {
        const isSlow = Date.now() - born > THINK_SLOW_AFTER_MS;
        const next = isSlow ? slow[si++ % slow.length] : queue[qi++ % queue.length];
        step++;
        // light up one more pip each swap (stays full once it reaches the end)
        for (let i = 0; i < THINK_PIPS; i++) pips.children[i].classList.toggle("is-on", i <= step);
        label.classList.add("is-swapping"); // fade out, swap text + orb, fade back in
        setTimeout(() => {
          label.textContent = next.text;
          if (box._orb) box._orb.setState(next.state);
          label.classList.remove("is-swapping");
        }, 170);
      }, THINK_SWAP_MS);
    } else {
      box.append(el("span"), el("span"), el("span"));
    }
    return box;
  }

  function finish(typing, render) {
    clearInterval(typing._timer); // stop rotating phrases
    clearTimeout(typing._long);
    if (typing._orb) typing._orb.destroy(); // stop the orb's animation loop
    typing.remove();
    render();
    setBusyUI(false);
    playMove(headMascot, null, false, "hop"); // little hop when the reply lands
    busy = false;
  }

  // header status + dimmed input while Sugi is thinking
  function setBusyUI(on) {
    subStatus.textContent = on ? "Sugi is thinking…" : SUB_IDLE;
    form.classList.toggle("is-busy", on);
    log.setAttribute("aria-busy", on ? "true" : "false");
  }

  function ask(raw) {
    const text = raw.trim().slice(0, MAX_LEN);
    if (!text || busy) return;
    busy = true;
    if (introEl) exitIntro(true); // skip the intro if they send something early
    clearChips();
    addUser(text);
    playMove(headMascot, null, false, "nod"); // nods when you send

    // work out the topic first, so the thinking indicator can match it
    const hit = findAnswer(text);
    const kind = DRAFT_RE.test(text) ? "draft" : hit ? "known" : "ai";

    const minMs = thinkTime(kind);
    const typing = makeTyping(kind, minMs);
    log.appendChild(typing);
    scrollDown();
    setMood("thinking");
    setBusyUI(true);

    const repeat = !!hit && hit.id === lastId;
    lastId = hit ? hit.id : null;
    const startedAt = Date.now();

    // Wait out whatever is left of the planned think time, then show the reply.
    const reveal = (render) => {
      const wait = Math.max(0, minMs - (Date.now() - startedAt));
      setTimeout(() => finish(typing, render), wait);
    };

    // Known questions get a rule-based answer (after the short orb moment).
    if (hit && !DRAFT_RE.test(text)) {
      // Deeper reply for "how did..." follow-ups; a gentle note if it's the same topic again.
      const wantsMore = hit.more && (repeat || DETAIL_RE.test(text));
      const reply = wantsMore
        ? { answer: hit.more, links: hit.links, chips: hit.chips }
        : repeat
        ? {
            answer: REPEAT_REPLIES,
            links: [{ label: "FAQ", href: "/pages/faq.html" }, { label: "Email us", href: "mailto:essuggest@gmail.com" }],
            chips: hit.chips,
          }
        : hit;
      reveal(() => {
        setMood("happy");
        const shown = addBot(reply);
        // keep the AI's memory of the chat in sync, so later AI answers have context
        aiHistory.push({ role: "user", content: scrubPII(text) }, { role: "assistant", content: shown });
      });
      return;
    }

    // Everything else goes to the AI, with the rule-based reply as backup.
    askAI(text).then((reply) => {
      reveal(() => {
        if (!reply) {
          // no AI reply: happy if a rule matched, confused (for a few seconds) if not
          if (hit) setMood("happy");
          else setMood("confused", 5000);
          return addBot(hit || fallbackReply(text));
        }
        setMood("happy");
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
      if (canIntro()) runIntro();
      else greet();
    }
    playMove(headMascot, null, true, "wiggle"); // waves hello when the chat opens
    input.focus();
  }

  function closePanel() {
    if (panel.hidden) return;
    if (introEl) exitIntro(true); // don't leave a half-played intro behind
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

  input.addEventListener("input", () => {
    if (introEl) exitIntro(true); // typing skips the intro
  });

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