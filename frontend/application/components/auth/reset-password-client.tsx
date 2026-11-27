"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Loader2,
  Lock,
  MailWarning,
  ShieldCheck,
  X,
} from "lucide-react";

import api from "@/lib/api";

interface ResetPasswordClientProps {
  token: string;
}

type ResetPasswordResponse = {
  message?: string;
  twoFactorRequired?: boolean;
};

export default function ResetPasswordClient({
  token,
}: ResetPasswordClientProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordConfirmationState =
    confirmPassword.length === 0
      ? "empty"
      : newPassword === confirmPassword
        ? "match"
        : "mismatch";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Password reset token is missing.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    const trimmedCode = twoFactorCode.trim();
    if (twoFactorRequired && !trimmedCode) {
      setError("Enter your 6-digit authenticator code or a backup code.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<ResetPasswordResponse>(
        "/auth/reset-password",
        {
          token,
          newPassword,
          ...(twoFactorRequired ? { code: trimmedCode } : {}),
        },
      );

      if (response.data?.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTwoFactorCode("");
        return;
      }

      setMessage(
        response.data?.message ||
          "Your password has been updated. Sign in with your new password.",
      );
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTwoFactorCode("");
      setTwoFactorRequired(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ??
            "This password reset link is invalid or has expired.",
        );
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackToPassword() {
    setTwoFactorRequired(false);
    setTwoFactorCode("");
    setError("");
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Brand Header */}
      <Link
        href="/"
        className="relative z-10 mb-8 inline-flex items-center gap-2.5 text-white transition hover:opacity-90"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20">
          <Film className="h-5 w-5 stroke-[2.25]" />
        </span>
        <span className="text-lg font-bold tracking-tight">
          Cine<span className="text-amber-400">Vault</span>
        </span>
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-7 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:p-9">
        {!token ? (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <MailWarning className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Missing reset token
            </h1>

            <p className="text-sm leading-relaxed text-zinc-400">
              Open the password reset link directly from your email, or request
              a new link below.
            </p>

            <div className="w-full pt-4">
              <Link
                href="/forgot-password"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Password updated
            </h1>

            <p className="text-sm leading-relaxed text-zinc-400">{message}</p>

            <div className="w-full pt-4">
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300"
              >
                Sign in with new password
              </Link>
            </div>
          </div>
        ) : twoFactorRequired ? (
          <div>
            <div className="mb-6 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Two-factor verification
                </h1>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Enter a 6-digit authenticator code or backup code to confirm.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 text-sm text-rose-200"
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="reset-2fa-code"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Authenticator or backup code
                </label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="reset-2fa-code"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) =>
                      setTwoFactorCode(e.target.value.toUpperCase())
                    }
                    placeholder="123456 or ABCD-EFGH"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-4 pl-11 font-mono text-sm tracking-wider text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Use the 6-digit code from your authenticator app or an unused
                  single-use backup code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying & updating...
                  </>
                ) : (
                  "Verify & reset password"
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <button
                type="button"
                onClick={handleBackToPassword}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-amber-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change new password
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Set new password
                </h1>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Choose a strong password for your account.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 text-sm text-rose-200"
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-zinc-300"
                >
                  New password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-11 pl-11 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-new-password"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="confirm-new-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className={`h-12 w-full rounded-xl border bg-zinc-950/90 pr-11 pl-11 text-sm text-white placeholder:text-zinc-600 transition focus:outline-none ${
                      passwordConfirmationState === "match"
                        ? "border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                        : passwordConfirmationState === "mismatch"
                          ? "border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
                          : "border-white/10 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
                    }`}
                  />
                  {passwordConfirmationState === "match" && (
                    <Check
                      className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-emerald-400"
                      aria-hidden="true"
                    />
                  )}
                  {passwordConfirmationState === "mismatch" && (
                    <X
                      className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-rose-400"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-zinc-400 underline underline-offset-4 transition hover:text-amber-300"
              >
                Link expired? Request a new reset link
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}