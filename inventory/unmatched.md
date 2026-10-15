# Unmatched — 2026-08-17 (rev 3)

> **rev 2 correction.** `ct-rcs-gateway` and `ca-wt-gateway` were absent from rev 1 entirely —
> not listed here, not in `plugins.yaml`. They live *inside* `1xtel/rnd`, so a repo-name scan
> never saw them. They are now capabilities of `clevertap`. Recorded in `aliases.yaml` under
> `nested_code` so the next run cannot repeat the miss. See conflicts.md C-23.


Things found in a source that could not be attached to a canonical slug + capability, with the
reason. **Nothing was guessed into the alias map.** Triage these by hand and either add an alias,
add a tracker row, or record a decision.

---

## 1. Tracker rows that are not capabilities

| Row | Why it is not a capability | Action |
|---|---|---|
| `LeadSquared` (second occurrence) | **Entirely empty** — no channel, version, scope, status, owner, dates or SOW. It is a duplicate row header with nothing in it. | Delete from the sheet, or fill it in if it was meant to be the SMS scope now sitting in AURA-14330. |
| `P16` | **Does not exist.** IDs run P1–P15, P17. | See conflicts.md C-19. |

---

## 2. Repositories in `github.com/1xtel` that match no plugin

163 repos scanned. These are connector-shaped but map to no tracker row.

| Repo | Evidence | Assessment |
|---|---|---|
| **`twixor-connector`** | Created 2026-07-06, HEAD 2026-07-30, 11 branches, active PR flow. Description: *"Server for API level connector from Aura to Twixor"*. Jira: AURA-11769 "VM provisioning for twixor Dev environment in sify proxmox" (Closed 2026-01-29). | **This is a real, actively-developed connector with no tracker row, no SOW reference, no slug and no docs.** It is the single largest gap this run found. Either Twixor belongs in the plugin inventory or it is a platform integration that should be explicitly scoped out. |
| `connector-core` | `@onextel/connector-core`, 1 commit 2026-05-29. Shared runtime that `fasttrack-connector` and `smartico-connector` are built on. | Shared infrastructure, not a plugin. Correctly excluded. Worth documenting as the connector platform. |
| `connector-environment-vars` | Created 2026-06-16, **empty repository** (0 KB, no commits, no branches). Referenced by AURA-15880 ("update all connectors env files in a repository for version management"). | Placeholder for in-flight CI/CD work (epic AURA-18443). Not a plugin. |
| `chatbot-integration` / `chatbot-integration-bugfixes` | Java, tag `v1.0.2-aura-alpha-1`, HEAD 2026-05-12. | Channel/chatbot integration, not a martech or CRM plugin. Out of scope by category. |
| `webengaura` | Created 2024-05-02, **one commit, 2 KB, README only**. Description: "WebEngage component for AURA". | Dead stub predating the WebEngage connector by 18 months. Aliased to `webengage` so it stops resurfacing, but it is not the plugin. Archive it. |
| `sftpconn` | Last activity 2021-08-09. | Name collides with "conn"; unrelated SFTP utility. Not a plugin. |

### Now matched (were missed entirely in rev 1)

| Path | Resolution |
|---|---|
| `1xtel/rnd → ct-rcs-gateway` | → `clevertap`, directions 1 and 2. Consco Tech, releases 1.0.0–2.0.0. |
| `1xtel/rnd → ca-wt-gateway` | → `clevertap`, direction 5. Consco Tech. **Source channel unconfirmed — C-24.** |
| `~/AI Projects/core_connector` | Platform, not a plugin. Generalisation of `ct-rcs-gateway`; local only, never pushed. |

Other `1xtel/rnd` subprojects by the same author (`onex-rcs-lite`, `jhub`, `ch-smpp-poc`,
`webqueue-gateway-*`, `webquque-gateway-rocksdb*`) are platform/R&D, not plugins — but they
establish that Consco Tech's footprint is much wider than the CleverTap gateways alone.

---

## 3. Jira issues matching an alias but no capability

### 3a. Platform-level connector work (attach to the platform, not to a plugin)

These are real and in-flight, but they are shared infrastructure across all connectors:

| Key | Status | Summary |
|---|---|---|
| **AURA-17234** | Epic, Open | Onextel Connectors *(umbrella epic)* |
| **AURA-18443** | Epic, Open | Connector CI/CD *(umbrella epic)* |
| AURA-15880 | In Code Review | Connectors — update all connector env files in a repository for version management |
| AURA-17607 | In Code Review | Connectors — design a deployment job for various connectors |
| AURA-18477 | Open | Investigate and fix the Node.js dependency issue in D2D connector deployments |
| AURA-14810 | Closed | Connector deployments for Omni_v2 — Dubai deployment |
| AURA-10045 | Closed | Connector's TUC name / TUC ID / API key |
| AURA-751 | Epic, Open | Internationalisation of Aura & Alaris — reports and connector *(open since 2025-01, untouched since 2025-01-28)* |
| AURA-9688 | Epic, Done | Unified Callback Framework for MoEngage, WebEngage, CleverTap & custom integrations |

The per-plugin CD-pipeline children of AURA-18443 **are** attached to their plugins in
`plugins.yaml` (moengage, webengage, salesforce, leadsquared, shopify, optimove, salla,
activecampaign). Note that CD pipelines exist as tickets for eight plugins and **none of them are
Closed except salla (AURA-18156) and activecampaign (AURA-18428)**.

### 3b. False positives — do not join (see conflicts.md C-13)

| Family | Count | What they actually are |
|---|---|---|
| `Pinelabs` | 39 of 40 | **Pine Labs as an SMS customer** — SFTP report delivery, callback formats, DLT, message capping, URL shortener, error codes. Dating from 2025-01. Only AURA-18001 is the connector. |
| `Active Campaign` | 8 of 10 | **Voice campaign manager** — "Verify Behavior with No Active Campaigns", "Delete Template in Active Campaign - Running/Paused/Scheduled", campaign-manager call-count bugs. Only AURA-18428/18429 are the connector. |
| `CleverTap` (subset) | ~25 | **CleverTap as an existing SMS/WhatsApp customer integration** predating the RCS connector — callback config for Snitch, Zepto, Cureskin, Pharmeasy, Dream11, Head Digital. Real history, but for the customer relationship, not the RCS middleware. Retained in `jira_keys` where they concern the callback contract; excluded where they are per-customer config tasks. |
| `plugin` (subset) | 3 | AURA-15751/15760/15837 — leading-zero normalisation tests. Platform number-handling, not a named plugin. |

### 3c. Test-case backlog with no owner

AURA-589–595 (WebEngage portal send scenarios), AURA-11862/11864/11866 (WebEngage callback
scenarios), AURA-12083 (connector initialisation failure), AURA-511/567 (preconditions) — all
`To Do`, all created 2024-12 to 2026-01, none updated since. These are the **absent test coverage**
that AURA-18001 and AURA-18633 complain about, already written down and never run.

---

## 4. Plugins with no published documentation

`live` capabilities all have a doc page, so the definition of done holds. These are the
**Mintlify backlog** for everything not yet live:

| Slug | Status | Doc page |
|---|---|---|
| salla | vendor_tested | **missing** |
| clevertap-pinelabs | vendor_tested | **missing** |
| activecampaign | in_dev | **missing** |
| hubspot-crm | in_dev | **missing** |
| smartico | hold | missing (correctly) |
| fasttrack-ai | hold | missing (correctly) |
| sfcc | hold | missing (correctly) |
| twixor *(unslugged)* | unknown | **missing** |

And the inverse, which matters more: **`/plugins/clevertap` is published and in navigation for a
connector that is not shippable.** See conflicts.md C-20.

---

## 5. Sources that could not be read in this run

| Source | Why | Effect |
|---|---|---|
| Meeting notes before 2026-07-14 | Granola plan retains 30 days | Smartico, Fasttrack, Oracle Eloqua and Unica have **no meeting evidence at all**. Their hold/drop reasons, where recorded, exist only in the tracker. |
| Wispr Flow | Not queried this run | May hold decisions the Granola window missed. |
| Email | Not queried this run | SFMC V2-SH's only scope record is an email (C-08); WebEngage's "four-item delta" (C-04) may be there. |
| Jira project `PROD` | Search scoped to `AURA` per the method | Production incidents against connectors are not joined. |
