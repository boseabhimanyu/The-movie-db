import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth";
import SecurityFormCore from "../components/security-form";

export const metadata: Metadata = {
  title: "Security",
};

export default async function SecurityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      <SecurityFormCore twoFactorEnabled={user.twoFactorEnabled} />
    </main>
  );
}