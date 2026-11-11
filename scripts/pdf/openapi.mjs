// Prints an OpenAPI operation the way the live API reference shows it: endpoint, authorization,
// parameters, request body, a cURL example and the responses. Pages with `openapi:` frontmatter
// carry little or no MDX body, so without this they would print empty.

import { readFileSync } from "node:fs";
import { h } from "./h.mjs";
import YAML from "yaml";

const specs = new Map();
export function loadSpec(file) {
  if (!specs.has(file)) specs.set(file, YAML.parse(readFileSync(file, "utf8")));
  return specs.get(file);
}

// `openapi: "POST /v1/pins"` or `openapi: "/path/openapi.yaml GET /v1/x"`
export function parseOpenapiRef(value) {
  const m = /^\s*(?:(\S+\.(?:ya?ml|json))\s+)?(get|post|put|patch|delete|head|options)\s+(\S+)\s*$/i.exec(value || "");
  return m ? { spec: m[1] || null, method: m[2].toLowerCase(), path: m[3] } : null;
}

function resolve(spec, obj, seen = new Set()) {
  while (obj && obj.$ref) {
    if (seen.has(obj.$ref)) return {};
    seen.add(obj.$ref);
    obj = obj.$ref.replace(/^#\//, "").split("/").reduce((o, k) => o?.[k.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
  }
  return obj || {};
}

function merged(spec, schema) {
  schema = resolve(spec, schema);
  if (!schema.allOf) return schema;
  const out = { ...schema, properties: { ...(schema.properties || {}) }, required: [...(schema.required || [])] };
  delete out.allOf;
  for (const part of schema.allOf) {
    const p = merged(spec, part);
    Object.assign(out.properties, p.properties || {});
    out.required.push(...(p.required || []));
    for (const k of ["type", "description", "example"]) if (out[k] === undefined && p[k] !== undefined) out[k] = p[k];
  }
  return out;
}

function typeLabel(spec, schema) {
  schema = merged(spec, schema);
  const types = [].concat(schema.type || (schema.properties ? "object" : schema.oneOf || schema.anyOf ? "one of" : "any"));
  return types.map((t) => {
    if (t === "array") return `${typeLabel(spec, schema.items || {})}[]`;
    return schema.format && t !== "null" ? `${t}<${schema.format}>` : t;
  }).join(" | ");
}

function exampleOf(spec, schema, depth = 0) {
  schema = merged(spec, schema);
  if (schema.example !== undefined) return schema.example;
  if (schema.examples?.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (depth > 6) return null;
  if (schema.oneOf || schema.anyOf) return exampleOf(spec, (schema.oneOf || schema.anyOf)[0], depth + 1);
  const t = [].concat(schema.type || (schema.properties ? "object" : "string")).find((x) => x !== "null");
  if (t === "object") {
    const o = {};
    for (const [k, v] of Object.entries(schema.properties || {})) o[k] = exampleOf(spec, v, depth + 1);
    return o;
  }
  if (t === "array") return [exampleOf(spec, schema.items || {}, depth + 1)];
  if (t === "integer" || t === "number") return 0;
  if (t === "boolean") return true;
  return schema.format === "date-time" ? "2026-01-01T00:00:00Z" : "string";
}

function mediaExample(spec, media) {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  const first = media.examples && Object.values(media.examples)[0];
  if (first) return resolve(spec, first).value;
  return media.schema ? exampleOf(spec, media.schema) : undefined;
}

export function createOpenapiRenderer({ md, code }) {
  function fields(spec, schema, depth = 0, seen = new Set()) {
    schema = merged(spec, schema);
    if (depth > 6) return [];
    if (schema.type === "array" || schema.items) return fields(spec, schema.items || {}, depth, seen);
    const variants = schema.oneOf || schema.anyOf;
    if (variants && !schema.properties) {
      return variants.map((v, i) => {
        const r = resolve(spec, v);
        return h("div.expandable", [h("div.expandable-title", `Option ${i + 1}${r.title ? `: ${r.title}` : ""}`), ...fields(spec, v, depth + 1, seen)]);
      });
    }
    const required = new Set(schema.required || []);
    return Object.entries(schema.properties || {}).map(([name, prop]) => field(spec, name, prop, required.has(name), depth, seen));
  }

  function field(spec, name, prop, isRequired, depth, seen) {
    const ref = prop.$ref;
    const s = merged(spec, prop);
    const body = [];
    if (s.description) body.push(...md(s.description));
    if (s.enum) body.push(h("p.field-enum", ["One of: ", ...s.enum.flatMap((v, i) => [i ? ", " : "", h("code", String(v))])]));
    if (s.example !== undefined && typeof s.example !== "object") body.push(h("p.field-example", ["Example: ", h("code", String(s.example))]));
    const inner = s.type === "array" || s.items ? merged(spec, s.items || {}) : s;
    const nested = inner.properties || inner.oneOf || inner.anyOf;
    if (nested && !(ref && seen.has(ref))) {
      const next = new Set(seen);
      if (ref) next.add(ref);
      body.push(h("div.expandable", [h("div.expandable-title", s.type === "array" ? "Each item" : "Properties"), ...fields(spec, inner, depth + 1, next)]));
    }
    return h("div.field", [
      h("div.field-head", [
        h("code.field-name", name),
        h("span.field-type", typeLabel(spec, prop)),
        isRequired && h("span.badge.required", "required"),
        s.deprecated && h("span.badge.deprecated", "deprecated"),
        s.default !== undefined && h("span.field-default", ["default: ", h("code", JSON.stringify(s.default))]),
      ]),
      body.length ? h("div.field-body", body) : null,
    ]);
  }

  function authHeader(spec, op) {
    const req = op.security || spec.security || [];
    const name = req[0] && Object.keys(req[0])[0];
    const scheme = name && spec.components?.securitySchemes?.[name];
    if (!scheme) return null;
    if (scheme.type === "apiKey" && scheme.in === "header") return { header: scheme.name, value: "YOUR_API_KEY", scheme };
    if (scheme.type === "http" && scheme.scheme === "bearer") return { header: "Authorization", value: "Bearer YOUR_API_KEY", scheme };
    if (scheme.type === "http" && scheme.scheme === "basic") return { header: "Authorization", value: "Basic BASE64_CREDENTIALS", scheme };
    return { header: null, scheme };
  }

  // Returns the endpoint bar (shown under the page title) and the reference sections that follow
  // the page's own text. The operation description prints only when the page has no description.
  return function renderOperation(spec, method, path, { headingLevel = 3, withDescription = true }) {
    const item = spec.paths?.[path];
    const op = item?.[method];
    if (!op) return { head: [], body: [h("aside.callout.warning", [h("div.callout-label", "Missing"), h("p", `${method.toUpperCase()} ${path} is not in the spec.`)])] };
    const H = (text) => h(`h${headingLevel}.api-section`, text);
    const base = spec.servers?.[0]?.url || "";
    const head = [h("div.api-endpoint", [h("span.method", { className: [method] }, method.toUpperCase()), h("code.api-path", base + path)])];
    const out = [];
    if (withDescription && op.description) out.push(...md(op.description));

    const auth = authHeader(spec, op);
    if (auth) {
      out.push(H("Authorization"));
      out.push(h("div.field", [
        h("div.field-head", [h("code.field-name", auth.header || "auth"), h("span.field-type", "string"), h("span.field-in", "header"), h("span.badge.required", "required")]),
        auth.scheme.description ? h("div.field-body", md(auth.scheme.description)) : null,
      ]));
    }

    const params = [...(item.parameters || []), ...(op.parameters || [])].map((p) => resolve(spec, p));
    for (const [loc, label] of [["path", "Path parameters"], ["query", "Query parameters"], ["header", "Headers"]]) {
      const list = params.filter((p) => p.in === loc);
      if (!list.length) continue;
      out.push(H(label));
      for (const p of list) out.push(field(spec, p.name, { ...(p.schema || {}), description: p.description || resolve(spec, p.schema || {}).description, deprecated: p.deprecated }, !!p.required, 0, new Set()));
    }

    const rb = op.requestBody && resolve(spec, op.requestBody);
    const [ctype, media] = rb?.content ? Object.entries(rb.content)[0] : [];
    if (media) {
      out.push(H("Request body"));
      out.push(h("p.api-ctype", [h("code", ctype), rb.required ? " (required)" : ""]));
      if (rb.description) out.push(...md(rb.description));
      out.push(...fields(spec, media.schema || {}));
    }

    const lines = [`curl --request ${method.toUpperCase()}`, `  --url '${base}${path}'`];
    if (auth?.header) lines.push(`  --header '${auth.header}: ${auth.value}'`);
    const body = media && ctype.includes("json") ? mediaExample(spec, media) : undefined;
    if (body !== undefined) lines.push(`  --header 'Content-Type: ${ctype}'`, `  --data '${JSON.stringify(body, null, 2)}'`);
    out.push(code(lines.join(" \\\n"), "bash", "Example request"));

    out.push(H("Responses"));
    for (const [status, r0] of Object.entries(op.responses || {})) {
      const r = resolve(spec, r0);
      const [rtype, rmedia] = r.content ? Object.entries(r.content)[0] : [];
      out.push(h("div.api-response", [h("span.status", { className: [`s${String(status)[0]}`] }, status), r.description ? h("span.api-response-desc", inline(md(r.description))) : null]));
      if (rmedia?.schema) {
        const f = fields(spec, rmedia.schema);
        if (f.length) out.push(h("div.expandable", [h("div.expandable-title", "Response fields"), ...f]));
      }
      const ex = rmedia && mediaExample(spec, rmedia);
      if (ex !== undefined && rtype?.includes("json")) out.push(code(JSON.stringify(ex, null, 2), "json", `${status} response`));
    }
    return { head, body: out };
  };
}

// A one-paragraph Markdown result, unwrapped so it can sit inline.
function inline(nodes) {
  const els = nodes.filter((n) => n.type === "element");
  return els.length === 1 && els[0].tagName === "p" ? els[0].children : nodes;
}
