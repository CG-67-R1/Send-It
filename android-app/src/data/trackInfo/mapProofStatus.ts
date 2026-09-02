import mapProofDoc from './mapProof.json';

type MapProofLayout = {
  status?: string;
  pitVerified?: boolean;
};

type MapProofFile = {
  layouts?: Record<string, MapProofLayout>;
};

const PROOF = mapProofDoc as MapProofFile;

/**
 * Numbered corner dots (and heuristic pit marks) ship only when the layout is
 * owner_verified against an official board map — never from GPX bake alone.
 */
export function areTrackInfoCornersVerified(trackId: string): boolean {
  return PROOF.layouts?.[trackId]?.status === 'owner_verified';
}

export function getTrackInfoMapProofStatus(trackId: string): string {
  return PROOF.layouts?.[trackId]?.status ?? 'needs_owner_data';
}
