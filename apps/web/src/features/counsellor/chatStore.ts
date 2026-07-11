"use client";

import type { ChatMessage } from "./counsellorTypes";

const STORAGE_KEY = "admitwise_counsellor_chat_v1";
const MAX_MESSAGES = 50;

export function loadChat(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Strip any still-streaming messages from a previous crashed session
    return (parsed as ChatMessage[]).filter(
      (m) => m.status !== "streaming"
    );
  } catch {
    return [];
  }
}

export function saveChat(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const toSave = messages.slice(-MAX_MESSAGES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Storage quota exceeded — silently swallow
  }
}

export function clearChat(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
