# Running your website (no code required)

Your website has a "studio" where you edit everything. Bookmark it:

**https://laurenbechererpottery.com/admin/**

Log in with the button Brett set up for you (either **Sign in with GitHub** or
**Sign In Using Access Token**, where you paste a code once and your browser
remembers it). After you save anything, the site rebuilds itself and your change
is live in about a minute. Refresh the page to see it.

Want a drawn logo in the header instead of your typed name? Upload one under
**Site settings → Logo image**.

---

## The sections

### Pieces
One entry per pot. This is the heart of the site.

- **Cover photo** — the picture shown on cards. Portrait or square photos look best.
- **Featured on home page** — turn on for up to 3 pieces you want on the front page.
- **Show in portfolio** — on for anything you want in the gallery (including sold work).
- **This is a working title** — leave on until the piece has a real name. The page says "working title" rather than pretending it is named.
- **For sale** — on to list it in the Shop. Add a **Price**.
- **Status** — Available / Reserved / Sold / Commission. Sold pieces stay in the portfolio with a "Sold" tag and disappear from the shop's buy button.
- **Stripe payment link** — how people pay. See "Taking payments" below.
- **More photos** — add as many as you like.
- **360° spin folder** — the folder name for a piece Brett has photographed on the turntable, e.g. `stoneware-planter`. Fill this in and the piece turns when someone hovers it on the wall, and can be dragged around on its own page. Leave it blank for a piece with ordinary photos.
- **Scene photos** — the piece in use: filled, styled, on a table, held. These appear in an "In use" section on the piece's page. Nothing shows until you add some.
- **Care (this piece only)** — leave blank to use the shared care note from Site settings.
- **3D model (.glb)** — if Brett gives you a 3D scan file, upload it here and the piece gets a 3D tab too.
- **Description** — write whatever you want; use the toolbar for bold, lists, links.

### Journal
Blog posts: kiln openings, market dates, process notes. Tick **Draft** to keep a post hidden while you write it.

### Clients
One private page per commission.

1. Click **New Client project**.
2. Fill in the name, what you're making, and a **Project code**. Make the code something nobody could guess, like `smith-plates-7h3k` (lowercase letters, numbers, dashes).
3. Save. The page is now at `https://laurenbechererpottery.com/client/smith-plates-7h3k/` — text or email that link to the client.
4. As the work progresses, change the **Stage** and add **Progress updates** with a note and a photo. The client sees a progress bar and a timeline.
5. Paste Stripe links into **Deposit** / **Balance** to collect payment right from their page.
6. When it's done, turn **Active** off to take the page down.

The client portal page (`/client/`) also has a "start a commission" form that emails you.

### Pages → About
Your bio, portrait, and studio photos.

### Site settings
Your name, tagline, home-page headline and intro text, contact email, Instagram handle, the **Announcement banner** (a quiet strip at the top of every page — good for "Holiday orders close Dec 10!"), and the **Care note** shown at the bottom of every piece's page. Leave the banner blank to hide it.

---

## Taking payments (Stripe)

1. Create a free account at https://stripe.com and finish the identity/bank setup.
2. In Stripe go to **Payment Links → + New**. Add the piece name, price, a photo, and turn on **Collect shipping address**. Click **Create link**, then **Copy**.
3. In the studio, open the piece and paste the link into **Stripe payment link**. Save.

The piece now shows a **Buy now** button. When it sells, mark the **Status** as Sold. Stripe deposits money to your bank on a rolling basis and only charges a small fee per sale — there is no monthly cost.

For deposits on commissions, make a Payment Link for the deposit amount and paste it into the client's page.

---

## Photos: quick tips

- Phone photos are fine. The studio automatically shrinks huge files so pages stay fast.
- Shoot in daylight near a window, plain background (a sheet of cream paper is perfect).
- 360° spins are shot and processed by Brett, not uploaded here. You only fill in the folder name.
- A piece with a spin does not need a cover photo. Its first frame is used.

## If something looks wrong

Nothing you do in the studio can permanently break the site — every save is a saved version and Brett can roll back to any earlier one. If a page looks off after a save, wait two minutes and refresh; if it's still wrong, tell Brett what you changed.
