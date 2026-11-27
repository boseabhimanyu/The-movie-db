import ResetPasswordClient from "@/components/auth/reset-password-client";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-zinc-950">
      <ResetPasswordClient token={token?.trim() ?? ""} />
    </main>
  );
}