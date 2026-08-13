# Coverage Audit — Aug 2026

Audit of the documentation set against the intended customer journey, following the Aug 2026
source drop (`OneDrive_2_05-08-2026`, 30 files).

**This file is not part of the published site** (it isn't in `docs.json`).

## Verdict on the information architecture

The intended shape is right:

```
1. Get on the platform      → account, users, roles, credits, dashboard
2. Activate a channel       → WhatsApp / RCS / SMS enablement
3. Use the channel          → campaigns, templates, reports per channel
4. Build against it         → API reference per channel
5. Connect existing tools   → plugins
```

Layers 3, 4, and 5 are built. **Layer 1 does not exist, and layer 2 is missing for every
channel.** That is the gap.

There is also a structural problem inside layer 1. Account-level features — API key generation,
notifications, phonebook, user profile — were extracted from the *SMS User Manual* and now live
under `guides/sms/`. They are not SMS features. A WhatsApp-only customer will never find them.

## Gap map

### Layer 1 — Platform (no coverage)

Source: **OneXtel V2 Aura User Guide** (100 pp), the single largest uncovered document.

A `guides/platform/` section now exists. Remaining gaps are marked **Missing**.

| Area | Status | Source |
|------|--------|--------|
| Account model, charging, masking | **Done** — `platform/overview` | V2 Aura pp. 29–33 |
| User Management — TUC add/view/edit/delete | **Done** — `platform/user-management` | V2 Aura pp. 29–36 |
| User Management — User add/view/edit/delete | **Done** — `platform/user-management` | V2 Aura pp. 37–41 |
| Roles, custom roles, assignment | **Done** — `platform/roles` | V2 Aura pp. 42–44 |
| Credits — userwise, all allocation, update | **Done** — `platform/credits` | V2 Aura pp. 45–47 |
| Callback Configuration | **Done** — `platform/callback-configuration` | V2 Aura pp. 91–92 |
| VMN Configuration and keywords | **Done** — `platform/vmn-configuration` | V2 Aura pp. 93–95 |
| Blacklist — category, number, upload, download | **Done** — `platform/blacklist` | V2 Aura pp. 86–90 |
| All Schedule | **Done** — `platform/all-schedule` | V2 Aura p. 100 |
| Telco Reports | **Done** — `platform/telco-reports` | V2 Aura p. 58 |
| Signing in, TUC login | **Done** — `platform/getting-started` | V2 Aura pp. 8–9 |
| Dashboard | **Done** — `platform/getting-started` | V2 Aura p. 24 |
| API key generation | **Done** — `platform/api-keys` (moved out of SMS) | V2 Aura pp. 72–75 |
| Phonebook — groups and contacts | **Done** — `platform/phonebook` (moved out of SMS) | V2 Aura pp. 77–84 |
| Notifications | **Done** — `platform/notifications` (moved out of SMS) | V2 Aura pp. 96–98 |
| User profile / account settings | **Done** — `platform/account-settings` (moved out of SMS) | V2 Aura — |
| DLT — entity IDs, sender IDs, templates, bulk upload, short URLs | **Done** — `platform/dlt` | V2 Aura pp. 59–71 |

**Relocation completed (Aug 2026).** `guides/sms/settings` was split into
`platform/account-settings`, `platform/api-keys`, and `platform/notifications`;
`guides/sms/phonebook` became `platform/phonebook`. Two permanent redirects are registered in
`docs.json`:

| Old URL | New URL |
|---------|---------|
| `/guides/sms/phonebook` | `/guides/platform/phonebook` |
| `/guides/sms/settings` | `/guides/platform/account-settings` |

`/guides/sms/settings` had three sections going to three destinations; the redirect points at
account-settings, since that carries the "settings" identity. Anyone deep-linking to the old
`#api` or `#notifications` anchors lands on account-settings and needs one more click — acceptable,
but worth knowing if those anchors were shared externally.

The duplicated **Signing in** and **Dashboard** sections were removed from `guides/sms/overview`
and replaced with a pointer to Platform.

### Layer 2 — Channel activation (no coverage)

No page tells a customer how to get a channel switched on. The source that covers it —
**Onextel WhatsApp Onboarding SOP** — is an internal PMO/Presales document and cannot be
published as-is (see below). A customer-facing version needs to be written from it, covering
what the *customer* does: supply activation and CERF forms, attend the embedded-signup session,
supply a display picture and business profile details, complete UAT.

RCS and SMS activation have no equivalent source in this drop at all.

### Layer 3 — Channel usage (mostly covered, two features missing)

| Feature | Status | Source |
|---------|--------|--------|
| Meta Direct Send | **Done** — `guides/whatsapp/direct-send` | `Meta Direct Send User Guide.docx` |
| Bulk WhatsApp Template Upload | **Done** — `guides/whatsapp/bulk-template-upload` | `Bulk WhatsApp Template Upload.docx` |
| WhatsApp campaigns | Covered | — |
| RCS campaigns and platform | Covered | — |
| International SMS | Covered | — |
| Multi-channel fallback | Covered and current — matches the formatted guide including Same Account / Third-Party modes, wait time, TTL | — |

Meta Direct Send is a substantial feature: WABA enablement, per-TUC enablement, message sample
validation, direct-send campaigns, interactive messages (CTA URL, reply buttons), TTL, and
auto-generated templates. None of it is in the docs.

### Layer 4 — API reference (covered, verify two)

| Item | Status |
|------|--------|
| WhatsApp, RCS, SMS, Omnichannel | Covered |
| RCS delivery notification | Added Aug 2026 |
| Operator error codes (Jio, Vi, Meta) | Added Aug 2026 |
| `Status Check API.docx` | **Verified and corrected** — see below |
| `Delivery Status (DLR) Mapping Document.pdf` | **Verified and rewritten** — see below |
| `VI Templates Payload Description.txt` | **Done** — constraints extracted into `api-reference/rcs/templates`; internal IPs and the sample API key in that file were not carried across |

### Corrections found in the verification pass

**`api-reference/omnichannel/message-status`** had three errors against the Status Check API
source, all of which would have caused failed calls:

| Was documented | Actually |
|----------------|----------|
| `messageId` required | Conditional — either `messageId` **or** `mobileNumber`, never both. Passing both returns an error |
| `pageNo` and `limit` required | Optional, defaulting to `0` and `10` |
| Description claimed SMS support | Source gives `wa` and `rcs` only |

The mutual-exclusion rule was absent entirely and is now a warning on the page, along with the
`YYYY-MM-DD HH:mm:ss` format for `from`/`to` and the rule that date range is mandatory only for
`mobileNumber` lookups.

**`api-reference/whatsapp/callback-delivery-notification`** was written against a structural
skeleton with every field marked "(inferred)" and the note "possible values of `statuses.status`
are not listed in the source". The DLR mapping document supplies all of it, so the page was
rewritten with the real status lifecycle (`sent` / `delivered` / `read` / `failed`, with trigger
conditions), authoritative field definitions, the enum values for `conversation.origin.type` and
`pricing.category`, the fact that `errors` appears only on `failed`, and Meta's error-codes
reference link.

### Layer 5 — Plugins (covered)

Eight live connectors documented, three in Coming soon. See `REVIEW_NOTES.md` for open items.

### Not in any layer — TSP / partner onboarding

The **TSP Onboarding Journey** (11 steps, 3–5 weeks) is a partner-facing flow for tech
providers reselling OneXtel: commercial alignment, Meta Business Portfolio setup, Meta App
creation, Tech Provider enrolment, Partner Solution linking, solution approval, Meta App review,
access verification, embedded signup implementation, credit line activation, go-live.

This is a distinct audience from end customers and would justify its own section. Nothing
covers it today.

## Sources that must NOT be published

| Source | Why |
|--------|-----|
| `Onextel WhatsApp Onboarding SOP.html` | Marked "Internal Use Document". Contains a shared default account password, internal staff names, internal request-routing emails, Super Admin and Tenant Admin procedures, and internal domains. Use it to *derive* a customer-facing activation guide; never publish it. |
| Support escalation matrix (image) | Internal L1 / L2 / Presales / TAM / Product routing and ownership. Internal process. |
| `WARCS_Architech_and_flow_Document` | Internal architecture. |
| `OneXAura_UI_UX_Audit.docx` | Internal product critique. |
| `Onextel_Documentation_Feedback_Tracker.xlsx` | Internal review process tracker. |
| `VI Templates Payload Description.txt` | Content is useful, but every cURL points at internal IPs (`10.20.3.125:8888`, `10.20.3.116:9191`) and carries a sample API key. Extract the field constraints only. |

## Recommended order

1. ~~Callback Configuration guide~~ — **done**.
2. ~~Getting Started / Platform section~~ — **done**. Ten pages under `guides/platform/`.
   The relocation of API keys, phonebook, and notifications out of `guides/sms/` is still
   outstanding (see the note above).
3. ~~Meta Direct Send and Bulk WhatsApp Template Upload~~ — **done**.
4. **Channel activation** — WhatsApp **done** (`guides/whatsapp/activation`), derived from the
   internal SOP with all internal procedure, hosts, credentials, and staff excluded.
   **RCS and SMS still have no source** — activation for those two remains undocumented beyond
   sender registration. Supply a source.
5. ~~TSP onboarding~~ — **done** (`guides/partners/tsp-onboarding`), from the 11-step journey.
   A written source would still be better than the infographic.
6. **Verification pass** — Status Check API and DLR mapping **done**. RCS template field
   constraints still outstanding.
7. ~~Relocation~~ — **done**, with redirects.

## Remaining work

1. **RCS and SMS activation pages** — blocked on source. The only gap left in the five-layer
   structure.
2. **Confirm the DLT / Templates-menu relationship.** `platform/dlt` documents the portal's DLT
   menu (India, TRAI). `guides/sms/sender-id` and `guides/sms/templates` came from the
   *International SMS* manual and describe a separate Templates menu. The pages cross-reference
   each other on the assumption that DLT is domestic-only and the Templates menu is
   international — **verify that split is real** before publishing, since getting it backwards
   would send someone to the wrong screen.
3. **Short URLs** (V2 Aura p. 71) are documented in one sentence in the source, so the section
   in `platform/dlt` is thin. Expand when there is more source.
4. The open API discrepancies in `REVIEW_NOTES.md`, several of which need engineering to
   confirm rather than more documentation — notably the RCS carousel enums (#14), which need a
   test template rather than another document.

## Open questions — domestic SMS

To put to the domestic SMS owner and engineering. Ordered by what unblocks the most.

### Blocking developers

1. **The Omni SMS API has no documented response.** The source guide covers the request only —
   no success shape, no failure shape, no error codes. A developer can send but cannot handle
   the reply. What does a 200 return, and what does a rejection look like?
2. **`type` vs API key configuration.** The guide says message type is "ultimately determined by
   the API key configuration, regardless of the value sent". If the key is configured for
   `TRANS` and the payload says `Promo` — is the request rejected, or silently recategorised
   and billed as `TRANS`?
3. **Are `templateId` and `entityId` really optional?** Marked "No" for mandatory, but
   DLT-regulated traffic is rejected without them. Can we state plainly that they are required
   for Indian destinations?
4. **`custRef1` shape.** It is an *object* (`CustomReference1`, `CustomReference2`) on the SMS
   API, but `custref1`–`custref5` are *strings* on RCS and WhatsApp. Intentional? Which form
   comes back on the DLR?
5. **What does `validation: true` validate?**
6. **Per-key throughput limit for SMS** — is there one, and what happens on breach?

### DLT and compliance

7. **How do DLT template types map to API `type` values?** DLT registers templates as Promo /
   Service Implicit / Service Explicit. The API accepts `SI`, `TRANS`, `OTP`, `SE`, `Promo`.
   `SI`/`SE`/`Promo` line up — but what are **`TRANS`** and **`OTP`** mapped to, given DLT has
   no such template categories? This is the seam where the TXN bug lived.
8. **Sender ID length.** The Add form hints "3 to 15 characters"; the list view calls it "the
   six-lettered government-issued Sender's ID". Which does the platform enforce?
9. **What does the DLT → URL tab do?** The source gives it one sentence.

### Quick portal checks

10. Is the **DLT** menu domestic-only and the **Templates** menu international-only? Our pages
    cross-reference each other on that assumption.
11. Does **MIS Report** exist on the domestic Reports menu? It is in the International manual but
    not in the V2 Aura tab list.
12. Confirm **Campaign Summary** is its own tab — the V2 Aura procedure says "click the Template
    Wise Report tab", almost certainly a copy-paste error.

### No source at all

13. **SMS channel activation.** Nothing documents what a customer does to get SMS switched on.
    This is the last structural gap in the docs.
14. **SMS DLR callback setup** — how the customer registers the DLR URL, expected headers, and
    the acknowledgement we expect back (REVIEW_NOTES #18).
15. **Does a fallback SMS emit a normal SMS DLR?** Needed to close the fallback ticket — it is
    the diagnostic that separates "fallback never fired" from "fired and failed".

### Naming

16. Wait time appears as `waittime` (Fallback API), `wait_time` (MoEngage CR), and
    `Fallback_wait_time` (CleverTap). Which is canonical?

## The live site — resolved

`https://onextel-09023014.mintlify.site/` is live and **deploys from this repo on push**.
Verified against pages that exist only in recent commits. The subdomain is Mintlify's
auto-generated project URL, not a custom one; the custom-domain cutover is still open.

Mintlify does not surface its builds through GitHub's checks or deployments API — the repo shows
zero of both while deploying normally. Do not use that as a signal; fetch a known-new URL
instead.

The `/getting-started` reference in the feedback tracker was **not a real page** — that row is
template placeholder text ("Jane Doe", "Example: intro paragraph is unclear on what CPaaS
covers"). It most likely came from an earlier, abandoned Mintlify project. Nothing to chase.
