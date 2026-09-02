import type { ImageSourcePropType } from 'react-native';

/** RR-owned Track Details maps (restyled board geometry). The image is the track — no GPX overlay. */
export const TRACK_BOARD_MAPS: Record<string, ImageSourcePropType> = {
  baskerville: require('../../assets/trackInfo/boards/baskerville.png'),
  broadford: require('../../assets/trackInfo/boards/broadford.png'),
  calder_park: require('../../assets/trackInfo/boards/calder_park.png'),
  hidden_valley: require('../../assets/trackInfo/boards/hidden_valley.png'),
  lakeside: require('../../assets/trackInfo/boards/lakeside.png'),
  mac_park: require('../../assets/trackInfo/boards/mac_park.png'),
  mallala: require('../../assets/trackInfo/boards/mallala.png'),
  morgan_park: require('../../assets/trackInfo/boards/morgan_park.png'),
  phillip_island: require('../../assets/trackInfo/boards/phillip_island.png'),
  queensland_raceway: require('../../assets/trackInfo/boards/queensland_raceway.png'),
  sandown: require('../../assets/trackInfo/boards/sandown.png'),
  smp_brabham: require('../../assets/trackInfo/boards/smp_brabham.png'),
  smp_druitt: require('../../assets/trackInfo/boards/smp_druitt.png'),
  smp_gardner: require('../../assets/trackInfo/boards/smp_gardner.png'),
  the_bend_gt: require('../../assets/trackInfo/boards/the_bend_gt.png'),
  the_bend_international: require('../../assets/trackInfo/boards/the_bend_international.png'),
  wakefield_park: require('../../assets/trackInfo/boards/wakefield_park.png'),
  wanneroo: require('../../assets/trackInfo/boards/wanneroo.png'),
  winton: require('../../assets/trackInfo/boards/winton.png'),
};

export function getTrackBoardMap(trackId: string): ImageSourcePropType | undefined {
  return TRACK_BOARD_MAPS[trackId];
}
