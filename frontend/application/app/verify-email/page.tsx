import { getCurrentUser } from "@/lib/auth";
import VerifyEmailClient from "@/components/auth/verify-email-client";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const [{ token }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950">
      <VerifyEmailClient
        token={token?.trim() ?? ""}
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
}