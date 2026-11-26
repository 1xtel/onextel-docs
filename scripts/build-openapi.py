#!/usr/bin/env python3
"""Build the importable OpenAPI 3.1 specs in openapi/.

WhatsApp, RCS and Omnichannel come from the Postman collection in
collections/onextel-omnichannel.json, which is the reference for those APIs: every request becomes
an operation and every request body becomes a named example. SMS (India), SMS
(International) and RCS template creation aren't in the collection, so they come
from their API reference pages. The specs carry only endpoints, headers, query
parameters and example payloads, with no descriptions, so the pages stay the
place for detail.

Re-run after updating the collection or an SMS page:

    python3 scripts/build-openapi.py
"""

import json
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlsplit

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "openapi"
DEFAULT_SERVER = "https://api.onexaura.com"

COLLECTION = ROOT / "collections" / "onextel-omnichannel.json"

PRODUCTS = {
    "whatsapp": {"title": "OneXtel WhatsApp API", "folders": ["WhatsApp"]},
    "rcs": {"title": "OneXtel RCS API", "folders": ["RCS"],
            "pages": ["rcs/templates"], "page_paths": ["/rcs/templates"]},
    "omnichannel": {"title": "OneXtel Omnichannel API", "folders": ["Fallback", "Status Check"]},
    "sms": {"title": "OneXtel SMS API (India)", "pages": ["sms/send-sms-omni", "sms/url-shortener", "sms/get-status"]},
    "sms-international": {"title": "OneXtel SMS API (International)",
                          "pages": ["sms-international/send-sms"]},
}

SKIP_HEADERS = {"content-type", "accept"}
TYPE_MAP = {"string": "string", "integer": "integer", "number": "number",
            "boolean": "boolean", "array": "array", "object": "object", "file": "string"}

ENDPOINT_RE = re.compile(
    r"^(?:\*\*Endpoint:\*\* `)?(GET|POST|PUT|PATCH|DELETE) ([^\s`]+)`?\s*$", re.M)
PARAM_RE = re.compile(
    r'<ParamField (header|query|path|body)="([^"]+)" type="([^"]+)"([^>]*)>(.*?)(?=<ParamField|</ParamField>)',
    re.S)
HEADING_RE = re.compile(r'^(#{2,4}) (.+)$|<Tab title="([^"]+)"|^\*\*([^*\n]+?):?\*\*\s*$', re.M)
FENCE_RE = re.compile(r"^```([^\n]*)\n(.*?)^```", re.M | re.S)
CURL_DATA_RE = re.compile(r"--data(?:-raw)? '(.*?)'", re.S)
CURL_URL_RE = re.compile(r"curl[^\n]*?'(https?://[^']+)'|--url '(https?://[^']+)'")


def clean(text):
    """MDX description -> plain one-paragraph text."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return " ".join(text.split())


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "example"


def schema_for(value):
    if isinstance(value, bool):
        return {"type": "boolean"}
    if isinstance(value, int):
        return {"type": "integer"}
    if isinstance(value, float):
        return {"type": "number"}
    if isinstance(value, list):
        items = {}
        for v in value:
            items = merge_schema(items, schema_for(v))
        return {"type": "array", "items": items}
    if isinstance(value, dict):
        return {"type": "object", "properties": {k: schema_for(v) for k, v in value.items()}}
    return {"type": "string"}


def merge_schema(a, b):
    if not a:
        return b
    if not b or a.get("type") != b.get("type"):
        return a
    if a["type"] == "object":
        props = dict(a.get("properties", {}))
        for k, v in b.get("properties", {}).items():
            props[k] = merge_schema(props.get(k, {}), v)
        return {**a, "properties": props}
    if a["type"] == "array":
        return {**a, "items": merge_schema(a.get("items", {}), b.get("items", {}))}
    return a


def find_node(schema, dotted):
    """Walk `wa[].template.name` through a schema; return (parent, key) or None."""
    parts = [p.replace("[]", "") for p in dotted.split(".")]
    node = schema
    for i, part in enumerate(parts):
        while node.get("type") == "array":
            node = node.setdefault("items", {})
        props = node.get("properties")
        if props is None or part not in props:
            return None
        if i == len(parts) - 1:
            return node, part
        node = props[part]
    return None


def dedupe(examples):
    """Drop repeated payloads and partial snippets that aren't a full request."""
    seen, out = set(), []
    for label, data in examples:
        key = json.dumps(data, sort_keys=True)
        if key not in seen:
            seen.add(key)
            out.append((label, data))
    if len(out) > 1:
        keys = [set(d) if isinstance(d, dict) else {"[]"} for _, d in out]
        out = [ex for i, ex in enumerate(out)
               if keys[i] & set().union(*(k for j, k in enumerate(keys) if j != i))]
    return out


def name_examples(examples, keep_partial=False):
    named, counts = {}, {}
    for label, data in (examples if keep_partial else dedupe(examples)):
        base = slug(label)
        counts[base] = counts.get(base, 0) + 1
        n = counts[base]
        named[base if n == 1 else f"{base}-{n}"] = {
            "summary": label if n == 1 else f"{label} ({n})", "value": data}
    return named


def nearest_heading(text, pos, default):
    best = default
    for m in HEADING_RE.finditer(text, 0, pos):
        best = clean(m.group(2) or m.group(3) or m.group(4))
    return best


def parse_json(raw):
    try:
        return json.loads(raw)
    except ValueError:
        return None


def parse_page(rel):
    path = ROOT / "api-reference" / f"{rel}.mdx"
    text = path.read_text()
    fm = re.match(r"---\n(.*?)\n---\n", text, re.S)
    title = re.search(r'title:\s*"?([^"\n]+)"?', fm.group(1)).group(1)
    body = text[fm.end():]

    endpoints = [m for m in ENDPOINT_RE.finditer(body)]
    bounds = [m.start() for m in endpoints] + [len(body)]
    page_params = [p for p in PARAM_RE.finditer(body, 0, bounds[0])]

    ops = []
    for i, m in enumerate(endpoints):
        start, end = m.start(), bounds[i + 1]
        method, url = m.group(1).lower(), m.group(2)
        server = None
        if url.startswith("http"):
            parts = urlsplit(url)
            server = f"{parts.scheme}://{parts.netloc}"
            url = parts.path
        section = body[start:end]
        fences = [f for f in FENCE_RE.finditer(body) if start <= f.start() < end]
        h2 = [h for h in re.finditer(r"^## (.+)$", body[:start], re.M)]
        heading = clean(h2[-1].group(1)) if h2 else title
        name = title if len(endpoints) == 1 else heading
        params = page_params + list(PARAM_RE.finditer(section))

        requests, responses, curl_query = [], [], []
        for f in fences:
            info, code = f.group(1).strip(), f.group(2)
            label = nearest_heading(body, f.start(), name)
            if info.startswith("json "):
                label = f"{label} — {info[5:].strip()}"
            if info.startswith("bash") or code.lstrip().startswith("curl"):
                for d in CURL_DATA_RE.finditer(code):
                    data = parse_json(d.group(1))
                    if data is not None:
                        requests.append((label, data))
                u = CURL_URL_RE.search(code)
                if u:
                    curl_query += parse_qsl(urlsplit(u.group(1) or u.group(2)).query)
                    if not server and urlsplit(u.group(1) or u.group(2)).netloc not in DEFAULT_SERVER:
                        p = urlsplit(u.group(1) or u.group(2))
                        server = f"{p.scheme}://{p.netloc}"
            elif info.startswith("json"):
                data = parse_json(code)
                if data is None:
                    continue
                is_response = ("respon" in info.lower() or "respon" in label.lower()
                               or "error" in label.lower() or method in ("get", "delete"))
                (responses if is_response else requests).append((label, data))
        ops.append({
            "method": method, "path": url, "server": server, "summary": name,
            "page": rel, "params": params, "requests": requests,
            "responses": responses, "curl_query": curl_query,
        })
    return ops


def build_operation(ops):
    first = ops[0]
    parameters, seen = [], set()
    body_params, multipart = [], False
    for op in ops:
        for p in op["params"]:
            loc, pname, ptype, attrs, desc = p.groups()
            if loc == "body":
                body_params.append(p)
                multipart |= ptype == "file"
                continue
            if loc == "header" and pname.lower() in SKIP_HEADERS:
                continue
            key = (loc, pname.lower())
            if key in seen:
                continue
            seen.add(key)
            parameters.append({
                "name": pname, "in": loc, "required": "required" in attrs or loc == "path",
                "description": clean(desc),
                "schema": {"type": TYPE_MAP.get(ptype, "string")},
            })
        for qname, qval in op["curl_query"]:
            if ("query", qname.lower()) not in seen:
                seen.add(("query", qname.lower()))
                parameters.append({"name": qname, "in": "query", "schema": {"type": "string"}})
    for prm in parameters:
        for op in ops:
            for qname, qval in op["curl_query"]:
                if prm["in"] == "query" and qname == prm["name"]:
                    prm["example"] = qval

    summaries = list(dict.fromkeys(op["summary"] for op in ops))
    pages = list(dict.fromkeys(op["page"] for op in ops))
    out = {
        "operationId": slug(first["page"].split("/")[-1] + " " + first["summary"]),
        "summary": " / ".join(summaries),
        "description": "Full reference: "
        + ", ".join(f"https://onextel-09023014.mintlify.app/api-reference/{p}" for p in pages),
    }
    if parameters:
        out["parameters"] = parameters

    examples = [ex for op in ops for ex in op["requests"]]
    if multipart:
        props, required = {}, []
        for p in body_params:
            _, pname, ptype, attrs, desc = p.groups()
            props[pname] = {"type": "string", "description": clean(desc)}
            if ptype == "file":
                props[pname]["format"] = "binary"
            if "required" in attrs:
                required.append(pname)
        out["requestBody"] = {"required": True, "content": {"multipart/form-data": {
            "schema": {"type": "object", "properties": props, "required": required}}}}
    elif examples or body_params:
        schema = {}
        for _, data in dedupe(examples):
            schema = merge_schema(schema, schema_for(data))
        if not schema:
            schema = {"type": "object", "properties": {}}
        for p in body_params:
            _, pname, ptype, attrs, desc = p.groups()
            hit = find_node(schema, pname)
            if hit is None and "." not in pname and "[" not in pname and schema.get("type") == "object":
                schema["properties"][pname] = {"type": TYPE_MAP.get(ptype, "string")}
                hit = (schema, pname)
            if hit is None:
                continue
            parent, key = hit
            parent["properties"][key].setdefault("description", clean(desc))
            if "required" in attrs and key not in parent.setdefault("required", []):
                parent["required"].append(key)
        content = {"schema": schema}
        if examples:
            content["examples"] = name_examples(examples)
        out["requestBody"] = {"required": True, "content": {"application/json": content}}

    resp = {"description": "Success"}
    resp_examples = [ex for op in ops for ex in op["responses"]]
    if resp_examples:
        named = name_examples(resp_examples)
        schema = {}
        for data in (e["value"] for e in named.values()):
            schema = merge_schema(schema, schema_for(data))
        resp["content"] = {"application/json": {"schema": schema, "examples": named}}
    out["responses"] = {"200": resp}

    servers = {op["server"] for op in ops if op["server"]}
    return out, servers


def strip_descriptions(node):
    """Keep the specs reference-only: drop every description except the one
    OpenAPI requires on each response."""
    if isinstance(node, dict):
        out = {k: strip_descriptions(v) for k, v in node.items() if k != "description"}
        for code, resp in node.get("responses", {}).items():
            out["responses"][code]["description"] = "OK"
        return out
    if isinstance(node, list):
        return [strip_descriptions(v) for v in node]
    return node


def loose_json(raw):
    """Parse a Postman raw body: drops // and /* */ comments (commented-out
    fields aren't sent) and trailing commas, and quotes bare {{variables}} and
    <PLACEHOLDERS>."""
    out, i, in_str = [], 0, False
    while i < len(raw):
        ch = raw[i]
        if in_str:
            out.append(ch)
            if ch == "\\":
                out.append(raw[i + 1])
                i += 1
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
            out.append(ch)
        elif raw.startswith("//", i):
            while i < len(raw) and raw[i] != "\n":
                i += 1
            continue
        elif raw.startswith("/*", i):
            i = raw.index("*/", i) + 2
            continue
        elif ch == "<":
            j = raw.index(">", i) + 1
            out.append(json.dumps(raw[i:j]))
            i = j
            continue
        elif raw.startswith("{{", i):
            j = raw.index("}}", i) + 2
            out.append(json.dumps(raw[i:j]))
            i = j
            continue
        else:
            out.append(ch)
        i += 1
    text = re.sub(r",(\s*[}\]])", r"\1", "".join(out))
    return json.loads(text)


def collection_requests(folders):
    data = json.loads(COLLECTION.read_text())

    def walk(items, trail):
        for item in items:
            if "item" in item:
                yield from walk(item["item"], trail + [item["name"]])
            else:
                yield trail, item

    for top in data["item"]:
        if top["name"] in folders:
            yield from walk(top.get("item", []), [top["name"]])


def collection_paths(folders):
    grouped = {}
    for trail, item in collection_requests(folders):
        req = item["request"]
        url = req["url"]
        raw = url if isinstance(url, str) else url["raw"]
        path = re.sub(r"^(\{\{domain\}\}|https?://[^/]+)", "", raw).split("?")[0]
        grouped.setdefault((path, req["method"].lower()), []).append((trail, item))

    paths, used_ids = {}, set()
    for (path, method), entries in grouped.items():
        trail0, item0 = entries[0]
        folder = trail0[-1]
        folders = list(dict.fromkeys(t[-1] for t, _ in entries))
        summary = item0["name"] if len(entries) == 1 else " / ".join(folders)
        op = {"tags": [folder], "summary": summary}
        op_id = slug(f"{trail0[0]} {summary} {method}")
        while op_id in used_ids:
            op_id += "-2"
        used_ids.add(op_id)
        op["operationId"] = op_id

        params, seen = [], set()
        for _, item in entries:
            req = item["request"]
            for h in req.get("header", []):
                if h.get("disabled") or h["key"].lower() in SKIP_HEADERS:
                    continue
                if ("header", h["key"].lower()) not in seen:
                    seen.add(("header", h["key"].lower()))
                    params.append({"name": h["key"], "in": "header", "schema": {"type": "string"},
                                   "example": h.get("value", "")})
            url = req["url"]
            for q in (url.get("query", []) if isinstance(url, dict) else []):
                if q.get("disabled") or ("query", q["key"]) in seen:
                    continue
                seen.add(("query", q["key"]))
                params.append({"name": q["key"], "in": "query", "schema": {"type": "string"},
                               "example": q.get("value", "")})
        if params:
            op["parameters"] = params

        json_examples, form_examples, form_fields = [], [], {}
        for _, item in entries:
            body = item["request"].get("body") or {}
            if body.get("mode") == "raw" and body.get("raw", "").strip():
                json_examples.append((item["name"], loose_json(body["raw"])))
            elif body.get("mode") == "formdata":
                value = {}
                for f in body["formdata"]:
                    if f.get("disabled"):
                        continue
                    if f.get("type") == "file":
                        form_fields[f["key"]] = {"type": "string", "format": "binary"}
                    else:
                        form_fields.setdefault(f["key"], {"type": "string"})
                        value[f["key"]] = f.get("value", "")
                form_examples.append((item["name"], value))
        if json_examples:
            schema = {}
            for _, data in json_examples:
                schema = merge_schema(schema, schema_for(data))
            op["requestBody"] = {"content": {"application/json": {
                "schema": schema, "examples": name_examples(json_examples, keep_partial=True)}}}
        elif form_fields:
            op["requestBody"] = {"content": {"multipart/form-data": {
                "schema": {"type": "object", "properties": form_fields},
                "examples": name_examples(form_examples, keep_partial=True)}}}
        op["responses"] = {"200": {"description": "OK"}}
        paths.setdefault(path, {})[method] = op
    return paths


def build(product, cfg):
    grouped = {}
    for page in cfg.get("pages", []):
        for op in parse_page(page):
            if "page_paths" in cfg and op["path"] not in cfg["page_paths"]:
                continue
            grouped.setdefault((op["path"], op["method"]), []).append(op)

    paths, all_servers, op_ids = collection_paths(cfg.get("folders", [])), set(), set()
    for (path, method), ops in grouped.items():
        operation, servers = build_operation(ops)
        while operation["operationId"] in op_ids:
            operation["operationId"] += "-2"
        op_ids.add(operation["operationId"])
        operation["tags"] = ["Template"] if ops[0]["path"] == "/rcs/templates" else [operation["summary"]]
        all_servers |= servers
        paths.setdefault(path, {})[method] = operation

    if not cfg.get("pages"):
        all_servers = set()
    verbs = {"get": "Get", "post": "Add to", "put": "Update", "delete": "Remove from"}
    ops_flat = [(m, o) for item in paths.values() for m, o in item.items()]
    summaries = [o["summary"] for _, o in ops_flat]
    for m, o in ops_flat:
        if summaries.count(o["summary"]) > 1:
            o["summary"] = f"{verbs[m]} {o['summary'].lower()}"

    server = next(iter(all_servers), DEFAULT_SERVER) if len(all_servers) <= 1 else DEFAULT_SERVER
    return {
        "openapi": "3.1.0",
        "info": {"title": cfg["title"], "version": "1.0.0"},
        "servers": [{"url": server}],
        "paths": strip_descriptions(paths),
    }


def main():
    OUT.mkdir(exist_ok=True)
    for product, cfg in PRODUCTS.items():
        spec = build(product, cfg)
        (OUT / f"{product}.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
        n = sum(len(v) for v in spec["paths"].values())
        print(f"openapi/{product}.json: {n} operations")


if __name__ == "__main__":
    main()
