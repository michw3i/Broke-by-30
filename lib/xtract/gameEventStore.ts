import type { GameCard } from "@/types/game";

const QUEUED_EVENT_KEY = "broke-by-30:queued-xtract-event";

function isQueuedGameEvent(value: unknown): value is GameCard {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<GameCard>;
  return event.kind === "news" && typeof event.id === "string" && typeof event.title === "string" && typeof event.body === "string" && Array.isArray(event.options) && event.options.length > 0 && event.options.every((option) => typeof option?.label === "string" && typeof option.cash === "number" && typeof option.net === "number" && typeof option.debt === "number" && typeof option.note === "string");
}

export function queueXtractGameEvent(event: GameCard) {
  window.localStorage.setItem(QUEUED_EVENT_KEY, JSON.stringify(event));
}

export function readQueuedXtractGameEvent(): GameCard | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(QUEUED_EVENT_KEY) ?? "null");
    return isQueuedGameEvent(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearQueuedXtractGameEvent() {
  window.localStorage.removeItem(QUEUED_EVENT_KEY);
}
