export const CONTACT_LIMITS = { name: 80, email: 120, message: 2000 } as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: "invalid" | "send_failed" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: unknown): ContactInput | null {
  if (typeof input !== "object" || input === null) return null;
  const { name, email, message } = input as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return null;
  }

  const clean: ContactInput = {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  };

  if (!clean.name || !clean.email || !clean.message) return null;
  if (!EMAIL_PATTERN.test(clean.email)) return null;
  if (
    clean.name.length > CONTACT_LIMITS.name ||
    clean.email.length > CONTACT_LIMITS.email ||
    clean.message.length > CONTACT_LIMITS.message
  ) {
    return null;
  }

  return clean;
}
