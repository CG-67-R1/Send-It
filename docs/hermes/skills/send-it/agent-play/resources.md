# Agent Play — efficient Android resource usage

Standing methods. Prefer these over “make it faster later”. RoadRacer is Expo / React Native; the same OS limits apply as native.

## Memory (LMK)

Android’s **Low Memory Killer** terminates the process when the device is under pressure. **Hermes GC does not account for native heaps** (Skia, images, decoded bitmaps, `DirectByteBuffer`).

1. **Allocate once, rewind.** Skia paths, paints, `PictureRecorder`, shaders: create in a kit; `rewind()` paths per frame. Do not allocate a path per quad per frame.
2. **Do not dispose GPU objects that are still on screen.** Delay kit/`SkPicture` dispose until after unmount + a frame lag. Landscape `Activity` recreate is the classic dispose-while-drawing crash.
3. **Reuse textures.** Tile bitumen with a repeating shader; do not upload a new image every frame.
4. **Decode images at display size** (`expo-image-manipulator` / downscale). Full camera stills on the home avatar are a silent dirty-memory spike.
5. **Cap retained pictures.** A recycler with a small lag is safer than leaking pictures *or* disposing the current frame.
6. **Lazy-load heavy JSON.** Do not project 220 road segments until Track Memory mounts.
7. **Emulator is a liar.** LMK shows on mid-range physical phones. Use Android Studio Memory Profiler / `adb shell dumpsys meminfo`.

**16 KB pages:** rebuild native `.so` with NDK that aligns ELF segments to 16 KB (Expo SDK 57 / current AGP). Misaligned Skia crashes on 16 KB devices, not on 4 KB emulators.

Warning bands (order of magnitude): extra GPU/texture memory should not climb without bound over a 15-minute Track Memory session.

## CPU / JS thread

1. **Do not `setState` at display refresh** for the world mesh. Drive Skia through a Reanimated shared value / refs. HUD at ~10 Hz is enough.
2. **Physics in refs**, not React. One rAF / Choreographer loop.
3. **Virtualize lists** (FlashList / SectionList) for headlines and track pickers.
4. **Avoid native alloc in `useMemo` during render** (`matchFont` throw = crash). Construct kits in try/catch; mount Canvas only when size is stable.
5. **Timeouts on every network call.** Render cold start ~30s is a Play review trap. Show waiting UI.

## GPU / display

1. **Target 60 fps, budget GPU.** Material You / blur is extra fill rate. Solid `#0f172a` chrome is cheaper and matches this app.
2. **Throttle SVG** if a web fallback exists (~20 fps). Native binary should not use the SVG road.
3. **Orientation:** lock landscape *then* create the Skia surface at the landscape size. Portrait-then-resize allocates two surfaces and often kills the process.
4. **Reduce overdraw:** one picture / one Canvas per game view.
5. **Edge-to-edge:** pad under status/nav bars; do not draw controls in the gesture inset.

## Energy / thermal / background

1. **No background location.** Track arrival is **when-in-use** only. Background location is a Play and battery P0.
2. **Stop rAF on blur.** Track Memory `useFocusEffect` cleanup must cancel animation frames (Android kills less often than iOS but burns battery).
3. **Notifications:** do not wake the app for every headline. Priority 1 only. Runtime `POST_NOTIFICATIONS` on API 33+.
4. **Do not start a foreground service** for Track Memory or location.
5. **Thermal:** if Track Memory is open long, drop draw depth rather than overheating a mid-range SoC.

## Profilers

| Tool | Why |
|------|-----|
| Android Studio CPU Profiler | JS + native hotspots |
| Memory Profiler / `meminfo` | dirty PSS, Skia |
| GPU Inspector / FrameMetrics | jank |
| Energy Profiler / `batterystats` | wakelocks |
| APK Analyzer | 16 KB ELF alignment, `.so` size |
| Play Vitals (after upload) | ANR, crash, excessive wakeups |

## RoadRacer hotspots

- **Track Memory native:** paint kit lifecycle, landscape lock, `matchFont`, PictureRecycler vs in-flight pictures, 16 KB Skia `.so`.
- **Home / onboarding:** camera + photos decode.
- **Coach chat:** growing message lists; images in threads.
- **Headlines:** interval refresh; images offscreen.
- **R8:** keep Skia JNI if release shrinks natives.
