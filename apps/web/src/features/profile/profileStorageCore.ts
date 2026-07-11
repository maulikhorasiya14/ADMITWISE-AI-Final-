import { parseStudentProfile, profileStorageKey, type SavedStudentProfile } from "./profileSchema.ts";

export type ProfileStorage = Pick<Storage, "getItem" | "setItem">;

export function saveProfileToStorage(storage: ProfileStorage, profile: SavedStudentProfile) {
  storage.setItem(profileStorageKey, JSON.stringify(profile));
}

export function loadProfileFromStorage(storage: ProfileStorage): SavedStudentProfile | null {
  const stored = storage.getItem(profileStorageKey);
  if (!stored) {
    return null;
  }

  try {
    const parsed = parseStudentProfile(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
