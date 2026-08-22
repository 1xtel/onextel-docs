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
| 14 | RCS send / templates | Carousel `width` and `height` enums differ across **three** sources: `MEDIUM_WIDTH`/`SMALL_WIDTH`, `MEDIUM_WIDTH`/`SHORT_WIDTH`, and bare `MEDIUM` in samples; `height` as `SHORT_HEIGHT`/`TALL_HEIGHT` vs `SHORT_HEIGHT`/`MEDIUM_HEIGHT` | All observed values listed with a `<Warning>` on `api-reference/rcs/templates` | **Confirm the accepted set with a test template** |
| 14b | RCS templates | Rich card `height` enum: one source lists `TALL_HEIGHT`, another omits it | All three listed, flagged inline | Confirm `TALL_HEIGHT` |
| 15 | RCS opt-in/out | Entire feature sourced only from Postman (no PDF coverage); GET list response schema undocumented | Documented request only | Provide response schema |
| 16 | RCS callbacks | Delivery Notification (RCS API Guide p.52–53) | **Resolved** — now `api-reference/rcs/callback-delivery-notification` | Outgoing sample uses `api_key` while the param table says `apiKey`; sample also carries an undocumented `tuc_id`. Both flagged inline — confirm against a live callback |
| 17 | Intl SMS | Source header sample reads `Contest-Type` (typo for `Content-Type`) | Corrected in cURL, flagged | Fix source |
| 18 | Intl SMS | DLR callback: URL registration, request headers, and expected ack response not documented | Noted as gap | Provide callback setup details |
| 19 | Omnichannel | Message Status & History have no saved example responses in Postman | Documented request only (`<Warning>`) | Provide response examples |
| 20 | Omnichannel | Message Status request is `auth: noauth` in Postman but still sends `apikey` header | Documented header auth | Confirm auth |
| 20b | Omnichannel | Message Status: `channel` documented as `wa`, but a working request uses `whatsapp`. `taId` and `tucId` appear in working requests and were undocumented entirely | Page now uses `whatsapp` and documents both IDs, with the conflict flagged | **Confirm the channel enum (`whatsapp`/`rcs`/`sms` vs `wa`) and when `taId`/`tucId` are required** |
| 20c | SMS | **`/oapi/send_sms` is not shared with clients for domestic SMS at present** (per domestic SMS owner, Aug 2026). The Omni SMS API is documented, but externally customers are given the standard SMS endpoint | Documented both APIs with a "Which SMS API" comparison; no change made | **Decide whether the Omni SMS page should be published, gated, or marked internal** |
| 20d | SMS DLR | Platform DLR carries both `dlrCode` (`001`) and `errorCode` (`000`) on the same delivered message. Only `errorCode` maps to the documented error table | Page tells integrators to branch on `errorCode` and treat `dlrCode` as informational | Confirm what `dlrCode` represents and its value set |
| 20e | SMS error codes | Code `995` arrived mojibake-encoded (`Platform_Time window Ã¢â‚¬â€œ discarded`) — that byte sequence is a UTF-8 en dash misread as Windows-1252 | Documented as "Time window — discarded", i.e. the message fell outside the SMS Time Window account setting | Confirm the reading |
| 21 | Fallback | SMS `type` enum — **RESOLVED** by *SMS API Omni Channel* (rel. 1.0, 3 Apr 2026): valid values are `SI`, `TRANS`, `OTP`, `SE`, `Promo`. `TXN` was never valid. | All three `TXN` examples corrected to `TRANS`; warning added to the fallback page. **Likely cause of the reported "SMS fallback not received" ticket** — an invalid `type` is rejected at the fallback stage, after the primary send has already returned 200 | Confirm with a live send |
| 22 | Legacy | Legacy Aura API domain is `api.onex-aura.com` (hyphenated) vs current `api.onexaura.com` | Flagged in `legacy/sms-aura.mdx` | Historical — confirm |
| 23 | RCS / WhatsApp error codes | Source tables (Soham Shirke, 25 Jun 2025) give operator codes but never state **which response or callback field carries them** | Documented with a `<Warning>` on both pages | Confirm the carrying field |
| 24 | RCS error codes (Jio) | "Default account TPS exceeded" is listed with **no error code** (`—`); codes 8, 10, 18, 19, 22, 26, 27, 29 undefined | Reproduced with `—`, flagged | Supply the missing code |
| 25 | RCS error codes (Vi) | "Test template limit exceeded" appears twice — `400-C` (retry UNSURE) and `429-B` (retry YES); "Curfew hours" appears as both `403-D` and `503-A` | Both reproduced, flagged | Reconcile duplicates |
| 26 | WhatsApp error codes | Meta code `3` (API Method) is mapped to HTTP **500** while every other permission error is 403 | Reproduced as given | Confirm status |
| 27 | Both error-code pages | "Retry Allowed" column uses **UNSURE** for 9 codes — the operators never confirmed behaviour | Documented as "treat as non-retryable until verified" | Verify against live traffic |

## Plugins section — source caveats

The `plugins/` pages were written from two source sets: **vendor SOWs** (OneXtel ↔ Spritle
Software) for scope, and the **setup guides in Google Drive** for procedures. Status was
reconciled against the connector delivery tracker (Aug 2026).

Deliberately excluded as commercially sensitive and not customer-facing: vendor identity and
addresses, pricing and person-day estimates, hourly rates, payment terms, vendor support tiers
and SLA tables, vendor escalation contacts, signature blocks, and internal delivery caveats
(e.g. "based solely on verbal confirmation").

### Redacted from the setup guides — must not be published

| # | Source | Redacted | Replaced with |
|---|--------|----------|---------------|
| R1 | Salesforce Marketing Cloud guide | Every endpoint is an **ngrok dev tunnel** (`jadon-unperished-prelusively.ngrok-free.app`) | `{connectorBaseUrl}` placeholder — **supply the production URL** |
| R2 | Salesforce Marketing Cloud guide | Hard-coded MID `546009709` in all four activity URLs | `{MID}` placeholder |
| R3 | Shopify RCS guide | DLR callback is an **internal private IP**, `http://10.52.6.54:8081/dlr/rcs` | Removed; page says share the callback URL with OneXtel — **supply the public URL** |
| R4 | Salesforce SMS + WhatsApp guides | Package install **password in plaintext**, and fixed package IDs | "Request the current install link and password from OneXtel support" |
| R5 | Salesforce WhatsApp guide | Real mobile number `919840161462` in the Apex sample | `919999999999` per style guide |
| R6 | Optimove guide | Sign-up / login URLs are `https://example.com/...` placeholders | "the connector portal URL provided by OneXtel" — **supply the real URL** |

### Errors found in the source setup guides

- **Optimove guide is footered "Copyright © 2024 Tanla Platforms Limited"** — a different
  company. Fix at source.
- **Shopify SMS guide** contains an unfinished editorial note ("Insert the above ss here bro").
- **LeadSquared guide** gives the same navigation path for delivery reports and inbound
  ("Delivery Reports → Incoming Messages") — copy-paste error. Page documents Delivery Reports
  for DLR and its Incoming Messages sub-tab for inbound; confirm.
- **Salesforce WhatsApp guide** lists `OneXtel.TemplateController` twice in the Apex class list.
- **MoEngage inbound header key differs by channel** — `callback_url` for WhatsApp, `cbUrl` for
  RCS. Documented as-is with a warning, but this looks unintentional; consider unifying.

### Open questions

### Resolved (Aug 2026)

- **P5 — Authentication templates.** Not supported via plugins by design: authentication needs
  direct API integration because plugins add latency. Per product decision, this is **not
  mentioned in the docs at all** — the limitation was removed from the Salesforce page rather
  than reworded.
- **P7 — Message categories.** RCS has two: **Promotional** and **Transactional** (Utility is
  part of Transactional). WhatsApp via plugins is **Marketing** and **Utility**. OTP is not
  supported via plugins on either channel. Pages now state supported categories positively and
  never enumerate what is excluded. Documented in `plugins/overview.mdx`.
- **P8 — Callback configuration is self-serve.** Customers configure their own callback URLs in
  the portal's callback designer (**Configuration → Add New Callback**). CleverTap and
  WebEngage pages updated; the WebEngage *setup guide* still says "reach out to the Onextel
  team" — fix at source.
- **P11 — Multi-region routing.** OnexAura is the domestic deployment, OnexGlobal the
  international one. The docs stay deployment-generic, so the Shopify multi-region feature is
  **not documented at all**. Removed from the Shopify page and from Coming soon.
- **P12 — TTL.** Status unclear for WebEngage and unverified elsewhere. Per product decision,
  **TTL is not mentioned anywhere in `plugins/`**. Note that `ttl` remains documented in the
  RCS API reference (`api-reference/rcs/send-messages`), which was left untouched — confirm
  that is intended.

### Open questions

| # | Plugin | Open question |
|---|--------|---------------|
| P2 | All | Onboarding is written as "contact your account manager". Confirm the real provisioning route. |
| P4 | Salesforce | Confirm SMS and WhatsApp ship as separate packages, and what the "with WA inbox" variant adds. |
| P9 | WebEngage | "The index won't be sent from Webengage, so it will be added arbitrarily" — documented as connector-assigned variable ordering with a test-send warning. Confirm actual behaviour. |
| P10 | LeadSquared | Auth uses the user's phone number as username and the OneXtel API key as password. Confirm this is intended and how keys are rotated. |
| P13 | Salesforce Marketing Cloud | Tracker lists a **V2-SH Fallback** as live, recorded only in an email thread (Jun 18). Page documents fallback via decision splits — confirm that is the same feature. |
| P14 | Salla / ActiveCampaign | Listed in Coming soon without detail, as agreed. Supply scope when they go live. |
| P15 | All plugins | The callback designer flow is now referenced from four pages but has **no guide page of its own**. Worth adding one under `guides/` and linking to it instead of repeating the menu path. |

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

1. ~~Add an **RCS Delivery Notification callback** page~~ — done.
2. Resolve the endpoint-path conflicts (#1, #2, #7, #8) with engineering and delete the inline notes.
3. Supply production portal URLs and real response examples (#18, #19).
4. Capture portal screenshots for the user guides.
5. Add a **Callback Designer** guide page (see P15) and point the plugin pages at it.
