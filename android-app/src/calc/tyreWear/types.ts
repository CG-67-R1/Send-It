export type TyreAxle = 'front' | 'rear';
export type WarmersUse = 'yes' | 'no' | 'unknown';
export type PhotoTakenWhen = 'hot_pit_in' | 'cooled' | 'unknown';
export type PressureUnit = 'psi' | 'kPa';

export const TYRE_AXLE_OPTIONS: { id: TyreAxle; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
];

export const WARMERS_OPTIONS: { id: WarmersUse; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unknown', label: 'Unknown' },
];

export const PHOTO_TAKEN_OPTIONS: { id: PhotoTakenWhen; label: string }[] = [
  { id: 'hot_pit_in', label: 'Hot (pit-in)' },
  { id: 'cooled', label: 'Cooled' },
  { id: 'unknown', label: 'Unknown' },
];

export const SESSION_LENGTH_OPTIONS = ['~10 min', '~15 min', '~20 min', 'Race length'] as const;

export type TyrePhotoSlotId = 'overview' | 'bandFollow' | 'macro';

export const TYRE_PHOTO_SLOTS: {
  id: TyrePhotoSlotId;
  label: string;
  required: boolean;
  tip: string;
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    required: true,
    tip: 'Whole tyre from about 45°. Centre, shoulder, and edge all visible. Same axle as the chips below.',
  },
  {
    id: 'bandFollow',
    label: 'Band follow',
    required: false,
    tip: 'Same tyre, rotated about 90–180°. Shows whether wear is a full ring or patches.',
  },
  {
    id: 'macro',
    label: 'Macro',
    required: false,
    tip: 'Optional. One groove or tear flap filling the frame. Daylight or even paddock light — avoid flash glare.',
  },
];

export type TyreWearCoachInput = {
  axle: TyreAxle;
  brandCompound: string;
  hotPressure: string;
  pressureUnit: PressureUnit;
  trackTemp: string;
  ambientTemp: string;
  sessionLength: string;
  warmers: WarmersUse;
  photoTaken: PhotoTakenWhen;
  trackName: string;
  bikeLabel: string;
  notes: string;
  photoSlots: TyrePhotoSlotId[];
};
