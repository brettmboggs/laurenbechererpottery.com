/**
 * 360° turntable runtime.
 *
 * Drives every spinning piece on a page — a whole wall of them on the
 * portfolio, one large one on a detail page — from a single animation loop
 * and a single shared frame cache.
 *
 * THE CONSTRAINT
 * --------------
 * The frames are small on disk (the entire library is a few megabytes) but
 * expensive once decoded. A 16-frame set at 1000px costs roughly 64 MB of
 * decoded bitmap; a visitor who hovered eight pieces would be carrying half
 * a gigabyte. Decoded memory, not bandwidth, is what breaks a wall of these.
 *
 * So:
 *   - Wall tiles are served at 420px, where a set costs about 11 MB. Full-size
 *     frames are used only where a single piece is on screen: a piece's own
 *     page, and the home page hero.
 *   - A tile ships exactly one frame in its markup. Nothing else is fetched
 *     until the visitor shows intent.
 *   - Intent means a hover that survives a short dwell, or keyboard focus,
 *     or (on touch) scrolling a piece to the middle of the screen. Sweeping
 *     a mouse across the grid fetches nothing.
 *   - Sets are fetched once per session, at most two at a time, and the
 *     least recently used are dropped so memory stays bounded.
 *   - Spinning starts as soon as a handful of frames have decoded and
 *     sharpens as the rest arrive, so the turn begins immediately instead of
 *     stalling on a full set.
 *
 * ROTATION
 * --------
 * The photographed positions are not evenly spaced — measured steps run from
 * 12° to 51° — so playing frames at a fixed interval makes the piece lurch.
 * Where true angles were measured, playback position maps through them so the
 * piece turns at a constant rate. Where the shoot could not be measured, even
 * spacing is assumed. Both arrive here as a plain angle-per-frame list, so
 * this code does not care which a piece is.
 *
 * Every frame is a real photograph. Nothing here interpolates between them:
 * a steppy honest turn is the point.
 */

export interface SpinSpec {
  /** Spin id, e.g. "stoneware-planter". */
  id: string;
  /** Public base path, e.g. "/spins/stoneware-planter". */
  base: string;
  /** Which size to load: w = wall tile, d = full size. */
  variant: 'w' | 'd';
  /** Number of frames. */
  count: number;
  /** True rotation angle of each frame, in degrees. */
  angles: number[];
}

/** One full turn, in milliseconds, when spinning on its own. */
const REVOLUTION_MS = 5200;
/** Hover must survive this long before anything is fetched. */
const INTENT_DWELL_MS = 90;
/** Frames decoded before the turn is allowed to start. */
const PREVIEW_FRAMES = 4;
/** Image requests in flight across the whole page. */
const MAX_PARALLEL = 4;
/** Frame sets held in memory. Beyond this, the least recently used is dropped. */
const MAX_SETS = 5;

const reduceMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches;

/* ------------------------------------------------------------------ *
 * Frame cache
 * ------------------------------------------------------------------ */

interface FrameSet {
  key: string;
  count: number;
  images: (HTMLImageElement | null)[];
  /** Indices that have decoded and are safe to display. */
  ready: Set<number>;
  /** Resolves once enough frames exist to start turning. */
  previewed: Promise<void>;
  /** Resolves once every frame has decoded. */
  complete: Promise<void>;
  /** Instances currently using this set; a set in use is never evicted. */
  users: number;
  lastUsed: number;
  listeners: Set<() => void>;
}

const sets = new Map<string, FrameSet>();

/** Image loads are queued so a wall of pieces cannot saturate the connection. */
const queue: (() => void)[] = [];
let inFlight = 0;

function pump() {
  while (inFlight < MAX_PARALLEL && queue.length) {
    const job = queue.shift()!;
    inFlight++;
    job();
  }
}

/** A frame that never loads must not wedge the queue behind it. */
const LOAD_TIMEOUT_MS = 10000;

function loadFrame(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    queue.push(() => {
      const img = new Image();
      img.decoding = 'async';
      // Frame sets must never compete with the page's own images.
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        inFlight--;
        pump();
        resolve(img);
      };
      const timer = window.setTimeout(settle, LOAD_TIMEOUT_MS);

      img.onerror = settle;
      img.onload = () => {
        // Readiness is decided by load, not by decode. decode() can hang
        // indefinitely while a tab is hidden or occluded, and awaiting it
        // would both stall the spin and hold a slot in the queue, blocking
        // every other piece on the page behind it. Pre-rasterising is worth
        // having when it works, so ask for it and carry on regardless.
        img.decode().catch(() => {});
        settle();
      };

      img.src = src;
    });
    pump();
  });
}

function frameUrl(spec: SpinSpec, i: number) {
  return `${spec.base}/${spec.variant}/${String(i).padStart(2, '0')}.webp`;
}

/** Frames to fetch first: evenly spaced around the piece, frame 0 included. */
function previewOrder(count: number): number[] {
  const step = Math.max(1, Math.round(count / PREVIEW_FRAMES));
  const picks: number[] = [];
  for (let i = 0; i < count && picks.length < PREVIEW_FRAMES; i += step) picks.push(i);
  return picks;
}

function evict() {
  if (sets.size <= MAX_SETS) return;
  const candidates = [...sets.values()]
    .filter((s) => s.users === 0)
    .sort((a, b) => a.lastUsed - b.lastUsed);
  while (sets.size > MAX_SETS && candidates.length) {
    const victim = candidates.shift()!;
    // Dropping every reference is what actually releases the decoded bitmaps.
    victim.images.fill(null);
    victim.ready.clear();
    victim.listeners.clear();
    sets.delete(victim.key);
  }
}

function acquire(spec: SpinSpec): FrameSet {
  const key = `${spec.base}/${spec.variant}`;
  const existing = sets.get(key);
  if (existing) {
    existing.lastUsed = performance.now();
    return existing;
  }

  const images: (HTMLImageElement | null)[] = new Array(spec.count).fill(null);
  const ready = new Set<number>();
  const listeners = new Set<() => void>();

  const set: FrameSet = {
    key,
    count: spec.count,
    images,
    ready,
    users: 0,
    lastUsed: performance.now(),
    listeners,
    previewed: Promise.resolve(),
    complete: Promise.resolve(),
  };

  const note = (i: number, img: HTMLImageElement) => {
    // A set evicted mid-flight must not resurrect itself.
    if (!sets.has(key)) return;
    if (!img.naturalWidth) return;
    images[i] = img;
    ready.add(i);
    listeners.forEach((fn) => fn());
  };

  const preview = previewOrder(spec.count);
  const rest = Array.from({ length: spec.count }, (_, i) => i).filter((i) => !preview.includes(i));

  set.previewed = Promise.all(
    preview.map((i) => loadFrame(frameUrl(spec, i)).then((img) => note(i, img)))
  ).then(() => undefined);

  set.complete = set.previewed
    .then(() => Promise.all(rest.map((i) => loadFrame(frameUrl(spec, i)).then((img) => note(i, img)))))
    .then(() => undefined);

  sets.set(key, set);
  evict();
  return set;
}

/* ------------------------------------------------------------------ *
 * Angle mapping
 * ------------------------------------------------------------------ */

/**
 * One frame index per whole degree of rotation. Built once per piece; the
 * lookup during playback is then a single array read, whether the angles
 * were measured off the real shoot or assumed even.
 */
function buildLookup(angles: number[]): Uint8Array {
  const lut = new Uint8Array(360);
  for (let deg = 0; deg < 360; deg++) {
    let best = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < angles.length; i++) {
      let delta = Math.abs(angles[i] - deg);
      if (delta > 180) delta = 360 - delta;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    }
    lut[deg] = best;
  }
  return lut;
}

/* ------------------------------------------------------------------ *
 * Animation loop — one for the whole page
 * ------------------------------------------------------------------ */

const spinning = new Set<Spin>();
let rafId = 0;
let lastTime = 0;

function tick(now: number) {
  const dt = lastTime ? Math.min(now - lastTime, 64) : 16;
  lastTime = now;
  spinning.forEach((s) => s.advance(dt));
  rafId = spinning.size ? requestAnimationFrame(tick) : 0;
  if (!rafId) lastTime = 0;
}

function wake() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ *
 * A single spinning piece
 * ------------------------------------------------------------------ */

export interface SpinOptions {
  /** "hover" = wall tile, spins on intent. "manual" = detail viewer. */
  mode: 'hover' | 'manual';
  onStateChange?: (state: 'idle' | 'loading' | 'spinning' | 'ready') => void;
}

export class Spin {
  readonly el: HTMLElement;
  private img: HTMLImageElement;
  private spec: SpinSpec;
  private lut: Uint8Array;
  private set: FrameSet | null = null;
  private onFrames = () => this.render();

  /** Current rotation in degrees. Grows without bound; wrapped on lookup. */
  rotation = 0;
  /** Degrees per millisecond while auto-spinning. Zero means parked. */
  private speed = 0;
  /** When returning home after a hover, the rotation to stop at. */
  private stopAt: number | null = null;
  private shownIndex = -1;
  private dwellTimer = 0;
  private dragging = false;
  private dragPointer = -1;
  private dragStartX = 0;
  private dragStartRotation = 0;
  private dragMoved = false;

  constructor(el: HTMLElement, spec: SpinSpec, private opts: SpinOptions) {
    this.el = el;
    this.spec = spec;
    this.lut = buildLookup(spec.angles);
    this.img = el.querySelector('img')!;
    if (opts.mode === 'hover') this.bindHover();
    this.bindDrag();
  }

  /* -- loading ---------------------------------------------------- */

  /** Fetch the frame set. Safe to call repeatedly; the cache dedupes. */
  async load(): Promise<void> {
    if (this.set) return;
    this.opts.onStateChange?.('loading');
    const set = acquire(this.spec);
    set.users++;
    set.listeners.add(this.onFrames);
    this.set = set;
    await set.previewed;
    if (this.set === set) this.opts.onStateChange?.('ready');
  }

  private release() {
    if (!this.set) return;
    this.set.users--;
    this.set.listeners.delete(this.onFrames);
    this.set.lastUsed = performance.now();
    this.set = null;
  }

  /* -- rendering -------------------------------------------------- */

  private targetIndex(): number {
    const deg = ((this.rotation % 360) + 360) % 360;
    return this.lut[Math.floor(deg)];
  }

  /**
   * The nearest frame that has actually decoded. While a set is still
   * arriving this shows a neighbour rather than a gap, so the turn is coarse
   * for a moment and then sharpens.
   */
  private nearestReady(want: number): number {
    const set = this.set;
    if (!set || set.ready.size === 0) return -1;
    if (set.ready.has(want)) return want;
    for (let d = 1; d <= set.count; d++) {
      const up = (want + d) % set.count;
      if (set.ready.has(up)) return up;
      const down = (want - d + set.count) % set.count;
      if (set.ready.has(down)) return down;
    }
    return -1;
  }

  render() {
    const index = this.nearestReady(this.targetIndex());
    if (index < 0 || index === this.shownIndex) return;
    const img = this.set?.images[index];
    if (!img) return;
    this.shownIndex = index;
    this.img.src = img.src;
  }

  /* -- motion ----------------------------------------------------- */

  advance(dt: number) {
    this.rotation += this.speed * dt;
    if (this.stopAt !== null && this.rotation >= this.stopAt) {
      this.rotation = this.stopAt;
      this.stopAt = null;
      this.stop();
    }
    this.render();
  }

  /** Turn continuously at a constant rate. */
  spinFreely(rate = 360 / REVOLUTION_MS) {
    this.stopAt = null;
    this.speed = rate;
    spinning.add(this);
    this.opts.onStateChange?.('spinning');
    wake();
  }

  stop() {
    this.speed = 0;
    this.stopAt = null;
    spinning.delete(this);
    this.opts.onStateChange?.(this.set ? 'ready' : 'idle');
  }

  /**
   * Finish the revolution and park back at the front, faster than the
   * browsing speed so the tile settles promptly. Snaps if it would be a long
   * way round.
   */
  private returnHome() {
    const next = (Math.floor(this.rotation / 360) + 1) * 360;
    const remaining = next - this.rotation;
    if (remaining > 300) {
      this.rotation = next;
      this.stop();
      this.render();
      return;
    }
    this.stopAt = next;
    this.speed = (360 / REVOLUTION_MS) * 2.6;
    spinning.add(this);
    wake();
  }

  /* -- intent ----------------------------------------------------- */

  /** Load, then spin. Used by hover, focus, and the mobile centre-of-screen rule. */
  activate = () => {
    if (reduceMotion) {
      this.load().then(() => this.render());
      return;
    }
    this.load().then(() => {
      if (this.el.dataset.spinActive !== 'true') return;
      this.render();
      this.spinFreely();
    });
  };

  deactivate = () => {
    if (this.dragging) return;
    if (spinning.has(this)) this.returnHome();
    else {
      this.rotation = Math.ceil(this.rotation / 360) * 360;
      this.render();
    }
  };

  private bindHover() {
    const enter = () => {
      window.clearTimeout(this.dwellTimer);
      // A mouse crossing the wall on its way somewhere else costs nothing.
      this.dwellTimer = window.setTimeout(() => {
        this.el.dataset.spinActive = 'true';
        this.activate();
      }, INTENT_DWELL_MS);
    };
    const leave = () => {
      window.clearTimeout(this.dwellTimer);
      this.el.dataset.spinActive = 'false';
      this.deactivate();
    };

    if (canHover) {
      this.el.addEventListener('pointerenter', enter);
      this.el.addEventListener('pointerleave', leave);
    }
    // Keyboard users get the same behaviour as hover.
    this.el.addEventListener('focusin', enter);
    this.el.addEventListener('focusout', leave);
  }

  /* -- dragging --------------------------------------------------- */

  private bindDrag() {
    const el = this.el;

    el.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      this.dragging = true;
      this.dragMoved = false;
      this.dragPointer = e.pointerId;
      this.dragStartX = e.clientX;
      this.dragStartRotation = this.rotation;
      this.stop();
      this.load().then(() => this.render());
      el.dataset.spinActive = 'true';
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.dragging || e.pointerId !== this.dragPointer) return;
      const dx = e.clientX - this.dragStartX;
      if (!this.dragMoved && Math.abs(dx) > 4) {
        this.dragMoved = true;
        // Only capture once it is clearly a drag, so a tap can still be a
        // click through to the piece.
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* capture is a nicety, not a requirement */
        }
      }
      if (!this.dragMoved) return;
      e.preventDefault();
      // A drag of roughly one and a quarter widths is one full turn.
      const degreesPerPixel = 360 / (el.clientWidth * 1.25);
      this.rotation = this.dragStartRotation + dx * degreesPerPixel;
      this.render();
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.dragPointer) return;
      this.dragging = false;
      this.dragPointer = -1;
      if (this.dragMoved) {
        // Suppress the click that would otherwise follow a drag on a linked tile.
        const swallow = (ev: Event) => ev.preventDefault();
        el.addEventListener('click', swallow, { capture: true, once: true });
        window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
      }
      if (this.opts.mode === 'hover' && el.dataset.spinActive !== 'true') this.deactivate();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 45 : 360 / this.spec.count;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.stop();
        this.rotation += step;
        this.load().then(() => this.render());
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.stop();
        this.rotation -= step;
        this.load().then(() => this.render());
      }
    });
  }

  destroy() {
    this.stop();
    this.release();
    window.clearTimeout(this.dwellTimer);
  }
}

/* ------------------------------------------------------------------ *
 * Touch: no hover, so the piece nearest the middle of the screen turns
 * ------------------------------------------------------------------ */

function bindTouchWall(instances: Spin[]) {
  if (canHover || reduceMotion || instances.length === 0) return;

  let current: Spin | null = null;
  const visible = new Set<Spin>();
  const byEl = new Map<Element, Spin>();
  instances.forEach((s) => byEl.set(s.el, s));

  const choose = () => {
    const middle = window.innerHeight / 2;
    let best: Spin | null = null;
    let bestDistance = Infinity;
    visible.forEach((s) => {
      const box = s.el.getBoundingClientRect();
      const distance = Math.abs(box.top + box.height / 2 - middle);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = s;
      }
    });
    if (best === current) return;
    if (current) {
      current.el.dataset.spinActive = 'false';
      current.deactivate();
    }
    current = best;
    // Exactly one set is ever active on touch, which keeps memory flat.
    if (current) {
      (current as Spin).el.dataset.spinActive = 'true';
      (current as Spin).activate();
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const spin = byEl.get(entry.target);
        if (!spin) return;
        if (entry.isIntersecting) visible.add(spin);
        else visible.delete(spin);
      });
      choose();
    },
    { rootMargin: '-25% 0px -25% 0px' }
  );
  instances.forEach((s) => observer.observe(s.el));

  let scrollTimer = 0;
  window.addEventListener(
    'scroll',
    () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(choose, 120);
    },
    { passive: true }
  );
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

const built = new WeakMap<HTMLElement, Spin>();

/** Read a spin spec off an element's data attribute. */
export function specFrom(el: HTMLElement): SpinSpec | null {
  const raw = el.dataset.spin;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SpinSpec;
    if (!parsed.count || parsed.count < 2 || !Array.isArray(parsed.angles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSpin(el: HTMLElement): Spin | undefined {
  return built.get(el);
}

/**
 * Attach to every `[data-spin]` on the page that is not already wired.
 * Idempotent, so it is safe for more than one component to call it.
 */
export function initSpins(): Spin[] {
  const created: Spin[] = [];
  const hovers: Spin[] = [];

  document.querySelectorAll<HTMLElement>('[data-spin]').forEach((el) => {
    if (built.has(el)) return;
    const spec = specFrom(el);
    if (!spec) return;
    const mode = (el.dataset.spinMode as SpinOptions['mode']) || 'hover';
    const spin = new Spin(el, spec, {
      mode,
      onStateChange: (state) => {
        el.dataset.spinState = state;
      },
    });
    built.set(el, spin);
    created.push(spin);
    if (mode === 'hover') hovers.push(spin);
    el.dataset.spinState = 'idle';
  });

  bindTouchWall(hovers);
  return created;
}
