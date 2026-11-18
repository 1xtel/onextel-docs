# OneXtel Product Documentation

Docs-as-code source for the OneXtel / OnexAura product documentation, built for
[Mintlify](https://mintlify.com). Covers WhatsApp, RCS, International SMS, and
omnichannel (fallback, status, callbacks) — plus a preserved Legacy section for
Aura V1 (formerly at docs.onextel.com).

## Local preview

```bash
npx mint dev
```

Serves the site at `http://localhost:3000` with hot reload.

## Deploying (git-backed)

1. Push this repo to GitHub (e.g. `1xtel/onextel-docs`).
2. Sign in at [dashboard.mintlify.com](https://dashboard.mintlify.com) and create a project.
3. Install the Mintlify GitHub App on the repo when prompted.
4. Every push to the default branch auto-deploys. PRs get preview deployments.
5. Set the custom domain (e.g. `docs.onextel.com`) under Settings → Custom Domain
   once you're ready to cut over from the legacy site.

## Structure

```
docs.json               # site config: branding, colors, navigation
index.mdx               # landing page
api-reference/          # developer API docs (WhatsApp, RCS, SMS, omnichannel)
guides/                 # portal user guides (campaigns, fallback, SMS platform)
legacy/                 # Aura V1 docs preserved from docs.onextel.com
logo/, favicon.svg      # brand assets (navy #1E2A5E / red #C23B34)
```

## Content sources

Extracted from the product documentation set (PDF/DOCX/HTML/Postman) dated July 2026.
The Postman collection `OmniChannel APIs` is the authoritative endpoint reference;
`STYLE_GUIDE.md` records the authoring conventions used.
