-- AlterTable
ALTER TABLE "CustomerProfile" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LoyaltyDecisionHistory" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "LoyaltyStatus",
    "toStatus" "LoyaltyStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyDecisionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneVerificationChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyDecisionHistory_membershipId_createdAt_idx" ON "LoyaltyDecisionHistory"("membershipId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyDecisionHistory_actorId_createdAt_idx" ON "LoyaltyDecisionHistory"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_userId_createdAt_idx" ON "PhoneVerificationChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_phone_expiresAt_idx" ON "PhoneVerificationChallenge"("phone", "expiresAt");

-- AddForeignKey
ALTER TABLE "LoyaltyDecisionHistory" ADD CONSTRAINT "LoyaltyDecisionHistory_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "LoyaltyMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyDecisionHistory" ADD CONSTRAINT "LoyaltyDecisionHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneVerificationChallenge" ADD CONSTRAINT "PhoneVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
