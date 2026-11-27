/** Loyalty access requires both contact channels to have been verified. */
export function loyaltyContactsVerified(user: { emailVerified: Date | null; phone: string | null; phoneVerifiedAt: Date | null }) {
  return Boolean(user.emailVerified && user.phone && user.phoneVerifiedAt);
}
