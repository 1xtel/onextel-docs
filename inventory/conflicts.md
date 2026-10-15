# Conflicts — 2026-08-17 (rev 3)

Sources that disagree. **Nothing here is silently resolved.** Each entry states every side and
where it came from. Per the definition of done, this file is clean only when every entry has a
named owner; owners are currently unassigned and marked **OWNER: —**.

Legend for sources: **T** = vendor tracker (Onextel Project Tracker sheet) · **G** = git
(github.com/1xtel) · **D** = docs repo · **J** = Jira AURA · **M** = meeting notes.
**WF-2026-08-10** = the Wispr Flow "Moengage CleverTap WebEngage Review" of 2026-08-10, which
supersedes several earlier entries.

---

## C-01 — Plaintext credentials in a shared tracker · SECURITY · OWNER: —

**T** carries a `Credentials` column with working plaintext credentials in at least two rows:

| Row | What is exposed |
|---|---|
| P7 ActiveCampaign | Host URL, username, password |
| ZohoCRM V2 | Onextel email address and password |

These are **not** carried into `plugins.yaml`; each capability records `credentials_held: true`
and a pointer instead. The inventory is intended to be committed and published through Mintlify,
and any credential that reached it would be a public disclosure.

Independent of this exercise: **both credential sets should be rotated and moved to a secrets
store.** The sheet is shared, so treat them as already compromised.

---

## C-02 — MoEngage RCS V2: three sources, three different states · OWNER: —

- **T**: `Testing`.
- **J**: AURA-17955 is *In Triage* and exists specifically to add TTL, full template support and
  multi-path SMS fallback — i.e. the scope is not closed. Epic AURA-14936 ("Moengage SMS Fallback
  Callback") is itself still in `Testing`.
- **M** (2026-08-07): SMS fallback is **not yet implemented** — payload fields for media,
  suggestions and status callbacks are missing.

Derived as `vendor_tested`. **The unresolved question is whether the RCS delta is vendor-complete
with fallback outstanding, or not vendor-complete at all.** Those imply different customer
promises. There is no named Onextel certification artefact either way, so it cannot be
`internally_certified`.

Aggravating factor from **M**: MoEngage's SMS fallback runs in *production only* — there is no
staging toggle, so any change goes straight live.

---

## C-03 — MoEngage WhatsApp CR exists in Jira but not in the tracker · OWNER: —

**J** AURA-18628 (Open, 2026-08-10) scopes a full WhatsApp template matrix (Carousel, LTO, Rich
Media, Location), Onextel→MoEngage template sync, complete DLR with MoEngage error codes, SMS
fallback and quick-reply click events. **T** has no such row and no SOW. Recorded as `proposed`.

Either the tracker is missing a row, or a critical-priority story has been raised against no
commercial scope.

---

## C-04 — WebEngage V2 · **LARGELY RESOLVED in rev 2** · OWNER: —

**Superseded by WF-2026-08-10.** The delta is real, and it is bigger than the brief said.

- **T**: still `Feasability`, no channel, no dates, no SOW, owner "bob". **The tracker is stale.**
- **WF-2026-08-10**: the vendor delivered the *"WebEngage Onextel Connector — Integration Delta
  Report"* that morning. Scope agreed at **13 items**, effort agreed at **~1 week** (2–3 days dev
  + 2–3 days back-and-forth), and it was **decided to be a NEW SOW, explicitly not support hours**.

The 13 items: LTO template, Location template, template CRUD across all five template types
(5), DLR callbacks for five message states with region-aware routing (5), quick-reply inbound
tracking. Plus error-code mapping.

**What remains open:** the SOW is agreed in principle but **not raised or signed**, so the
capability stays `proposed`. And a call with WebEngage on 2026-08-11 was to decide whether
quick-reply tracking and template creation are *required* for native-channel status — if not, the
app ships as native first and those follow. Both WebEngage features are in **beta and
undocumented**; docs were requested.

The brief's "four-item delta" was an undercount, not a fiction. Its "go-live push this week" does
not appear anywhere.

---

## C-05 — LeadSquared start date is impossible · OWNER: —

**T** gives LeadSquared WhatsApp V1 a start date of `11/03/2026` against a `Completed/Live` status,
while **J** AURA-15281 records production deployment on 2026-05-18 and **G** shows the repo's only
commit on 2026-05-13. Under `DD/MM` the start reads 2026-03-11, which is consistent; under `MM/DD`
it reads 2026-11-03, which is in the future. The tracker mixes both conventions across rows
(P1 uses `11/19/2025`, unambiguously `MM/DD`). Resolved here as 2026-03-11; **the sheet's date
format needs to be fixed at source.**

---

## C-06 — LeadSquared is live with a scope gap sales did not know about · OWNER: —

**M** (2026-07-29): WhatsApp **two-way conversation is not in the plugin**, and the UAE /
international sales team was unaware. **T** and **D** both present the capability as complete.
This is not a status conflict — it is a *published-scope* conflict, and it is customer-facing:
`/plugins/leadsquared` does not state the limitation.

---

## C-07 — Salesforce is "Completed/Live" but is not on AppExchange · OWNER: —

**T** marks Sales & Service Cloud V1/V2/V3 `Completed/Live` with all four env flags, and the
`integration_pattern` is `marketplace_app`. **M** (2026-07-17): the generic connectors still need
to be **wrapped into AppExchange format and submitted for approval**, that process has **not
started**, and the **NDA with DotSquares is unsigned** so no account access has been shared.

A marketplace app that is not in the marketplace is live only for manually-installed customers.
The inventory keeps `live` because prod flags and a published doc page both hold, but the
distribution claim is unsupported.

---

## C-08 — SFMC V2-SH has no SOW at all · OWNER: —

**T** records SFMC WhatsApp V2-SH (Fallback) as `Completed/Live`, delivered in 4 hours against
"Support hours". The only artefact is an email thread ("Re: Marketing cloud Integration
enhancement and suggestion", 2026-06-18 13:22). `sow_state: support_hours` is recorded, but a live
production capability whose entire scope record is one email is an audit gap.

---

## C-09 — SFMC V3-CR: the tracker contradicts itself in the same row · **RESOLVED** · OWNER: —

**T** sets Status = `Completed/Live` while, in the same row, Dev = ✓, Test = `-`, UAT = blank and
**PROD = blank**. Delivery date reads "29th, Wednesday" with no month or year. No Jira issue
mentions the Reports & Dashboard CR.

rev 1 derived this down to `vendor_tested`. **WF-2026-08-10 resolves it upward:** the demo was
delivered to Harshan and accepted, and the vendor states *"Marketing Cloud is done, completed and
live."* Status is now `live`; **the env flags in the sheet are simply not being maintained.**

The lesson generalises: the tracker's env-flag columns are unreliable in *both* directions. They
were the primary derivation input in rev 1. Treat them as weak evidence unless corroborated.

---

## C-10 — Four rows are paused or dropped with no reason recorded · OWNER: —

`hold` requires a recorded reason; `dropped` requires a recorded reason. These four have none:

| Capability | Tracker status | What is missing |
|---|---|---|
| Salesforce Commerce SMS V1 | Hold | reason, project ID, SOW, timeline |
| Optimove SMS V2 | Hold | reason (SOW exists → derived `scoped` instead) |
| Smartico V1 | Hold | reason, SOW, timeline, dates |
| Unica V2 | Dropped | reason |

Each is carried with the nearest defensible status and an explicit note in `status_evidence`.
**Someone has to say why these stopped, or they will be re-proposed from scratch in six months.**

---

## C-11 — Shopify: live domestically, but the tracker implies everywhere · OWNER: —

**T** shows V1/V2 fully live with no region qualifier. **M** (2026-07-17): the app supports
WhatsApp/SMS/RCS **for the Onextel domestic region only**; multi-region middleware changes are not
deployed to the live app and exist only on the Onextel Global endpoint. Customers can be onboarded
on domestic Shopify now. Also flagged in **M**: "onboarding process is informal — no proper
process defined yet."

---

## C-12 — The `in_dev` rule does not survive contact with this codebase · METHOD · OWNER: —

`in_dev` is defined as "commits in last 30 days, **no release tag**". Neither half works here:

- **No connector repo in the 1xtel org carries a single release tag.** Not one. The tag test can
  never fire, so it cannot distinguish `in_dev` from anything later.
- GitHub `pushedAt` is corrupted as an activity signal: 40+ repos report `pushedAt` of
  2026-08-11/12 from a bulk mirror operation. All `last_activity` values in `plugins.yaml` come
  from the default-branch HEAD commit date via the commits API instead.

Shopify V3 is the row this bites: tracker `Testing`, own Test cell `In Progress`, repo HEAD
2026-07-02 (46 days — well outside the window). Derived `in_dev` on the tracker's own
"In Progress" rather than on commit recency.

---

## C-13 — Alias matching over-joins badly on two families · METHOD · OWNER: —

Naive alias matching does not merely under-join here; it **over**-joins:

- **"Pinelabs"** returns 40 AURA issues. **39 of them are Pine Labs as an SMS customer** — SFTP
  reports, callback formats, DLT, message capping, going back to 2025-01. Only **AURA-18001** is
  the CleverTap connector. Joining on the bare term would inflate that capability's history ~39×
  and make a brand-new connector look like eighteen months of delivery.
- **"Active Campaign"** returns 10 issues; **8 are the Voice campaign manager** ("Verify Behavior
  with No Active Campaigns", "Delete Template in Active Campaign - Running"). Only **AURA-18428**
  and **AURA-18429** are the ActiveCampaign connector.

Both families are recorded in `aliases.yaml` under `false_friends`. Do not remove them.

---

## C-14 — The 2026 CleverTap middleware is built and deployed with no repository · OWNER: —

> **rev 2 narrowing.** This applies only to the two **Spritle** 2026 directions. The *other* two
> CleverTap directions do have code — inside `1xtel/rnd`, written by Consco Tech. See C-22/C-23.


**T** and **J** both describe delivered, deployed middleware:

- CleverTap WhatsApp-channel → Onextel RCS (AURA-18633)
- CleverTap Generic RCS Provider → Onextel RCS, Pine Labs markers (AURA-18001, 7 person-day SOW
  dated 2026-07-31)

**G**: there is **no top-level CleverTap repository in the 1xtel org** (163 repos scanned) and
neither Spritle direction appears inside `rnd` either. Nor is there a repo for Zoho CRM or HubSpot.
For vendor-hosted marketplace apps that is expected; for *wrapper API middleware that Onextel
operates and must support*, it is not.

Where does this code live, who can deploy it, and what happens when Spritle's engagement ends?

---

## C-15 — CleverTap: the tracker's status is two steps behind, and dates disagree · OWNER: —

- **T**: CleverTap RCS V1 = `In Development`; Pinelabs CleverTap RCS V1 = `Testing`.
- **J** (AURA-18001, AURA-18633): both are **built and deployed**, with no test coverage, no QA
  sign-off, an ambiguous callback contract, and undocumented marker routing sitting in the same
  send path as normal traffic.
- **M** (2026-07-30/31): Spritle built RCS-to-RCS over a weekend; templates targeted **mid-August**;
  performance testing **end of August**.

The source brief for this exercise expected "a 21 Aug release with the Pine Labs vendor-ID patch."
**No 21 August date appears in T, J, D, G or the accessible meeting window** — the only dates
found are mid-August (templates) and end-August (perf). Recorded `target_date: 2026-08-15`.
Confirm the real commitment before it is quoted to anyone.

---

## C-16 — Three plugins have zero Jira history · OWNER: —

Zoho CRM, HubSpot CRM and Salesforce Commerce produce **no matching AURA issues at all** — not
Open, not Closed, not Won't Do. Zoho SMS V1 is recorded `live`; Zoho V2 and HubSpot V1 are both
`In Development` at **P1 priority** with signed SOWs and 27.5 and 23 contracted days respectively.

Work at that priority leaving no trace in the tracker of record means either the work is tracked
somewhere else entirely, or it is not being tracked.

---

## C-17 — Scaffold repos exist for two plugins that are on hold · OWNER: —

`1xtel/smartico-connector` and `1xtel/fasttrack-connector` were both created on 2026-05-29 with a
single commit each (~21 KB, scaffolded on `@onextel/connector-core`), while **T** has both on
`Hold` with no SOW and no timeline. Someone started building against no commercial scope, then
stopped. Decide whether these are seeds or dead code.

---

## C-18 — Unica is a V2 with no V1 · OWNER: —

**T** lists "Unica Implementation" as `V2`, EMAIL, `Dropped`. No V1 row exists anywhere in the
tracker, and no Jira or git artefact mentions Unica. The V1 is either in a predecessor tracker or
never existed.

---

## C-19 — P16 does not exist · OWNER: —

Project IDs run P1–P15 and P17. **There is no P16 row.** No Jira epic, repo, SOW or meeting
reference corresponds to a missing sixteenth project. Most likely a numbering gap when a row was
deleted, but it cannot be ruled out that a project was removed from the sheet. Unresolved.

Separately, six rows carry **no project ID at all**: Salesforce Commerce, Pinelabs CleverTap, the
duplicate LeadSquared row, WebEngage V2, and the SFDC/SFMC/Shopify/Optimove/ZohoCRM continuation
rows (the last group inherit their parent's ID by adjacency, which is a spreadsheet convention,
not data).

---

## C-20 — CleverTap has a published doc page but no shippable connector · DOCS · OWNER: —

`/plugins/clevertap` is live in `docs.json` navigation, carrying a `<Warning>` that reads "This
connector is in development and not yet available." Every other published page describes a
shipped capability. This is the inverse of the usual docs gap: **documentation ahead of the
product**, publicly visible, for a connector that is `vendor_tested` with no test coverage.

Either the page comes out of nav until certification, or the warning is accepted as deliberate
pre-announcement. Right now it looks like neither decision was made.

**rev 2 makes this worse, not better:** the page describes *one* CleverTap connector. There are
six directions, one of which has been carrying production traffic since 2025-10 and is not
described anywhere. The page is simultaneously ahead of one thing and behind another.

---

## C-21 — "SMS is missing from all three tier-1 plugins" · **REFRAMED in rev 3** · OWNER: —

rev 2 recorded this as a flat gap. **That was wrong, and the error was mine** — I took
WF-2026-08-10 at face value without checking git or the Jira enablement trail.

**WF-2026-08-10**, stated and agreed: *"SMS needs to be added still. SMS in all three: CleverTap,
MoEngage, WebEngage."* And for CleverTap: *"we will need all three channels: WhatsApp, RCS, SMS."*

**J and G both say SMS already flows for all three**, by a different route — see C-27. The
statement and the evidence are only compatible if "SMS" means two different things:

| | SMS **via the gateway** | SMS **native in the plugin** |
|---|---|---|
| What it is | Platform posts to Onextel's shared apikey-bound SMS gateway | SMS as a sendable channel *inside* MoEngage / WebEngage / CleverTap, like WhatsApp and RCS |
| Built by | **Consco Tech** | nobody |
| Status | **live** for all three | **proposed** for all three |
| Evidence | AURA-13991 / 13992 / 11235, all Closed Mar–May 2026 | no SOW, no code, no Jira |

The gap in WF-2026-08-10 is real — it is the *right-hand column*. But it is not "SMS is missing";
it is "the in-platform SMS channel is missing, while SMS already flows through a gateway nobody in
that meeting mentioned." Those are very different conversations to have with a customer.

**Unresolved:** whether the native path is even wanted, given the gateway path works. Nobody in
the 2026-08-10 review referred to the gateway at all.

---

## C-22 — CleverTap was built twice, by two vendors, in overlapping directions · OWNER: —

CleverTap is not one connector. It is six directions with **split vendor ownership**, and nobody
has written that down before now:

| # | Direction | Built by | First seen | Status |
|---|---|---|---|---|
| 1 | Generic RCS Provider → Onextel RCS | **Consco Tech** | 2025-10-27 | live |
| 2 | Generic SMS Plugin → Onextel RCS (proxy) | **Consco Tech** | 2026-01-22 | vendor_tested |
| 3 | Generic RCS + Pine Labs markers → Onextel RCS | **Spritle** | 2026-07-31 | vendor_tested |
| 4 | WhatsApp channel → Onextel RCS | **Spritle** | 2026-07-30 | vendor_tested |
| 5 | WhatsApp → Onextel WhatsApp | Consco Tech? | 2026-05-27 | unknown (C-24) |
| 6 | SMS → Onextel SMS | — | — | proposed |

**Directions 1 and 3 target the same CleverTap surface.** Consco's `ct-rcs-gateway` has ingested
CleverTap's Generic RCS Provider since 2025-10 with per-customer API-key bindings; Spritle's
2026-07-31 middleware does Generic RCS Provider → Onextel RCS with Pine Labs routing via reserved
markers in the Sender ID field. Whether direction 3 extends direction 1, replaces it, or duplicates
it **is not recorded anywhere**. A 7 person-day SOW was signed on a compressed timeline without,
apparently, anyone checking the existing gateway.

Consequences already visible:

- **Error-code mapping diverges by direction.** RCS→RCS has a mapping document; WhatsApp→RCS does
  not, and the vendor confirmed on 2026-08-10 that it *"hasn't been spoken for."*
- Direction 4 must be built forward-compatible with direction 5 or customers face migration or
  downtime — the whole reason for the 2026-08-11 workshop.
- Udayan's question at that review — *"can we think of one single deployment for all of the three
  connectors in one place?"* — is exactly this conflict, asked from the inside.

---

## C-23 — An entire vendor and a live connector are invisible to the tracker · OWNER: —

**Consco Tech** (`conscotech@gmail.com`) has built and maintained the CleverTap RCS gateway
family inside `1xtel/rnd` since 2025-10-21:

- `ct-rcs-gateway` — 22 commits, releases **1.0.0 → 2.0.0**, last 2026-05-27
- `ca-wt-gateway` — CleverTap → Onextel WhatsApp API, same author, same release line
- `onex-rcs-lite`, `jhub`, `ch-smpp-poc`, the `webqueue-gateway-*` family

Against that: **zero tracker rows. Zero docs pages. One Jira ticket** that names it
(AURA-11681, "Run load with CT SMS gen connector with CT RCS Gateway").

And it is demonstrably in production — AURA-11235 enabled the CleverTap connector on OMNI/V2,
AURA-18114 was a production callback change, AURA-18568 is an **open production bug**.

Three structural problems:

1. **A repo-name scan does not find it.** The code is inside `rnd`, so any inventory that
   enumerates repositories by name misses an entire vendor. rev 1 of this inventory did exactly
   that.
2. **It is the only version-tagged work in the estate.** Consco versions releases in commit
   messages (1.0.0–2.0.0). Every Spritle repo has no tags at all (C-12). The one vendor with a
   release discipline is the one nobody is tracking.
3. **No continuity record.** If that engagement lapses, there is no SOW, no doc and no ticket
   describing what the gateway covers.

---

## C-24 — CleverTap WhatsApp→WhatsApp was scoped as new work; a gateway for it may already exist · **HIGHEST PRIORITY** · OWNER: —

At **WF-2026-08-10** CleverTap WhatsApp→WhatsApp was discussed as a **new requirement not yet
handed to the vendor** (*"that has not come to you guys yet, right?"* — *"WhatsApp to WhatsApp was
not in our hand"*). The entire forward-compatibility constraint placed on direction 4 rests on
that premise: direction 4 ships first, so it must not block direction 5.

**G** says something different. `1xtel/rnd → ca-wt-gateway`:

> *"Gateway service for CT message conversion and forwarding to Onex WhatsApp API."*
> Endpoint `POST /ct/wa-messages`. Author `conscotech@gmail.com`. Last commit 2026-05-27,
> sharing the CT-RCS release lineage (*"Auth service to RCS and WA"*).

That is, on its face, CleverTap → Onextel WhatsApp. It has no tracker row, no SOW, no Jira, no
deployment evidence and no recorded decision to stop — it simply went quiet in May.

**Unresolved, and it matters before the workshop scopes anything:**

- Is `ca-wt-gateway` CleverTap **WhatsApp**→WhatsApp, or CleverTap Generic/SMS→WhatsApp? The
  README says only "CT message conversion". The source channel is not stated.
- Is it deployed anywhere?
- Why did it stop in May, and does the forward-compatibility constraint on direction 4 still
  apply — or is the answer to route direction 5 through the gateway that exists?

The inventory carries direction 5 as `hold`, which is a **placeholder, not a finding**. Its true
status is unknown.

---

## C-25 — SFMC has a fifth CR that exists only in a meeting · OWNER: —

**WF-2026-08-10**: the client raised a further CR — additional metrics, a partner licence, and
debugging — Joshi is reviewing feasibility, and Udayan approved it to proceed (*"we are not doing
any big things for that client. Reports and dashboard is okay. Partner licence is okay. If you can
debug and get that done, that is fine."*). The full conversation-history request was **explicitly
declined**.

There is no tracker row, no SOW and no Jira ticket. Carried as `V5-CR / scoped` on the strength of
a verbal approval alone. Also unresolved: the **50/50 billing split** (50% now, 50% post-delivery)
that Pooja was to confirm with Dhanush.

---

## C-26 — The tracker has no Onextel owner, and rev 1 mis-attributed three plugins · OWNER: —

Two related problems with attribution.

**(a) rev 1 credited DotSquares with building Salesforce, SFMC and Shopify.** That was wrong, and
it came from taking a meeting mention at face value. Git commit authorship is unambiguous:

| Repo | Authors |
|---|---|
| `salesforce` | `saas@spritle.com` (63), `bellarmine.v@spritle.com` (24) |
| `shopify-connector` | `bellarmine.v@spritle.com` (52), `benny.immanuel@spritle.com` (44) |
| `moengage` | `bobert.e@spritle.com` (43) |
| `optimov` | `karthikeyan.r@spritle.com` (44) |

**Spritle built all of them.** DotSquares is the prospective *AppExchange wrapping and submission*
partner — a distribution partner, not a builder — and the NDA with them is still unsigned (C-07).
The inventory now separates `built_by` from `distribution_partner`.

**(b) The tracker's `Accountability` column names Spritle engineers.** Bobert, Anish, Karthikeyan,
Bellarmine and Benny all resolve to `@spritle.com` commit authors. So the one column that looks
like ownership is really vendor staffing.

**There is no Onextel-side owner recorded for any plugin, anywhere.** That is why every entry in
this file says `OWNER: —`, and why the definition of done cannot be met from the tracker alone.

---

## C-27 — There is a third gateway, it carries SMS for all three tier-1 plugins, and nothing records it · OWNER: —

rev 2 found two Consco Tech gateways. There are **three, plus a monitoring stack**, and the
authority for that is Consco's own Prometheus config
(`rnd/ct-gateway-monitoring/prometheus/prometheus.yml`):

| Prometheus job | Port | Path | Endpoint | Release |
|---|---|---|---|---|
| `ct-rcs-gateway` | 8280 | `rnd/ct-rcs-gateway` | `POST /ct/rcs-messages` | 2.0.0 |
| `ct-wa-gateway` | 8180 | `rnd/ca-wt-gateway` | `POST /ct/wa-messages` | shares CT-RCS line |
| **`ct-sms-gateway`** | **8082** | **`rnd/webquque-gateway-rocksdbv2`** | **`POST /postsms`** | **3.0.3 (2026-08-11)** |

The SMS gateway is not a prototype. Release 3.0.3 adds **HA primary/secondary with config and user
sync**, `/health` for Route53, JWT admin console, audit log, Prometheus metrics and an E2E suite.
Predecessors `webqueue-gateway-sqlite` and `webquque-gateway-rocksdb` show the lineage. Grafana
dashboards exist for all three gateways plus nginx/DLR and per-apikey traffic.

**J** ties it to the plugins — a matched set of enablement stories, all Closed:

| Key | Summary | Closed |
|---|---|---|
| AURA-11235 | Enable **CleverTap** Connector on OMNI/V2 Platform for SMS Integration | 2026-04-22 |
| AURA-13991 | Enable **MoEngage** Connector on OMNI/V2 Platform for SMS Integration | 2026-04-22 |
| AURA-13992 | Enable **WebEngage** Connector on OMNI/V2 Platform for SMS Integration | 2026-05-19 |

Plus SMS-specific follow-ups: AURA-11681 (load test, CT SMS gen connector against the CT RCS
gateway), AURA-11809 (WebEngage SMS, accept TMD), AURA-14394 (WebEngage SMS payload bug), and
**AURA-18660 — an OPEN bug from 2026-08-11 about the WebEngage SMS callback format.** An open
production bug is hard to reconcile with "not built."

### The evidential limit, stated plainly

The gateway is **source-agnostic**. A binding is one entry in `apiKeys` in `config/config.json`,
and the README says that file is **not tracked in git**. So:

- Git proves the gateway **exists**, at what release, with what features. ✅
- Git **cannot** prove which platforms are bound to it. ❌
- The Jira enablement tickets are what carry the MoEngage / WebEngage / CleverTap bindings.

To close this properly someone has to read `config/config.json` off the running 8082 deployments
(and its HA pair) and list the live bindings. Until then the three `sms-via-gateway` capabilities
rest on Jira alone.

### Why it matters beyond SMS

1. **The tracker does not know this exists.** Three production gateways, an entire vendor, and the
   SMS path for the three most important plugins — none of it is in the spine document.
2. **It changes the CleverTap picture again.** Consco built RCS *and* WhatsApp *and* SMS gateways
   for CleverTap. Udayan's question at WF-2026-08-10 — *"can we think of one single deployment for
   all of the three connectors in one place?"* — describes something Consco has arguably already
   built, under `ct-gateway-monitoring`, and it strengthens C-24 considerably.
3. **`core_connector` is the successor to all of it.** The local, unpushed
   `~/AI Projects/core_connector` generalises `ct-rcs-gateway` into a source/channel/region-aware
   core. Its own backlog names *"CleverTap→WhatsApp, MoEngage→WA/SMS, WebEngage→WA/SMS,
   LeadSquared→WA"* transformers. That is this conflict, already written down as a plan, in a repo
   that has never been pushed.
