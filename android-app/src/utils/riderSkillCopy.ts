import type { RiderAiSkill } from '../navigation/homeMode';
import type { RideActivity } from '../storage/onboarding';
import type { RiderLevel } from '../storage/trackdayPrep';
import { BIKE_SETUP_INTRO } from '../data/bikeSetupBasics';
import { TRACK_INFO_COACHING } from '../data/trackInfo/coaching';

/** Appended to Coach / Bike Setup user messages so every briefing matches how they ride. */
export function riderSkillReplyInstruction(skill: RiderAiSkill): string {
  if (skill === 'advanced') {
    return 'Reply for a club or national racer: include technical coaching and setup detail, why it works, and what to check next. Still one change at a time.';
  }
  if (skill === 'intermediate') {
    return 'Reply for an intermediate track rider: combine technique and small setup changes, and explain why. One change at a time.';
  }
  return 'Reply for a track-day or getting-into-racing rider: everyday language, short, one main focus, no jargon.';
}

/** Default Trackday Prep rider-level chip from onboarding "how you ride". */
export function trackPrepLevelFromActivity(
  activity: RideActivity | null | undefined
): RiderLevel {
  if (activity === 'race') return 'racer';
  if (activity === 'intermediate') return 'experienced';
  if (activity === 'track_days') return 'can_ride';
  return 'newbie';
}

export function trackPrepBriefingInstruction(level: RiderLevel | ''): string {
  if (level === 'racer') {
    return 'This rider races. Use race-engineer depth: session purpose, tyre windows, reference points, and what to log. Technical language is OK. Still one change at a time.';
  }
  if (level === 'experienced') {
    return 'This rider is intermediate. Give more coaching and bike-setup detail than a beginner briefing, and explain why. One focus per session.';
  }
  return 'This rider is on track days or getting into racing. Keep the briefing short and simple: everyday language, one focus per session, skip clicker counts and geometry unless they asked.';
}

export type TrackInfoCoachingCopy = {
  title: string;
  intro: string;
  points: readonly string[];
};

export function trackInfoCoachingForSkill(skill: RiderAiSkill): TrackInfoCoachingCopy {
  if (skill === 'novice') {
    return {
      title: 'Reference points — keep it simple',
      intro:
        'You do not need a racing line yet. Pick a few things you can actually see, and look at the next one before you turn.',
      points: [
        'One brake marker and one turn-in marker per corner is enough for now.',
        'Look where you want to go — through the corner, not down at the apex once you are in it.',
        'On a new track, walk or roll a lap and name what you will look at. Write those down. Speed comes later.',
      ],
    };
  }
  if (skill === 'advanced') {
    return {
      title: TRACK_INFO_COACHING.title,
      intro: TRACK_INFO_COACHING.intro,
      points: [
        ...TRACK_INFO_COACHING.points,
        'Once the three markers are stable, add trail-brake and throttle-release points, and note where the bike wants to run wide or stand up.',
      ],
    };
  }
  return TRACK_INFO_COACHING;
}

export function bikeSetupIntroForSkill(skill: RiderAiSkill): typeof BIKE_SETUP_INTRO {
  if (skill === 'novice') {
    return {
      whyBase:
        'A baseline is just a known starting point so the bike feels predictable. Set sag first if you can, then change one thing at a time.',
      capabilityCaveat:
        'Your bike may not have every adjuster on this picture. If you are not sure, ask Bike Setup AI with your make and model and keep it to one simple change.',
    };
  }
  return BIKE_SETUP_INTRO;
}

export function showDetailedSetupTips(skill: RiderAiSkill): boolean {
  return skill !== 'novice';
}
