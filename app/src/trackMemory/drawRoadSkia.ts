import {
  ClipOp,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  TileMode,
  matchFont,
} from '@shopify/react-native-skia';
import type {
  SkFont,
  SkImage,
  SkPaint,
  SkPath,
  SkPicture,
  SkPictureRecorder,
  SkRect,
} from '@shopify/react-native-skia';
import type { ProjectedFrame } from './projectRoad';
import { nearGrassAprons, underBikeApron } from './projectRoad';

/** Bitumen tile edge in px; also the scroll period. */
export const TILE_PX = 64;

type Quad = [number, number][];

/**
 * Skia has no painter's-order per quad once quads are merged into one path, so
 * every quad is wound the same way and filled with the default non-zero rule.
 * Mixed winding would punch holes where hill crests make quads overlap.
 */
function addQuad(path: SkPath, q: Quad): void {
  const area =
    (q[1][0] - q[0][0]) * (q[1][1] + q[0][1]) +
    (q[2][0] - q[1][0]) * (q[2][1] + q[1][1]) +
    (q[3][0] - q[2][0]) * (q[3][1] + q[2][1]) +
    (q[0][0] - q[3][0]) * (q[0][1] + q[3][1]);
  if (area >= 0) {
    path.moveTo(q[0][0], q[0][1]);
    path.lineTo(q[1][0], q[1][1]);
    path.lineTo(q[2][0], q[2][1]);
    path.lineTo(q[3][0], q[3][1]);
  } else {
    path.moveTo(q[3][0], q[3][1]);
    path.lineTo(q[2][0], q[2][1]);
    path.lineTo(q[1][0], q[1][1]);
    path.lineTo(q[0][0], q[0][1]);
  }
  path.close();
}

/** Kerb strip between a road edge and an inset fraction across the quad. */
function addCurbStrip(path: SkPath, road: Quad, side: 'left' | 'right', inset: number): void {
  const [tl, tr, br, bl] = road;
  const outerA = side === 'left' ? tl : tr;
  const outerB = side === 'left' ? bl : br;
  const towardA = side === 'left' ? tr : tl;
  const towardB = side === 'left' ? br : bl;
  addQuad(path, [
    outerA,
    [outerA[0] + (towardA[0] - outerA[0]) * inset, outerA[1] + (towardA[1] - outerA[1]) * inset],
    [outerB[0] + (towardB[0] - outerB[0]) * inset, outerB[1] + (towardB[1] - outerB[1]) * inset],
    outerB,
  ]);
}

/** Explicit float colour — gradient stops cannot rely on CSS rgba() parsing. */
function floatColor(r: number, g: number, b: number, a: number): Float32Array {
  return Float32Array.of(r / 255, g / 255, b / 255, a);
}

function fillPaint(color: string, alpha = 1): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  if (alpha < 1) paint.setAlphaf(alpha);
  return paint;
}

/**
 * Every Skia handle the renderer needs, allocated once.
 *
 * Skia objects hold native memory that Hermes' GC does not account for, so
 * allocating paths/shaders per frame grows native memory until iOS jetsams the
 * app on the next surface allocation. Paths are rewound and refilled instead.
 */
export type RoadPaintKit = {
  width: number;
  height: number;
  horizonY: number;
  sky: SkPaint;
  distantGrass: SkPaint;
  grassBand: SkPaint;
  grassA: SkPaint;
  grassB: SkPaint;
  asphalt: SkPaint;
  bitumen: SkPaint | null;
  depthShade: SkPaint;
  rubberStrong: SkPaint;
  rubberLight: SkPaint;
  kerbRed: SkPaint;
  kerbWhite: SkPaint;
  edgeLine: SkPaint;
  boardFill: SkPaint;
  boardStroke: SkPaint;
  boardText: SkPaint;
  font: SkFont;
  recorder: SkPictureRecorder;
  paths: {
    grass: SkPath;
    grassAlt: SkPath;
    asphalt: SkPath;
    rubberStrong: SkPath;
    rubberLight: SkPath;
    kerbRed: SkPath;
    kerbWhite: SkPath;
    edges: SkPath;
    board: SkPath;
  };
  rects: {
    sky: SkRect;
    runoff: SkRect;
    grassBand: SkRect;
    bitumen: SkRect;
    bounds: SkRect;
  };
};

export function makeRoadPaintKit(
  width: number,
  height: number,
  horizonY: number,
  bitumenTile: SkImage | null
): RoadPaintKit {
  const sky = Skia.Paint();
  sky.setAntiAlias(true);
  sky.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: 0, y: Math.max(1, horizonY) },
      [Skia.Color('#6fa8d0'), Skia.Color('#b9d4e4'), Skia.Color('#cfe0c4')],
      [0, 0.55, 1],
      TileMode.Clamp
    )
  );

  const depthShade = Skia.Paint();
  depthShade.setAntiAlias(true);
  depthShade.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: horizonY },
      { x: 0, y: height },
      [floatColor(10, 10, 12, 0.42), floatColor(10, 10, 12, 0.08)],
      [0, 1],
      TileMode.Clamp
    )
  );

  const edgeLine = Skia.Paint();
  edgeLine.setAntiAlias(true);
  edgeLine.setStyle(PaintStyle.Stroke);
  edgeLine.setStrokeWidth(2.2);
  edgeLine.setColor(Skia.Color('#f4f4f5'));
  edgeLine.setAlphaf(0.8);

  const boardStroke = Skia.Paint();
  boardStroke.setAntiAlias(true);
  boardStroke.setStyle(PaintStyle.Stroke);
  boardStroke.setStrokeWidth(1.2);
  boardStroke.setColor(Skia.Color('#111827'));

  // One repeating shader for the life of the view; scrolling translates the
  // canvas instead of rebuilding the shader every frame.
  let bitumen: SkPaint | null = null;
  if (bitumenTile) {
    bitumen = Skia.Paint();
    bitumen.setAntiAlias(true);
    bitumen.setShader(
      bitumenTile.makeShaderOptions(
        TileMode.Repeat,
        TileMode.Repeat,
        FilterMode.Linear,
        MipmapMode.None
      )
    );
  }

  const grassBandH = Math.max(10, (height - horizonY) * 0.08);

  return {
    width,
    height,
    horizonY,
    sky,
    distantGrass: fillPaint('#3d5a32'),
    grassBand: fillPaint('#4f6b40'),
    grassA: fillPaint('#4a6b3a'),
    grassB: fillPaint('#456338'),
    asphalt: fillPaint('#2c2c30'),
    bitumen,
    depthShade,
    rubberStrong: fillPaint('#050507', 0.42),
    rubberLight: fillPaint('#050507', 0.22),
    kerbRed: fillPaint('#dc2626'),
    kerbWhite: fillPaint('#f8fafc'),
    edgeLine,
    boardFill: fillPaint('#f8fafc'),
    boardStroke,
    boardText: fillPaint('#0f172a'),
    font: matchFont({ fontFamily: 'System', fontSize: 14, fontWeight: '800' }),
    recorder: Skia.PictureRecorder(),
    paths: {
      grass: Skia.Path.Make(),
      grassAlt: Skia.Path.Make(),
      asphalt: Skia.Path.Make(),
      rubberStrong: Skia.Path.Make(),
      rubberLight: Skia.Path.Make(),
      kerbRed: Skia.Path.Make(),
      kerbWhite: Skia.Path.Make(),
      edges: Skia.Path.Make(),
      board: Skia.Path.Make(),
    },
    rects: {
      sky: Skia.XYWHRect(0, 0, width, horizonY),
      runoff: Skia.XYWHRect(0, horizonY, width, height - horizonY),
      grassBand: Skia.XYWHRect(0, horizonY, width, grassBandH),
      bitumen: Skia.XYWHRect(0, -TILE_PX, width, height + TILE_PX * 2),
      bounds: Skia.XYWHRect(0, 0, width, height),
    },
  };
}

/**
 * Records one frame as a single SkPicture (~15 draw calls) instead of the
 * ~2000 SVG nodes the web renderer emits. The picture is the only Skia object
 * allocated per frame.
 */
export function buildRoadPicture(
  frame: ProjectedFrame,
  kit: RoadPaintKit,
  scrollY: number
): SkPicture {
  const { width, height, horizonY, paths, rects } = kit;

  paths.grass.rewind();
  paths.grassAlt.rewind();
  paths.asphalt.rewind();
  paths.rubberStrong.rewind();
  paths.rubberLight.rewind();
  paths.kerbRed.rewind();
  paths.kerbWhite.rewind();
  paths.edges.rewind();

  for (let i = 0; i < frame.grassQuads.length; i++) {
    addQuad(i % 2 === 0 ? paths.grass : paths.grassAlt, frame.grassQuads[i]);
  }
  const aprons = nearGrassAprons(frame, height);
  if (aprons) {
    addQuad(paths.grass, aprons.left);
    addQuad(paths.grassAlt, aprons.right);
  }

  for (let i = 0; i < frame.quads.length; i++) {
    const q = frame.quads[i];
    addQuad(paths.asphalt, q.points);

    for (const streak of q.rubber) {
      addQuad(streak.opacity >= 0.32 ? paths.rubberStrong : paths.rubberLight, streak.points);
    }

    // Stable red/white alternation along the lap, not draw order
    const redFirst = Math.floor(i * 0.55) % 2 === 0;
    if (q.curbLeft) {
      addCurbStrip(redFirst ? paths.kerbRed : paths.kerbWhite, q.points, 'left', 0.09);
    } else {
      paths.edges.moveTo(q.points[0][0], q.points[0][1]);
      paths.edges.lineTo(q.points[3][0], q.points[3][1]);
    }
    if (q.curbRight) {
      addCurbStrip(redFirst ? paths.kerbWhite : paths.kerbRed, q.points, 'right', 0.09);
    } else {
      paths.edges.moveTo(q.points[1][0], q.points[1][1]);
      paths.edges.lineTo(q.points[2][0], q.points[2][1]);
    }
  }

  const apron = underBikeApron(frame, height);
  if (apron) {
    addQuad(paths.asphalt, apron);
    paths.edges.moveTo(apron[0][0], apron[0][1]);
    paths.edges.lineTo(apron[3][0], apron[3][1]);
    paths.edges.moveTo(apron[1][0], apron[1][1]);
    paths.edges.lineTo(apron[2][0], apron[2][1]);
  }

  // Recorder is reused; the picture it hands back copies the paths, so rewinding
  // them next frame cannot corrupt a picture still on screen.
  const canvas = kit.recorder.beginRecording(rects.bounds);

  canvas.drawRect(rects.sky, kit.sky);
  canvas.drawRect(rects.runoff, kit.distantGrass);
  canvas.drawRect(rects.grassBand, kit.grassBand);
  canvas.drawPath(paths.grass, kit.grassA);
  canvas.drawPath(paths.grassAlt, kit.grassB);
  canvas.drawPath(paths.asphalt, kit.asphalt);

  if (kit.bitumen) {
    canvas.save();
    canvas.clipPath(paths.asphalt, ClipOp.Intersect, true);
    canvas.translate(0, scrollY);
    canvas.drawRect(rects.bitumen, kit.bitumen);
    canvas.restore();
  }

  canvas.drawPath(paths.asphalt, kit.depthShade);
  canvas.drawPath(paths.rubberLight, kit.rubberLight);
  canvas.drawPath(paths.rubberStrong, kit.rubberStrong);
  canvas.drawPath(paths.kerbRed, kit.kerbRed);
  canvas.drawPath(paths.kerbWhite, kit.kerbWhite);
  canvas.drawPath(paths.edges, kit.edgeLine);

  for (const marker of frame.markers) {
    paths.board.rewind();
    addQuad(paths.board, marker.points);
    canvas.drawPath(paths.board, kit.boardFill);
    canvas.drawPath(paths.board, kit.boardStroke);
    const label = String(marker.metres);
    kit.font.setSize(marker.fontSize);
    const w = kit.font.getTextWidth(label);
    canvas.drawText(
      label,
      marker.labelX - w / 2,
      marker.labelY + marker.fontSize * 0.35,
      kit.boardText,
      kit.font
    );
  }

  return kit.recorder.finishRecordingAsPicture();
}

/**
 * Releases pictures a few frames after they leave the screen.
 *
 * The UI thread may still be mid-draw on a picture the loop has already
 * replaced, so disposal lags by RELEASE_LAG frames (~100 ms) rather than firing
 * immediately. Waiting for the GC instead is what let native memory grow until
 * iOS killed the app on the next surface allocation.
 */
const RELEASE_LAG = 6;

export class PictureRecycler {
  private queue: SkPicture[] = [];

  track(picture: SkPicture): void {
    this.queue.push(picture);
    while (this.queue.length > RELEASE_LAG) {
      this.queue.shift()?.dispose();
    }
  }
}

/**
 * Frees the handles the kit owns outright. Paints are left alone: a recorded
 * picture copies them, and disposing one still referenced by a frame on screen
 * would crash.
 */
export function disposeRoadPaintKit(kit: RoadPaintKit): void {
  for (const path of Object.values(kit.paths)) path.dispose();
  kit.recorder.dispose();
}
