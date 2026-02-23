import golemImage from '../assets/mining_ship_golem_pixel_120x78.png';
import prospectorImage from '../assets/mining_ship_prospector_pixel_120x78.png';
import moleImage from '../assets/mining_ship_mole_pixel_120x78_transparent.png';
import peacefrogImage from '../assets/peacefrog-favicon-64.png';

/** Avatar option IDs that can be stored in user metadata */
export type AvatarId = 'golem' | 'prospector' | 'mole' | 'rieger' | 'peacefrog' | 'custom';

export interface AvatarOption {
  id: AvatarId;
  label: string;
  src: string;
}

/** Rieger icon is in public/ directory */
const riegerImage = `${import.meta.env.BASE_URL}rieger-icon.png`;

/** Map of avatar ID to image source (excludes 'custom' which uses uploaded data) */
export const AVATAR_MAP: Partial<Record<AvatarId, string>> = {
  golem: golemImage,
  prospector: prospectorImage,
  mole: moleImage,
  rieger: riegerImage,
  peacefrog: peacefrogImage,
};

/** Ordered list of avatar options for selection UI */
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'golem', label: 'GOLEM', src: golemImage },
  { id: 'prospector', label: 'Prospector', src: prospectorImage },
  { id: 'mole', label: 'MOLE', src: moleImage },
  { id: 'rieger', label: 'Rieger', src: riegerImage },
  { id: 'peacefrog', label: 'PeaceFrog', src: peacefrogImage },
];

/** Get the image source for an avatar ID, or null if not found */
export function getAvatarSrc(avatarId: string | null): string | null {
  if (!avatarId) return null;
  return AVATAR_MAP[avatarId as AvatarId] ?? null;
}
