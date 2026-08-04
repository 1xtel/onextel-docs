# OneXtel Docs — Authoring Conventions (for extraction agents)

You are writing MDX pages for a Mintlify documentation site for OneXtel, a CPaaS provider
(WhatsApp Business API, RCS, SMS, omnichannel messaging). Audience: enterprise developers
and campaign managers integrating with the OneXtel Omni platform (brand name "OnexAura").

## Hard rules

1. **Fidelity over invention.** Extract endpoints, parameters, payloads, status codes, and
   procedures exactly as documented in the source. NEVER invent parameter names, enum values,
   error codes, or URLs. If the source is ambiguous or unreadable, write what you can confirm
   and list the gap in your returned `gaps` array instead of guessing.
2. Every page starts with YAML frontmatter:
   ```yaml
   ---
   title: "Short Title"
   description: "One-line description for SEO and nav hover."
   ---
   ```
3. File names: kebab-case, `.mdx` extension, inside YOUR assigned output directory only.
   Do not write outside your assigned directory.
4. Page size: aim for 100–350 lines per page. Split long material into multiple pages by
   topic (e.g. one page per endpoint group, message type, or workflow) rather than one
   giant page.
5. Do not carry over page headers/footers, page numbers, "Confidential", or version
   footers from PDFs.

## Mintlify components (use them, they render natively)

- Callouts: `<Note>`, `<Warning>`, `<Tip>`, `<Info>`
- Procedures: `<Steps>` / `<Step title="...">`
- Multiple variants of one thing: `<Tabs>` / `<Tab title="...">`
- Request/response side-by-side: `<CodeGroup>` with fenced blocks titled e.g. ```json Request```
- Parameter tables → prefer `<ParamField>` for API params:
  `<ParamField body="apiKey" type="string" required>API key issued by OneXtel.</ParamField>`
  Use `body=`, `query=`, `header=`, or `path=` as appropriate.
- Response fields: `<ResponseField name="..." type="...">...</ResponseField>`
- FAQs/long enumerations: `<AccordionGroup>` / `<Accordion title="...">`
- Plain markdown tables are fine for enum/code lists (status codes, error codes).

## Style

- cURL examples for every API endpoint when the source gives a payload (reconstruct the
  cURL from documented method + URL + headers + body — that is not invention).
- Keep JSON examples exactly as documented; pretty-print with 2-space indent.
- Placeholders in examples: `YOUR_API_KEY`, `919999999999` style MSISDNs.
- Product names: use **"OneXtel"** for the company and the product, and **"the OneXtel portal"**
  for the web UI. Do **not** use deployment names ("OnexAura", "OneXGlobal", "Aura V1/V2",
  "Core 365") in customer-facing pages — customers see one platform, not our deployments.
  Likewise do not label SMS as "International SMS": SMS is one product, and domestic versus
  international is a compliance difference documented inside it. Channel names are
  "WhatsApp", "RCS", "SMS". Do not write "Onextel" or "OneXTel".
- Voice: second person, present tense, concise. No marketing fluff.
- Screenshots in source PDFs/DOCX you cannot extract: describe the UI action in text
  (e.g. "click **Create Campaign** in the top-right") — do NOT insert broken image links.

## Cross-reference source (APIs only)

The authoritative Postman collection is at:
`/Users/udayan.chowdhury/Downloads/Documentation/OmniChannel APIs(1).postman_collection.json`
If your source document's endpoint/payload disagrees with the Postman collection, document
the Postman version and add a note in your `gaps` array describing the discrepancy.
Base URL variable `{{domain}}` in Postman = `https://api.onexaura.com`.
