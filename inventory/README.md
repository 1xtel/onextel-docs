# Plugin inventory — how to regenerate

A single regenerable inventory of every Onextel plugin/connector, its capabilities, its real
derived status, and its supporting artefacts.

| File | What it is |
|---|---|
| `plugins.yaml` | **Source of truth.** Edit this. |
| `plugins.md` | Rendered table. Do not hand-edit. |
| `aliases.yaml` | Hand-maintained slug ↔ alias map, plus `false_friends`. |
| `conflicts.md` | Every source disagreement, unresolved, with all sides. |
| `unmatched.md` | Everything that matched no slug + why. |
| `context.md` | *(not present)* Dated meeting decisions, produced separately — see §5. |

Run from a machine with the docs repo cloned, `gh` authenticated against the `1xtel` org, a
logged-in Atlassian session in Chrome, and the Granola **and Wispr Flow** connectors available.
Wispr Flow is not optional: the 2026-08-10 "Moengage CleverTap WebEngage Review" moved six
capabilities and is the only place several decisions are recorded at all.

---

## What each source is authoritative for

| Source | Authoritative for | **Not** authoritative for |
|---|---|---|
| Vendor tracker (Google Sheet "Onextel Project Tracker") | Existence, version history, SOW links, setup-guide links, contracted timelines | **Current status** (it lags by up to two states), scope truth |
| Connector git repos (`github.com/1xtel`) | Code existence, last activity, branch state, implemented capabilities | Whether anything is certified or live |
| Docs repo (`1xtel/onextel-docs`) | What is published and customer-visible | Whether the code behind it ships |
| Jira (project `AURA`) | History, scope decisions, who asked for what, abandoned scopes | Product readiness — a `Done` ticket is **not** a certified connector |
| Meeting notes (Granola / Wispr Flow) | Decisions, deferrals, verbal scope changes recorded nowhere else | Anything datable or auditable on its own |

**The tracker is the spine for existence. Git is the check for reality. Jira is the check for
completeness of history. Meeting notes explain why a row is in the state it is in.**

Never copy a status from any source.

---

## Schema: a plugin is not one integration

The parent is the **plugin** (the platform Onextel integrates with). The child is the
**capability**, and a capability is identified by its **direction**, not by its channel alone:

```
direction:  <source platform> <source channel>  →  Onextel <target channel>
```

CleverTap is the case that forces this. It has seven directions — Generic RCS Provider→RCS,
Generic SMS Plugin→RCS (proxy), Generic RCS + Pine Labs markers→RCS, WhatsApp→RCS,
WhatsApp→WhatsApp, SMS via the shared gateway, and native in-platform SMS — built by **two
different vendors**, carrying **different error-code mappings**, and constraining each other. One row per (plugin, channel) cannot
represent that, and rev 1 of this inventory proved it by modelling Pine Labs as a separate plugin
and losing an entire vendor.

Two fields carry this:

| Field | Rule |
|---|---|
| `direction` | Always state source channel *and* target channel. `MoEngage RCS → Onextel RCS` is a different thing from `CleverTap WhatsApp → Onextel RCS`. |
| `built_by` | From **git commit authorship**, never from the SOW or the tracker's `Accountability` column. See extraction step 3. |

### `rollup` — three numbers, not one

rev 1 used a single `rollup_status` = the weakest capability. It reported MoEngage as `proposed`
while MoEngage V1 had been in production for six months. Useless. rev 2 uses:

| Field | Question |
|---|---|
| `shipped` | Best status any capability has reached — *do we have something to sell?* |
| `weakest_open` | Worst status still intended for live, excluding `hold`/`dropped` — *what will embarrass us?* |
| `live_count` | `N of M` capabilities actually in production. |

### `tier` — commercial priority

`1` = MoEngage, WebEngage, CleverTap. `2` = shipped and revenue-carrying. `3` = parked, dropped or
never started. `plugins.md` is ordered by tier, not alphabetically.

---

## Status vocabulary — derived, never copied

The tracker uses eight inconsistent values (`Completed/Live`, `Testing`, `In Development`, `Hold`,
`Review Process`, `Awaiting Confirmation`, `Feasability`, `Dropped`). Jira uses its own. Neither
reflects product readiness. Map everything to:

| Status | Definition | Evidence required |
|---|---|---|
| `proposed` | Discussed, no SOW | Meeting note or Jira ticket only |
| `scoped` | SOW exists, dev not started | SOW link present |
| `in_dev` | Code being written | Recent commits, no release tag |
| `vendor_tested` | Vendor says testing complete | Vendor confirmation |
| `internally_certified` | Onextel has certified it | **A named certification artefact** |
| `live` | In production with ≥1 customer | Prod flag **and** docs published |
| `hold` | Paused, resumable | Reason recorded |
| `dropped` | Abandoned | Reason recorded |

**Two rules that decide whether this inventory is useful or actively misleading:**

- `vendor_tested → internally_certified` requires a **named Onextel certification artefact**.
  Collapsing those two would report connectors as ready that are not. As of this run **no
  capability is internally certified** — the artefact does not exist for any of them.
- A Jira status of `Done` maps to **nothing** on its own. It contributes evidence, not status.

Every capability carries `status_evidence` naming which source and which artefact justified it.

**What a certification artefact looks like.** As of rev 2 exactly one exists as an agreed concept,
for MoEngage: *a fail/pass report against the named test-case checklist shared 2026-07-31, covering
every WhatsApp and RCS template plus delivery callbacks.* It is not filled. Use its shape as the
template for the other plugins — without one, nothing can ever leave `vendor_tested`.

### Known degradations of these rules

Recorded in full at `conflicts.md` C-12:

- `in_dev`'s "no release tag" test **can never fire** — not one connector repo in the org carries
  a release tag. It degrades to a commit-recency test.
- GitHub `pushedAt` is unusable as an activity signal (a bulk mirror on 2026-08-11/12 reset 40+
  repos). Use the default-branch HEAD commit date from the commits API instead.
- `hold` and `dropped` require a recorded reason. Four rows have none; they carry the nearest
  defensible status with the gap stated in `status_evidence`.

---

## Extraction procedure

1. **Seed from the vendor tracker.** Every row becomes a capability record; preserve the P-numbers
   as `legacy_project_id`.
   ```
   Drive file: "Onextel Project Tracker"
   id 1ubmAznCBX6FFOY9efQQ5e9MVjpuSMMlEhBZZzAz5_wg
   ```
   > There is also a local `~/Downloads/Integrations & Connectors/Plugins and integrations.xlsx`.
   > **It is not this tracker** — it is a product backlog (Idea Repository / Wishlist / sprints).
   > Do not seed from it.

2. **Walk the connector repos.** Enumerate the org, don't trust local clones — local clones were
   stale by up to 10 weeks on this run.
   ```bash
   gh repo list 1xtel --limit 400 --json name,updatedAt,isArchived,description
   gh api repos/1xtel/<repo>/commits?per_page=1 --jq '.[0].commit.committer.date'
   gh api repos/1xtel/<repo>/branches?per_page=100 --jq '[.[].name]'
   ```
   Infer implemented channels from route/handler names (`rcs.route.ts`, `wa.js`, `sms/execute-*`).
   Match to a slug via `aliases.yaml`. **A missing repo is a finding, not a blank** — but it is
   expected for `marketplace_app` plugins whose code is vendor-hosted, and a red flag for
   `wrapper_api` middleware Onextel operates.

   **A repo-name scan is not sufficient.** Connector code also lives *inside* other repos —
   `1xtel/rnd` holds a whole three-channel gateway family (`ct-rcs-gateway`, `ca-wt-gateway`,
   `webquque-gateway-rocksdbv2`) plus its monitoring stack. rev 1 missed all of it; rev 2 still
   missed the SMS gateway. Walk the remote tree, not the local clone (which was 82 days stale):
   ```bash
   gh api "repos/1xtel/rnd/git/trees/$(gh api repos/1xtel/rnd/commits?per_page=1 \
     --jq '.[0].sha')?recursive=1" --jq '.tree[].path'
   ```
   **The fastest way to enumerate a gateway family is its own monitoring config** — 
   `rnd/ct-gateway-monitoring/prometheus/prometheus.yml` lists every gateway, port and metrics
   token in one file. Check `aliases.yaml → nested_code` too.

   **Bindings are not in git.** These gateways are source-agnostic: a "plugin" is one entry in
   `apiKeys` in `config/config.json`, and that file is explicitly untracked. Git proves a gateway
   exists; only the running deployment or a Jira enablement ticket proves *who is bound to it*.
   Record that limit in `status_evidence` rather than inferring a binding from code.

3. **Attribute every capability to its actual builder.** Do not take this from the SOW or from the
   tracker's `Accountability` column — that column names *vendor engineers*.
   ```bash
   gh api "repos/1xtel/<repo>/commits?per_page=100" \
     --jq '[.[].commit.author.email] | group_by(.) | map({e:.[0],n:length}) | sort_by(-.n)'
   git -C rnd log --format='%an <%ae>' -- <subdir> | sort | uniq -c
   ```
   Email domain gives the vendor: `@spritle.com` → Spritle, `conscotech@gmail.com` → Consco Tech,
   `@onextel.com` → in-house. rev 1 credited DotSquares with code they never wrote (C-26).

4. **Walk the docs repo.** Map `plugins/*.mdx` to slugs via `docs.json` navigation. Flag any
   plugin that is `live` with no published doc — that gap is the Mintlify backlog. Also flag the
   inverse: a published page for something not shippable.

5. **Query Jira.** The Atlassian MCP is unauthenticated in Claude Code; the working route is the
   REST API through a logged-in Chrome session:
   ```js
   // POST /rest/api/3/search/jql  — paginate on nextPageToken
   {jql: `project = AURA AND summary ~ "<alias>" ORDER BY created ASC`,
    maxResults: 100,
    fields: ["summary","status","created","updated","issuetype","parent","resolution"]}
   ```
   Include `Closed`, `Won't Do` and pre-2026 issues. Render results into the DOM and read them
   with `get_page_text` — the JS tool's own return is capped around 1.5 KB.

   **Check `false_friends` in `aliases.yaml` before joining anything.** On this run naive matching
   over-joined by 39 issues on "Pinelabs" alone.

6. **Mine meeting notes.** The recommended split is: mine Granola/Wispr in Claude.ai and emit
   `inventory/context.md` (a dated list of decisions, deferrals, scope changes and blockers, each
   tagged with a plugin slug); read it here as the input for `target_date` and `blocked_on`. This
   run had no `context.md` and queried the Granola connector directly instead — workable, but the
   plan retains only **30 days**, so anything decided before ~2026-07-14 is invisible.

7. **Derive status** per the table above, recording `status_evidence` for every row.

8. **Emit** `plugins.yaml`, `plugins.md`, `unmatched.md`, `conflicts.md`.

---

## Secrets

The vendor tracker has a `Credentials` column carrying **plaintext credentials** — at minimum a
host, username and password for ActiveCampaign, and an email and password for Zoho CRM.

**Never carry that column into the inventory.** Replace it with `credentials_held: true` plus a
`credentials_pointer` to a secrets store. These files are committed and are candidates for
Mintlify publication; any credential that reaches them becomes a public disclosure.

Separately from this exercise: those credentials should be rotated and moved out of the shared
sheet. See `conflicts.md` C-01.

---

## Definition of done

- [x] Every tracker row appears as a capability, or is listed in `unmatched.md` with a reason.
- [x] Every capability has a status with non-empty `status_evidence`.
- [x] Every `live` capability has a `docs_url`, or appears in the docs-gap list.
- [ ] `conflicts.md` is empty, or **every entry has a named owner** — 27 open entries, **0 owners
      assigned**. This is the one criterion the run cannot satisfy on its own, and rev 2 explains
      why: the tracker has no Onextel owner column at all (C-26).
- [x] Regenerating produces a clean diff against the committed version.

## Publication

`plugins.md` is **not** wired into `docs.json`. It carries vendor names, SOW links, contracted
day counts and derived readiness — internal by default. Publishing it through Mintlify is a
deliberate decision, not a default; if it is published, strip vendor and commercial columns first.
