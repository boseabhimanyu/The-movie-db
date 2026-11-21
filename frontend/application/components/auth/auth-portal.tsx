"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

import api from "@/lib/api";

export type AuthMode = "login" | "register";

interface AuthPortalProps {
  loginHint: string;
  registrationEnabled: boolean;
  initialMode?: AuthMode;
}

type LoginResponse = {
  message: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  backupCodesLow?: boolean;
  backupCodesRemaining?: number;
};

const TOTP_REGEX = /^\d{6}$/;
const BACKUP_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function formatBackupCodeInput(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  if (cleaned.length <= 4) {
    return cleaned;
  }

  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

export default function AuthPortal({
  loginHint,
  registrationEnabled,
  initialMode = "login",
}: AuthPortalProps) {
  const [mode, setMode] = useState<AuthMode>(
    initialMode === "register" && registrationEnabled ? "register" : "login",
  );
  const [challengeToken, setChallengeToken] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // 2FA state
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Shared request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordConfirmationState =
    confirmPassword.length === 0
      ? "empty"
      : regPassword === confirmPassword
        ? "match"
        : "mismatch";

  const isTwoFactorFormatValid = useBackupCode
    ? BACKUP_CODE_REGEX.test(twoFactorCode)
    : TOTP_REGEX.test(twoFactorCode);

  function switchMode(nextMode: AuthMode) {
    if (nextMode === "register" && !registrationEnabled) return;
    setError("");
    setBannerMessage("");
    setChallengeToken("");
    setTwoFactorCode("");
    setMode(nextMode);
  }

  function finalizeSession(data: LoginResponse) {
    if (data.backupCodesLow) {
      sessionStorage.setItem(
        "backupCodesLow",
        JSON.stringify({
          remaining: data.backupCodesRemaining,
        }),
      );
    }
    window.location.href = "/";
  }

  function handleTwoFactorCodeChange(rawValue: string) {
    if (error) setError("");

    if (useBackupCode) {
      setTwoFactorCode(formatBackupCodeInput(rawValue));
    } else {
      const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 6);
      setTwoFactorCode(digitsOnly);
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBannerMessage("");
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        identifier,
        password: loginPassword,
      });

      const data = response.data;

      if (data.twoFactorRequired === true && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setTwoFactorCode("");
        setUseBackupCode(false);
        return;
      }

      finalizeSession(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? "Sign in failed");
      } else {
        setError("Unable to connect to the server");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBannerMessage("");

    if (regPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: regPassword,
      });

      setIdentifier(email.trim() || username.trim());
      setLoginPassword("");
      setRegPassword("");
      setConfirmPassword("");
      setMode("login");
      setBannerMessage(
        "Account created! Check your inbox for a verification link, or sign in now to start exploring.",
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? "Registration failed");
      } else {
        setError("Unable to connect to the server");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedCode = twoFactorCode.trim();

    if (useBackupCode) {
      if (!BACKUP_CODE_REGEX.test(normalizedCode)) {
        setError("Enter a valid backup recovery code in XXXX-XXXX format.");
        return;
      }
    } else if (!TOTP_REGEX.test(normalizedCode)) {
      setError("Enter the 6-digit numeric verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<LoginResponse>(
        "/auth/2fa/verify-login",
        {
          challengeToken,
          code: normalizedCode,
        },
      );

      finalizeSession(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? "Verification failed");
      } else {
        setError("Unable to connect to the server");
      }
    } finally {
      setLoading(false);
    }
  }

  const isTwoFactorStep = Boolean(challengeToken);

  return (
    <div className="relative flex min-h-screen w-full bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      {/* Left Cinema Showcase Panel (Desktop) */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-white/10 bg-zinc-900/60 p-12 lg:flex xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-white transition hover:opacity-90"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20">
              <Film className="h-5 w-5 stroke-[2.25]" />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Cine<span className="text-amber-400">Vault</span>
            </span>
          </Link>
        </div>

        {/* Editorial Copy */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Curated Cinema &amp; Series Discovery
          </div>

          <h2 className="text-4xl leading-tight font-bold tracking-tight text-white xl:text-5xl">
            Every frame, tracked and reviewed.
          </h2>

          <p className="text-base leading-relaxed text-zinc-400">
            Explore trending films and television across global regions, write
            in-depth reviews, and build your personal cinema journal.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">Global</p>
              <p className="mt-0.5 text-xs text-zinc-400">Regional feeds</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">4K Art</p>
              <p className="mt-0.5 text-xs text-zinc-400">Backdrops &amp; posters</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">2FA</p>
              <p className="mt-0.5 text-xs text-zinc-400">Protected accounts</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500">
          <span>Powered by Trakt &amp; Fanart.tv metadata</span>
          <Link href="/" className="text-zinc-400 transition hover:text-white">
            Browse without signing in →
          </Link>
        </div>
      </aside>

      {/* Right Interactive Auth Form Panel */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        {/* Mobile Brand Header */}
        <div className="mb-8 flex w-full max-w-lg items-center justify-between lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950">
              <Film className="h-5 w-5 stroke-[2.25]" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Cine<span className="text-amber-400">Vault</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-zinc-400 transition hover:text-white"
          >
            Explore →
          </Link>
        </div>

        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:p-9">
          {/* Mode Switcher Tabs (Hidden during 2FA challenge) */}
          {!isTwoFactorStep && (
            <div className="mb-7 grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-950/80 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`h-10 rounded-xl text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                disabled={!registrationEnabled}
                onClick={() => switchMode("register")}
                className={`h-10 rounded-xl text-sm font-medium transition ${
                  mode === "register"
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : registrationEnabled
                      ? "text-zinc-400 hover:text-white"
                      : "cursor-not-allowed text-zinc-600"
                }`}
              >
                {registrationEnabled ? "Create Account" : "Sign Up Closed"}
              </button>
            </div>
          )}

          {/* Post-Registration Success Banner */}
          {bannerMessage && !isTwoFactorStep && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-200"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{bannerMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 text-sm text-rose-200"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ==================== VIEW 1: 2-STEP VERIFICATION ==================== */}
          {isTwoFactorStep ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setChallengeToken("");
                  setTwoFactorCode("");
                  setError("");
                }}
                className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>

              <div className="mb-6 flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Two-step verification
                  </h1>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {useBackupCode
                      ? "Enter one of your single-use recovery backup codes."
                      : "Enter the 6-digit code from your authenticator app."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="twoFactorCode"
                      className="block text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      {useBackupCode ? "Backup recovery code" : "Verification code"}
                    </label>
                    <span className="font-mono text-xs text-zinc-500">
                      {useBackupCode
                        ? `${twoFactorCode.replace("-", "").length}/8`
                        : `${twoFactorCode.length}/6`}
                    </span>
                  </div>

                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="twoFactorCode"
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => handleTwoFactorCodeChange(e.target.value)}
                      inputMode={useBackupCode ? "text" : "numeric"}
                      pattern={
                        useBackupCode
                          ? "[A-Za-z0-9]{4}-[A-Za-z0-9]{4}"
                          : "\\d{6}"
                      }
                      maxLength={useBackupCode ? 9 : 6}
                      autoComplete="one-time-code"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                      autoFocus
                      required
                      className="h-13 w-full rounded-xl border border-white/10 bg-zinc-950/90 px-11 text-center font-mono text-lg tracking-[0.25em] text-white placeholder:text-center placeholder:tracking-normal placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isTwoFactorFormatValid}
                  className="h-12 w-full rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>

              <div className="mt-6 border-t border-white/10 pt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode((prev) => !prev);
                    setTwoFactorCode("");
                    setError("");
                  }}
                  className="text-xs font-medium text-zinc-400 underline underline-offset-4 transition hover:text-amber-300"
                >
                  {useBackupCode
                    ? "Use authenticator app code instead"
                    : "Lost access to your authenticator? Use a backup code"}
                </button>
              </div>
            </div>
          ) : mode === "login" ? (
            /* ==================== VIEW 2: SIGN IN ==================== */
            <div>
              <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Welcome back
                </h1>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Sign in to access your reviews, ratings, and personalized
                  feeds.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="identifier"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    {loginHint}
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                      className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-4 pl-11 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="loginPassword"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="loginPassword"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-11 pl-11 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={
                        showLoginPassword ? "Hide password" : "Show password"
                      }
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {registrationEnabled && (
                <p className="mt-6 text-center text-sm text-zinc-400">
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-medium text-amber-400 underline underline-offset-4 transition hover:text-amber-300"
                  >
                    Create an account
                  </button>
                </p>
              )}
            </div>
          ) : (
            /* ==================== VIEW 3: REGISTER ==================== */
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Create your account
                </h1>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Join to rate movies &amp; shows, write reviews, and customize
                  your feed.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DarkField
                    id="firstName"
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    autoComplete="given-name"
                    required
                  />
                  <DarkField
                    id="lastName"
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    autoComplete="family-name"
                    required
                  />
                </div>

                <DarkField
                  id="username"
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  autoComplete="username"
                  icon={<User className="h-4 w-4" />}
                  required
                />

                <DarkField
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  icon={<Mail className="h-4 w-4" />}
                  required
                />

                <DarkField
                  id="phone"
                  label="Phone (optional)"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                  icon={<Phone className="h-4 w-4" />}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="regPassword"
                      className="block text-sm font-medium text-zinc-300"
                    >
                      Password <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="regPassword"
                        type={showRegPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-10 pl-3.5 text-sm text-white focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((prev) => !prev)}
                        aria-label={
                          showRegPassword ? "Hide password" : "Show password"
                        }
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showRegPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <DarkField
                    id="confirmPassword"
                    label="Confirm password"
                    type={showRegPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    required
                    passwordMatchState={passwordConfirmationState}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-amber-400 underline underline-offset-4 transition hover:text-amber-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type DarkFieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  icon?: React.ReactNode;
  passwordMatchState?: "empty" | "match" | "mismatch";
};

function DarkField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required = false,
  icon,
  passwordMatchState = "empty",
}: DarkFieldProps) {
  const isMatch = passwordMatchState === "match";
  const isMismatch = passwordMatchState === "mismatch";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
        {label}
        {required && (
          <span className="ml-1 text-amber-400" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-500">
            {icon}
          </span>
        )}

        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className={`h-11 w-full rounded-xl border bg-zinc-950/90 text-sm text-white transition focus:outline-none ${
            icon ? "pl-10" : "pl-3.5"
          } pr-10 ${
            isMatch
              ? "border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              : isMismatch
                ? "border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
                : "border-white/10 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
          }`}
        />

        {isMatch && (
          <Check
            className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-emerald-400"
            aria-hidden="true"
          />
        )}

        {isMismatch && (
          <X
            className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-rose-400"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}