/**
 * Persists the room snapshot (from Submit my ratings) in localStorage for the guest profile preview.
 */

const STORAGE_KEY = "five-stars-only:profile-room-sticker-v1";
const MAX_CHARS = 4_800_000;

export function readProfileRoomSticker(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !raw.startsWith("data:image/")) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeProfileRoomSticker(dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl.length > MAX_CHARS) return;
    localStorage.setItem(STORAGE_KEY, dataUrl);
  } catch {
    // quota / private mode
  }
}

export function clearProfileRoomSticker(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
