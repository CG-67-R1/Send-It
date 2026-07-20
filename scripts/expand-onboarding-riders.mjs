/**
 * Merge a large curated set of road-racing champions / major winners into
 * app/src/data/onboardingRiders.json (skip existing ids / displayNames).
 *
 * Run: node scripts/expand-onboarding-riders.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'app/src/data/onboardingRiders.json');
const riders = JSON.parse(readFileSync(path, 'utf8'));

const existingIds = new Set(riders.map((r) => r.id));
const existingNames = new Set(
  riders.map((r) => r.displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
);

function entry(id, displayName, aliases, series, era, signature, blurb, style = ['race_craft'], vibe = ['champion']) {
  return {
    id,
    displayName,
    aliases,
    series,
    era,
    characteristics: { style, vibe, signature },
    blurb,
    active: true,
  };
}

/** @type {ReturnType<typeof entry>[]} */
const additions = [
  // —— Premier / classic GP world champions ——
  entry('barry_sheene', 'Barry Sheene', ['barry sheene', 'sheene', 'seven'], ['motogp', 'classic'], 'legend', 'two-time 500cc world champion', "Barry Sheene — two-time 500cc world champion, playboy, survivor, and the face of British bike racing. Proper legend.", ['showman', 'racer_iq'], ['british_legend']),
  entry('geoff_duke', 'Geoff Duke', ['geoff duke', 'duke'], ['motogp', 'classic'], 'legend', 'six-time world champion', "Geoff Duke was the original stylish world champion — six titles when road racing was still raw courage.", ['smooth'], ['classic_legend']),
  entry('john_surtees', 'John Surtees', ['john surtees', 'surtees'], ['motogp', 'classic'], 'legend', 'multi-class world champion + F1', "John Surtees won bike world titles and Formula 1 — the only person to champion both. Unreal résumé.", ['versatile', 'racer_iq'], ['classic_legend']),
  entry('phil_read', 'Phil Read', ['phil read'], ['motogp', 'classic'], 'legend', 'multi-class world champion', "Phil Read collected world titles across classes like they were souvenir badges. British GP royalty.", ['racer_iq', 'aggressive'], ['classic_legend']),
  entry('jim_redman', 'Jim Redman', ['jim redman', 'redman'], ['motogp', 'classic'], 'legend', 'six-time world champion', "Jim Redman won six world championships for Honda in the classic era. Rhodesian steel, Japanese machinery.", ['smooth', 'versatile'], ['classic_legend']),
  entry('carlo_ubbiali', 'Carlo Ubbiali', ['carlo ubbiali', 'ubbiali'], ['motogp', 'classic'], 'legend', 'nine-time world champion', "Carlo Ubbiali stacked nine world titles in the small classes — MV Agusta excellence.", ['smooth', 'technical'], ['classic_legend']),
  entry('luigi_taveri', 'Luigi Taveri', ['luigi taveri', 'taveri'], ['motogp', 'classic'], 'legend', 'three-time 125cc world champion', "Luigi Taveri — Swiss precision, three 125cc world titles. Classic-era craft.", ['smooth'], ['classic_legend']),
  entry('franco_uncini', 'Franco Uncini', ['franco uncini', 'uncini'], ['motogp'], 'legend', '1982 500cc world champion', "Franco Uncini took the 1982 500cc title — Italian grit in the two-stroke missile era.", ['aggressive'], ['champion']),
  entry('alex_criville', 'Àlex Crivillé', ['alex criville', 'àlex crivillé', 'criville', 'crivillé'], ['motogp'], 'legend', '1999 500cc world champion', "Àlex Crivillé became Spain's first 500cc world champion in 1999. Pathway opener for a generation.", ['smooth', 'race_craft'], ['champion']),
  entry('kenny_roberts_jr', 'Kenny Roberts Jr.', ['kenny roberts jr', 'kenny roberts junior', 'roberts jr'], ['motogp'], 'legend', '2000 500cc world champion', "Kenny Roberts Jr. followed his dad to a 500cc world title in 2000. American GP bloodline.", ['aggressive', 'smooth'], ['champion']),
  entry('leslie_graham', 'Leslie Graham', ['leslie graham', 'les graham'], ['motogp', 'classic'], 'legend', 'inaugural 500cc world champion', "Leslie Graham won the first-ever 500cc world championship in 1949. Where the history book starts.", ['brave'], ['classic_legend']),
  entry('umberto_masetti', 'Umberto Masetti', ['umberto masetti', 'masetti'], ['motogp', 'classic'], 'legend', 'two-time 500cc world champion', "Umberto Masetti took early 500cc titles when the world championship was still finding its feet.", ['brave'], ['classic_legend']),
  entry('fergus_anderson', 'Fergus Anderson', ['fergus anderson'], ['motogp', 'classic'], 'legend', 'two-time 350cc world champion', "Fergus Anderson was a 350cc world champion in the 1950s — Scottish talent on continental grids.", ['smooth'], ['classic_legend']),
  entry('libero_liberati', 'Libero Liberati', ['libero liberati', 'liberati'], ['motogp', 'classic'], 'legend', '1957 500cc world champion', "Libero Liberati won the 1957 500cc crown — Italian classic-era steel.", ['aggressive'], ['classic_legend']),
  entry('gary_hocking', 'Gary Hocking', ['gary hocking', 'hocking'], ['motogp', 'classic'], 'legend', '1961 500cc world champion', "Gary Hocking took the 1961 500cc title — Rhodesian speed in the MV years.", ['aggressive'], ['classic_legend']),
  entry('mike_hailwood_already', null, null, null, null, null, null), // skip sentinel
  entry('kel_carruthers', 'Kel Carruthers', ['kel carruthers', 'carruthers'], ['motogp', 'classic'], 'legend', '1969 250cc world champion', "Kel Carruthers won the 1969 250cc title and later mentored Americans into GP. Aussie pioneer.", ['racer_iq'], ['australian_legend']),
  entry('walter_villa', 'Walter Villa', ['walter villa'], ['motogp', 'classic'], 'legend', 'four-time world champion', "Walter Villa piled up 250/350 titles for Harley-Davidson's race program. Unusual factory, serious results.", ['smooth'], ['champion']),
  entry('kork_ballington', 'Kork Ballington', ['kork ballington', 'ballington'], ['motogp', 'classic'], 'legend', 'four-time world champion', "Kork Ballington swept 250 and 350 titles for Kawasaki. South African excellence.", ['smooth', 'technical'], ['champion']),
  entry('anton_mang', 'Anton Mang', ['anton mang', 'mang'], ['motogp', 'classic'], 'legend', 'five-time world champion', "Anton Mang collected five world titles in 250/350 — German precision in the two-stroke age.", ['smooth'], ['champion']),
  entry('loris_capirossi', 'Loris Capirossi', ['loris capirossi', 'capirossi', 'capi'], ['motogp'], 'legend', 'three-time world champion', "Loris Capirossi won titles from 125 up and became a MotoGP race winner. Capì never aged out of fight.", ['aggressive', 'race_craft'], ['champion']),
  entry('max_biaggi_already', null, null, null, null, null, null),
  entry('marco_simoncelli', 'Marco Simoncelli', ['marco simoncelli', 'simoncelli', 'sic'], ['motogp'], 'legend', '2008 250cc world champion', "Marco Simoncelli — Sic — won the 250 title and raced with a wild grin. Gone too soon, never forgotten.", ['aggressive', 'showman'], ['cult_hero']),
  entry('enea_bastianini', 'Enea Bastianini', ['enea bastianini', 'bastianini', 'bestia', 'the beast'], ['motogp', 'moto2'], 'current', '2020 Moto2 world champion', "Enea Bastianini — Bestia — took Moto2 gold then started winning in MotoGP. The Beast lives up to it.", ['aggressive', 'smooth'], ['champion']),
  entry('marco_melandri', 'Marco Melandri', ['marco melandri', 'melandri'], ['motogp', 'wsbk'], 'legend', '2002 250cc world champion', "Marco Melandri won the 250 crown and later WSBK races — Italian flair across two decades.", ['smooth', 'race_craft'], ['champion']),
  entry('dani_pedrosa_tag', null, null, null, null, null, null),
  entry('stefan_bradl', 'Stefan Bradl', ['stefan bradl', 'bradl'], ['motogp', 'moto2'], 'legend', '2011 Moto2 world champion', "Stefan Bradl took the 2011 Moto2 title — German pathway into the premier class.", ['smooth'], ['champion']),
  entry('pol_espargaro', 'Pol Espargaró', ['pol espargaro', 'pol espargaró'], ['motogp', 'moto2', 'endurance', 'suzuka'], 'current', '2013 Moto2 world champion', "Pol Espargaró won Moto2 in 2013 and later helped Yamaha conquer Suzuka. Sibling rivalry fuel.", ['aggressive', 'spectacular'], ['champion']),
  entry('esteve_rabat', 'Esteve Rabat', ['esteve rabat', 'tito rabat', 'rabat'], ['moto2', 'motogp'], 'legend', '2014 Moto2 world champion', "Tito Rabat dominated Moto2 in 2014 — calm on a Kalex when the intermediate class was chaos.", ['smooth', 'race_craft'], ['champion']),
  entry('johann_zarco_tag', null, null, null, null, null, null),
  entry('toni_elias', 'Toni Elías', ['toni elias', 'toni elías', 'elias'], ['moto2', 'motoamerica', 'motogp'], 'legend', '2010 Moto2 + AMA champion', "Toni Elías won the first Moto2 world title and later AMA Superbike gold. Spanish résumé, US chapter.", ['aggressive', 'versatile'], ['champion']),
  entry('stefan_bradl_dup', null, null, null, null, null, null),
  entry('daijiro_kato', 'Daijiro Kato', ['daijiro kato', 'kato'], ['motogp', 'suzuka'], 'legend', '2001 250cc world champion', "Daijiro Kato won the 250 title and Suzuka glory — Japanese hero taken far too soon.", ['aggressive', 'spectacular'], ['cult_hero']),
  entry('tady_okada', 'Tadayuki Okada', ['tadayuki okada', 'tady okada', 'okada'], ['motogp', 'suzuka'], 'legend', 'GP winner + Suzuka winner', "Tady Okada was Honda's late-90s GP threat and a Suzuka 8 Hours winner. Quiet speed.", ['smooth'], ['cult_hero']),
  entry('nobuatsu_aoki', 'Nobuatsu Aoki', ['nobuatsu aoki', 'aoki'], ['motogp', 'suzuka'], 'legend', 'GP podium + Suzuka winner', "Nobuatsu Aoki flew the Japanese flag in 500cc and later won at Suzuka. Family racing dynasty energy.", ['smooth'], ['cult_hero']),

  // —— WSBK / AMA extras ——
  entry('doug_polen', 'Doug Polen', ['doug polen', 'polen'], ['wsbk', 'motoamerica'], 'legend', 'two-time WSBK champion', "Doug Polen won back-to-back World Superbike titles — American domination on a Ducati.", ['smooth', 'qualifier'], ['champion']),
  entry('reg_pridmore', 'Reg Pridmore', ['reg pridmore', 'pridmore'], ['motoamerica', 'classic'], 'legend', 'three-time AMA Superbike champion', "Reg Pridmore won the first three AMA Superbike titles. Where the US national story begins.", ['smooth'], ['classic_legend']),
  entry('wes_cooley', 'Wes Cooley', ['wes cooley', 'cooley'], ['motoamerica', 'suzuka'], 'legend', 'two-time AMA Superbike champion', "Wes Cooley was an AMA Superbike champ and Suzuka winner — California cool in the superbike dawn.", ['aggressive'], ['champion']),
  entry('carlos_checa', 'Carlos Checa', ['carlos checa', 'checa'], ['wsbk', 'motogp', 'suzuka'], 'legend', '2011 WSBK champion', "Carlos Checa finally took a World Superbike title in 2011 — and he won Suzuka too. Spanish persistence.", ['smooth', 'race_craft'], ['champion']),
  entry('james_toseland_tag', null, null, null, null, null, null),
  entry('anthony_west', 'Anthony West', ['anthony west', 'aj west'], ['asbk', 'motogp', 'endurance'], 'legend', 'ASBK + GP race winner', "Anthony West won Grands Prix and kept showing up in ASBK and endurance — Aussie career chameleon.", ['aggressive', 'versatile'], ['australian_legend']),
  entry('kevin_magee', 'Kevin Magee', ['kevin magee', 'magee'], ['motogp', 'suzuka', 'asbk'], 'legend', 'GP winner + Suzuka winner', "Kevin Magee won a 500cc GP and the Suzuka 8 Hours — Aussie pace on the biggest stages.", ['aggressive'], ['australian_legend']),
  entry('graeme_crosby', 'Graeme Crosby', ['graeme crosby', 'crosby'], ['motogp', 'tt', 'suzuka', 'classic'], 'legend', 'TT winner + GP star', "Graeme Crosby won at the TT and ran at the front in 500cc — Kiwi legend across roads and GPs.", ['brave', 'aggressive'], ['cult_hero']),

  // —— WorldSSP champions ——
  entry('kenan_sofuoglu', 'Kenan Sofuoğlu', ['kenan sofuoglu', 'kenan sofuoğlu', 'sofuoglu', 'sofuoğlu'], ['ssp'], 'legend', 'five-time WorldSSP champion', "Kenan Sofuoğlu owns World Supersport — five titles. Turkey's road-racing giant.", ['aggressive', 'dominant'], ['champion']),
  entry('dominique_aegerter', 'Dominique Aegerter', ['dominique aegerter', 'aegerter'], ['ssp', 'moto2', 'endurance', 'wsbk'], 'current', 'two-time WorldSSP champion', "Dominique Aegerter went Moto2 → back-to-back WorldSSP titles → WSBK. Swiss multi-tool.", ['smooth', 'race_craft'], ['champion']),
  entry('nicolo_bulega', 'Nicolò Bulega', ['nicolo bulega', 'nicolò bulega', 'bulega'], ['ssp', 'wsbk', 'moto2'], 'current', '2023 WorldSSP champion', "Nicolò Bulega took WorldSSP gold then started winning in World Superbike. Ducati rocket.", ['aggressive', 'smooth'], ['champion']),
  entry('adrian_huertas', 'Adrián Huertas', ['adrian huertas', 'adrián huertas', 'huertas'], ['ssp'], 'current', '2024 WorldSSP champion', "Adrián Huertas became WorldSSP champion in 2024 — young, fast, Ducati-mounted.", ['aggressive'], ['champion']),
  entry('stefano_manzi', 'Stefano Manzi', ['stefano manzi', 'manzi'], ['ssp', 'moto2', 'red_bull_rookies'], 'current', '2025 WorldSSP champion', "Stefano Manzi capped the climb with the 2025 WorldSSP title. Rookies graduate, job done.", ['smooth', 'race_craft'], ['champion']),
  entry('andrea_locatelli', 'Andrea Locatelli', ['andrea locatelli', 'locatelli'], ['ssp', 'wsbk'], 'current', '2020 WorldSSP champion', "Andrea Locatelli dominated WorldSSP in 2020 then stepped to Superbike. Italian pathway clean.", ['smooth'], ['champion']),
  entry('lucas_mahias', 'Lucas Mahias', ['lucas mahias', 'mahias'], ['ssp', 'endurance'], 'legend', '2017 WorldSSP champion', "Lucas Mahias took the 2017 WorldSSP crown — French flair in the 600 class.", ['aggressive'], ['champion']),
  entry('randy_krummenacher', 'Randy Krummenacher', ['randy krummenacher', 'krummenacher'], ['ssp'], 'legend', '2019 WorldSSP champion', "Randy Krummenacher sealed the 2019 WorldSSP title — Swiss race craft in a Yamaha year.", ['smooth'], ['champion']),
  entry('michael_van_der_mark', 'Michael van der Mark', ['michael van der mark', 'van der mark', 'mvdm'], ['ssp', 'wsbk', 'suzuka', 'endurance'], 'current', '2014 WorldSSP + Suzuka winner', "Michael van der Mark won WorldSSP and keeps winning at Suzuka. Dutch endurance weapon.", ['smooth', 'versatile'], ['champion']),
  entry('sebastien_charpentier', 'Sébastien Charpentier', ['sebastien charpentier', 'sébastien charpentier', 'charpentier'], ['ssp'], 'legend', 'two-time WorldSSP champion', "Sébastien Charpentier went back-to-back in WorldSSP mid-2000s. French 600-class benchmark.", ['aggressive'], ['champion']),
  entry('andrew_pitt', 'Andrew Pitt', ['andrew pitt'], ['ssp', 'wsbk'], 'legend', 'two-time WorldSSP champion', "Andrew Pitt won WorldSSP twice — including a title without a race win. Aussie brain over brawn.", ['racer_iq', 'smooth'], ['australian_legend']),
  entry('karl_muggeridge', 'Karl Muggeridge', ['karl muggeridge', 'muggeridge'], ['ssp'], 'legend', '2004 WorldSSP champion', "Karl Muggeridge took the 2004 WorldSSP title for Ten Kate Honda. Aussie 600-class gold.", ['aggressive'], ['australian_legend']),
  entry('fabien_foret', 'Fabien Foret', ['fabien foret', 'fabien forêt', 'foret'], ['ssp'], 'legend', '2002 WorldSSP champion', "Fabien Foret won the 2002 WorldSSP championship — early-era French supersport star.", ['aggressive'], ['champion']),
  entry('jorg_teuchert', 'Jörg Teuchert', ['jorg teuchert', 'jörg teuchert', 'teuchert'], ['ssp'], 'legend', '2000 WorldSSP champion', "Jörg Teuchert was WorldSSP champion in 2000 — German Yamaha pace.", ['smooth'], ['champion']),
  entry('stephane_chambon', 'Stéphane Chambon', ['stephane chambon', 'stéphane chambon', 'chambon'], ['ssp'], 'legend', '1999 WorldSSP champion', "Stéphane Chambon took WorldSSP gold in 1999 on a Suzuki. French classic of the 600 class.", ['aggressive'], ['champion']),
  entry('paolo_casoli', 'Paolo Casoli', ['paolo casoli', 'casoli'], ['ssp'], 'legend', '1997 WorldSSP champion', "Paolo Casoli won the inaugural modern WorldSSP flavour title era on Ducati. Italian pioneer.", ['aggressive'], ['champion']),
  entry('fabrizio_pirovano', 'Fabrizio Pirovano', ['fabrizio pirovano', 'pirovano'], ['ssp', 'wsbk'], 'legend', '1998 WorldSSP champion', "Fabrizio Pirovano won WorldSSP in 1998 after years as a Superbike cult hero. Italian longevity.", ['smooth'], ['champion']),

  // —— Superstock ——
  entry('raffaele_de_rosa', 'Raffaele De Rosa', ['raffaele de rosa', 'de rosa'], ['superstock', 'ssp'], 'legend', 'Superstock 1000 champion', "Raffaele De Rosa won Superstock 1000 — the production-bike proving ground done properly.", ['aggressive'], ['champion']),
  entry('sylvain_barrier', 'Sylvain Barrier', ['sylvain barrier', 'barrier'], ['superstock'], 'legend', 'Superstock 1000 champion', "Sylvain Barrier took Superstock 1000 titles when BMW was rewriting the class. French factory pace.", ['aggressive'], ['champion']),
  entry('leandro_mercado', 'Leandro Mercado', ['leandro mercado', 'tati mercado', 'mercado'], ['superstock', 'wsbk'], 'legend', 'Superstock champion', "Tati Mercado won Superstock and stepped to World Superbike — Argentine fire.", ['aggressive'], ['champion']),
  entry('markus_reiterberger', 'Markus Reiterberger', ['markus reiterberger', 'reiterberger'], ['superstock', 'wsbk'], 'legend', 'Superstock / IDM star', "Markus Reiterberger dominated German superbike ladders and Superstock machinery. Teutonic pace.", ['smooth'], ['champion']),
  entry('florian_marino', 'Florian Marino', ['florian marino'], ['superstock', 'ssp'], 'legend', 'Superstock / SSP winner', "Florian Marino won at Superstock and WorldSSP level — French production-bike specialist.", ['smooth'], ['champion']),
  entry('xavi_fore', 'Xavi Forés', ['xavi fores', 'xavi forés', 'fores', 'forés'], ['superstock', 'wsbk'], 'legend', 'Superstock race winner', "Xavi Forés was a Superstock and WSBK regular who could steal wins when it counted.", ['aggressive'], ['cult_hero']),
  entry('gino_rea', 'Gino Rea', ['gino rea'], ['superstock', 'ssp', 'endurance'], 'legend', 'Superstock / SSP race winner', "Gino Rea won in Superstock and kept fighting through injuries — British determination.", ['aggressive'], ['cult_hero']),

  // —— TT winners / roads ——
  entry('steve_hislop', 'Steve Hislop', ['steve hislop', 'hislop', 'hizzy'], ['tt', 'bsb', 'classic'], 'legend', 'multiple TT winner', "Steve Hislop — Hizzy — won TTs and a BSB title. Scotland's road-racing poet.", ['brave', 'smooth'], ['tt_legend']),
  entry('robert_dunlop', 'Robert Dunlop', ['robert dunlop'], ['tt', 'classic'], 'legend', 'multiple TT winner', "Robert Dunlop carried the Dunlop name with TT wins of his own. Family dynasty, roads DNA.", ['brave', 'road_racing'], ['tt_legend']),
  entry('william_dunlop', 'William Dunlop', ['william dunlop'], ['tt'], 'legend', 'multiple TT / NW200 winner', "William Dunlop won on the roads with that unmistakable Dunlop commitment. Gone too soon.", ['brave', 'road_racing'], ['tt_legend']),
  entry('bruce_anstey', 'Bruce Anstey', ['bruce anstey', 'anstey'], ['tt'], 'legend', 'multiple TT winner', "Bruce Anstey was a TT winner with Kiwi calm at mountain pace. Quietly rapid.", ['smooth', 'road_racing'], ['tt_legend']),
  entry('dave_molyneux', 'Dave Molyneux', ['dave molyneux', 'molyneux'], ['tt', 'sidecar'], 'legend', 'record TT sidecar winner', "Dave Molyneux owns TT sidecar history — more wins than seems fair. Outfit king of the Mountain.", ['technical', 'road_racing'], ['tt_legend']),
  entry('klaus_klaffenbock', 'Klaus Klaffenböck', ['klaus klaffenbock', 'klaus klaffenböck', 'klaffenbock'], ['tt', 'sidecar'], 'legend', 'TT sidecar winner', "Klaus Klaffenböck won TT sidecars — Austrian precision in the chair class.", ['technical'], ['tt_legend']),
  entry('nick_jefferies', 'Nick Jefferies', ['nick jefferies'], ['tt', 'classic'], 'legend', 'TT winner', "Nick Jefferies won at the Isle of Man — Yorkshire racing bloodline (and David's uncle).", ['brave'], ['tt_legend']),
  entry('phillip_mccallen', 'Phillip McCallen', ['phillip mccallen', 'mccallen'], ['tt', 'classic'], 'legend', 'multiple TT winner', "Phillip McCallen racked TT wins in the 90s — Northern Irish mountain specialist.", ['aggressive', 'road_racing'], ['tt_legend']),
  entry('carl_fogarty_tt', null, null, null, null, null, null),
  entry('adrian_archibald', 'Adrian Archibald', ['adrian archibald', 'archibald'], ['tt'], 'legend', 'TT winner', "Adrian Archibald won TTs — another Northern Irish name etched into Mountain Course history.", ['brave'], ['tt_legend']),
  entry('ryan_farquhar', 'Ryan Farquhar', ['ryan farquhar', 'farquhar'], ['tt'], 'legend', 'multiple national roads winner', "Ryan Farquhar won everywhere on the Irish roads circuit — TT podiums and domestic domination.", ['aggressive', 'road_racing'], ['tt_legend']),
  entry('james_hillier', 'James Hillier', ['james hillier', 'hillier'], ['tt'], 'current', 'TT winner', "James Hillier is a modern TT winner — British roads pace when the weather turns nasty.", ['brave'], ['tt_legend']),
  entry('michael_dunlop_tag', null, null, null, null, null, null),
  entry('dean_harrison_tag', null, null, null, null, null, null),
  entry('conor_cummins_tag', null, null, null, null, null, null),
  entry('ian_hutchinson_tag', null, null, null, null, null, null),
  entry('john_mcguinness_tag', null, null, null, null, null, null),
  entry('joey_dunlop_tag', null, null, null, null, null, null),
  entry('david_jefferies_tag', null, null, null, null, null, null),
  entry('peter_hickman_tag', null, null, null, null, null, null),
  entry('mike_hailwood_tt', null, null, null, null, null, null),
  entry('geoff_duke_tt', null, null, null, null, null, null),
  entry('john_surtees_tt', null, null, null, null, null, null),
  entry('charlie_williams', 'Charlie Williams', ['charlie williams'], ['tt', 'classic'], 'legend', 'multiple TT winner', "Charlie Williams won multiple TTs in the classic production era — British roads staple.", ['brave'], ['tt_legend']),
  entry('mick_grant', 'Mick Grant', ['mick grant'], ['tt', 'classic', 'motogp'], 'legend', 'multiple TT winner', "Mick Grant won TTs and raced GPs — Yorkshire hardman of the 70s roads.", ['brave', 'aggressive'], ['tt_legend']),
  entry('tony_rutter', 'Tony Rutter', ['tony rutter'], ['tt', 'classic'], 'legend', 'multiple TT Formula winner', "Tony Rutter cleaned up TT Formula races — related racing bloodline, serious silverware.", ['smooth'], ['tt_legend']),
  entry('alex_george', 'Alex George', ['alex george'], ['tt', 'classic'], 'legend', 'TT winner', "Alex George won at the Isle of Man — Scottish courage on the Mountain Course.", ['brave'], ['tt_legend']),
  entry('joey_dunlop_era_robert', null, null, null, null, null, null),
  entry('brian_reid', 'Brian Reid', ['brian reid'], ['tt', 'classic'], 'legend', 'TT winner', "Brian Reid won TTs — Irish roads excellence from the classic years.", ['brave'], ['tt_legend']),
  entry('sammy_miller', 'Sammy Miller', ['sammy miller'], ['tt', 'classic'], 'legend', 'TT winner + trials legend', "Sammy Miller won TTs and became a trials immortal — rare dual-threat legend.", ['versatile', 'technical'], ['classic_legend']),
  entry('giacomo_agostini_tt', null, null, null, null, null, null),
  entry('mv_hailwood', null, null, null, null, null, null),
  entry('john_hartle', 'John Hartle', ['john hartle', 'hartle'], ['tt', 'classic', 'motogp'], 'legend', 'TT winner + GP winner', "John Hartle won TTs and Grands Prix — British star of the late 50s/60s.", ['brave'], ['classic_legend']),
  entry('bob_mcintyre', 'Bob McIntyre', ['bob mcintyre', 'mcintyre'], ['tt', 'classic'], 'legend', 'first 100mph TT lap', "Bob McIntyre was first to lap the TT at 100mph — Scottish history on the Mountain.", ['brave'], ['classic_legend']),
  entry('stanley_woods', 'Stanley Woods', ['stanley woods'], ['tt', 'classic'], 'legend', '10-time TT winner', "Stanley Woods won 10 TTs — pre-war and 1930s dominance. Absolute roads royalty.", ['brave', 'dominant'], ['classic_legend']),
  entry('mike_duff', 'Mike Duff', ['mike duff'], ['tt', 'classic', 'motogp'], 'legend', 'TT / GP winner', "Mike Duff won at world level and on the roads — Canadian in a European world.", ['brave'], ['classic_legend']),
  entry('tom_herron', 'Tom Herron', ['tom herron', 'herron'], ['tt', 'classic', 'motogp'], 'legend', 'TT winner + GP winner', "Tom Herron won TTs and Grands Prix — Northern Irish talent taken far too young.", ['brave', 'aggressive'], ['tt_legend']),
  entry('john_williams_tt', 'John Williams', ['john williams tt'], ['tt', 'classic'], 'legend', 'TT winner', "John Williams won TTs in the 1970s — British roads hardman era.", ['brave'], ['tt_legend']),
  entry('gary_johnson', 'Gary Johnson', ['gary johnson tt'], ['tt'], 'legend', 'TT winner', "Gary Johnson won TTs — privateer heart, Mountain Course results.", ['brave'], ['tt_legend']),
  entry('cameron_donald', 'Cameron Donald', ['cameron donald'], ['tt'], 'legend', 'TT winner', "Cameron Donald won TTs — Aussie attacking the Mountain Course.", ['brave', 'aggressive'], ['tt_legend']),
  entry('steve_plater', 'Steve Plater', ['steve plater', 'plater'], ['tt', 'bsb'], 'legend', 'TT winner', "Steve Plater won TTs and raced BSB — British all-rounder on roads and short circuits.", ['brave'], ['tt_legend']),
  entry('keith_amor', 'Keith Amor', ['keith amor'], ['tt'], 'legend', 'TT winner', "Keith Amor won at the Isle of Man — Irish roads winner.", ['brave'], ['tt_legend']),
  entry('ivan_lintin', 'Ivan Lintin', ['ivan lintin', 'lintin'], ['tt'], 'legend', 'TT winner', "Ivan Lintin won a TT — lightweight class heroics on the Mountain Course.", ['brave'], ['tt_legend']),
  entry('lee_johnston', 'Lee Johnston', ['lee johnston'], ['tt'], 'current', 'TT winner', "Lee Johnston is a modern TT winner — Northern Irish pace across road-race weekends.", ['brave'], ['tt_legend']),
  entry('dan_kneen', 'Dan Kneen', ['dan kneen', 'kneen'], ['tt'], 'legend', 'TT winner', "Dan Kneen won TTs — Manx rider living the home-course dream.", ['brave'], ['tt_legend']),
  entry('horst_saiger', 'Horst Saiger', ['horst saiger', 'saiger'], ['tt', 'endurance'], 'legend', 'TT winner', "Horst Saiger became a TT race winner and endurance regular — Austrian roads commitment.", ['brave'], ['tt_legend']),
  entry('davey_todd', 'Davey Todd', ['davey todd'], ['tt', 'bsb'], 'current', 'TT winner', "Davey Todd is a modern TT winner who also races BSB — British roads/short-circuit crossover.", ['aggressive', 'brave'], ['tt_legend']),
  entry('dominic_herbertson', 'Dominic Herbertson', ['dominic herbertson'], ['tt'], 'current', 'TT winner', "Dominic Herbertson won at the TT — privateer story done right.", ['brave'], ['tt_legend']),
  entry('paul_jordan', 'Paul Jordan', ['paul jordan'], ['tt'], 'current', 'TT winner', "Paul Jordan won TT races — Irish roads pace in the modern era.", ['brave'], ['tt_legend']),
  entry('jamie_coward', 'Jamie Coward', ['jamie coward'], ['tt'], 'current', 'TT winner', "Jamie Coward is a TT winner — Yorkshire racing through and through.", ['brave'], ['tt_legend']),
  entry('michael_sweeney', 'Michael Sweeney', ['michael sweeney'], ['tt'], 'current', 'TT winner', "Michael Sweeney won TT racing — Irish attack on the Mountain.", ['brave'], ['tt_legend']),
  entry('adam_mclean', 'Adam McLean', ['adam mclean'], ['tt'], 'current', 'TT winner', "Adam McLean won at the TT — modern lightweight / roads specialist.", ['brave'], ['tt_legend']),

  // —— Endurance / Suzuka ——
  entry('takumi_takahashi', 'Takumi Takahashi', ['takumi takahashi'], ['suzuka', 'endurance'], 'current', 'record Suzuka 8 Hours winner', "Takumi Takahashi is the Suzuka 8 Hours win king — Honda's endurance metronome.", ['smooth', 'endurance'], ['champion']),
  entry('katsuyuki_nakasuga', 'Katsuyuki Nakasuga', ['katsuyuki nakasuga', 'nakasuga'], ['suzuka', 'endurance', 'motogp'], 'legend', 'multiple Suzuka 8 Hours winner', "Katsuyuki Nakasuga won Suzuka again and again for Yamaha — test rider who delivered on Sundays.", ['smooth', 'endurance'], ['champion']),
  entry('josh_hook', 'Josh Hook', ['josh hook', 'hooky'], ['endurance', 'suzuka', 'asbk'], 'current', 'EWC / Suzuka winner', "Josh Hook wins endurance classics and flies the Aussie flag at Suzuka. Hooky means business.", ['aggressive', 'endurance'], ['australian_legend']),
  entry('gregg_black', 'Gregg Black', ['gregg black'], ['endurance', 'suzuka'], 'current', 'EWC champion / Suzuka winner', "Gregg Black is a modern Endurance world title threat and Suzuka winner — Yamaha's long-haul ace.", ['smooth', 'endurance'], ['champion']),
  entry('mike_di_meglio', 'Mike Di Meglio', ['mike di meglio', 'di meglio'], ['endurance', 'motogp', 'suzuka'], 'legend', '125 champ + EWC star', "Mike Di Meglio won a 125 world title then became an Endurance / Suzuka weapon. Full career arc.", ['versatile', 'endurance'], ['champion']),
  entry('xavier_simeon', 'Xavier Siméon', ['xavier simeon', 'xavier siméon', 'simeon'], ['endurance', 'motogp'], 'legend', 'EWC winner', "Xavier Siméon won at Endurance world level after a GP career — Belgian versatility.", ['smooth', 'endurance'], ['champion']),
  entry('etienne_masson', 'Etienne Masson', ['etienne masson', 'étienne masson'], ['endurance'], 'current', 'EWC race winner', "Etienne Masson wins FIM Endurance classics — French long-distance specialist.", ['endurance'], ['champion']),
  entry('julien_da_costa', 'Julien Da Costa', ['julien da costa'], ['endurance'], 'legend', 'EWC champion', "Julien Da Costa collected Endurance world titles — French Bol d'Or DNA.", ['endurance', 'race_craft'], ['champion']),
  entry('vincent_philippe', 'Vincent Philippe', ['vincent philippe'], ['endurance'], 'legend', 'multiple EWC / Bol d\'Or winner', "Vincent Philippe is Bol d'Or / EWC royalty — decades of French endurance excellence.", ['endurance', 'longevity'], ['champion']),
  entry('freddy_foray', 'Freddy Foray', ['freddy foray', 'foray'], ['endurance'], 'legend', 'EWC / Bol d\'Or winner', "Freddy Foray won the big French endurance races — sprint brain, endurance body.", ['aggressive', 'endurance'], ['champion']),
  entry('niccolo_canepa', 'Niccolò Canepa', ['niccolo canepa', 'niccolò canepa', 'canepa'], ['endurance', 'motogp', 'wsbk'], 'legend', 'EWC champion', "Niccolò Canepa won Endurance world honours after GP and WSBK chapters. Italian all-rounder.", ['smooth', 'endurance'], ['champion']),
  entry('randy_de_puniet', 'Randy de Puniet', ['randy de puniet', 'de puniet'], ['endurance', 'motogp'], 'legend', 'GP winner + EWC star', "Randy de Puniet won Grands Prix and later Endurance races — French career second act.", ['aggressive', 'endurance'], ['cult_hero']),
  entry('shinichi_itoh', 'Shinichi Itoh', ['shinichi itoh', 'shin\'ichi itoh', 'itoh'], ['suzuka', 'motogp', 'endurance'], 'legend', 'multiple Suzuka winner', "Shinichi Itoh won Suzuka multiple times and raced 500cc GPs — Honda legend.", ['smooth', 'endurance'], ['champion']),
  entry('kousuke_akiyoshi', 'Kousuke Akiyoshi', ['kousuke akiyoshi', 'akiyoshi'], ['suzuka', 'endurance'], 'legend', 'multiple Suzuka winner', "Kousuke Akiyoshi is a multi-time Suzuka 8 Hours winner — Japanese endurance benchmark.", ['endurance'], ['champion']),
  entry('manabu_kamada', 'Manabu Kamada', ['manabu kamada', 'kamada'], ['suzuka', 'endurance'], 'legend', 'Suzuka 8 Hours winner', "Manabu Kamada won the Suzuka 8 Hours alongside GP stars — Japanese endurance glue.", ['endurance'], ['champion']),
  entry('yukio_kagayama', 'Yukio Kagayama', ['yukio kagayama', 'kagayama'], ['suzuka', 'wsbk'], 'legend', 'Suzuka winner + WSBK winner', "Yukio Kagayama won at Suzuka and in World Superbike — Suzuki's Japanese fighter.", ['aggressive'], ['champion']),
  entry('alex_lowes', 'Alex Lowes', ['alex lowes'], ['wsbk', 'suzuka', 'endurance', 'bsb'], 'current', 'WSBK winner + Suzuka winner', "Alex Lowes wins World Superbike races and Suzuka 8 Hours — Lowes family race craft.", ['smooth', 'versatile'], ['champion']),
  entry('sam_lowes_tag', null, null, null, null, null, null),
  entry('iker_lecuona', 'Iker Lecuona', ['iker lecuona', 'lecuona'], ['wsbk', 'suzuka', 'motogp'], 'current', 'WSBK winner + Suzuka winner', "Iker Lecuona wins in WSBK and at Suzuka — Spanish fire on Honda machinery.", ['aggressive'], ['champion']),
  entry('tetsuta_nagashima', 'Tetsuta Nagashima', ['tetsuta nagashima', 'nagashima'], ['motogp', 'suzuka'], 'legend', 'Moto2 winner + Suzuka winner', "Tetsuta Nagashima won in Moto2 and the Suzuka 8 Hours — Japanese home-soil hero.", ['smooth'], ['champion']),
  entry('jonathan_rea_suzuka', null, null, null, null, null, null),
  entry('wayne_gardner_suzuka', null, null, null, null, null, null),
  entry('aaron_slight_suzuka', null, null, null, null, null, null),
  entry('colin_edwards_suzuka', null, null, null, null, null, null),
  entry('valentino_rossi_suzuka', null, null, null, null, null, null),

  // —— More classic / feature winners ——
  entry('jarno_saarinen', 'Jarno Saarinen', ['jarno saarinen', 'saarinen'], ['motogp', 'classic'], 'legend', '1972 250cc world champion', "Jarno Saarinen won the 250 title with revolutionary style — Finnish genius, gone too soon.", ['smooth', 'racer_iq'], ['classic_legend']),
  entry('teuvo_lansivuori', 'Teuvo Länsivuori', ['teuvo lansivuori', 'teuvo länsivuori', 'lansivuori'], ['motogp', 'classic'], 'legend', 'GP winner', "Teuvo Länsivuori won Grands Prix in the 70s — another Finnish flyer.", ['aggressive'], ['cult_hero']),
  entry('pat_hennen', 'Pat Hennen', ['pat hennen', 'hennen'], ['motogp', 'classic'], 'legend', 'first US 500cc GP winner', "Pat Hennen was the first American to win a 500cc GP — then the story stopped too early.", ['brave', 'aggressive'], ['cult_hero']),
  entry('kenny_roberts_tag', null, null, null, null, null, null),
  entry('eddie_lawson_tag', null, null, null, null, null, null),
  entry('wayne_rainey_tag', null, null, null, null, null, null),
  entry('kevin_schwantz_tag', null, null, null, null, null, null),
  entry('mick_doohan_tag', null, null, null, null, null, null),
  entry('wayne_gardner_tag', null, null, null, null, null, null),
  entry('bubba_shobert', 'Bubba Shobert', ['bubba shobert', 'shobert'], ['motoamerica', 'motogp', 'classic'], 'legend', 'AMA Superbike champion', "Bubba Shobert won AMA Superbike titles before a tough GP jump. Texas dirt-track DNA on tarmac.", ['aggressive'], ['american_legend']),
  entry('freddie_spencer_tag', null, null, null, null, null, null),
  entry('marco_lucchinelli', 'Marco Lucchinelli', ['marco lucchinelli', 'lucchinelli', 'lucky'], ['motogp', 'classic'], 'legend', '1981 500cc world champion', "Marco Lucchinelli — Lucky — took the 1981 500cc title. Italian cool in the two-stroke wars.", ['aggressive', 'showman'], ['champion']),
  entry('franco_uncini_dup', null, null, null, null, null, null),
  entry('marco_lucchinelli_dup', null, null, null, null, null, null),
  entry('frederick_merkel_tag', null, null, null, null, null, null),
  entry('raymond_roche', 'Raymond Roche', ['raymond roche', 'roche'], ['wsbk', 'endurance', 'classic'], 'legend', '1990 WSBK champion', "Raymond Roche won the 1990 World Superbike title — French pioneer of the series.", ['aggressive'], ['champion']),
  entry('jean_philippe_ruggia', 'Jean-Philippe Ruggia', ['jean-philippe ruggia', 'ruggia'], ['motogp', 'classic'], 'legend', 'GP winner', "Jean-Philippe Ruggia won 250 GPs with wild saves — French entertainment.", ['spectacular'], ['cult_hero']),
  entry('luca_cadalora', 'Luca Cadalora', ['luca cadalora', 'cadalora'], ['motogp', 'classic'], 'legend', 'two-time 250cc world champion', "Luca Cadalora won two 250 titles and ran at the front in 500cc. Italian textbook style.", ['smooth', 'technical'], ['champion']),
  entry('max_biaggi_250', null, null, null, null, null, null),
  entry('alex_debon', 'Àlex Debón', ['alex debon', 'àlex debón', 'debon'], ['motogp'], 'legend', '250 GP winner', "Àlex Debón won 250 GPs — Spanish privateer-speed energy.", ['aggressive'], ['cult_hero']),
  entry('roberto_rolfo', 'Roberto Rolfo', ['roberto rolfo', 'rolfo'], ['motogp', 'ssp'], 'legend', '250 GP winner', "Roberto Rolfo won at 250 level and later raced Supersport — Italian career depth.", ['smooth'], ['cult_hero']),
  entry('sebastian_porto', 'Sebastián Porto', ['sebastian porto', 'sebastián porto', 'porto'], ['motogp'], 'legend', '250 GP winner', "Sebastián Porto won 250 GPs — Argentine attack in the two-stroke twilight.", ['aggressive'], ['cult_hero']),
  entry('hiroshi_aoyama', 'Hiroshi Aoyama', ['hiroshi aoyama', 'aoyama'], ['motogp'], 'legend', '2009 250cc world champion', "Hiroshi Aoyama was the last 250cc world champion in 2009 — end of an era, Japanese title.", ['smooth'], ['champion']),
  entry('alvaro_bautista_125', null, null, null, null, null, null),
  entry('thomas_luthi', 'Thomas Lüthi', ['thomas luthi', 'thomas lüthi', 'luthi', 'lüthi'], ['motogp', 'moto2'], 'legend', '2005 125cc world champion', "Thomas Lüthi won the 2005 125 title and became a Moto2 institution. Swiss longevity.", ['smooth', 'race_craft'], ['champion']),
  entry('gabor_talmacsi', 'Gábor Talmácsi', ['gabor talmacsi', 'gábor talmácsi', 'talmacsi'], ['motogp'], 'legend', '2007 125cc world champion', "Gábor Talmácsi took the 2007 125 crown — Hungary's world champion.", ['aggressive'], ['champion']),
  entry('mike_di_meglio_125', null, null, null, null, null, null),
  entry('julian_simon', 'Julián Simón', ['julian simon', 'julián simón', 'simon 125'], ['motogp'], 'legend', '2009 125cc world champion', "Julián Simón won the 2009 125 title — Spanish small-class excellence.", ['smooth'], ['champion']),
  entry('nico_terol', 'Nicolás Terol', ['nicolas terol', 'nicolás terol', 'nico terol', 'terol'], ['motogp'], 'legend', '2011 125cc world champion', "Nicolás Terol was the last 125cc world champion in 2011 — end of the two-stroke age.", ['smooth', 'race_craft'], ['champion']),
  entry('andrea_dovizioso_125', null, null, null, null, null, null),
  entry('dani_pedrosa_125', null, null, null, null, null, null),
  entry('casey_stoner_tag', null, null, null, null, null, null),
  entry('jorge_lorenzo_tag', null, null, null, null, null, null),
  entry('marc_marquez_tag', null, null, null, null, null, null),
  entry('joan_mir_tag', null, null, null, null, null, null),
  entry('fabio_quartararo_tag', null, null, null, null, null, null),
  entry('francesco_bagnaia_tag', null, null, null, null, null, null),
  entry('jorge_martin_tag', null, null, null, null, null, null),
  entry('jack_miller_tag', null, null, null, null, null, null),

  // —— Classic / historic racing ——
  entry('troy_corser_tag', null, null, null, null, null, null),
  entry('jeremy_mcwilliams_tag', null, null, null, null, null, null),
  entry('ron_haslam', 'Ron Haslam', ['ron haslam', 'rocket ron'], ['motogp', 'classic', 'tt'], 'legend', 'GP star + TT', "Rocket Ron Haslam — GP front-runner, TT racer, British institution. Leon's dad.", ['brave', 'aggressive'], ['british_legend']),
  entry('joey_dunlop_classic', null, null, null, null, null, null),
  entry('gaylard', 'Peter Williams', ['peter williams norton'], ['tt', 'classic'], 'legend', 'TT winner + Norton legend', "Peter Williams won TTs and shaped Norton race engineering — rider-engineer mythos.", ['technical', 'brave'], ['classic_legend']),
  entry('john_cooper', 'John Cooper', ['john cooper motorcycle'], ['classic', 'tt'], 'legend', 'Transatlantic / classic winner', "John Cooper was a British short-circuit terror of the classic era — feature-race destroyer.", ['aggressive'], ['classic_legend']),
  entry('percy_tait', 'Percy Tait', ['percy tait'], ['classic', 'tt'], 'legend', 'TT winner + Triumph tester', "Percy Tait won TTs and developed Triumphs — factory rider in the classic sense.", ['versatile'], ['classic_legend']),
  entry('chaz_davies_ssp', null, null, null, null, null, null),
  entry('cal_crutchlow_ssp', null, null, null, null, null, null),
  entry('chris_vermeulen_ssp', null, null, null, null, null, null),
  entry('sam_lowes_ssp', null, null, null, null, null, null),
  entry('sandro_cortese_ssp', null, null, null, null, null, null),
];

// Drop null sentinels and SKIP blurbs
const cleaned = additions.filter((a) => a && a.id && a.displayName && a.blurb && a.blurb !== 'SKIP');

// Tag upgrades for existing riders
const tagUpserts = [
  { id: 'crutchlow', series: ['ssp'] },
  { id: 'bautista_era_davies', series: ['ssp'] },
  { id: 'mclaren_mclaren', series: ['ssp'] }, // Chris Vermeulen
  { id: 'sam_lowes', series: ['ssp'] },
  { id: 'sandro_cortese', series: ['ssp'] },
  { id: 'can_oncu', series: ['ssp'] },
  { id: 'gardner', series: ['suzuka'] },
  { id: 'beattie', series: ['suzuka'] },
  { id: 'edwards', series: ['suzuka'] },
  { id: 'rossi', series: ['suzuka'] },
  { id: 'rea', series: ['suzuka'] },
  { id: 'aaron_slight', series: ['suzuka'] },
  { id: 'ukawa', series: ['suzuka', 'endurance'] },
  { id: 'tohru_ukawa', series: ['suzuka', 'endurance'] },
  { id: 'kiyonari', series: ['suzuka', 'endurance'] },
  { id: 'ryuichi_kiyonari', series: ['suzuka', 'endurance'] },
  { id: 'haslam', series: ['suzuka'] },
  { id: 'leon_haslam', series: ['suzuka'] },
  { id: 'fogarty', series: ['tt'] },
  { id: 'hailwood', series: ['classic'] },
  { id: 'agostini', series: ['tt', 'classic'] },
  { id: 'doohan', series: ['suzuka'] },
  { id: 'mamola', series: ['classic'] },
  { id: 'spencer', series: ['classic'] },
  { id: 'roberts', series: ['classic'] },
  { id: 'lawson', series: ['classic', 'suzuka'] },
  { id: 'rainey', series: ['classic', 'suzuka'] },
  { id: 'schwantz', series: ['classic'] },
  { id: 'pedrosa', series: ['moto3'] }, // 125/250 - close enough pathway
  { id: 'lorenzo_era_pedrosa_steyn', series: ['moto3'] }, // dovizioso 125
  { id: 'bautista', series: ['moto3'] }, // 125 champ
];

let added = 0;
let skipped = 0;
for (const a of cleaned) {
  const nameKey = a.displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (existingIds.has(a.id) || existingNames.has(nameKey)) {
    skipped += 1;
    continue;
  }
  riders.push(a);
  existingIds.add(a.id);
  existingNames.add(nameKey);
  added += 1;
}

let tagged = 0;
for (const t of tagUpserts) {
  const r = riders.find((x) => x.id === t.id);
  if (!r) continue;
  for (const s of t.series) {
    if (!r.series.includes(s)) {
      r.series.push(s);
      tagged += 1;
    }
  }
}

writeFileSync(path, JSON.stringify(riders, null, 2) + '\n');
console.log(JSON.stringify({ total: riders.length, added, skipped, tagged }, null, 2));
