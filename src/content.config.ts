import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/**
 * Content collections.
 * Every collection here maps 1:1 to a section in the admin portal
 * (public/admin/config.yml). Lauren edits these through forms; the
 * schemas below validate what she saves so a typo can't break the build.
 */

const optionalPath = z.string().optional().or(z.literal(''));
const optionalUrl = z.string().url().optional().or(z.literal(''));

const pieces = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pieces' }),
  schema: z.object({
    title: z.string(),
    /** True while the title is the studio's working name, not a product name. */
    workingTitle: z.boolean().default(false),
    date: z.coerce.date(),
    /**
     * Tie-breaker for pieces made on the same day, lowest first. Several
     * pieces are often photographed in one session, and without this the
     * wall order falls back to whatever order the files are read in, which
     * is not stable.
     */
    order: z.number().optional(),
    featured: z.boolean().default(false),
    showInPortfolio: z.boolean().default(true),
    forSale: z.boolean().default(false),
    status: z.enum(['available', 'sold', 'reserved']).default('available'),
    price: z.number().nonnegative().optional(),
    stripeLink: optionalUrl,
    collection: z.string().optional(),
    /**
     * Cover photo. Optional: a piece with a 360° spin uses its first frame,
     * so a piece can go up with nothing but its spin folder.
     */
    cover: optionalPath,
    gallery: z.array(z.object({ image: z.string(), alt: z.string().optional() })).default([]),
    /**
     * 360° spin id, matching a folder in the photography project and an entry
     * in src/data/spins.json. Run `npm run spins` after adding one.
     */
    spin: z.string().optional(),
    /**
     * Scene photography — the piece in use, filled, styled. Not shot yet.
     * The detail page renders this section only when it has something to show,
     * so the shoot is a data drop rather than a layout change.
     */
    scenes: z
      .array(
        z.object({
          image: z.string(),
          alt: z.string().optional(),
          caption: z.string().optional(),
          kind: z.enum(['styled', 'in-use', 'detail', 'scale']).default('styled'),
        })
      )
      .default([]),
    // 3D: a .glb/.gltf file (optionally animated → "4D"). Dormant until a real scan exists.
    model: optionalPath,
    modelAutoRotate: z.boolean().default(true),
    dimensions: z.string().optional(),
    materials: z.string().optional(),
    firing: z.string().optional(),
    /** Overrides the shared care note at the bottom of a piece page. */
    care: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    cover: optionalPath,
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    portrait: optionalPath,
    studioImages: z.array(z.object({ image: z.string(), alt: z.string().optional() })).default([]),
    /** Signed under the story in Lauren's own handwriting. */
    signature: z.string().optional(),
  }),
});

const settings = defineCollection({
  // site.json is a flat object (CMS-friendly); wrap it as a single entry with id "site".
  loader: file('./src/content/settings/site.json', {
    parser: (text) => [{ id: 'site', ...JSON.parse(text) }],
  }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    /** Optional lettered logo used in the header instead of the typed name. */
    logoImage: optionalPath,
    /** The picture shown when a link to the site is shared. */
    shareImage: optionalPath,
    announcement: z.string().optional(),
    email: z.string().optional(),
    instagram: z.string().optional(),
    location: z.string().optional(),
    /** Shared care note shown on every piece page unless the piece overrides it. */
    careNote: z.string().optional(),
  }),
});

/**
 * Page text. Every word on the site that is not a piece, a post or the About
 * page lives in one of these files, one per page, so Lauren can change any of
 * it from "Page text" in the studio. Each file is a single entry whose id is
 * its own name: getEntry('home', 'home').
 *
 * Every field falls back to an empty string, and the pages hide anything
 * blank that can sensibly go missing (an eyebrow, an intro). Button labels are
 * marked required in the studio, so those can't be emptied.
 */
const text = z.string().default('');
const single = <T extends z.ZodRawShape>(name: string, shape: T) =>
  defineCollection({
    loader: file(`./src/content/text/${name}.json`, {
      parser: (raw) => [{ id: name, ...JSON.parse(raw) }],
    }),
    schema: z.object(shape),
  });

const home = single('home', {
  eyebrow: text,
  heading: text,
  intro: text,
  /** Shown only when no piece has a 360° spin. */
  photo: optionalPath,
  button: text,
  turnHint: text,
  workHeading: text,
  workLink: text,
  journalHeading: text,
  journalLink: text,
});

const work = single('work', {
  description: text,
  eyebrow: text,
  heading: text,
  intro: text,
  allFilter: text,
  empty: text,
  archiveHeading: text,
  archiveIntro: text,
});

const piece = single('piece', {
  backLink: text,
  searchDescription: text,
  workingTitle: text,
  available: text,
  reserved: text,
  sold: text,
  priceToCome: text,
  buyButton: text,
  inquireButton: text,
  askButton: text,
  emailSubject: text,
  dimensionsLabel: text,
  dimensionsMissing: text,
  materialsLabel: text,
  materialsMissing: text,
  firingLabel: text,
  madeLabel: text,
  scenesHeading: text,
  sceneStyled: text,
  sceneInUse: text,
  sceneDetail: text,
  sceneScale: text,
  moreHeading: text,
  moreLink: text,
  spinTab: text,
  modelTab: text,
  photosTab: text,
  spinBadge: text,
  dragHint: text,
  turnButton: text,
  stopButton: text,
  tiltButton: text,
  tiltStop: text,
  modelHint: text,
  arButton: text,
});

const shop = single('shop', {
  description: text,
  eyebrow: text,
  heading: text,
  intro: text,
  emptyText: text,
  emptyLink: text,
  faq: z
    .array(z.object({ heading: text, text, emailLink: text }))
    .default([]),
});

const journal = single('journal', {
  description: text,
  eyebrow: text,
  heading: text,
  intro: text,
  empty: text,
  backLink: text,
});

const layout = single('layout', {
  navWork: text,
  navShop: text,
  navJournal: text,
  navAbout: text,
  menuButton: text,
  footerLine: text,
  footerLineSoft: text,
  finePrint: text,
  loginLink: text,
  /** A faint wash behind the footer. Blank for none. */
  footerImage: optionalPath,
});

const notfound = single('notfound', {
  title: text,
  eyebrow: text,
  heading: text,
  intro: text,
  homeButton: text,
  workButton: text,
});

export const collections = {
  pieces, posts, pages, settings,
  home, work, piece, shop, journal, layout, notfound,
};
