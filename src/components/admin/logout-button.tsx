"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return <button className="admin-logout" onClick={() => signOut({ callbackUrl: "/admin/login" })}><LogOut size={16}/> Sign out</button>;
}
