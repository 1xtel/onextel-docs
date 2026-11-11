// Builds the whole docs site into one PDF, in navigation order, with a cover, numbered contents and
// PDF bookmarks.
//
//   node scripts/pdf/build.mjs [--out path.pdf] [--only guides/sms] [--keep-html]
//
// The PDF is published on every merge to main by .github/workflows/docs-pdf.yml.

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";
import { h } from "./h.mjs";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import { slug } from "github-slugger";
import { createHighlighter } from "shiki";
import { chromium } from "playwright";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from "pdf-lib";
import sharp from "sharp";
import { createRenderer, splitFrontmatter } from "./mdx.mjs";
import { createOpenapiRenderer, loadSpec, parseOpenapiRef } from "./openapi.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = (process.env.DOCS_SITE_URL || "https://onextel-09023014.mintlify.site").replace(/\/$/, "");
const EXCLUDED_TABS = new Set(["Archived APIs"]);
const TITLE = "OneXtel Documentation";

const { values: args } = parseArgs({ options: {
  out: { type: "string", default: join(ROOT, ".pdf-build", "OneXtel-Docs.pdf") },
  only: { type: "string" },
  "keep-html": { type: "boolean", default: false },
} });
const WORK = join(ROOT, ".pdf-build");
mkdirSync(join(WORK, "img"), { recursive: true });

const warnings = new Set();
const warn = (m) => warnings.add(m);

// ---------- navigation ----------
const config = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));
const tabs = [];
const seenPages = new Set();
function walk(items, groups, openapi, out) {
  for (const item of items || []) {
    if (typeof item === "string") {
      if (item.endsWith(".yaml") || item.endsWith(".json") || seenPages.has(item)) continue;
      if (args.only && !item.startsWith(args.only)) continue;
      seenPages.add(item);
      out.push({ id: item, groups, openapi });
    } else if (item.group) {
      walk(item.pages, [...groups, item.group], item.openapi || openapi, out);
    }
  }
}
for (const tab of config.navigation.tabs || []) {
  if (EXCLUDED_TABS.has(tab.tab)) continue;
  const pages = [];
  walk(tab.groups || tab.pages, [], tab.openapi, pages);
  if (pages.length) tabs.push({ title: tab.tab, pages });
}
const pageSet = new Set(tabs.flatMap((t) => t.pages.map((p) => p.id)));

// ---------- links and images ----------
const anchorFor = (id) => "p-" + id.replace(/[^A-Za-z0-9]+/g, "-");
const liveUrl = (id) => `${SITE}/${id}`;

// Heading anchors are matched in slug form, so a link written as #part-a-—-set-up still finds
// the heading "Part A — Set up".
const hashId = (hash) => slug(decodeURIComponent(hash));

function resolveLink(url, pageId) {
  if (!url || /^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith("#")) return `#${anchorFor(pageId)}--${hashId(url.slice(1))}`;
  let [path, hash] = url.split("#");
  path = url.startsWith("/") ? path.replace(/^\/+/, "") : posix.normalize(posix.join(posix.dirname(pageId), path));
  path = path.replace(/\/+$/, "").replace(/\.mdx?$/, "") || "index";
  if (pageSet.has(path)) return `#${anchorFor(path)}${hash ? `--${hashId(hash)}` : ""}`;
  return `${SITE}/${path === "index" ? "" : path}${hash ? `#${hash}` : ""}`;
}

// Images are downscaled and re-encoded as JPEG so the PDF stays a reasonable size.
const imageJobs = new Map();
function resolveImage(src) {
  if (!src || /^(https?:|data:)/i.test(src)) return src;
  const file = join(ROOT, decodeURI(src.replace(/^\//, "")));
  if (!existsSync(file)) { warn(`missing image ${src}`); return src; }
  if (/\.svg$/i.test(file)) return pathToFileURL(file).href;
  const out = join(WORK, "img", src.replace(/^\//, "").replace(/[^A-Za-z0-9.-]+/g, "_").replace(/\.\w+$/, "") + ".jpg");
  imageJobs.set(out, file);
  return pathToFileURL(out).href;
}

// ---------- render pages ----------
const highlighter = await createHighlighter({ themes: ["github-light"], langs: ["bash", "json", "javascript", "csv", "text"] });
const LANG_ALIASES = { js: "javascript", sh: "bash", shell: "bash", curl: "bash" };
const render = createRenderer({ highlighter, resolveLink, resolveImage, liveUrl, anchorFor, warn });
const codeBlock = (value, lang, title) => {
  const root = highlighter.codeToHast(value, { lang: LANG_ALIASES[lang] || lang, theme: "github-light" });
  return h("figure.code", [title && h("figcaption", title), ...root.children]);
};
let currentPage = "openapi";
const md = (text) => render(String(text), { page: currentPage, mdx: false, headingOffset: 3 }).children;
const renderOperation = createOpenapiRenderer({ md, code: codeBlock });

const articles = [];
for (const tab of tabs) {
  articles.push(h("section.part", { id: anchorFor(`tab-${tab.title}`) }, [h("h1", tab.title)]));
  for (const page of tab.pages) {
    const file = [`${page.id}.mdx`, `${page.id}.md`].map((f) => join(ROOT, f)).find(existsSync);
    if (!file) { warn(`${page.id}: in docs.json but no file`); continue; }
    const { data, body } = splitFrontmatter(readFileSync(file, "utf8"));
    const source = body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, k) => config.variables?.[k] ?? m);
    let content;
    try {
      content = render(source, { page: page.id }).children;
    } catch (e) {
      warn(`${page.id}: could not parse (${e.message.split("\n")[0]}), printed as plain text`);
      content = [h("pre", body)];
    }
    const ref = parseOpenapiRef(data.openapi);
    currentPage = page.id;
    let endpoint = [];
    if (ref) {
      const specFile = ref.spec ? join(ROOT, ref.spec.replace(/^\//, "")) : page.openapi && join(ROOT, page.openapi);
      if (specFile && existsSync(specFile)) {
        const op = renderOperation(loadSpec(specFile), ref.method, ref.path, { headingLevel: 3, withDescription: !data.description });
        endpoint = op.head;
        content.push(...op.body);
      } else warn(`${page.id}: OpenAPI spec not found for "${data.openapi}"`);
    }
    articles.push(h("article.page", { id: anchorFor(page.id) }, [
      page.groups.length ? h("div.eyebrow", page.groups.join(" · ")) : null,
      h("h2.page-title", data.title || page.id.split("/").pop()),
      data.description ? h("p.lead", data.description) : null,
      ...endpoint,
      ...content,
    ]));
  }
}

// Links to a heading the PDF slugged differently fall back to the top of that page.
const ids = new Set();
const doc = h("main", articles);
visit(doc, "element", (n) => { if (n.properties?.id) ids.add(n.properties.id); });
const relinked = [];
visit(doc, "element", (n) => {
  const href = n.tagName === "a" && n.properties?.href;
  if (typeof href !== "string" || !href.startsWith("#") || ids.has(href.slice(1))) return;
  const page = href.slice(1).split("--")[0];
  n.properties.href = ids.has(page) ? `#${page}` : undefined;
  relinked.push(href);
});

await Promise.all([...imageJobs].map(([out, file]) => existsSync(out) && statSync(out).mtimeMs > statSync(file).mtimeMs
  ? null
  : sharp(file, { animated: false }).resize({ width: 1600, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toFile(out)));

// ---------- contents ----------
const toc = h("nav.toc", { id: "toc" }, [h("h1", "Contents"), ...tabs.flatMap((tab) => {
  const rows = [h("div.toc-tab", [h("a", { href: `#${anchorFor(`tab-${tab.title}`)}` }, tab.title), h("span.leader"), h("span.pn", { dataTarget: anchorFor(`tab-${tab.title}`) }, "000")])];
  let last = "";
  for (const p of tab.pages) {
    const group = p.groups.join(" · ");
    if (group && group !== last) rows.push(h("div.toc-group", group));
    last = group;
    const file = [`${p.id}.mdx`, `${p.id}.md`].map((f) => join(ROOT, f)).find(existsSync);
    const title = file ? splitFrontmatter(readFileSync(file, "utf8")).data.title || p.id : p.id;
    rows.push(h("div.toc-page", [h("a", { href: `#${anchorFor(p.id)}` }, title), h("span.leader"), h("span.pn", { dataTarget: anchorFor(p.id) }, "000")]));
  }
  return rows;
})]);

const sha = (process.env.GITHUB_SHA || safe(() => execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim()) || "").slice(0, 7);
const built = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
function safe(fn) { try { return fn(); } catch { return ""; } }

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "style.css"), "utf8");
// Fonts come from npm as fixed weights. Google Fonts serves Linux Chromium a variable Montserrat,
// which prints with uneven letter spacing.
const fonts = ["montserrat/400", "montserrat/500", "montserrat/600", "montserrat/700", "jetbrains-mono/400", "jetbrains-mono/600"]
  .map((f) => `<link rel="stylesheet" href="${pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "node_modules/@fontsource", `${f}.css`)).href}">`)
  .join("");
const hasMermaid = toHtml(doc).includes('class="mermaid"');
// Mermaid loads from node_modules as a classic script: module scripts do not load over file://.
const mermaidJs = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "node_modules/mermaid/dist/mermaid.min.js")).href;
const mermaid = hasMermaid
  ? `<script src="${mermaidJs}"></script><script>
     mermaid.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Montserrat" });
     mermaid.run({ querySelector: ".mermaid" }).catch((e) => { window.__mermaidError = String(e); }).finally(() => { window.__mermaidDone = true; });</script>`
  : "<script>window.__mermaidDone = true</script>";
const page = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${TITLE}</title>${fonts}<style>${css}</style></head><body>${body}${mermaid}</body></html>`;

// The cover logo keeps its transparency: JPEG leaves a visible box around it.
const logoFile = join(WORK, "img", "cover-logo.png");
if (!existsSync(logoFile)) await sharp(join(ROOT, "images/logo.png")).trim().resize({ width: 1400 }).png().toFile(logoFile);
const logo = pathToFileURL(logoFile).href;
const coverHtml = page(`<section style="height:250mm;display:flex;flex-direction:column;justify-content:center;padding:0 22mm">
  <img src="${logo}" alt="OneXtel" style="width:80mm;margin:0 0 14mm">
  <div style="font-size:30pt;font-weight:700;color:#252e6a;line-height:1.15">Documentation</div>
  <div style="font-size:12pt;color:#5d6475;margin-top:4mm">Guides, API reference and plugins for WhatsApp, RCS and SMS</div>
  <div style="height:3px;width:40mm;background:#d72327;margin:12mm 0 8mm"></div>
  <div style="font-size:9pt;color:#5d6475;line-height:1.7">Generated ${built}${sha ? ` from revision ${sha}` : ""}<br>
  The latest version is always at <a href="${SITE}" style="color:#252e6a">${SITE.replace(/^https:\/\//, "")}</a></div></section>`);

// ---------- print ----------
const footer = `<div style="width:100%;font-family:Arial,sans-serif;font-size:7pt;color:#8a90a0;padding:0 16mm;display:flex;justify-content:space-between">
  <span>${TITLE}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
const browser = await chromium.launch();
async function print(html, { withFooter }) {
  const file = join(WORK, withFooter ? "docs.html" : "cover.html");
  writeFileSync(file, html);
  const tab = await browser.newPage();
  await tab.goto(pathToFileURL(file).href, { waitUntil: "networkidle", timeout: 120_000 });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForFunction(() => window.__mermaidDone === true, null, { timeout: 30_000 }).catch(() => warn("mermaid diagrams timed out"));
  const mermaidError = await tab.evaluate(() => window.__mermaidError);
  if (mermaidError) warn(`mermaid: ${mermaidError}`);
  const pdf = await tab.pdf({
    format: "A4", printBackground: true, outline: withFooter, tagged: true,
    margin: withFooter ? { top: "15mm", bottom: "17mm", left: "16mm", right: "16mm" } : { top: "0", bottom: "0", left: "0", right: "0" },
    displayHeaderFooter: withFooter, headerTemplate: "<span></span>", footerTemplate: footer,
  });
  await tab.close();
  return pdf;
}

// Chromium writes a named destination for every in-document link target; read their page numbers.
async function destinationPages(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const index = new Map(pdf.getPages().map((p, i) => [p.ref.toString(), i + 1]));
  const out = new Map();
  const add = (name, dest) => {
    if (dest instanceof PDFRef) dest = pdf.context.lookup(dest);
    if (dest instanceof PDFDict) dest = dest.lookup(PDFName.of("D"));
    const ref = dest instanceof PDFArray ? dest.get(0) : null;
    if (ref instanceof PDFRef && index.has(ref.toString())) out.set(name, index.get(ref.toString()));
  };
  const dests = pdf.catalog.lookup(PDFName.of("Dests"));
  if (dests instanceof PDFDict) for (const [k, v] of dests.entries()) add(k.decodeText(), v);
  const tree = pdf.catalog.lookup(PDFName.of("Names"))?.lookup?.(PDFName.of("Dests"));
  (function names(node) {
    if (!(node instanceof PDFDict)) return;
    const arr = node.lookup(PDFName.of("Names"));
    if (arr instanceof PDFArray) for (let i = 0; i < arr.size(); i += 2) add(arr.lookup(i).decodeText(), arr.get(i + 1));
    const kids = node.lookup(PDFName.of("Kids"));
    if (kids instanceof PDFArray) for (let i = 0; i < kids.size(); i++) names(kids.lookup(i));
  })(tree);
  return out;
}

let numbers = new Map();
let bodyPdf;
for (let pass = 1; pass <= 3; pass++) {
  visit(toc, "element", (n) => {
    if (n.properties?.dataTarget) n.children = [{ type: "text", value: String(numbers.get(n.properties.dataTarget) ?? "000") }];
  });
  bodyPdf = await print(page(toHtml(h("div", [toc, doc]))), { withFooter: true });
  const next = await destinationPages(bodyPdf);
  const stable = [...next].every(([k, v]) => numbers.get(k) === v);
  numbers = next;
  if (stable && pass > 1) break;
}
const coverPdf = await print(coverHtml, { withFooter: false });
await browser.close();

const out = await PDFDocument.load(bodyPdf);
const [cover] = await out.copyPages(await PDFDocument.load(coverPdf), [0]);
out.insertPage(0, cover);
out.setTitle(TITLE);
out.setAuthor("OneXtel");
out.setSubject("Guides, API reference and plugins");
mkdirSync(dirname(resolve(args.out)), { recursive: true });
writeFileSync(args.out, await out.save());

const missing = tabs.flatMap((t) => t.pages).filter((p) => !numbers.has(anchorFor(p.id))).length;
console.log(`${pageSet.size} pages, ${out.getPageCount()} PDF pages, ${(statSync(args.out).size / 1048576).toFixed(1)} MB → ${args.out}`);
if (missing) console.log(`${missing} pages have no page number in the contents`);
if (relinked.length) console.log(`${relinked.length} links pointed at headings slugged differently; they open the page instead:\n  ${relinked.join("\n  ")}`);
for (const w of warnings) console.log(`warning: ${w}`);
if (args["keep-html"]) console.log(`html: ${join(WORK, "docs.html")}`);
