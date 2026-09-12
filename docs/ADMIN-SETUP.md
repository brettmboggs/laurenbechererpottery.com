# Admin login

**Setup is done.** Lauren signs in at <https://laurenbechererpottery.com/admin/>
with **Sign in with GitHub**. Nothing below needs doing again unless something
breaks or the client secret has to be rotated.

| Piece | Where it lives |
| --- | --- |
| GitHub account | `laurenbecherer`, Write access on this repo |
| OAuth app | `Lauren Becherer Pottery Studio`, under Brett's GitHub developer settings |
| OAuth proxy | Cloudflare Worker `sveltia-cms-auth`, in the **Lauren Becherer Pottery** account |
| Worker URL | `https://sveltia-cms-auth.lauren-becherer-pottery.workers.dev` |
| Client id + allowed domain | Plain Worker variables, redeployed from `wrangler.toml` |
| Client secret | Encrypted Worker secret `GITHUB_CLIENT_SECRET`, set in the Cloudflare dashboard. Never in this repo. |

**If the client secret is ever exposed**, generate a new one in the GitHub OAuth
app, delete the old one, and replace the Worker secret in the Cloudflare
dashboard under Workers & Pages → sveltia-cms-auth → Settings → Variables and
secrets. Nothing else changes; the client id stays the same.

---

## Original setup notes

The studio at `/admin/` is Sveltia CMS. It talks directly to GitHub, so Lauren
needs a way to prove to GitHub that she's allowed to edit the repo. There are
two ways.

**The one-click button is the one to set up.** It costs Brett ten minutes once,
and after that Lauren clicks *Sign in with GitHub*, approves, and never sees
GitHub again. The token path below works today and needs no servers, but it
sends her into GitHub's developer settings to generate a token, which is the
exact thing the studio exists to spare her.

## Fallback: a personal access token

No servers, no OAuth app. Lauren pastes a token once and her browser remembers it.

1. She already has repo access; see step 1 below.
2. **Logged in as Lauren**, go to https://github.com/settings/personal-access-tokens/new
   - Token name: `Pottery studio`
   - Expiration: **No expiration** (or 1 year and set a reminder)
   - Repository access: **Only select repositories** → `laurenbechererpottery.com`
   - Permissions → Repository permissions → **Contents: Read and write**. Leave everything else at *No access*.
   - Generate token and copy it (it's shown once).
3. Open https://laurenbechererpottery.com/admin/ → **Sign In Using Access Token** → paste → done.

The token only works for this one repo and only for editing files. If it ever
leaks, delete it at https://github.com/settings/personal-access-tokens and make
a new one. Don't paste it anywhere except the studio login.

## The one to set up: "Sign in with GitHub" button

GitHub's OAuth flow requires a tiny server to exchange a code for a token;
Sveltia provides one that runs free on Cloudflare Workers.

## 1. Give Lauren a GitHub account with access to the repo

**Done.** Lauren is `laurenbecherer` and already has **Write** access to the repo.

## 2. Create the GitHub OAuth App

1. Go to https://github.com/settings/developers → **OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** Lauren Becherer Pottery Studio
   - **Homepage URL:** `https://laurenbechererpottery.com`
   - **Authorization callback URL:** leave a placeholder for now, e.g. `https://example.com/callback` (you'll update it in step 4)
3. Click **Register application**, then **Generate a new client secret**. Keep the **Client ID** and **Client secret** handy (don't commit them anywhere).

## 3. Deploy the auth Worker on Cloudflare (free)

1. Create a free account at https://dash.cloudflare.com/sign-up if you don't have one.
2. Open https://github.com/sveltia/sveltia-cms-auth and click the **Deploy to Cloudflare Workers** button in its README. Follow the prompts (it forks the repo and creates the Worker).
3. In the Cloudflare dashboard → **Workers & Pages → sveltia-cms-auth → Settings → Variables and Secrets**, add:
   - `GITHUB_CLIENT_ID` = the Client ID from step 2
   - `GITHUB_CLIENT_SECRET` = the Client secret (mark it as *Secret*)
   - `ALLOWED_DOMAINS` = `laurenbechererpottery.com`
4. Note the Worker URL, e.g. `https://sveltia-cms-auth.<your-subdomain>.workers.dev`.

## 4. Connect the pieces

1. Back in the GitHub OAuth App, set **Authorization callback URL** to `<Worker URL>/callback`.
2. In this repo edit `public/admin/config.yml` and add your Worker URL under
   `backend:`:

   ```yaml
   backend:
     name: github
     repo: brettmboggs/laurenbechererpottery.com
     branch: main
     base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
   ```

   There is deliberately no placeholder in the file: a wrong `base_url` breaks
   the GitHub button, while a missing one simply leaves the working token
   option. Commit and push (or edit the file on github.com and commit).
3. Wait for the deploy workflow to finish, open https://laurenbechererpottery.com/admin/, click **Sign in with GitHub**, approve once. Done.

## Editing locally in the meantime

Sveltia's **Work with Local Repository** button (Chrome or Edge) lets you edit
content on this computer without any login: run `npm run dev`, open
http://localhost:4321/admin/, click the button, and pick the project folder.
Saves write to the files on disk; commit and push them when you're ready.

## Upgrade paths (when you want them)

- **Real cart / multi-item checkout:** add a Cloudflare Worker that creates a Stripe Checkout Session; the front end already isolates purchase buttons in `src/pages/portfolio/[slug].astro`.
- **Real client login (email + password):** Supabase Auth (free tier) or Cloudflare Access. The current portal is private-by-link, which is appropriate for progress photos but not for anything sensitive.
- **Bigger 3D assets:** GitHub caps files at 100 MB and repos at ~1 GB. Move to Cloudflare Pages + R2 (10 GB free) when scans get heavy; the build output is identical.
- **Contact form without an email app:** create a free https://formspree.io or https://web3forms.com form and paste the endpoint into *Site settings → Form service endpoint*.
