/**
 * Central AsyncStorage key registry.
 * Keep string values stable — changing a value orphans existing device data.
 */
export const STORAGE_KEYS = {
  ONBOARDING_DONE: '@roadrace_onboarding_done',
  ONBOARDING_ANSWERS: '@roadrace_onboarding_answers',
  TRACK_WALK_SESSIONS: '@roadrace_track_walk_sessions',
  HEADLINES_PRIORITY: '@roadrace_headlines_priority',
  HEADLINES_CUSTOM_SOURCES: '@roadrace_headlines_custom_sources',
  HEADLINES_NOTIFY_PRIORITY_1: '@roadrace_headlines_notify_priority_1',
  HEADLINES_LAST_SEEN_P1_URLS: '@roadrace_headlines_last_seen_p1_urls',
  BIKE_SETUP_DAY_SHEET: '@roadrace_bike_setup_day_sheet',
  BIKE_SETUP_SESSION_HISTORY: '@roadrace_bike_setup_session_history',
  BIKE_BALANCE_STATE: '@roadrace_bike_balance_state',
  BIKE_PHOTO_URI: '@roadrace_bike_photo_uri',
  BIKE_PHOTO_REV: '@roadrace_bike_photo_rev',
  AVATAR_FACE_URI: '@roadrace_avatar_face_photo_uri',
  AVATAR_FACE_REV: '@roadrace_avatar_face_photo_rev',
  TRACK_ARRIVAL_ENABLED: '@roadrace_track_arrival_enabled',
  TRACK_ARRIVAL_STATE: '@roadrace_track_arrival_state',
  TRIVIA_BEST_SCORE: '@roadrace_trivia_best',
  TRACK_MEMORY_BEST_LAP: '@roadrace_track_memory_best_lap',
  TRACK_PREP_SELECTED_TRACK: '@roadrace_track_prep_selected_track',
  TRACKDAY_PREP_DRAFT: '@roadrace_trackday_prep_draft',
  TRACKDAY_PREP_HISTORY: '@roadrace_trackday_prep_history',
  GEARING_GUIDE_STATE: '@roadrace_gearing_guide_state',
} as const;

/** Pre-prefix trivia best-score key — migrate once then delete. */
export const LEGACY_TRIVIA_BEST_SCORE_KEY = 'ROADRACER_TRIVIA_BEST';

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
