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
| DLT — entity IDs, sender IDs, templates, bulk upload | Partially, under SMS | V2 Aura pp. 59–71 |

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

1. **RCS and SMS activation pages** — blocked on source.
2. **RCS template field constraints** — from `VI Templates Payload Description.txt`, stripping
   the internal IPs.
3. **DLT section** (V2 Aura pp. 59–71) — entity IDs, sender IDs, templates, bulk upload. Still
   only partially covered under SMS.
4. The open API discrepancies in `REVIEW_NOTES.md`, several of which need engineering to
   confirm rather than more documentation.

## The live site — resolved, with a caveat

`https://onextel-09023014.mintlify.site/` **is live.** The subdomain is Mintlify's
auto-generated project URL, not a custom one.

**Its content does not match this repo.** The live landing page has "Choose your path" and
"How it works" sections that do not exist in `index.mdx` here, and it lists six API-reference
entries against this repo's different set. So it was deployed from an earlier state, a different
branch, or edited through Mintlify's web editor.

<u>Confirm which GitHub repo and branch the Mintlify project is connected to before pushing</u> —
if it is connected to this repo's default branch, the next push replaces the live site wholesale.

The `/getting-started` reference in the feedback tracker is **not a real page**. That tracker
row is template placeholder text — same row reads "Jane Doe" and "Example: intro paragraph is
unclear on what CPaaS covers". The live site has no Getting Started page either. Nothing to
chase.
