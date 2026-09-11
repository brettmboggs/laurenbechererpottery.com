# laurenbechererpottery.com

Handmade ceramics by Lauren Becherer. A fast, free-to-host static site built
around 360° turntable photography of the real pieces, with a no-code admin
portal, Stripe checkout, and private client project pages.

Every frame in every spin is a real photograph. Nothing is interpolated, and it
stays that way: the point of the site is that no two pieces are alike, so the
glaze has to read true. A steppy honest turn beats a smooth fake one.

**Live site:** https://laurenbechererpottery.com
**Studio login (admin):** https://laurenbechererpottery.com/admin/

## How it works

| Layer | Tool | Cost |
| --- | --- | --- |
| Hosting + SSL | GitHub Pages (this repo, auto-deployed by GitHub Actions) | Free |
| Site framework | [Astro 5](https://astro.build) + TypeScript, static output | Free |
| Admin portal | [Sveltia CMS](https://github.com/sveltia/sveltia-cms) at `/admin/` — edits commit straight to this repo | Free |
| Admin login | GitHub personal access token, or GitHub OAuth via a tiny Cloudflare Worker (see `docs/ADMIN-SETUP.md`) | Free |
| Typography | Spectral (display) and Karla (text), self-hosted — no third-party font request | Free |
| 360° viewer | Turntable runtime (`src/scripts/spin.ts`) driving the wall and the piece pages | Free |
| 3D viewer | Google `<model-viewer>` for `.glb`/`.gltf` — wired up but dormant, no scan exists yet | Free |
| Payments | Stripe Payment Links pasted into each piece | Per-sale fee only |
| Commission form | Visitor's email app by default; optional Formspree/Web3Forms endpoint | Free |
| Domain | Namecheap (DNS → GitHub Pages, see `docs/DNS.md`) | Yearly renewal |

Every time content is saved in the admin (or code is pushed to `main`), the
workflow in `.github/workflows/deploy.yml` rebuilds and publishes the site in
about a minute.

## Site map

- `/` — home (hero, featured pieces, commission CTA, latest journal)
- `/portfolio/` — the wall: every piece, hover one to turn it
- `/portfolio/<piece>/` — one piece: turntable, dimensions, materials, care, price, more photos, scenes
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

Import the 360° spins from the photography project next door (see
`docs/ASSETS.md`), and regenerate the generated images:

```bash
npm run spins                    # frames + src/data/spins.json
node scripts/make-og.mjs         # social card, built from a real frame
node scripts/make-placeholders.mjs
```

`public/spins/` and `src/data/spins.json` are committed: CI builds the site
without access to the photography project.

## Docs

- `docs/LAUREN-GUIDE.md` — plain-English guide for running the site day to day
- `docs/ADMIN-SETUP.md` — one-time setup of the admin login (access token, or GitHub OAuth + Cloudflare Worker)
- `docs/HAND-DRAWN-FONT.md` — the font traced from Lauren's lettering (retired from the site; the files and pipeline are kept)
- `docs/DNS.md` — Namecheap DNS records for GitHub Pages
- `docs/ASSETS.md` — photo specs, and how a 360° spin gets from the camera onto the site

## Growing later

The site is plain static files, so moving to Cloudflare Pages (bigger asset
limits, free Workers/D1 for a real cart or login) is a five-minute change with
no rewrite. See `docs/ADMIN-SETUP.md` → "Upgrade paths".
