import geofenceCatalog from '../data/catalog_track_geofences.json';
import { getTrackById } from '../data/tracks';

export interface TrackGeofenceMatch {
  trackId: string;
  name: string;
  centreLat: number;
  centreLng: number;
  radiusM: number;
}

interface GeofenceFeatureProperties {
  trackId: string;
  name: string;
  radius_m: number;
  aliases?: string[];
}

interface GeofenceFeature {
  type: 'Feature';
  properties: GeofenceFeatureProperties;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

const FEATURES = (geofenceCatalog as unknown as { features: GeofenceFeature[] }).features;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Match user coords to a catalog track geofence (Point + radius). Closest centre wins if multiple match. */
export function findTrackByLocation(lat: number, lng: number): TrackGeofenceMatch | null {
  let best: TrackGeofenceMatch | null = null;
  let bestDist = Infinity;

  for (const feature of FEATURES) {
    const { trackId, radius_m: radiusM } = feature.properties;
    const [centreLng, centreLat] = feature.geometry.coordinates;
    const dist = haversineMeters(lat, lng, centreLat, centreLng);
    if (dist > radiusM) continue;
    if (dist < bestDist) {
      const catalog = getTrackById(trackId);
      bestDist = dist;
      best = {
        trackId,
        name: catalog?.name ?? feature.properties.name,
        centreLat,
        centreLng,
        radiusM,
      };
    }
  }

  return best;
}

export function getCatalogGeofenceFeatures(): GeofenceFeature[] {
  return FEATURES;
}
