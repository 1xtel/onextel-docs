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

// Images are downscaled and re-encoded as JPEG so the PDF stays a reasonable size. SVGs are
// copied with Open Sans and its Noto Sans Math fallback embedded: an SVG shown as an image cannot
// use the page's fonts, and would otherwise fall back to a system font for arrows such as ⇄.
const FONT_FILES = join(dirname(fileURLToPath(import.meta.url)), "node_modules/@fontsource");
const b64 = (f) => readFileSync(f).toString("base64");
const svgFonts = [400, 600, 700].map((w) => `@font-face{font-family:"Open Sans";font-weight:${w};src:url(data:font/woff2;base64,${b64(join(FONT_FILES, `open-sans/files/open-sans-latin-${w}-normal.woff2`))}) format("woff2")}`).join("")
  + `@font-face{font-family:"Noto Sans Math";src:url(data:font/woff2;base64,${b64(join(FONT_FILES, "noto-sans-math/files/noto-sans-math-latin-400-normal.woff2"))}) format("woff2")}`;
const imageJobs = new Map();
function resolveImage(src) {
  if (!src || /^(https?:|data:)/i.test(src)) return src;
  const file = join(ROOT, decodeURI(src.replace(/^\//, "")));
  if (!existsSync(file)) { warn(`missing image ${src}`); return src; }
  if (/\.svg$/i.test(file)) {
    const out = join(WORK, "img", src.replace(/^\//, "").replace(/[^A-Za-z0-9.-]+/g, "_"));
    const svg = readFileSync(file, "utf8")
      .replace(/font-family="[^"]*"/g, "font-family=\"'Open Sans', 'Noto Sans Math'\"")
      .replace(/font-family:[^;"]*/g, "font-family:'Open Sans','Noto Sans Math'")
      .replace(/(<svg\b[^>]*>)/, `$1<style>${svgFonts}</style>`);
    writeFileSync(out, svg);
    return pathToFileURL(out).href;
  }
  const out = join(WORK, "img", src.replace(/^\//, "").replace(/[^A-Za-z0-9.-]+/g, "_").replace(/\.\w+$/, "") + ".jpg");
  imageJobs.set(out, file);
  return pathToFileURL(out).href;
}

// ---------- brand assets ----------
// Colours and marks follow the OneXtel Brand Guidelines (v9); style.css carries the palette.
const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = { red: "#d72327", navy: "#252e6a", sky: "#dae6f1", grey: "#e6e7e8", gold: "#f7e7ce", ink: "#231f20", muted: "#666666" };
const fileUrl = (...p) => pathToFileURL(join(...p)).href;
const curve = fileUrl(HERE, "assets", "curve.svg");

// The red wordmark goes on white; on navy the guidelines call for the white wordmark. Both keep
// their transparency: JPEG would leave a visible box around them.
const redLogo = join(WORK, "img", "logo-red.png");
const whiteLogo = join(WORK, "img", "logo-white.png");
if (!existsSync(redLogo) || !existsSync(whiteLogo)) {
  const base = sharp(join(ROOT, "images/logo.png")).trim().resize({ width: 1400 }).ensureAlpha();
  await base.clone().png().toFile(redLogo);
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  await sharp(data, { raw: info }).png().toFile(whiteLogo);
}

// Code is highlighted in brand colours: keys navy, literals and commands red, comments grey.
const CODE_THEME = {
  name: "onextel", type: "light",
  colors: { "editor.background": "#ffffff", "editor.foreground": BRAND.ink },
  tokenColors: [
    { settings: { foreground: BRAND.ink } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: BRAND.muted, fontStyle: "italic" } },
    { scope: ["support.type.property-name", "meta.object-literal.key", "variable.other.property", "entity.name.tag", "constant.other.option", "variable.parameter"], settings: { foreground: BRAND.navy } },
    { scope: ["string", "string.quoted"], settings: { foreground: BRAND.ink } },
    { scope: ["constant.numeric", "constant.language", "keyword", "storage", "entity.name.function", "support.function", "entity.name.command"], settings: { foreground: BRAND.red } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: BRAND.muted } },
  ],
};

// ---------- render pages ----------
const highlighter = await createHighlighter({ themes: [CODE_THEME], langs: ["bash", "json", "javascript", "csv", "text"] });
const LANG_ALIASES = { js: "javascript", sh: "bash", shell: "bash", curl: "bash" };
const render = createRenderer({ highlighter, theme: CODE_THEME.name, resolveLink, resolveImage, liveUrl, anchorFor, warn });
const codeBlock = (value, lang, title) => {
  const root = highlighter.codeToHast(value, { lang: LANG_ALIASES[lang] || lang, theme: CODE_THEME.name });
  return h("figure.code", [title && h("figcaption", title), ...root.children]);
};
let currentPage = "openapi";
const md = (text) => render(String(text), { page: currentPage, mdx: false, headingOffset: 3 }).children;
const renderOperation = createOpenapiRenderer({ md, code: codeBlock });

const articles = [];
for (const tab of tabs) {
  articles.push(h("section.part", { id: anchorFor(`tab-${tab.title}`) }, [
    h("img.part-logo", { src: pathToFileURL(whiteLogo).href, alt: "OneXtel" }),
    h("h1", tab.title),
    h("img.part-curve", { src: curve, alt: "" }),
  ]));
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

const css = readFileSync(join(HERE, "style.css"), "utf8");
// Open Sans is the brand typeface for training material. Fonts come from npm as fixed weights, so
// every machine prints the same; the brand does not specify a monospace face.
// Noto Sans Math fills the arrows and shapes Open Sans lacks. Its package declares only the Latin
// range, so it is declared here without one.
const fonts = ["open-sans/400", "open-sans/400-italic", "open-sans/600", "open-sans/700", "jetbrains-mono/400", "jetbrains-mono/600"]
  .map((f) => `<link rel="stylesheet" href="${fileUrl(HERE, "node_modules/@fontsource", `${f}.css`)}">`)
  .join("") + `<style>@font-face { font-family: "Noto Sans Math"; src: url("${fileUrl(FONT_FILES, "noto-sans-math/files/noto-sans-math-latin-400-normal.woff2")}") format("woff2"); }</style>`;
const hasMermaid = toHtml(doc).includes('class="mermaid"');
// Mermaid loads from node_modules as a classic script: module scripts do not load over file://.
const mermaidJs = fileUrl(HERE, "node_modules/mermaid/dist/mermaid.min.js");
const mermaidTheme = { primaryColor: BRAND.sky, primaryTextColor: BRAND.ink, primaryBorderColor: BRAND.navy, lineColor: BRAND.navy,
  actorBkg: BRAND.sky, actorBorder: BRAND.navy, actorTextColor: BRAND.ink, signalColor: BRAND.navy, signalTextColor: BRAND.ink,
  noteBkgColor: BRAND.gold, noteBorderColor: BRAND.gold, fontFamily: "Open Sans" };
const mermaid = hasMermaid
  ? `<script src="${mermaidJs}"></script><script>
     mermaid.initialize({ startOnLoad: false, theme: "base", fontFamily: "Open Sans", themeVariables: ${JSON.stringify(mermaidTheme)},
       sequence: { actorFontFamily: "Open Sans", messageFontFamily: "Open Sans", noteFontFamily: "Open Sans" } });
     mermaid.run({ querySelector: ".mermaid" }).catch((e) => { window.__mermaidError = String(e); }).finally(() => { window.__mermaidDone = true; });</script>`
  : "<script>window.__mermaidDone = true</script>";
const page = (body, extra = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${TITLE}</title>${fonts}<style>${css}</style>${extra}</head><body>${body}${mermaid}</body></html>`;

// The cover follows the brand's navy stationery: white wordmark top right, the red curve on the
// right-hand side, copy on the left.
const coverHtml = page(`<section style="position:relative;width:210mm;height:296mm;background:${BRAND.navy};overflow:hidden">
  <img src="${pathToFileURL(whiteLogo).href}" alt="OneXtel" style="position:absolute;top:20mm;right:20mm;width:62mm">
  <div style="position:absolute;left:22mm;top:88mm;width:150mm">
    <div style="font-size:36pt;font-weight:700;color:#fff;line-height:1.1">Documentation</div>
    <div style="font-size:12.5pt;color:${BRAND.sky};margin-top:5mm;line-height:1.45">Guides, API reference and plugins<br>for WhatsApp, RCS and SMS</div>
  </div>
  <img src="${curve}" alt="" style="position:absolute;right:0;bottom:34mm;width:182mm">
  <div style="position:absolute;left:22mm;bottom:16mm;font-size:8.6pt;color:${BRAND.sky};line-height:1.7">Generated ${built}${sha ? ` from revision ${sha}` : ""}<br>
  The latest version is always at <a href="${SITE}" style="color:#fff">${SITE.replace(/^https:\/\//, "")}</a></div></section>`);

// ---------- print ----------
// Running header and footer are CSS page-margin boxes, so they use the document's fonts. The
// wordmark sits top right at 25 mm, the guidelines' minimum print width. Divider pages have none.
const headerLogo = join(WORK, "img", "logo-header.png");
if (!existsSync(headerLogo)) await sharp(redLogo).resize({ width: 600 }).png().toFile(headerLogo);
const running = `font: 7pt "Open Sans", sans-serif; color: ${BRAND.muted};`;
const pageCss = `<style>
  @page { size: A4; margin: 20mm 16mm 17mm;
    @top-right { content: ""; width: 25mm; background: url("${pathToFileURL(headerLogo).href}") no-repeat right 8mm / 25mm auto; }
    @bottom-left { content: "${TITLE}"; ${running} }
    @bottom-right { content: counter(page) " / " counter(pages); ${running} } }
  @page part { margin: 0; @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; } }
</style>`;
const browser = await chromium.launch();
async function print(html, { withFooter }) {
  const file = join(WORK, withFooter ? "docs.html" : "cover.html");
  writeFileSync(file, html);
  const tab = await browser.newPage();
  await tab.goto(pathToFileURL(file).href, { waitUntil: "networkidle", timeout: 120_000 });
  // Fonts load per character range on demand; load the ones the docs use before printing.
  await tab.evaluate(() => Promise.all([...["400", "600", "700", "italic 400"].map((w) => document.fonts.load(`${w} 12px "Open Sans"`, "…–—·×")),
    document.fonts.load('12px "Noto Sans Math"', "→←⇄○−")]));
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForFunction(() => window.__mermaidDone === true, null, { timeout: 30_000 }).catch(() => warn("mermaid diagrams timed out"));
  const mermaidError = await tab.evaluate(() => window.__mermaidError);
  if (mermaidError) warn(`mermaid: ${mermaidError}`);
  const pdf = await tab.pdf({
    format: "A4", printBackground: true, outline: withFooter, tagged: true,
    preferCSSPageSize: withFooter,
    margin: withFooter ? undefined : { top: "0", bottom: "0", left: "0", right: "0" },
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
  bodyPdf = await print(page(toHtml(h("div", [toc, doc])), pageCss), { withFooter: true });
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
