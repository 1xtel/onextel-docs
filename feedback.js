// On-page feedback for the beta docs.
//
// A reviewer selects text (or picks a block) on any page, writes what is wrong, and the note is
// kept against that page. The Feedback button, bottom right, lists the notes for the current page
// and highlights the text each one refers to.
//
// Notes are stored through FEEDBACK_ENDPOINT, a small web app that accepts
//   GET  ?page=/path            -> { items: [...] }
//   POST { action, ...fields }  -> { ok: true, item }
// (see scripts/feedback/Code.gs). While FEEDBACK_ENDPOINT is empty, notes are kept in this
// browser only, which is enough to try the flow but shares nothing.
(() => {
  if (window.onextelFeedback) return;
  window.onextelFeedback = true;

  const FEEDBACK_ENDPOINT = "https://script.google.com/macros/s/AKfycbz-6hA-o8awODFzCVX_odJ5hyPUs5cetik9YELYNFtU9DPoq76PqXe-UqB8_9ifSJLw/exec";
  const LOCAL_KEY = "onextel-docs-feedback";
  const NAME_KEY = "onextel-docs-feedback-name";
  const BLOCKS =
    "p, li, tr, pre, img, h1, h2, h3, h4, blockquote, .card, .callout, .step, [data-component-part='code-block-root'], span[data-as='p']";

  const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  };
  const squash = (text) => (text || "").replace(/\s+/g, " ").trim();
  const pagePath = () => location.pathname.replace(/\/+$/, "") || "/";
  const content = () => document.querySelector("#content") || document.querySelector("main") || document.body;
  const inWidget = (node) => !!(node && node.nodeType === 1 ? node : node?.parentElement)?.closest(".oxf");

  // ---- storage ------------------------------------------------------------------------------

  const readLocal = () => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const writeLocal = (items) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable: the note still shows until the page reloads */
    }
  };

  const store = {
    async list(page) {
      if (!FEEDBACK_ENDPOINT) return readLocal().filter((item) => item.page === page);
      const response = await fetch(`${FEEDBACK_ENDPOINT}?page=${encodeURIComponent(page)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()).items || [];
    },
    async send(payload) {
      if (!FEEDBACK_ENDPOINT) {
        const items = readLocal();
        if (payload.action === "add") {
          const item = { ...payload.item, id: `local-${Date.now()}`, createdAt: new Date().toISOString(), status: "open" };
          writeLocal(items.concat(item));
          return item;
        }
        const found = items.find((item) => item.id === payload.id);
        if (found) found.status = payload.status;
        writeLocal(items);
        return found;
      }
      // A string body is sent as text/plain, so the browser makes no CORS preflight request.
      const response = await fetch(FEEDBACK_ENDPOINT, { method: "POST", body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "The note was not saved");
      return data.item;
    },
  };

  // ---- finding quoted text on the page --------------------------------------------------------

  // Returns a Range for the first place `quote` appears in the page content, or null when the text
  // is no longer there. Whitespace is ignored, so a quote that spans several blocks still matches.
  const findQuote = (quote) => {
    const wanted = (quote || "").replace(/\s+/g, "");
    if (!wanted) return null;
    const walker = document.createTreeWalker(content(), NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (inWidget(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let text = "";
    const map = []; // one entry per character of `text`: [textNode, offset]
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.nodeValue;
      for (let i = 0; i < value.length; i += 1) {
        if (/\s/.test(value[i])) continue;
        text += value[i];
        map.push([node, i]);
      }
    }
    const at = text.indexOf(wanted);
    if (at < 0) return null;
    const [startNode, startOffset] = map[at];
    const [endNode, endOffset] = map[at + wanted.length - 1];
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset + 1);
    return range;
  };

  const paintHighlights = (items) => {
    if (!window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
    const ranges = items
      .filter((item) => item.status !== "resolved")
      .map((item) => findQuote(item.quote))
      .filter(Boolean);
    if (ranges.length) CSS.highlights.set("oxf-note", new Highlight(...ranges));
    else CSS.highlights.delete("oxf-note");
  };

  const nearestHeading = (node) => {
    const headings = [...content().querySelectorAll("h1, h2, h3")].filter((h) => !inWidget(h));
    let found = "";
    for (const heading of headings) {
      if (heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING || heading.contains(node)) found = squash(heading.textContent);
      else break;
    }
    return found.replace(/^​/, "");
  };

  // ---- interface ------------------------------------------------------------------------------

  let items = [];
  let pending = null; // { quote, heading, kind }
  let picking = false;

  const bubble = el("button", { type: "button", class: "oxf oxf-bubble", hidden: "" }, "Give feedback");
  const launcher = el("button", { type: "button", class: "oxf oxf-launcher", "aria-haspopup": "dialog" }, "Feedback");
  const panel = el("aside", { class: "oxf oxf-panel", hidden: "", role: "dialog", "aria-label": "Feedback on this page" });
  const pickHint = el("div", { class: "oxf oxf-pick-hint", hidden: "", role: "status" }, "Click the part of the page your feedback is about. Press Esc to cancel.");
  const status = el("p", { class: "oxf-status", role: "status" });
  const list = el("ol", { class: "oxf-list" });
  const quoteBox = el("blockquote", { class: "oxf-quote" });
  const comment = el("textarea", {
    class: "oxf-input",
    rows: "4",
    required: "",
    placeholder: "What is wrong here, and how should the product behave?",
    "aria-label": "Your feedback",
  });
  const nameInput = el("input", { class: "oxf-input", type: "text", required: "", placeholder: "Your name", "aria-label": "Your name" });
  const submit = el("button", { type: "submit", class: "oxf-primary" }, "Save feedback");
  const cancel = el("button", { type: "button", class: "oxf-link" }, "Cancel");
  const form = el("form", { class: "oxf-form", hidden: "" }, [quoteBox, comment, nameInput, el("div", { class: "oxf-actions" }, [submit, cancel])]);
  const addPage = el("button", { type: "button", class: "oxf-secondary" }, "Comment on the whole page");
  const addPick = el("button", { type: "button", class: "oxf-secondary" }, "Pick a part of the page");
  const close = el("button", { type: "button", class: "oxf-link", "aria-label": "Close feedback" }, "Close");
  const starters = el("div", { class: "oxf-starters" }, [addPick, addPage]);
  const localNote = el("p", { class: "oxf-local" }, "Feedback is saved in this browser only until a shared store is connected.");

  panel.append(
    el("div", { class: "oxf-head" }, [el("strong", { text: "Feedback on this page" }), close]),
    el("p", { class: "oxf-help" }, "Select any text on the page and choose Give feedback, or start below."),
    starters,
    form,
    status,
    list,
    FEEDBACK_ENDPOINT ? null : localNote,
  );

  const openCount = () => items.filter((item) => item.status !== "resolved").length;
  const renderLauncher = () => {
    const count = openCount();
    launcher.textContent = count ? `Feedback (${count})` : "Feedback";
  };

  const renderList = () => {
    list.replaceChildren();
    if (!items.length) {
      list.append(el("li", { class: "oxf-empty" }, "No feedback on this page yet."));
    }
    for (const item of [...items].reverse()) {
      const resolved = item.status === "resolved";
      const jump = el("button", { type: "button", class: "oxf-jump" }, item.quote ? `“${item.quote.slice(0, 140)}${item.quote.length > 140 ? "…" : ""}”` : "Whole page");
      jump.addEventListener("click", () => {
        const range = findQuote(item.quote);
        if (!range) return;
        (range.startContainer.parentElement || content()).scrollIntoView({ block: "center", behavior: "smooth" });
        if (window.CSS && CSS.highlights && typeof Highlight !== "undefined") {
          CSS.highlights.set("oxf-focus", new Highlight(range));
          setTimeout(() => CSS.highlights.delete("oxf-focus"), 2500);
        }
      });
      const toggle = el("button", { type: "button", class: "oxf-link" }, resolved ? "Reopen" : "Mark resolved");
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        try {
          await store.send({ action: "status", id: item.id, status: resolved ? "open" : "resolved" });
          item.status = resolved ? "open" : "resolved";
          refreshView();
        } catch (error) {
          status.textContent = `Could not update the note: ${error.message}`;
          toggle.disabled = false;
        }
      });
      const when = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
      list.append(
        el("li", { class: resolved ? "oxf-item oxf-resolved" : "oxf-item" }, [
          jump,
          el("p", { class: "oxf-comment", text: item.comment }),
          el("p", { class: "oxf-meta" }, [el("span", { text: [item.name, when, resolved ? "Resolved" : ""].filter(Boolean).join(" · ") }), toggle]),
        ]),
      );
    }
  };

  const refreshView = () => {
    renderLauncher();
    renderList();
    paintHighlights(items);
  };

  const load = async () => {
    status.textContent = "";
    try {
      items = await store.list(pagePath());
    } catch (error) {
      items = [];
      status.textContent = `Could not load feedback for this page: ${error.message}`;
    }
    refreshView();
  };

  const openPanel = () => {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
  };
  const closePanel = () => {
    panel.hidden = true;
    form.hidden = true;
    starters.hidden = false;
    launcher.setAttribute("aria-expanded", "false");
  };

  const startNote = (note) => {
    pending = note;
    quoteBox.textContent = note.quote ? note.quote.slice(0, 400) + (note.quote.length > 400 ? "…" : "") : "The whole page";
    try {
      nameInput.value = nameInput.value || localStorage.getItem(NAME_KEY) || "";
    } catch {
      /* no saved name */
    }
    form.hidden = false;
    starters.hidden = true;
    status.textContent = "";
    openPanel();
    comment.focus();
  };

  const stopPicking = () => {
    picking = false;
    pickHint.hidden = true;
    document.documentElement.classList.remove("oxf-picking");
    document.querySelectorAll(".oxf-pick-target").forEach((node) => node.classList.remove("oxf-pick-target"));
  };

  // ---- events ---------------------------------------------------------------------------------

  document.addEventListener("selectionchange", () => {
    const selection = document.getSelection();
    const text = selection ? squash(selection.toString()) : "";
    if (!selection || selection.isCollapsed || text.length < 3 || inWidget(selection.anchorNode) || !content().contains(selection.anchorNode)) {
      bubble.hidden = true;
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    bubble.style.top = `${Math.max(8, rect.top + window.scrollY - 40)}px`;
    bubble.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
    bubble.hidden = false;
  });

  // Keep the selection alive while the bubble is pressed.
  bubble.addEventListener("mousedown", (event) => event.preventDefault());
  bubble.addEventListener("click", () => {
    const selection = document.getSelection();
    const quote = squash(selection.toString()).slice(0, 1000);
    const anchor = selection.anchorNode;
    bubble.hidden = true;
    startNote({ quote, heading: nearestHeading(anchor), kind: "text" });
  });

  launcher.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
  close.addEventListener("click", closePanel);
  cancel.addEventListener("click", () => {
    form.hidden = true;
    starters.hidden = false;
    pending = null;
  });
  addPage.addEventListener("click", () => startNote({ quote: "", heading: "", kind: "page" }));
  addPick.addEventListener("click", () => {
    picking = true;
    panel.hidden = true;
    pickHint.hidden = false;
    document.documentElement.classList.add("oxf-picking");
  });

  document.addEventListener("mouseover", (event) => {
    if (!picking) return;
    document.querySelectorAll(".oxf-pick-target").forEach((node) => node.classList.remove("oxf-pick-target"));
    const target = event.target.closest?.(BLOCKS);
    if (target && content().contains(target) && !inWidget(target)) target.classList.add("oxf-pick-target");
  });
  document.addEventListener(
    "click",
    (event) => {
      if (!picking) return;
      const target = event.target.closest?.(BLOCKS);
      if (!target || !content().contains(target) || inWidget(target)) return;
      event.preventDefault();
      event.stopPropagation();
      const quote = squash(target.tagName === "IMG" ? target.alt : target.innerText).slice(0, 1000);
      const heading = nearestHeading(target);
      stopPicking();
      startNote({ quote, heading, kind: target.tagName === "IMG" ? "image" : "block" });
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (picking) {
      stopPicking();
      openPanel();
    } else if (!panel.hidden) closePanel();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pending) return;
    submit.disabled = true;
    status.textContent = "Saving…";
    try {
      localStorage.setItem(NAME_KEY, nameInput.value.trim());
    } catch {
      /* name is not remembered */
    }
    try {
      const item = await store.send({
        action: "add",
        item: {
          page: pagePath(),
          title: document.title,
          quote: pending.quote,
          heading: pending.heading,
          kind: pending.kind,
          comment: comment.value.trim(),
          name: nameInput.value.trim(),
        },
      });
      items.push(item);
      comment.value = "";
      form.hidden = true;
      starters.hidden = false;
      pending = null;
      status.textContent = "Saved. Thank you.";
      refreshView();
    } catch (error) {
      status.textContent = `Could not save your feedback: ${error.message}`;
    } finally {
      submit.disabled = false;
    }
  });

  const mount = () => {
    for (const node of [bubble, launcher, panel, pickHint]) if (!node.isConnected) document.body.append(node);
  };
  const onPage = () => {
    mount();
    stopPicking();
    closePanel();
    load();
  };

  onPage();
  window.addEventListener("mintlify:navigate", onPage);
})();
