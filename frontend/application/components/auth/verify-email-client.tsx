"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Film,
  Loader2,
  MailWarning,
  Send,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";

interface VerifyEmailClientProps {
  token: string;
  isLoggedIn: boolean;
}

type VerifyStatus = "missing" | "verifying" | "success" | "error";

export default function VerifyEmailClient({
  token,
  isLoggedIn,
}: VerifyEmailClientProps) {
  const [status, setStatus] = useState<VerifyStatus>(
    token ? "verifying" : "missing",
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState("");
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token || hasAttempted.current) return;
    hasAttempted.current = true;

    async function verify() {
      try {
        const res = await api.post<{ message: string; emailVerified: boolean }>(
          "/auth/verify-email",
          { token },
        );
        setStatus("success");
        setMessage(
          res.data?.message || "Your email address has been verified.",
        );
      } catch (err) {
        setStatus("error");
        if (axios.isAxiosError(err)) {
          setMessage(
            err.response?.data?.error ??
              "This verification link is invalid or has expired.",
          );
        } else {
          setMessage("Unable to connect to the server.");
        }
      }
    }

    verify();
  }, [token]);

  async function handleResend() {
    setResending(true);
    setResendFeedback("");

    try {
      const res = await api.post<{ message: string }>(
        "/auth/send-verification-email",
      );
      setResendFeedback(
        res.data?.message || "A new verification link has been sent to your email.",
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setResendFeedback(
          err.response?.data?.error ?? "Unable to resend verification email.",
        );
      } else {
        setResendFeedback("Unable to connect to the server.");
      }
    } finally {
      setResending(false);
    }
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
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-7 text-center shadow-2xl shadow-black/60 backdrop-blur-2xl sm:p-9">
        {status === "verifying" && (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Verifying your email
            </h1>
            <p className="text-sm text-zinc-400">
              Confirming your verification token, just a moment...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Email verified
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">{message}</p>

            <div className="w-full pt-4">
              <Link
                href={isLoggedIn ? "/" : "/login"}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300"
              >
                {isLoggedIn ? "Continue to CineVault" : "Sign in to your account"}
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Verification failed
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">{message}</p>

            {resendFeedback && (
              <div className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-xs text-zinc-300">
                {resendFeedback}
              </div>
            )}

            <div className="flex w-full flex-col gap-3 pt-4">
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {resending ? "Sending new link..." : "Resend verification email"}
                </button>
              )}

              <Link
                href={isLoggedIn ? "/" : "/login"}
                className={`flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
                  isLoggedIn
                    ? "border border-white/10 bg-zinc-950/80 text-zinc-200 hover:bg-zinc-800"
                    : "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/15 hover:bg-amber-300"
                }`}
              >
                {isLoggedIn ? "Back to home" : "Back to sign in"}
              </Link>
            </div>
          </div>
        )}

        {status === "missing" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <MailWarning className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Missing verification token
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Please open the verification link directly from the email we sent
              you.
            </p>

            {resendFeedback && (
              <div className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-xs text-zinc-300">
                {resendFeedback}
              </div>
            )}

            <div className="flex w-full flex-col gap-3 pt-4">
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {resending ? "Sending new link..." : "Send verification email"}
                </button>
              )}

              <Link
                href={isLoggedIn ? "/" : "/login"}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 px-5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                {isLoggedIn ? "Back to home" : "Back to sign in"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}