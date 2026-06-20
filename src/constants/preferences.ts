import type { Ionicons } from '@expo/vector-icons';

export type RidePref = { id: string; label: string; icon: keyof typeof Ionicons.glyphMap };

/** Comfort / accessibility preferences a rider can request for a trip. */
export const RIDE_PREFS: RidePref[] = [
  { id: 'quiet', label: 'Quiet ride', icon: 'volume-mute' },
  { id: 'bags', label: 'Help with bags', icon: 'bag-handle' },
  { id: 'accessible', label: 'Wheelchair accessible', icon: 'accessibility' },
  { id: 'pet', label: 'Pet on board', icon: 'paw' },
];

export function prefLabels(ids: string[]): string {
  return ids
    .map((id) => RIDE_PREFS.find((p) => p.id === id)?.label ?? id)
    .join(' · ');
}
