import {
  createPicture,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  TileMode,
  matchFont,
} from '@shopify/react-native-skia';
import type { SkFont, SkImage, SkPaint, SkPath, SkPicture } from '@shopify/react-native-skia';
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

export type RoadPaintKit = {
  width: number;
  height: number;
  horizonY: number;
  grassBandH: number;
  sky: SkPaint;
  distantGrass: SkPaint;
  grassBand: SkPaint;
  grassA: SkPaint;
  grassB: SkPaint;
  asphalt: SkPaint;
  bitumen: SkPaint;
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
};

/**
 * Paints and gradients depend only on viewport size, so they are built once per
 * layout rather than per frame.
 */
export function makeRoadPaintKit(width: number, height: number, horizonY: number): RoadPaintKit {
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

  return {
    width,
    height,
    horizonY,
    grassBandH: Math.max(10, (height - horizonY) * 0.08),
    sky,
    distantGrass: fillPaint('#3d5a32'),
    grassBand: fillPaint('#4f6b40'),
    grassA: fillPaint('#4a6b3a'),
    grassB: fillPaint('#456338'),
    asphalt: fillPaint('#2c2c30'),
    bitumen: fillPaint('#2c2c30'),
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
  };
}

/**
 * Records one frame as a single SkPicture (~15 draw calls) instead of the
 * ~1500 SVG nodes the web renderer emits.
 */
export function buildRoadPicture(
  frame: ProjectedFrame,
  kit: RoadPaintKit,
  scrollY: number,
  bitumenTile: SkImage | null
): SkPicture {
  const { width, height, horizonY } = kit;

  const grass = Skia.Path.Make();
  const grassAlt = Skia.Path.Make();
  for (let i = 0; i < frame.grassQuads.length; i++) {
    addQuad(i % 2 === 0 ? grass : grassAlt, frame.grassQuads[i]);
  }
  const aprons = nearGrassAprons(frame, height);
  if (aprons) {
    addQuad(grass, aprons.left);
    addQuad(grassAlt, aprons.right);
  }

  const asphalt = Skia.Path.Make();
  const rubberStrong = Skia.Path.Make();
  const rubberLight = Skia.Path.Make();
  const kerbRed = Skia.Path.Make();
  const kerbWhite = Skia.Path.Make();
  const edges = Skia.Path.Make();

  for (let i = 0; i < frame.quads.length; i++) {
    const q = frame.quads[i];
    addQuad(asphalt, q.points);

    for (const streak of q.rubber) {
      addQuad(streak.opacity >= 0.32 ? rubberStrong : rubberLight, streak.points);
    }

    // Stable red/white alternation along the lap, not draw order
    const redFirst = Math.floor(i * 0.55) % 2 === 0;
    if (q.curbLeft) {
      addCurbStrip(redFirst ? kerbRed : kerbWhite, q.points, 'left', 0.09);
    } else {
      edges.moveTo(q.points[0][0], q.points[0][1]);
      edges.lineTo(q.points[3][0], q.points[3][1]);
    }
    if (q.curbRight) {
      addCurbStrip(redFirst ? kerbWhite : kerbRed, q.points, 'right', 0.09);
    } else {
      edges.moveTo(q.points[1][0], q.points[1][1]);
      edges.lineTo(q.points[2][0], q.points[2][1]);
    }
  }

  const apron = underBikeApron(frame, height);
  if (apron) {
    addQuad(asphalt, apron);
    edges.moveTo(apron[0][0], apron[0][1]);
    edges.lineTo(apron[3][0], apron[3][1]);
    edges.moveTo(apron[1][0], apron[1][1]);
    edges.lineTo(apron[2][0], apron[2][1]);
  }

  if (bitumenTile) {
    const m = Skia.Matrix();
    m.translate(0, scrollY);
    kit.bitumen.setShader(
      bitumenTile.makeShaderOptions(
        TileMode.Repeat,
        TileMode.Repeat,
        FilterMode.Linear,
        MipmapMode.None,
        m
      )
    );
  }

  return createPicture(
    (canvas) => {
      canvas.drawRect(Skia.XYWHRect(0, 0, width, horizonY), kit.sky);
      canvas.drawRect(
        Skia.XYWHRect(0, horizonY, width, height - horizonY),
        kit.distantGrass
      );
      canvas.drawRect(Skia.XYWHRect(0, horizonY, width, kit.grassBandH), kit.grassBand);
      canvas.drawPath(grass, kit.grassA);
      canvas.drawPath(grassAlt, kit.grassB);
      canvas.drawPath(asphalt, kit.asphalt);
      if (bitumenTile) canvas.drawPath(asphalt, kit.bitumen);
      canvas.drawPath(asphalt, kit.depthShade);
      canvas.drawPath(rubberLight, kit.rubberLight);
      canvas.drawPath(rubberStrong, kit.rubberStrong);
      canvas.drawPath(kerbRed, kit.kerbRed);
      canvas.drawPath(kerbWhite, kit.kerbWhite);
      canvas.drawPath(edges, kit.edgeLine);

      for (const marker of frame.markers) {
        const board = Skia.Path.Make();
        addQuad(board, marker.points);
        canvas.drawPath(board, kit.boardFill);
        canvas.drawPath(board, kit.boardStroke);
        const label = String(marker.metres);
        kit.font.setSize(marker.fontSize);
        const w = kit.font.measureText(label).width;
        canvas.drawText(
          label,
          marker.labelX - w / 2,
          marker.labelY + marker.fontSize * 0.35,
          kit.boardText,
          kit.font
        );
      }
    },
    Skia.XYWHRect(0, 0, width, height)
  );
}
