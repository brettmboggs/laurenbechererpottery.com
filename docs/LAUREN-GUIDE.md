# Running your website (no code required)

Your website has a "studio" where you edit everything. Bookmark it:

**https://laurenbechererpottery.com/admin/**

Log in with the **Sign in with GitHub** button. After you save anything, the site
rebuilds itself and your change is live in about a minute. Refresh the page to
see it.

---

## The sections

### Pieces
One entry per pot. This is the heart of the site.

- **Cover photo** — the picture shown on cards. Portrait or square photos look best.
- **Featured on home page** — turn on for up to 3 pieces you want on the front page.
- **Show in portfolio** — on for anything you want in the gallery (including sold work).
- **For sale** — on to list it in the Shop. Add a **Price**.
- **Status** — Available / Reserved / Sold / Commission. Sold pieces stay in the portfolio with a "Sold" tag and disappear from the shop's buy button.
- **Stripe payment link** — how people pay. See "Taking payments" below.
- **More photos** — add as many as you like.
- **3D model (.glb)** — if Brett gives you a 3D scan file, upload it here and the piece gets the interactive spinner.
- **360° photo frames** — alternative to a 3D scan: 12–36 photos taken in order around the piece on a turntable. Visitors drag to spin.
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
Your name, tagline, home-page headline and intro text, contact email, Instagram handle, and the **Announcement banner** (a colorful strip at the top of every page — great for "Holiday orders close Dec 10!"). Leave the banner blank to hide it.

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
- For 360° frames: put the piece on a lazy Susan, keep the phone on a tripod, turn ~15° between shots (24 photos), and upload them in order.

## If something looks wrong

Nothing you do in the studio can permanently break the site — every save is a saved version and Brett can roll back to any earlier one. If a page looks off after a save, wait two minutes and refresh; if it's still wrong, tell Brett what you changed.
