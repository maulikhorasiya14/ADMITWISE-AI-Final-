"use client";

import { loadProfileFromStorage, saveProfileToStorage } from "@/features/profile/profileStorageCore";
import type { SavedStudentProfile } from "./profileSchema";

export function saveGuestProfile(profile: SavedStudentProfile) {
  saveProfileToStorage(window.localStorage, profile);
}

export function loadGuestProfile(): SavedStudentProfile | null {
  return loadProfileFromStorage(window.localStorage);
}
