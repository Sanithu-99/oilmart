export function normalizeSriLankanMobile(value: string) {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("94") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^7\d{8}$/.test(national)) throw new Error("Enter a valid Sri Lankan mobile number");
  return `+94${national}`;
}

export function isOtpChallengeUsable(input: { consumedAt: Date | null; expiresAt: Date; attempts: number; maxAttempts: number }, now = new Date()) {
  return !input.consumedAt && input.expiresAt > now && input.attempts < input.maxAttempts;
}
