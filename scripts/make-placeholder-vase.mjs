/**
 * Generates public/models/placeholder-vase.glb — a lathe-turned bottle vase with a
 * sunset vertex-color "glaze" — so the 3D viewer can be tested before real scans exist.
 * Pure Node, no dependencies:  npm run make-model
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const HEIGHT_M = 0.23; // ~9 inches, so AR shows real size
const SEGMENTS = 96;

// (y, radius) profile in 0..1 height units — outer wall, lip, inner neck.
const profile = [
  [0.0, 0.0], [0.0, 0.26], [0.02, 0.30], [0.08, 0.36], [0.18, 0.41], [0.30, 0.43], [0.42, 0.41],
  [0.54, 0.35], [0.64, 0.26], [0.72, 0.18], [0.80, 0.15], [0.90, 0.155], [0.97, 0.17], [1.0, 0.185],
  [1.0, 0.14], [0.96, 0.125], [0.80, 0.11], [0.72, 0.11],
];

// Sunset glaze: gold lip → apricot → coral → rose → plum foot
const stops = [
  [0.0, [0.24, 0.12, 0.24]], [0.25, [0.88, 0.28, 0.42]], [0.5, [1.0, 0.42, 0.34]],
  [0.75, [1.0, 0.71, 0.47]], [1.0, [0.97, 0.75, 0.35]],
];
const colorAt = (t) => {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1]; const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => v + (c1[j] - v) * k);
    }
  }
  return stops.at(-1)[1];
};

const positions = [], colors = [], indices = [];
for (const [y, r] of profile) {
  for (let s = 0; s <= SEGMENTS; s++) {
    const a = (s / SEGMENTS) * Math.PI * 2;
    positions.push(Math.cos(a) * r * HEIGHT_M, y * HEIGHT_M, Math.sin(a) * r * HEIGHT_M);
    colors.push(...colorAt(y));
  }
}
const ring = SEGMENTS + 1;
for (let i = 0; i < profile.length - 1; i++) {
  for (let s = 0; s < SEGMENTS; s++) {
    const a = i * ring + s, b = a + 1, c = a + ring, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
}

// Smooth normals by accumulating face normals
const normals = new Array(positions.length).fill(0);
for (let i = 0; i < indices.length; i += 3) {
  const [ia, ib, ic] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
  const ux = positions[ib] - positions[ia], uy = positions[ib + 1] - positions[ia + 1], uz = positions[ib + 2] - positions[ia + 2];
  const vx = positions[ic] - positions[ia], vy = positions[ic + 1] - positions[ia + 1], vz = positions[ic + 2] - positions[ia + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  for (const k of [ia, ib, ic]) { normals[k] += nx; normals[k + 1] += ny; normals[k + 2] += nz; }
}
for (let i = 0; i < normals.length; i += 3) {
  const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
  normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
}
// Seam vertices (s=0 and s=SEGMENTS) share a position; average their normals so the seam is invisible.
for (let i = 0; i < profile.length; i++) {
  const a = (i * ring) * 3, b = (i * ring + SEGMENTS) * 3;
  for (let k = 0; k < 3; k++) { const m = (normals[a + k] + normals[b + k]) / 2; normals[a + k] = m; normals[b + k] = m; }
}

const f32 = (arr) => Buffer.from(new Float32Array(arr).buffer);
const u32 = (arr) => Buffer.from(new Uint32Array(arr).buffer);
const pad4 = (buf, fill = 0) => Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4, fill)]);

const posBuf = f32(positions), nrmBuf = f32(normals), colBuf = f32(colors), idxBuf = pad4(u32(indices));
const bin = Buffer.concat([posBuf, nrmBuf, colBuf, idxBuf]);
const vcount = positions.length / 3;
const min = [0, 1, 2].map((k) => Math.min(...positions.filter((_, i) => i % 3 === k)));
const max = [0, 1, 2].map((k) => Math.max(...positions.filter((_, i) => i % 3 === k)));

const gltf = {
  asset: { version: '2.0', generator: 'laurenbechererpottery placeholder' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'PlaceholderVase' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ name: 'SunsetGlaze', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.0, roughnessFactor: 0.28 }, doubleSided: true }],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length, byteLength: nrmBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length + nrmBuf.length, byteLength: colBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length + nrmBuf.length + colBuf.length, byteLength: idxBuf.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vcount, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5126, count: vcount, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: vcount, type: 'VEC3' },
    { bufferView: 3, componentType: 5125, count: indices.length, type: 'SCALAR' },
  ],
};

const json = pad4(Buffer.from(JSON.stringify(gltf)), 0x20);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const chunk = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
const glb = Buffer.concat([header, chunk(json.length, 0x4e4f534a), json, chunk(bin.length, 0x004e4942), bin]);

mkdirSync('public/models', { recursive: true });
writeFileSync('public/models/placeholder-vase.glb', glb);
console.log(`wrote public/models/placeholder-vase.glb (${(glb.length / 1024).toFixed(0)} KB, ${vcount} verts, ${indices.length / 3} tris)`);
