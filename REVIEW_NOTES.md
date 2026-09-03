# Review Notes — Open Questions & Source Discrepancies

These are inconsistencies the source documents contained (not authoring choices). Each was
handled with **fidelity over invention** — where the Postman collection and a PDF disagreed,
the Postman value was documented as authoritative and the conflict flagged inline. Reconcile
each against the live platform, then update the page and delete the note here.

**Closed items are deleted, not archived.** Once an answer is reflected in a published page, its
row goes — git history is the record of what was asked and when. A row only survives if something
is still outstanding: an unanswered question, a source to correct, or a page to revisit when
something ships.

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
| 19 | Omnichannel | Message Status & History have no saved example responses | **Message Status resolved** — real response captured and documented. **Message History still has none** | Capture a History response |
| 20 | Omnichannel | Message Status request is `auth: noauth` in Postman but still sends `apikey` header | Documented header auth | Confirm auth |
| 20b | Omnichannel | Message Status `channel` enum and `taId`/`tucId` requirement | **Resolved by live testing (Aug 2026).** `channel` is not validated on `messageId` lookups — `whatsapp`, `wa`, `sms`, a bogus string, and omitting it all return the same record. `taId`/`tucId` are optional. Response schema captured and documented; bad key returns HTTP 400 "NO VALID AUTH_KEY FOUND!" | Closed — retest `channel` on a `mobileNumber` lookup, where it may matter |
| 20d | SMS DLR | Platform DLR carries both `dlrCode` (`001`) and `errorCode` (`000`) on the same delivered message. Only `errorCode` maps to the documented error table | Page tells integrators to branch on `errorCode` and treat `dlrCode` as informational | Confirm what `dlrCode` represents and its value set |
| 20e | SMS error codes | Code `995` arrived mojibake-encoded (`Platform_Time window Ã¢â‚¬â€œ discarded`) — that byte sequence is a UTF-8 en dash misread as Windows-1252 | Documented as "Time window — discarded", i.e. the message fell outside the SMS Time Window account setting | Confirm the reading |
| 21 | Fallback / SMS send | SMS `type` enum — **re-resolved by live testing (Aug 2026)**. The *SMS API Omni Channel* guide lists `SI, TRANS, OTP, SE, Promo`, but the live API accepts only **`SI`, `OTP`, `SE`** (case-sensitive). `TRANS`, `Promo`, and `TXN` all return `invalid type` (status 700), and `type` is **required**, not optional | Examples across the fallback and send pages now use `SI`; the verified matrix is documented on both. **The source PDF enum is wrong and should be corrected at source** | `Promo` may be rejected due to account entitlement rather than being invalid — retest with a promo-enabled key |
| 21b | SMS send | Send returns `messageid` in ULID form (`01M0QSEJ...`) while Message Status keys on `uuid` (`3I7dnaYRaiTVj8f5EgxsoiJrT5R`). Status lookups by the returned `messageid` returned no record shortly after send | Not documented as interchangeable | **Confirm whether `messageid` and `uuid` are the same identifier, and how long status takes to populate** |
| 21c | RCS templates | `guides/rcs-platform/template-guidelines` is derived from a **single operator's** internal template-approval SOP (Vi, classified "Vodafone Idea Internal"). All operator branding, the internal classification footer, the "RBM" terminology, and the escalation path to that operator's ops team were stripped | Published as generic RCS approval guidance with a note that requirements vary by operator | **Confirm these rules hold across Jio and Airtel, or scope the page per operator** |
| 21e | CleverTap RCS | The connector setup guide gives the SMS-fallback `type` as "Optional (default TXN)" and "e.g. TXN or SI". Live testing shows `TXN` is rejected | Page uses `SI` and carries the verified matrix | Correct the vendor guide at source |
| 21f | Connector screenshots | Source screenshots carried live API keys, an ngrok dev host, and a named customer (`PinelabDemo`, `Pinelab Dlr`, `fallbackCTpinelab`) | **Published (Aug 2026).** Keys confirmed rotated and left visible; customer names and the ngrok host masked; the MoEngage callback list cropped to drop the key/URL table; the two Pinelabs-flow campaign shots had their `sender_id` row masked so they match the Normal flow | Re-capture against the production connector URL when one is available |
| 21g | Intl SMS codes | Scope of `ERRORCODE` remapping | **Partly answered (Aug 2026).** The platform normalises many operator codes onto a generic set for customer and internal clarity — that is the mechanism, and it explains the duplicate descriptions. Warning rewritten from "remapped per account" to "platform codes, not raw operator codes, mapping under review" | **Still open: is the mapping identical for every account, or can it differ, and where is it configured?** Error descriptions are also being reworked to map onto native connectors (MoEngage, Braze, CleverTap, Adobe) — the published tables need reissuing when that lands |
| 21h | Intl SMS codes | Source inconsistencies: the API guide's consolidated table glosses `011` as "Undelivered" while the code list gives it as "Teleservice not provisioned" (`UNDELIV` is the class, not the meaning); `001`/`033` both read "Unknown subscriber" and `027`/`029` both "Absent subscriber"; the `9xxxxx` table is headed "Value (hex)" though the values read as decimal | `011` documented as teleservice not provisioned; duplicates documented as equivalent with a note; the hex/decimal label dropped and codes documented as returned strings | Confirm the duplicate pairs really are equivalent, and whether `9xxxxx` is genuinely hex |
| 21j | Intl SMS codes | The **Retry?** column was inferred, not sourced | **Partly answered (Aug 2026).** Platform behaviour is now known: only gateway-level failover exists today, with no per-error-code retry. The page says so, and the column is framed as guidance for the customer's own logic | Still open: have routing confirm the retryable set. Per-code retry via a secondary gateway is on the roadmap — republish when it ships |
| 21l | Intl SMS | **DLR TTL is a live capability we document nowhere.** There are two — an operator-level default set per API key on the platform, and a value the customer supplies in the submission, which supersedes it. The API guide covers neither, and the sample payload has no TTL field | Not documented; the field name is unknown | **Blocking: what is the field called, what unit and range does it take, and what is the operator-level default?** |
| 21m | Intl SMS | Message part counts are not returned by the API or the callback — `messagepartids` comes back empty, and parts appear only in the portal summary/detail reports | Documented on the send page as a stated limitation | Platform side is open to exposing it; republish if added |
| 21o | Intl SMS | Coverage and destination obligations | **Answered (Aug 2026).** Service is offered A–Z with no published country list. Obligations vary and several fall on the customer — UAE sender-ID registration, USA A2P 10DLC | Documented as "confirm with your account team" plus the two named examples. **A consolidated obligations list would be worth building** |
| 21p | Intl SMS | Billing is undocumented. No wallet exists; 1 credit = the destination country unit price, and charges are tracked manually. A wallet has been pending roughly a year | Nothing published | **What can a customer be told about pricing and balance today, and how do they check either?** |
| 21t | MoEngage RCS | The **new** connector setup guide (Sept 2026) again lists **OTP** as an RCS sender type, with `Name_OTP` / `SenderID_OTP` naming examples, and the sender-form screenshot still shows the OTP radio | Not documented. Page continues to state Promotional and Transactional only and warns readers not to create an OTP sender | **Third source in a row to assert OTP. Get it removed from the vendor guide, or reopen the product decision** |
| 21u | MoEngage RCS | MoEngage `ttl` and `fallbackWaitTime` in the Authorization string. The guide says only "use the suggested values provided by OneXtel"; the screenshot shows `10s` for ttl | Documented as tilde-separated with the unit shown as in the screenshot, and "use the values OneXtel supplies" | **What are the suggested values, what units and ranges are accepted, and does this ttl relate to the DLR TTL in 21l?** |
| 21v | MoEngage RCS | SMS DLR callback for fallback **cannot be created in the portal** — the guide says to contact support | Documented as a warning in the fallback steps | Product gap: expose SMS DLR callback creation in the UI |
| 21w | MoEngage RCS | Source inconsistencies in the new guide: the sender-form screenshot shows Sender Name `antuc_prod`, which does not follow the mandatory `Name_Type` rule the same guide states; and the SMS provider screenshot shows Method `GET` selected while the text says `POST` | Docs follow the stated rules (`Name_Type`, `POST`) | Fix both at source |
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

| # | Plugin | Open question |
|---|--------|---------------|
| P8 | WebEngage | Callback configuration is self-serve and the pages say so, but the WebEngage *setup guide* still tells customers to "reach out to the Onextel team". Fix at source. |
| P12 | RCS API | TTL is deliberately absent from `plugins/` per product decision, but `ttl` remains documented in `api-reference/rcs/send-messages`, which was left untouched. Confirm that is intended. |
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

Portal and connector screenshots are published under `images/` for the platform, SMS, and plugin
pages — masked where a source carried live keys, a named customer, or a dev host. Coverage is
partial: the WhatsApp and RCS campaign guides still describe UI actions in prose because their
source PDFs did not yield usable images.

## Suggested follow-ups

1. Resolve the endpoint-path conflicts (#1, #2, #7, #8) with engineering and delete the inline notes.
2. Supply production portal URLs and real response examples (#18, #19).
3. Capture screenshots for the WhatsApp and RCS campaign guides.
4. Add a **Callback Designer** guide page (see P15) and point the plugin pages at it.
5. Close the international SMS items (#21g–#21p) on the joint call with routing and commercial.
