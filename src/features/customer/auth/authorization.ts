import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/features/admin/auth/options";
import { loyaltyContactsVerified } from "@/features/customer/loyalty/eligibility";
import { LoyaltyStatus, UserStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import type { StoreLocale } from "@/lib/i18n/config";

export async function getCurrentCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return db.customerProfile.findFirst({
    where: { userId: session.user.id, user: { status: UserStatus.ACTIVE } },
    include: { user: true, loyaltyMembership: true },
  });
}

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) throw new Error("Customer authentication required");
  return customer;
}

export async function requireCustomerPage(locale: StoreLocale, next = `/${locale}/account`) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
  return customer;
}

export function hasActiveLoyalty(customer: Awaited<ReturnType<typeof getCurrentCustomer>>) {
  const membership = customer?.loyaltyMembership;
  return Boolean(
    membership?.status === LoyaltyStatus.ACTIVE &&
      (!membership.expiresAt || membership.expiresAt > new Date()) &&
      customer && loyaltyContactsVerified(customer.user),
  );
}

export async function getCustomerPricingContext() {
  const customer = await getCurrentCustomer();
  return { customerId: customer?.id ?? null, loyaltyEligible: hasActiveLoyalty(customer) };
}
