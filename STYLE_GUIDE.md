# OneXtel docs — house style

Everything published on the docs site follows this, whoever writes it. The mechanical rules are
enforced by Vale on every pull request (`.vale.ini`, `styles/OneXtel/`); the judgement ones are
what reviewers look for.

Our reader is an enterprise developer or campaign manager integrating with OneXtel. They are
busy, competent, and mid-task. They came to finish something.

## Voice

**Write what the product does, in the order the reader does it.** A page earns its place by
getting someone from "I need to send an RCS campaign" to a sent campaign, without them having to
guess what we meant.

- **Second person, present tense.** "Copy your API key", not "the user should copy their API key"
  or "we will now copy the key".
- **Say the consequence.** Not "configure the callback" but "configure the callback, or delivery
  reports never reach your dashboard". The reader is deciding what to skip; tell them the cost.
- **Plain words.** Use, not utilise. Send, not transmit. Before, not prior to.
- **State facts, not feelings about facts.** "The bare path accepts a recipient of `12345`" beats
  "the bare path is unfortunately quite permissive".
- **Short sentences carry technical detail better.** One idea each.
- **Describe OneXtel in the third person**, not as "we" or "our platform". The reader is "you";
  the company is "OneXtel".

## Never

- **Marketing register.** No seamless, robust, powerful, world-class, cutting-edge, turnkey,
  effortless, next-generation, game-changing. These fail the build.
- **Minimisers.** No simply, easily, just click, obviously, of course, all you need to do. If a
  step is easy, the reader finds out by doing it; if it isn't, you have lied to them.
- **Unearned warnings.** A `<Warning>` means something costs money, loses data, or silently fails.
  A page where everything is a warning is a page where nothing is.
- **Invented specifics.** Never guess a parameter name, enum value, error code, limit or URL. If
  the source is unclear, document what is confirmed and note the gap in `REVIEW_NOTES` rather
  than writing something plausible. Everything here is load-bearing: someone will paste it into
  production code.
- **Deployment names.** Customers see one platform. Do not write OnexAura, OneXGlobal, Aura V1/V2
  or Core 365 on a customer-facing page. Likewise, SMS is one product — domestic versus
  international is a compliance difference documented inside it, not a separate brand.

## Names and spellings

| Write | Not |
| --- | --- |
| OneXtel | Onextel, ONEXTEL, OneXTel |
| the OneXtel portal | the dashboard, the panel, the UI |
| WhatsApp | Whatsapp, whats app |
| RCS, SMS, DLT, DLR, MSISDN | expanded on every mention |
| CleverTap, MoEngage, WebEngage, LeadSquared | Clevertap, Moengage, Webengage |
| email | e-mail |

Channel names are WhatsApp, RCS and SMS. Partner product names are spelled the way the partner
spells them.

## Structure

- **Frontmatter on every page**, with a `title` of two to five words and a one-line `description`
  that reads as a sentence — it shows in search and navigation, so it is prose, not keywords.
- **Headings in sentence case**: "Before you start", not "Before You Start".
- **One page, one job.** Aim for 100–350 lines. Split by task rather than growing a page that
  covers four of them.
- **Procedures are `<Steps>`.** Each step is an action with its result. If a step has no action,
  it is a note, not a step.
- **Channel variants are `<Tabs>`** with matching titles across the page, so choosing a channel in
  one section switches them all.
- **Parameters are `<ParamField>`, responses `<ResponseField>`**; plain tables are right for code
  and enum lists.
- **Every endpoint gets a cURL example** with `YOUR_API_KEY` and `919999999999`-style
  placeholders. Never a real key, a real customer number, or a customer's name.

## Accuracy

- Document what the live API does, not what a vendor guide says it does. Where they disagree, the
  live behaviour wins and the discrepancy goes in the internal review notes.
- Say when something is unverified rather than implying it is settled.
- Mark a code or field as deprecated instead of deleting it, until it stops being returned.

## Before you open a pull request

```bash
vale api-reference guides plugins legacy index.mdx
npx -y mint@4.2.917 validate
npx -y mint@4.2.917 broken-links
```

The same three run on your pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the review
flow.

## Writing with an agent

If you generate pages with an AI assistant, give it this file and these constraints: extract
endpoints, parameters, payloads and status codes exactly as the source documents them; never
invent a value to fill a gap; return the gaps instead. Agent-written pages go through the same
pull request and the same review as anything else.
