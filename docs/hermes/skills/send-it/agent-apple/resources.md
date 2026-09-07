# Agent Apple — efficient iOS resource usage

Standing methods. Prefer these over “make it faster later”. RoadRacer is Expo / React Native; the same OS limits apply as native.

## Memory (jetsam)

iOS kills (`jetsam`) when dirty memory is high. **Hermes GC does not account for native heaps** (Skia, images, decoded bitmaps).

1. **Allocate once, rewind.** Skia paths, paints, `PictureRecorder`, shaders: create in a kit; `rewind()` paths per frame. Do not `Skia.Path()` per quad per frame.
2. **Do not dispose GPU objects that are still on screen.** Delay kit/`SkPicture` dispose until after unmount + a frame lag. Landscape rotation is the classic dispose-while-drawing crash.
3. **Reuse textures.** Tile bitumen with a repeating shader; do not upload a new image every frame.
4. **Decode images at display size** (`expo-image-manipulator` / `allowDownscaling`). Full camera stills on the home avatar are a silent dirty-memory spike.
5. **Cap retained pictures.** A recycler with a small lag (a few frames) is safer than leaking pictures *or* disposing the current frame.
6. **Lazy-load heavy JSON.** Do not import every Track Memory layout on the hub if a screen can load one id — if they are already bundled, at least do not project 220 segments until the game mounts.
7. **Simulator is a liar.** Jetsam shows on device. TestFlight + Xcode Memory Gauge / Instruments Allocations on a physical iPhone.

Warning bands (order of magnitude, not Apple SLAs): keep additional texture memory well under a few hundred MB; a 15-minute session should not climb without bound.

## CPU / JS thread

1. **Do not `setState` at display refresh** for the world mesh. Drive Skia through a Reanimated shared value / refs. HUD at ~10 Hz is enough.
2. **Physics in refs**, not React. One rAF loop.
3. **Virtualize lists** (FlashList / SectionList) for headlines and track pickers.
4. **Avoid work in `useMemo` that allocates native objects** during render (Skia `matchFont` throwing = white screen / crash). Construct kits in try/catch; mount Canvas only when size is stable.
5. **Timeouts on every network call.** Render cold start ~30s is a Review trap (user thinks the app is hung). Show waiting UI.

## GPU / display

1. **Target 60 fps, budget GPU.** Liquid Glass and stacked blurs cost sampling passes. Solid `#0f172a` chrome is cheaper and matches this app.
2. **Throttle SVG** if a web fallback exists (~20 fps). Native binary should not use the SVG road.
3. **Orientation:** lock landscape *then* create the Metal/Skia surface at the landscape size. Creating at portrait and resizing allocates two surfaces.
4. **Reduce overdraw:** one picture / one Canvas per game view, not hundreds of RN `View`s for asphalt.

## Energy / thermal / background

1. **No background location.** Track arrival is **when-in-use** only. Always-location is a Review and battery P0.
2. **Stop rAF on blur.** Track Memory `useFocusEffect` cleanup must cancel animation frames.
3. **Notifications:** do not wake the app for every headline. Priority 1 only, as product already intends.
4. **Respect Low Power Mode** if adding extra animations later (`NSProcessInfoPowerStateDidChange`).
5. **Thermal:** if Track Memory is open long, watch `ProcessInfo.thermalState`; dropping draw depth is better than a thermal kill.

## Instruments (when a Mac is available)

| Template | Why |
|----------|-----|
| Time Profiler | JS + native hotspots |
| Allocations + VM Tracker | dirty memory, Skia |
| Metal System Trace | GPU, if Skia/Metal |
| Core Animation | hitches |
| Energy Log | battery |
| Leaks | native objects |

Xcode 27 Organizer adds hitch / storage metrics — use crash reports from TestFlight after each upload.

## RoadRacer hotspots

- **Track Memory native:** paint kit lifecycle, landscape lock, `matchFont`, PictureRecycler vs in-flight pictures.
- **Home / onboarding:** camera + photos decode.
- **Coach chat:** growing message lists; images in threads.
- **Headlines:** interval refresh vs large DOM; images offscreen.
