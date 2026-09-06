# laurenbechererpottery.com

Handmade ceramics by Lauren Becherer. A fast, free-to-host static site with a
no-code admin portal, 3D/360° piece viewers, Stripe checkout, and private client
project pages.

**Live site:** https://laurenbechererpottery.com
**Studio login (admin):** https://laurenbechererpottery.com/admin/

## How it works

| Layer | Tool | Cost |
| --- | --- | --- |
| Hosting + SSL | GitHub Pages (this repo, auto-deployed by GitHub Actions) | Free |
| Site framework | [Astro 5](https://astro.build) + TypeScript, static output | Free |
| Admin portal | [Sveltia CMS](https://github.com/sveltia/sveltia-cms) at `/admin/` — edits commit straight to this repo | Free |
| Admin login | GitHub OAuth via a tiny Cloudflare Worker (see `docs/ADMIN-SETUP.md`) | Free |
| 3D viewer | Google `<model-viewer>` for `.glb`/`.gltf` (animated models = "4D", AR on phones) | Free |
| 360° viewer | Built-in photo turntable (`SpinViewer.astro`) | Free |
| Payments | Stripe Payment Links pasted into each piece | Per-sale fee only |
| Commission form | Visitor's email app by default; optional Formspree/Web3Forms endpoint | Free |
| Domain | Namecheap (DNS → GitHub Pages, see `docs/DNS.md`) | Yearly renewal |

Every time content is saved in the admin (or code is pushed to `main`), the
workflow in `.github/workflows/deploy.yml` rebuilds and publishes the site in
about a minute.

## Site map

- `/` — home (hero, featured pieces, commission CTA, latest journal)
- `/portfolio/` and `/portfolio/<piece>/` — gallery with 3D / 360° / photo viewer
- `/shop/` — pieces marked *for sale*, with Stripe buy buttons
- `/journal/` — posts
- `/about/` — bio
- `/client/` — project-code lookup + commission request form
- `/client/<code>/` — private per-client progress page (unlisted, `noindex`)
- `/admin/` — studio login

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # serve dist/ locally
```

Content lives in `src/content/` as Markdown/JSON and is validated by the
schemas in `src/content.config.ts`. Uploaded photos go to
`public/images/uploads/`, 3D models to `public/models/`.

Regenerate the placeholder assets any time:

```bash
node scripts/make-placeholders.mjs
npm run make-model
```

## Docs

- `docs/LAUREN-GUIDE.md` — plain-English guide for running the site day to day
- `docs/ADMIN-SETUP.md` — one-time setup of the admin login (GitHub OAuth + Cloudflare Worker)
- `docs/DNS.md` — Namecheap DNS records for GitHub Pages
- `docs/ASSETS.md` — photo and 3D-model specs for the viewers

## Growing later

The site is plain static files, so moving to Cloudflare Pages (bigger asset
limits, free Workers/D1 for a real cart or login) is a five-minute change with
no rewrite. See `docs/ADMIN-SETUP.md` → "Upgrade paths".
