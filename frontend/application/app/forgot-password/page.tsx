import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import ForgotPasswordClient from "@/components/auth/forgot-password-client";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <ForgotPasswordClient />
    </main>
  );
}