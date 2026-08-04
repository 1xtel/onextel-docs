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
| Blacklist — category, number, upload, download | **Missing** | V2 Aura pp. 86–90 |
| All Schedule | **Missing** | V2 Aura p. 100 |
| Telco Reports | **Missing** | V2 Aura p. 58 |
| Signing in, TUC login | Exists but SMS-scoped (`guides/sms/overview`) — generalise into Platform | V2 Aura pp. 8–9 |
| Dashboard | Exists but SMS-scoped (`guides/sms/overview`) — generalise into Platform | V2 Aura p. 24 |
| API key generation | Covered, still filed under SMS — cross-linked from Platform overview, physical move pending | V2 Aura pp. 72–75 |
| Phonebook — groups and contacts | Covered, still filed under SMS — same | V2 Aura pp. 77–84 |
| Notifications | Covered, still filed under SMS — same | V2 Aura pp. 96–98 |
| DLT — entity IDs, sender IDs, templates, bulk upload | Partially, under SMS | V2 Aura pp. 59–71 |

**On relocating the SMS-filed pages:** API keys, phonebook, and notifications are account-level,
not SMS features, and belong in Platform. They are cross-linked from `platform/overview` for now
rather than moved, because moving them changes their published URLs. Decide whether the deployed
site can absorb redirects before doing the move.

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
| **Meta Direct Send** | **Entirely undocumented** | `Meta Direct Send User Guide.docx` |
| **Bulk WhatsApp Template Upload** | **Entirely undocumented** | `Bulk WhatsApp Template Upload.docx` |
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
| `Status Check API.docx` | Verify against `api-reference/omnichannel/message-status` |
| `Delivery Status (DLR) Mapping Document.pdf` | Verify against the SMS and WhatsApp DLR pages |
| `VI Templates Payload Description.txt` | Field constraints (max lengths, allowed characters, suggestion limits) may not all be in `api-reference/rcs/templates` — worth a pass |

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

1. **Callback Configuration guide** — smallest, and four published pages already link to the
   concept. Closes `REVIEW_NOTES` P15.
2. **Getting Started section** — sign-in, dashboard, user management, roles, credits, blacklist,
   VMN, all-schedule. Move API keys, phonebook, and notifications out of `guides/sms/` into it.
   This is the layer-1 fix and the largest single piece of work.
3. **Channel activation pages** — one per channel, derived from the onboarding SOP for WhatsApp;
   RCS and SMS need a source.
4. **Meta Direct Send** and **Bulk WhatsApp Template Upload** — two self-contained new features
   with complete sources.
5. **TSP onboarding section** — partner-facing, separate audience.
6. **Verification pass** — Status Check API, DLR mapping, and RCS template field constraints
   against their new sources.

## Note on the live site

The feedback tracker points at `https://onextel-09023014.mintlify.site/` and references a
`/getting-started` page. No such page exists in this repo — confirm whether the deployed site is
built from this repo or from an earlier source.
