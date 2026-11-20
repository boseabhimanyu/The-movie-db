import { redirect } from "next/navigation";

import api from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import AuthPortal, { AuthMode } from "@/components/auth/auth-portal";

type SettingsResponse = {
  registration_enabled: boolean;
  login_hint: string;
};

interface LoginPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const [{ mode }, response] = await Promise.all([
    searchParams,
    api.get<SettingsResponse>("/settings"),
  ]);

  const initialMode: AuthMode = mode === "register" ? "register" : "login";

  return (
    <main className="min-h-screen bg-zinc-950">
      <AuthPortal
        loginHint={response.data.login_hint}
        registrationEnabled={response.data.registration_enabled}
        initialMode={initialMode}
      />
    </main>
  );
}