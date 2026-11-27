"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Film,
  KeyRound,
  Loader2,
  User,
  X,
} from "lucide-react";

import api from "@/lib/api";

export default function ForgotPasswordClient() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Please enter your email address or username.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<{ message: string }>(
        "/auth/forgot-password",
        { identifier: trimmed },
      );

      setMessage(
        response.data?.message ||
          "If an account matches that email or username, a password reset link has been sent to its registered email address.",
      );
      setSubmitted(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ??
            "Unable to process your password reset request.",
        );
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
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
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-7 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:p-9">
        {submitted ? (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Check your inbox
            </h1>

            <p className="text-sm leading-relaxed text-zinc-400">{message}</p>

            <div className="flex w-full flex-col gap-3 pt-4">
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300"
              >
                Back to sign in
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setError("");
                }}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 px-5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Try a different email or username
              </button>
            </div>
          </div>
        ) : (
          <div>
            <Link
              href="/login"
              className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>

            <div className="mb-6 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Forgot password
                </h1>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Enter your email or username to receive a reset link.
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
                  htmlFor="reset-identifier"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Email or username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="reset-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com or username"
                    autoComplete="username"
                    autoFocus
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-4 pl-11 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                  />
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
                    Sending reset link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}