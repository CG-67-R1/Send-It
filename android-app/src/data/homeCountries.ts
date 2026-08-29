export const HOME_COUNTRY_CODES = ['GB', 'IT', 'ES', 'AU', 'FR', 'DE', 'JP', 'US'] as const;

export type HomeCountryCode = (typeof HOME_COUNTRY_CODES)[number];

export type HomeCountry = {
  code: HomeCountryCode;
  name: string;
  /** PNG width / height as generated in src/assets/flags. */
  aspectRatio: number;
};

const HOME_COUNTRIES: Record<HomeCountryCode, HomeCountry> = {
  GB: { code: 'GB', name: 'United Kingdom', aspectRatio: 2 },
  IT: { code: 'IT', name: 'Italy', aspectRatio: 1.5 },
  ES: { code: 'ES', name: 'Spain', aspectRatio: 1.5 },
  AU: { code: 'AU', name: 'Australia', aspectRatio: 2 },
  FR: { code: 'FR', name: 'France', aspectRatio: 1.5 },
  DE: { code: 'DE', name: 'Germany', aspectRatio: 5 / 3 },
  JP: { code: 'JP', name: 'Japan', aspectRatio: 1.5 },
  US: { code: 'US', name: 'United States', aspectRatio: 1.9 },
};

const PACK_TO_FLAG: Record<string, HomeCountryCode> = {
  au: 'AU',
  uk: 'GB',
  it: 'IT',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  jp: 'JP',
  us: 'US',
};

function isHomeCountryCode(value: string): value is HomeCountryCode {
  return value in HOME_COUNTRIES;
}

export function getHomeCountry(code: HomeCountryCode): HomeCountry {
  return HOME_COUNTRIES[code];
}

/** Header flag for this binary: primary pack ISO country, else pack id. */
export function getReleaseCountryCode(primaryPackId: string, isoCountry?: string): HomeCountryCode {
  if (isoCountry && isHomeCountryCode(isoCountry)) return isoCountry;
  return PACK_TO_FLAG[primaryPackId] ?? 'AU';
}
