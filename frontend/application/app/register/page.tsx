import { redirect } from "next/navigation";

import api from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import AuthPortal from "@/components/auth/auth-portal";

type SettingsResponse = {
  registration_enabled: boolean;
  login_hint: string;
};

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const response = await api.get<SettingsResponse>("/settings");

  return (
    <main className="min-h-screen bg-zinc-950">
      <AuthPortal
        loginHint={response.data.login_hint}
        registrationEnabled={response.data.registration_enabled}
        initialMode="register"
      />
    </main>
  );
}