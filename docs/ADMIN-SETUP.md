# Admin login — one-time setup

The studio at `/admin/` is Sveltia CMS. It talks directly to GitHub, so Lauren
needs a way to prove to GitHub that she's allowed to edit the repo. There are
two ways. **Start with the quick path**; add the polished path later if you want
a one-click "Sign in with GitHub" button.

## Quick path (5 minutes): a personal access token

No servers, no OAuth app. Lauren pastes a token once and her browser remembers it.

1. Do step 1 below (Lauren's GitHub account, added as a collaborator).
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

## Polished path (10 minutes): "Sign in with GitHub" button

GitHub's OAuth flow requires a tiny server to exchange a code for a token;
Sveltia provides one that runs free on Cloudflare Workers.

## 1. Give Lauren a GitHub account with access to the repo

1. Lauren creates a free account at https://github.com/join (pick a simple username; she'll only ever use it to click "Sign in with GitHub").
2. Brett: repo → **Settings → Collaborators → Add people** → her username → role **Write**.
3. She accepts the invite from the email GitHub sends.

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
   - `ALLOWED_DOMAINS` = `laurenbechererpottery.com,*.github.io,localhost:4321`
4. Note the Worker URL, e.g. `https://sveltia-cms-auth.<your-subdomain>.workers.dev`.

## 4. Connect the pieces

1. Back in the GitHub OAuth App, set **Authorization callback URL** to `<Worker URL>/callback`.
2. In this repo edit `public/admin/config.yml` and replace

   ```yaml
   base_url: https://REPLACE-WITH-YOUR-WORKER.workers.dev
   ```

   with your Worker URL. Commit and push (or edit the file on github.com and commit).
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
