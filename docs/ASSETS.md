# Asset specs for the viewers

## Photos
- JPG/PNG/WebP/HEIC from a phone are fine; the admin converts uploads to WebP and caps them at 2400 px.
- Cover photos: portrait (4:5) or square. Cards crop to 4:5.
- Journal covers: landscape (16:9).

## 3D models (full rotation, "4D" if animated)
- Format: **.glb** (binary glTF 2.0). `.gltf` + separate textures also works but `.glb` is one file and simpler for the admin.
- Target size: under **15 MB** per model for fast loading on phones. 5–8 MB is ideal.
- Geometry: 50k–200k triangles is plenty for a pot. Decimate heavier scans.
- Textures: 2048×2048 base color (+ normal/roughness if you have them), JPEG inside the GLB. Avoid 8k textures.
- Scale: real-world meters (a 9-inch vase ≈ 0.23 m tall) so the AR "View in your space" button shows true size.
- Origin: bottom-center of the piece, Y up.
- Animations: any animation clips embedded in the GLB play automatically and loop.

### Good pipelines
- **Phone photogrammetry:** Polycam, KIRI Engine, or Scaniverse → export GLB → (optional) open in Blender → *File → Export → glTF 2.0*, tick *Compression* (Draco) → upload.
- **Blender from scratch:** model → UV → bake → export glTF 2.0 with Draco compression. Draco-compressed GLBs are supported by the viewer.
- **Quick compression:** `npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp` shrinks most scans 3–10×.

## 360° photo turntables (no scan needed)
- 24 frames (every 15°) is smooth; 12 works, 36 is luxurious.
- Same framing/exposure every shot: tripod, manual exposure, lazy Susan, plain backdrop.
- Export all frames at the same size (e.g. 1200×1500), name them `01.jpg … 24.jpg`, and upload in order.
