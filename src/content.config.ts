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
    status: z.enum(['available', 'sold', 'reserved', 'commission']).default('available'),
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

const clients = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/clients' }),
  schema: z.object({
    name: z.string(),
    code: z.string().min(6),
    project: z.string(),
    status: z
      .enum(['inquiry', 'deposit', 'in-progress', 'drying', 'firing', 'glazing', 'ready', 'shipped', 'complete'])
      .default('inquiry'),
    estimatedCompletion: z.string().optional(),
    depositLink: optionalUrl,
    balanceLink: optionalUrl,
    updates: z
      .array(z.object({ date: z.coerce.date(), note: z.string(), image: optionalPath }))
      .default([]),
    active: z.boolean().default(true),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    portrait: optionalPath,
    studioImages: z.array(z.object({ image: z.string(), alt: z.string().optional() })).default([]),
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
    heroHeading: z.string(),
    heroSubheading: z.string(),
    heroImage: optionalPath,
    /** Optional lettered logo used in the header instead of the typed name. */
    logoImage: optionalPath,
    announcement: z.string().optional(),
    email: z.string().optional(),
    instagram: z.string().optional(),
    location: z.string().optional(),
    commissionsOpen: z.boolean().default(true),
    formEndpoint: z.string().optional(),
    /** Shared care note shown on every piece page unless the piece overrides it. */
    careNote: z.string().optional(),
  }),
});

export const collections = { pieces, posts, clients, pages, settings };
