import baskerville from './baskerville.json';
import broadford from './broadford.json';
import calderPark from './calder_park.json';
import hiddenValley from './hidden_valley.json';
import lakeside from './lakeside.json';
import macPark from './mac_park.json';
import mallala from './mallala.json';
import morganPark from './morgan_park.json';
import phillipIsland from './phillip_island.json';
import queenslandRaceway from './queensland_raceway.json';
import sandown from './sandown.json';
import smpBrabham from './smp_brabham.json';
import smpDruitt from './smp_druitt.json';
import smpGardner from './smp_gardner.json';
import theBendGt from './the_bend_gt.json';
import theBendInternational from './the_bend_international.json';
import wakefieldPark from './wakefield_park.json';
import winton from './winton.json';
import type { RacingLine } from './types';

const LINES: Record<string, RacingLine> = {
  baskerville: baskerville as RacingLine,
  broadford: broadford as RacingLine,
  calder_park: calderPark as RacingLine,
  hidden_valley: hiddenValley as RacingLine,
  lakeside: lakeside as RacingLine,
  mac_park: macPark as RacingLine,
  mallala: mallala as RacingLine,
  morgan_park: morganPark as RacingLine,
  phillip_island: phillipIsland as RacingLine,
  queensland_raceway: queenslandRaceway as RacingLine,
  sandown: sandown as RacingLine,
  smp_brabham: smpBrabham as RacingLine,
  smp_druitt: smpDruitt as RacingLine,
  smp_gardner: smpGardner as RacingLine,
  the_bend_gt: theBendGt as RacingLine,
  the_bend_international: theBendInternational as RacingLine,
  wakefield_park: wakefieldPark as RacingLine,
  winton: winton as RacingLine,
};

export const RACING_LINE_IDS = Object.keys(LINES);

export function getRacingLine(trackId: string): RacingLine | undefined {
  return LINES[trackId];
}
