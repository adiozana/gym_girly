export type RepInput = number | null | "invalid";

// Text from a rep field: empty means "not set", otherwise a whole number from 1 to 999.
export function parseRepInput(text: string): RepInput {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return "invalid";
  const value = Number(trimmed);
  return value >= 1 && value <= 999 ? value : "invalid";
}
