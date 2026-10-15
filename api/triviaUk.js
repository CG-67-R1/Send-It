/**
 * UK trivia for the UK app only. Facts are from the UK pack catalog
 * (circuits, corner names, ACU / SACU / MCUI) or the sourced 2026 UK rounds
 * already in the calendar files. No Australian questions and no invented clauses.
 */

function q(question, correct, wrongs, joke, rating) {
  const options = [correct, ...wrongs.slice(0, 3), joke].filter((s) => typeof s === 'string' && s.length > 0);
  return {
    question,
    options,
    correct_index: 0,
    difficulty_rating: rating,
    difficulty: rating <= 4 ? 'easy' : 'hard',
    source: 'uk-pack',
  };
}

export const UK_TRIVIA = [
  q('What does ACU stand for in British motorcycle sport?', 'Auto-Cycle Union', ['Australian Cycling Union', 'Auto Club United', 'Association of Circuit Users'], 'A Cup of Tea, Usually', 1),
  q('Which body publishes the Standing Regulations for UK short-circuit road racing?', 'Auto-Cycle Union', ['Motorcycling Australia', 'Motorsport UK', 'MCRCB only'], 'The pie stall at the paddock gate', 2),
  q('What does BSB stand for?', 'British Superbike Championship', ['British Sidecar Brigade', 'Bikes of Southern Britain', 'British Speedway Board'], 'Brilliantly Slippery Bend', 1),
  q('Which spelling does the UK pack use for the rubber on the wheel?', 'Tyre', ['Tire', 'Tyre-wheel', 'Slick only'], 'Round black surprise', 1),
  q('Which organisation applies standing regulations for motorcycle sport in Scotland?', 'SACU', ['MCUI', 'Motorcycling Australia', 'DMV'], 'The local haggis inspector', 3),
  q('Which body applies regulations for motorcycle events in Northern Ireland?', 'MCUI Ulster Centre', ['SACU', 'Motorcycling Australia', 'ACU England only'], 'The ferry timetable', 3),
  q('Which of these is a public-road event with its own regulations, not a standard ACU short circuit?', 'Isle of Man TT', ['Brands Hatch GP', 'Snetterton 300', 'Oulton Park International'], 'The queue for the clubhouse kettle', 2),
  q('Where is the British MotoGP round held?', 'Silverstone', ['Phillip Island', 'Assen', 'Donington Park'], 'A retail park roundabout', 2),
  q('Where is the UK round of WorldSBK held on the sourced 2026 calendar?', 'Donington Park', ['Silverstone', 'Cadwell Park', 'Phillip Island'], 'The office car park', 3),
  q('What is Turn 1 at Brands Hatch called in the UK track catalog?', 'Paddock Hill Bend', ['Redgate', 'Copse', 'Old Hall'], 'The bit with the burger van', 2),
  q('What is Turn 2 at Brands Hatch called?', 'Druids', ['Druids at Oulton Park', 'Graham Hill Bend', 'Clearways'], 'A stone circle detour', 3),
  q('Which way is the Brands Hatch Grand Prix circuit raced in the catalog?', 'Clockwise', ['Anticlockwise', 'Either way each session', 'Figure-eight'], 'Towards the nearest cafe', 2),
  q('What is Turn 1 at Donington Park called?', 'Redgate', ['Paddock Hill Bend', 'Copse', 'Gerards'], 'The car-boot sale', 2),
  q('What is the downhill sweeper after Hollywood at Donington called?', 'Craner Curves', ['Coppice', 'Old Hairpin', 'Starkey\'s Bridge'], 'A very steep driveway', 4),
  q('What is Turn 1 on the Silverstone National layout called?', 'Copse', ['Maggotts', 'Woodcote', 'Luffield'], 'The gift shop', 3),
  q('Which circuit in the UK release set is in Scotland?', 'Knockhill', ['Anglesey', 'Thruxton', 'Mallory Park'], 'The one behind the castle gift shop', 2),
  q('Which circuit in the UK release set is in Wales?', 'Anglesey (Trac Môn)', ['Knockhill', 'Cadwell Park', 'Snetterton'], 'The one in the caravan park', 2),
  q('What is Turn 1 at Snetterton 300 called?', 'Riches', ['Montreal', 'Coram', 'Murrays'], 'The budget straight', 3),
  q('What is Turn 1 at Oulton Park called?', 'Old Hall', ['Cascades', 'Lodge', 'Knickerbrook'], 'The National Trust entrance', 3),
  q('What is Turn 1 at Mallory Park called?', 'Gerards', ['Edwina\'s', 'Shaw\'s', 'Devil\'s Elbow'], 'The lakeside picnic', 3),
  q('What is Turn 1 at Knockhill called?', 'Duffus Dip', ['Leslie\'s', 'The Hairpin', 'Clark\'s'], 'The dip in the access road', 4),
  q('About how long is the Knockhill International layout in the catalog?', '2.09 km', ['4.45 km', '5.8 km', '8 km'], 'Long enough for a cup of tea', 4),
];
