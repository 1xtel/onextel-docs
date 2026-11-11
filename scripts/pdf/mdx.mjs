// Turns one docs page (MDX) into a HAST tree for the print document. Every Mintlify component the
// site uses is mapped to static markup, so content hidden behind tabs, steps or expandables on the
// website is printed in full.

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { h } from "./h.mjs";
import { toString } from "mdast-util-to-string";
import GithubSlugger, { slug } from "github-slugger";
import YAML from "yaml";

export function splitFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  return m ? { data: YAML.parse(m[1]) || {}, body: src.slice(m[0].length) } : { data: {}, body: src };
}

const CALLOUTS = { Note: "Note", Info: "Info", Tip: "Tip", Warning: "Warning", Check: "Check", Danger: "Danger" };
const FIELD_LOCATIONS = ["path", "query", "body", "header", "cookie"];
const PASS_THROUGH = new Set(["div", "span", "p", "a", "img", "br", "b", "strong", "i", "em", "u", "sup", "sub", "small",
  "code", "pre", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "hr", "h3", "h4", "h5"]);

// Attribute values arrive as strings, null (a bare boolean attribute) or JS expressions like {2}.
function attrs(node) {
  const out = {};
  for (const a of node.attributes || []) {
    if (a.type !== "mdxJsxAttribute") continue;
    if (a.value === null || a.value === undefined) out[a.name] = true;
    else if (typeof a.value === "string") out[a.name] = a.value;
    else out[a.name] = literal(a.value.value);
  }
  return out;
}

function literal(expr) {
  const s = String(expr).trim();
  if (s === "true") return true;
  if (s === "false") return false;
  const str = /^(["'`])([\s\S]*)\1$/.exec(s);
  if (str) return str[2];
  try { return JSON.parse(s); } catch { return s; }
}

// Mintlify reads a code block's title from the fence meta: ```json Response
function codeTitle(meta) {
  if (!meta) return "";
  return meta.replace(/\{[^}]*\}/g, "").replace(/\b\w+=("[^"]*"|\S+)/g, "")
    .replace(/\b(wrap|lines|expandable|twoslash)\b/g, "").trim();
}

export function createRenderer({ highlighter, resolveLink, resolveImage, liveUrl, anchorFor, warn }) {
  const langs = new Set(highlighter.getLoadedLanguages());

  function code(value, lang, title) {
    if (lang === "mermaid") return h("figure.code.diagram", [title && h("figcaption", title), h("pre.mermaid", value)]);
    const l = lang && langs.has(lang) ? lang : "text";
    const root = highlighter.codeToHast(value.replace(/\n$/, ""), { lang: l, theme: "github-light" });
    return h("figure.code", [title && h("figcaption", title), ...root.children]);
  }

  // `markdown` is MDX unless `mdx` is false (OpenAPI descriptions are plain Markdown).
  // `page` is the docs path, such as "guides/sms/overview".
  return function render(markdown, { page, headingOffset = 1, mdx = true, slugger = new GithubSlugger() }) {
    const imported = new Set();
    const processor = unified().use(remarkParse);
    if (mdx) processor.use(remarkMdx);
    processor.use(remarkGfm);
    const tree = processor.parse(markdown);
    processor.runSync(tree);

    const component = (state, node) => {
      const a = attrs(node);
      const kids = () => state.all(node);
      const name = node.name;
      if (!name) return kids();
      if (CALLOUTS[name]) return h("aside.callout", { className: [name.toLowerCase()] }, [h("div.callout-label", CALLOUTS[name]), ...kids()]);
      switch (name) {
        case "Steps": return h("ol.steps", kids());
        case "Step": return h("li.step", [a.title && h("div.step-title", String(a.title)), h("div.step-body", kids())]);
        case "Tabs": return h("div.tabs", kids());
        case "Tab": return h("section.tab", [h("div.tab-label", String(a.title || "")), ...kids()]);
        case "CodeGroup": return h("div.code-group", kids());
        case "RequestExample": return h("div.example", [h("div.example-label", "Request example"), ...kids()]);
        case "ResponseExample": return h("div.example", [h("div.example-label", "Response example"), ...kids()]);
        case "ParamField": {
          const loc = FIELD_LOCATIONS.find((k) => typeof a[k] === "string");
          return field(loc ? a[loc] : "", a, loc, kids());
        }
        case "ResponseField": return field(a.name || "", a, null, kids());
        case "Expandable": return h("div.expandable", [h("div.expandable-title", String(a.title || "Properties")), ...kids()]);
        case "Card": {
          const href = a.href ? resolveLink(a.href, page) : null;
          return h("div.card", [a.title && (href ? h("a.card-title", { href }, String(a.title)) : h("div.card-title", String(a.title))), ...kids()]);
        }
        case "CardGroup": case "Columns": return h("div.cards", kids());
        case "AccordionGroup": return h("div.accordion-group", kids());
        case "Accordion": return h("div.accordion", [h("div.accordion-title", String(a.title || "")), ...kids()]);
        case "Frame": return h("figure.frame", [...kids(), a.caption && h("figcaption", String(a.caption))]);
        case "Update": return h("section.update", [h("div.update-label", String(a.label || "")), ...kids()]);
        case "Badge": return h("span.badge", kids());
        case "video": {
          return h("aside.callout.info", [h("div.callout-label", "Video"), h("p", ["This page has a video. Watch it on the docs site: ", h("a", { href: liveUrl(page) }, liveUrl(page))])]);
        }
        case "Tooltip": return h("span", kids());
        case "Icon": return null;
      }
      if (imported.has(name)) {
        // Snippet components are interactive widgets; point the reader at the live page.
        const url = liveUrl(page);
        return h("aside.callout.info", [h("div.callout-label", "Interactive tool"),
          h("p", ["This tool runs on the docs site: ", h("a", { href: url }, url)])]);
      }
      if (PASS_THROUGH.has(name)) {
        const props = {};
        if (a.href) props.href = resolveLink(String(a.href), page);
        if (a.src) props.src = resolveImage(String(a.src));
        if (a.id) props.id = `${anchorFor(page)}--${slug(String(a.id))}`;
        for (const k of ["alt", "title", "colSpan", "rowSpan", "align"]) if (a[k] !== undefined) props[k] = a[k];
        return h(name, props, kids());
      }
      warn(`${page}: no print mapping for <${name}>, printing its content only`);
      return h("div", kids());
    };

    const field = (fieldName, a, loc, children) => h("div.field", [
      h("div.field-head", [
        h("code.field-name", fieldName),
        a.type && h("span.field-type", String(a.type)),
        loc && loc !== "body" && h("span.field-in", loc),
        a.required && h("span.badge.required", "required"),
        a.deprecated && h("span.badge.deprecated", "deprecated"),
        a.default !== undefined && h("span.field-default", ["default: ", h("code", String(a.default))]),
      ]),
      children.length ? h("div.field-body", children) : null,
    ]);

    const hast = unified().use(remarkRehype, {
      handlers: {
        heading(state, node) {
          const text = toString(node);
          return h(`h${Math.min(6, node.depth + headingOffset)}`, { id: `${anchorFor(page)}--${slugger.slug(text)}` }, state.all(node));
        },
        link: (state, node) => h("a", { href: resolveLink(node.url, page) }, state.all(node)),
        image: (state, node) => h("img", { src: resolveImage(node.url), alt: node.alt || "" }),
        code: (state, node) => code(node.value, (node.lang || "").toLowerCase(), codeTitle(node.meta)),
        mdxjsEsm(state, node) {
          for (const m of node.value.matchAll(/import\s+(?:(\w+)|\{([^}]*)\})\s+from/g)) {
            if (m[1]) imported.add(m[1]);
            if (m[2]) m[2].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach((n) => imported.add(n));
          }
          return null;
        },
        mdxJsxFlowElement: component,
        mdxJsxTextElement: component,
        mdxFlowExpression: (state, node) => expression(node),
        mdxTextExpression: (state, node) => expression(node),
      },
    }).runSync(tree);
    return hast;
  };
}

// Only string literals such as {" "} print; comments and other expressions are dropped.
function expression(node) {
  const m = /^\s*(["'`])([\s\S]*)\1\s*$/.exec(node.value);
  return m ? { type: "text", value: m[2] } : null;
}
