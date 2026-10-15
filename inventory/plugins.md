# Onextel plugin & connector inventory

**Generated 2026-08-17 · rev 3** from `plugins.yaml`. Do not edit by hand — edit the YAML and
re-render. Status is **derived**, never copied. See [`conflicts.md`](conflicts.md) and
[`unmatched.md`](unmatched.md).

> **Internal document.** Vendor names, SOW links, contracted days, derived readiness. Not wired
> into `docs.json`.

**What changed in rev 2:** a plugin is not one integration. `direction` and `built_by` are now
first-class, because CleverTap alone has **seven directions built by two different vendors**, and
because git authorship contradicts who the tracker implies built things.

**What changed in rev 3:** SMS. Consco Tech's gateway family is not two gateways but **three —
RCS, WhatsApp and SMS — plus its own monitoring stack**. The SMS gateway carries MoEngage,
WebEngage and CleverTap SMS today, which rev 2 recorded as "not built at all." See C-27.

---

## How to read `rollup`

rev 1 had a single `rollup_status` = *the weakest capability*. It was useless: it showed MoEngage
as `proposed` when MoEngage V1 has been in production since February. rev 2 replaces it with three
numbers that answer different questions:

| Field | Question it answers |
|---|---|
| `shipped` | **What is the best this plugin has ever reached?** Highest status any capability holds. "Do we have something to sell?" |
| `weakest_open` | **What is the worst thing still intended to go live?** Excludes `hold` and `dropped`. "What will embarrass us?" |
| `live_count` | **How much of the plugin is actually in production?** e.g. `1 of 6`. |

MoEngage now reads `shipped: live · weakest_open: proposed · live_count: 1 of 4` — one thing is
in production, three are not, and the worst of those has no SOW. That is the real picture.

---

## Where things stand

| | Count |
|---|---|
| Plugins | 17 |
| Capabilities (directions) | 42 |
| **Live in production** | **17** |
| Vendor-delivered, **not internally certified** | 7 |
| In development | 2 |
| Scoped (SOW, no dev) | 3 |
| Proposed (no SOW) | 6 |
| On hold | 5 |
| Dropped | 2 |
| **Internally certified** | **0** |

**Who actually builds this estate** (from git commit authorship, not from SOWs):

| Builder | Capabilities | Notes |
|---|---|---|
| **Spritle Software** | 24 | Every 2026 connector. The tracker's `Accountability` column names *Spritle engineers* — Bobert, Anish, Karthikeyan, Bellarmine, Benny — so every row reads as vendor-owned. **There is no Onextel-side owner column at all.** |
| **Consco Tech** | 6 | Builder of a **three-channel gateway family** (RCS, WhatsApp, SMS) plus its Grafana/Prometheus monitoring, all inside `1xtel/rnd` — never as its own repo. 364 commits, every one in `rnd`. Ships **versioned releases with changelogs** (SMS gateway at 3.0.3, 2026-08-11, with HA) — the only version-disciplined connector work in the estate. Still shipping: `rnd` HEAD is **2026-08-17**, today. Appears in **no tracker row**. |
| Onextel in-house | 2 | `connector-core` plus the Smartico and Fasttrack scaffolds. |
| DotSquares | **0** | Not a builder. Prospective AppExchange wrapping partner for Salesforce; NDA unsigned. *rev 1 wrongly credited them with the Salesforce and Shopify code.* |

---

# Tier 1 — MoEngage, WebEngage, CleverTap

## MoEngage · `shipped: live` · `weakest_open: proposed` · **2 of 5 live**

**Certification gate — named and not met:** the fail/pass test-case report against the checklist
shared **2026-07-31**. Agreed 2026-08-10; full-flow retest of every WhatsApp and RCS template
required before certification; billed to support hours (RCS outside warranty, WhatsApp shipped
Dec 2025). *This is the first concrete definition of `internally_certified` anywhere in the estate.*

| Direction | Ver | Built by | Status | Blocked on |
|---|---|---|---|---|
| MoEngage WhatsApp → Onextel WhatsApp | V1 | Spritle | **live** | — |
| MoEngage RCS → Onextel RCS (+ SMS fallback) | V2 | Spritle | **vendor_tested** | Carousel not enabled by MoEngage; fallback testable only in MoEngage prod; two dry runs owed |
| MoEngage WhatsApp → Onextel WhatsApp (full template matrix) | V2-CR | Spritle | **proposed** | No SOW. MoEngage drops manual template upload from September |
| MoEngage → Onextel SMS, **via the shared webqueue SMS gateway** | gw 3.0.3 | **Consco Tech** | **live** | — (AURA-13991 Closed 2026-04-22) |
| MoEngage SMS channel → Onextel SMS (native, in-platform) | — | — | **proposed** | Not built |

## WebEngage · `shipped: live` · `weakest_open: proposed` · **2 of 4 live**

| Direction | Ver | Built by | Status | Blocked on |
|---|---|---|---|---|
| WebEngage WhatsApp & RCS → Onextel WhatsApp & RCS | V1 | Spritle | **live** | — |
| WebEngage → Onextel (native-channel delta, 13 items) | V2 | Spritle | **proposed** | SOW agreed in principle 2026-08-10, not raised |
| WebEngage → Onextel SMS, **via the shared webqueue SMS gateway** | gw 3.0.3 | **Consco Tech** | **live** | — (AURA-13992 Closed 2026-05-19) |
| WebEngage SMS channel → Onextel SMS (native, in-platform) | — | — | **proposed** | Not built |

**The V2 delta is real and now scoped** — 13 items, ~1 week, decided on 2026-08-10 to be a **new
SOW, explicitly not support hours**: LTO template, Location template, template CRUD across all
five types, DLR callbacks for five states with region-aware routing, and quick-reply inbound
tracking. Design consequence worth noting: Onextel must push the region (US/KSA/IN) in the DLR
header; WebEngage supplies one **static token per region**, held in the connector's ENV. That adds
a mandatory step to the WebEngage onboarding script.

## CleverTap · `shipped: live` · `weakest_open: proposed` · **2 of 7 live**

**This is the one that was modelled wrong.** rev 1 had "CleverTap" and "Pinelabs CleverTap" as two
plugins with one capability each. There are seven directions and two vendors:

| # | Direction | Built by | Status | Note |
|---|---|---|---|---|
| 1 | CleverTap **Generic RCS Provider → Onextel RCS** (RCS→RCS) | **Consco Tech** | **live** | `rnd/ct-rcs-gateway`, releases 1.0.0→2.0.0 since 2025-10. Production bugs prove production traffic. **Not in the tracker. No docs.** |
| 2 | CleverTap **Generic SMS Plugin → Onextel RCS** (SMS→RCS proxy) | **Consco Tech** | **vendor_tested** | Same gateway, release 1.0.2 (2026-01-22): *"Support for Generic SMS Plugin for proxy RCS"*. Load-tested via AURA-11681. **Not in the tracker.** |
| 3 | CleverTap Generic RCS + **Pine Labs markers** → Onextel RCS | Spritle | **vendor_tested** | 7 person-day SOW, 2026-07-31. Built and deployed, no test coverage. **No repo.** |
| 4 | CleverTap **WhatsApp channel → Onextel RCS** (WhatsApp→RCS) | Spritle | **vendor_tested** | With template sync. Delivered but unproven. **No repo.** |
| 5 | CleverTap **WhatsApp → Onextel WhatsApp** (WhatsApp→WhatsApp) | Consco Tech? | **hold** *(unknown)* | Treated on 2026-08-10 as a brand-new unscoped requirement — **but `rnd/ca-wt-gateway` already does exactly this.** See C-24. |
| 6 | CleverTap **→ Onextel SMS, via the shared webqueue SMS gateway** | **Consco Tech** | **live** | `rnd/webquque-gateway-rocksdbv2`, `POST /postsms`, monitored as `ct-sms-gateway`. AURA-11235 Closed. **Not in the tracker.** |
| 7 | CleverTap **SMS channel → Onextel SMS** (native, in-platform) | — | **proposed** | Not built |

Two things fall out of laying it out this way:

- **Error-code mapping is inconsistent by direction.** RCS→RCS maps in RCS format and has a
  document. WhatsApp→RCS maps in WhatsApp format and *was never discussed* — the vendor confirmed
  on 2026-08-10: *"for WhatsApp to RCS, we haven't spoken for this."*
- **Direction 4 ships before direction 5 and constrains it.** The decision on 2026-08-10 was that
  WhatsApp→RCS must be built forward-compatible with WhatsApp→WhatsApp, or the later one forces a
  customer migration or downtime. That is the primary agenda item of the 2026-08-11 workshop —
  along with whether all three CleverTap connectors can share **one deployment**.

---

# Tier 2 — shipped, revenue-carrying, lower strategic priority

| Plugin | Rollup | Live | Notable |
|---|---|---|---|
| **Salesforce Marketing Cloud** | live / scoped | 3 of 4 | V3-CR **upgraded to live** (demo accepted 2026-08-10; the tracker's blank PROD flag is stale). New V5-CR approved: metrics, partner licence, debugging. Conversation history declined. Billing 50/50. |
| **Salesforce Sales & Service** | live / — | 3 of 4 | Live but **never submitted to AppExchange**; DotSquares NDA unsigned. RCS V4 on hold, no active customer. |
| **Shopify** | live / in_dev | 2 of 3 | Domestic only. V3 multi-region in test. Certification owner (Benny) is off Onextel work. |
| **ActiveCampaign** | vendor_tested | 0 of 1 | **Upgraded from in_dev** — dev done, app description finalised and submitted 2026-08-10. Dubai only. No docs page. |
| **Zoho CRM** | live / vendor_tested | 1 of 2 | V2 **upgraded from in_dev** — development complete 2026-08-10; setup guide and video still owed. Zero Jira history. |
| **Salla** | vendor_tested | 0 of 1 | **App launch call 2026-08-20.** Certification story AURA-18669 open. No docs page. |
| **Optimove** | live / scoped | 1 of 2 | V2 SOW exists; tracker says Hold with no reason. |
| **LeadSquared** | live / proposed | 1 of 2 | Live, but two-way WhatsApp is not in scope and sales did not know. |

# Tier 3 — parked, dropped, never started

| Plugin | Status | Why |
|---|---|---|
| HubSpot CRM | in_dev | Not a HubSpot Technology Partner; DLR stuck in Notes. Zero Jira. |
| Salesforce Commerce | hold | **No reason recorded** |
| Smartico | hold | **No reason recorded**; in-house scaffold only |
| Fasttrack.ai | hold | Awaiting a call with Fasttrack; in-house scaffold only |
| Oracle Eloqua & Responsys | dropped | Could not obtain a partner account |
| Unica | dropped | **No reason recorded**; a V2 with no V1 |

---

## The six things worth acting on

1. **`rnd/ca-wt-gateway` already forwards CleverTap traffic to the Onextel WhatsApp API.** On
   2026-08-10 CleverTap WhatsApp→WhatsApp was discussed as a new, unscoped requirement and the
   whole forward-compatibility constraint on direction 4 was built on that premise. Check the
   gateway before the workshop scopes work that may be half-done. (C-24)

2. **An entire vendor is invisible to the tracker.** Consco Tech has run CleverTap RCS in
   production since 2025-10 with versioned releases and open production bugs, and appears in zero
   tracker rows, zero docs pages and one Jira ticket. If that engagement lapses, nobody has a
   record of what it covers. (C-22, C-23)

3. **Rotate the tracker credentials.** Plaintext host/username/password for ActiveCampaign and an
   Onextel email/password for Zoho CRM, in a shared sheet. (C-01)

4. **MoEngage now has a real certification gate — use it as the template.** A named fail/pass
   report against a named checklist. Nothing else in the estate has one, which is why all 39
   capabilities sit at `internally_certified: 0`. (C-02)

5. **SMS is missing from all three tier-1 plugins.** Stated flatly on 2026-08-10. No SOW, no
   tracker row, no Jira for any of them. (C-21)

6. **The tracker has no Onextel owner column.** `Accountability` names the Spritle engineer. Every
   conflict in `conflicts.md` is therefore unassignable from the tracker alone.
