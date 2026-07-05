# Review Notes — Open Questions & Source Discrepancies

These are inconsistencies the source documents contained (not authoring choices). Each was
handled with **fidelity over invention** — where the Postman collection and a PDF disagreed,
the Postman value was documented as authoritative and the conflict flagged inline. Reconcile
each against the live platform, then update the page and delete the note here.

This file is **not** part of the published site (it isn't in `docs.json`).

## API — endpoint / payload conflicts

| # | Area | Discrepancy | Resolved as | Verify |
|---|------|-------------|-------------|--------|
| 1 | WhatsApp media | Media Upload path: PDF `/wa/mediaupload` vs Postman `/oapi/wa/mediaupload` | Postman `/oapi/wa/mediaupload` | Confirm live path |
| 2 | WhatsApp send | Send path: PDF `/send_sms` vs Postman `/oapi/send_sms` | `/send_sms` (both noted) | Confirm canonical |
| 3 | WhatsApp templates | Single Product Message: PDF `CAROUSEL` wrapper vs Postman flat `HEADER format: PRODUCT` | Both shown | Which shape is valid |
| 4 | WhatsApp templates | Limited Time Offer `category`: Postman `marketing` vs PDF `LTO` | Both shown | Correct enum |
| 5 | WhatsApp fetch | Date filter: PDF `createdDate` vs Postman `start_date`/`end_date` | `createdDate` authoritative | Confirm params |
| 6 | WhatsApp create template | No distinct success/failure response body documented (reused Delete Template shape) | Noted inline | Provide real response |
| 7 | RCS fetch | Path: PDF `/templates/fetch` vs Postman `/oapi/templates/fetch` | Postman `/oapi/templates/fetch` | Confirm live path |
| 8 | RCS media | Heading says `/rcs/mediaupload` but PDF sample cURL hits `/wa/mediaupload`; error codes imply an undocumented `url` field | Documented `/rcs/mediaupload`; no `url` invented | Confirm path + whether `url` exists |
| 9 | RCS send | Sender-ID field named `domain` in param table but examples use both `senderId` and `domain` | Both documented | Correct field name |
| 10 | RCS send | Calendar Event `customParams` example is malformed JSON (two comma-separated objects) | Reproduced as-is, flagged | Fix source example |
| 11 | RCS send | "Dynamic Query with Tracking" nests `ttl` inside `contentMessage` (contradicts every other example) | Reproduced as-is, flagged | Confirm `ttl` placement |
| 12 | RCS send | `prefix` marked mandatory in table but optional/commented in Postman | Both readings noted | Confirm required? |
| 13 | RCS send | Suggestions `displayText` mandatory in one table, omitted for `calendar_event` in another | Treated as required | Confirm |
| 14 | RCS send | Carousel `cardWidth`: samples use `MEDIUM` but template table lists `MEDIUM_WIDTH`/`SMALL_WIDTH` | Both flagged | Correct enum |
| 15 | RCS opt-in/out | Entire feature sourced only from Postman (no PDF coverage); GET list response schema undocumented | Documented request only | Provide response schema |
| 16 | RCS callbacks | **Delivery Notification (RCS API Guide p.52–53) not yet turned into a page** | Not documented | Add an RCS callback page (see below) |
| 17 | Intl SMS | Source header sample reads `Contest-Type` (typo for `Content-Type`) | Corrected in cURL, flagged | Fix source |
| 18 | Intl SMS | DLR callback: URL registration, request headers, and expected ack response not documented | Noted as gap | Provide callback setup details |
| 19 | Omnichannel | Message Status & History have no saved example responses in Postman | Documented request only (`<Warning>`) | Provide response examples |
| 20 | Omnichannel | Message Status request is `auth: noauth` in Postman but still sends `apikey` header | Documented header auth | Confirm auth |
| 21 | Fallback | SMS `type` values: guide says `SI, TRANS, OTP or Promo`; API ref example uses `TXN` | Both carried verbatim | Reconcile enum |
| 22 | Legacy | Legacy Aura API domain is `api.onex-aura.com` (hyphenated) vs current `api.onexaura.com` | Flagged in `legacy/sms-aura.mdx` | Historical — confirm |

## Product manuals — gaps & likely errors

- **Portal URL is a QA/staging host** (`warcsqa.1xtel.dev`) in the RCS & WhatsApp manuals. The
  production portal URL is not stated — pages flag this; supply the real URL.
- **WhatsApp Campaign manual** preface says "RCS messaging campaigns" and several screenshots
  show the RCS channel selected — copy-paste from the RCS manual. Pages follow the WhatsApp text.
- **WhatsApp Campaign manual** does not cover Reports/analytics (sidebar shows them). No pages written.
- **International SMS manual**: "Clicker Data" and "Clicker Details" both give identical
  navigation ("Reports → Sender ID Summary tab") — almost certainly a copy-paste error. Flagged.
- **RCS User Manual is a draft** (Release 1.0, dated 8 Apr 2026). Content may change. Embedded
  sign-up / RCS agent onboarding steps are only mentioned, not detailed (needs the Admin Manual).
- **Legacy V1**: Voice and Email were "coming soon" placeholders (no content). Several plugin
  connectors (WebEngage, CleverTap, Salesforce, Shopify, etc.) and WhatsApp connector pages were
  listed in the legacy nav but returned no fetchable body — only MoEngage had content.

## Screenshots

Source PDFs/DOCX are screenshot-heavy, but images could not be reliably extracted, so all UI
actions are described in prose. A follow-up pass could capture real portal screenshots and add
them under `/images` for the campaign and platform guides.

## Suggested follow-ups

1. Add an **RCS Delivery Notification callback** page under `api-reference/rcs/` (parity with the
   WhatsApp callback pages) from RCS API Guide p.52–53.
2. Resolve the endpoint-path conflicts (#1, #2, #7, #8) with engineering and delete the inline notes.
3. Supply production portal URLs and real response examples (#18, #19).
4. Capture portal screenshots for the user guides.
