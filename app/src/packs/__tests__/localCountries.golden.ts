import { getLocalCountryNames } from '../loader';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function localCountryNamesFor(packId: string | undefined): Set<string> {
  if (packId === undefined) {
    delete process.env.EXPO_PUBLIC_PACK;
  } else {
    process.env.EXPO_PUBLIC_PACK = packId;
  }
  return getLocalCountryNames();
}

const defaultCountries = localCountryNamesFor(undefined);
assert(defaultCountries.has('Australia'), 'default hybrid build should keep Australia as local');
assert(!defaultCountries.has('UK'), 'default hybrid build should not treat UK as local');
assert(
  !defaultCountries.has('United Kingdom'),
  'default hybrid build should not treat United Kingdom as local'
);

const ukCountries = localCountryNamesFor('uk');
assert(ukCountries.has('UK'), 'UK release should treat UK as local');
assert(ukCountries.has('United Kingdom'), 'UK release should treat United Kingdom as local');
assert(!ukCountries.has('Australia'), 'UK release should not treat Australia as local');

delete process.env.EXPO_PUBLIC_PACK;
