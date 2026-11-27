"use client";

import axios from "axios";
import Link from "next/link";
import QRCode from "qrcode";
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import api from "@/lib/api";
import { useNotification } from "@/components/notifications/notification-provider";

type SecurityFormProps = {
  twoFactorEnabled: boolean;
};

type SetupResponse = {
  message: string;
  otpauthUrl: string;
  secret: string;
};

type VerifySetupResponse = {
  backupCodes: string[];
  backupCodesLow: boolean;
  backupCodesRemaining: number;
  message: string;
  twoFactorEnabled: boolean;
};

type DisableResponse = {
  message: string;
  twoFactorEnabled: boolean;
};

type PasswordResponse = {
  message: string;
};

type BackupCodesResponse = {
  backupCodes: string[];
  backupCodesLow: boolean;
  backupCodesRemaining: number;
  message: string;
};

const primaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-950 px-5 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function SecurityFormCore({
  twoFactorEnabled: initialTwoFactorEnabled,
}: SecurityFormProps) {
  const { showNotification } = useNotification();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    initialTwoFactorEnabled,
  );

  const [platformTwoFactorEnabled, setPlatformTwoFactorEnabled] =
    useState(true);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Two-factor authentication setup
  const [setupStarted, setSetupStarted] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Two-factor authentication disable
  const [disableMode, setDisableMode] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Initial backup codes
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  const [capsLockOn, setCapsLockOn] = useState(false);

  // Backup code regeneration
  const [showBackupCodeRegeneration, setShowBackupCodeRegeneration] =
    useState(false);
  const [backupCodeVerification, setBackupCodeVerification] = useState("");
  const [backupCodeRegenerationLoading, setBackupCodeRegenerationLoading] =
    useState(false);
  const [backupCodeRegenerationError, setBackupCodeRegenerationError] =
    useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

    useEffect(() => {
    let cancelled = false;

    api
      .get<{ two_factor_enabled?: boolean }>("/auth/settings")
      .then((res) => {
        if (
          !cancelled &&
          typeof res.data?.two_factor_enabled === "boolean"
        ) {
          setPlatformTwoFactorEnabled(res.data.two_factor_enabled);
        }
      })
      .catch(() => {
        // Keep default true if settings cannot be fetched
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Generate QR code for authenticator setup
  useEffect(() => {
    if (!otpauthUrl) {
      setQrCode("");
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(otpauthUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrCode(url);
      })
      .catch(() => {
        if (!cancelled) setQrCode("");
      });

    return () => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordMessage(
        "New password and re-entered password do not match.",
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await api.patch<PasswordResponse>("/auth/password", {
        currentPassword,
        newPassword,
      });

      showNotification(
        response.data?.message ?? "Password changed successfully.",
        "success",
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          error.response?.data?.message ?? error.response?.data?.error;

        showNotification(
          backendMessage ?? "Unable to change password.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  async function startTwoFactorSetup() {
    setTwoFactorLoading(true);

    try {
      const response = await api.post<SetupResponse>("/auth/2fa/setup");
      setOtpauthUrl(response.data.otpauthUrl);
      setSecret(response.data.secret);
      setSetupStarted(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.message ??
            error.response?.data?.error ??
            "Unable to start two-factor authentication.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function verifyTwoFactorSetup() {
    setTwoFactorLoading(true);

    try {
      const response = await api.post<VerifySetupResponse>(
        "/auth/2fa/verify-setup",
        { code: setupCode.trim() },
      );

      setTwoFactorEnabled(response.data.twoFactorEnabled);
      setBackupCodes(response.data.backupCodes);
      setShowBackupCodes(true);
      setCopied(false);

      setSetupStarted(false);
      setSetupCode("");
      setOtpauthUrl("");
      setSecret("");
      setQrCode("");

      showNotification(
        response.data.message ??
          "Two-factor authentication enabled successfully.",
        "success",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.message ??
            error.response?.data?.error ??
            "Unable to verify two-factor authentication.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function disableTwoFactor() {
    setTwoFactorLoading(true);

    try {
      const response = await api.post<DisableResponse>("/auth/2fa/disable", {
        code: disableCode.trim(),
      });

      setTwoFactorEnabled(response.data.twoFactorEnabled);
      setDisableMode(false);
      setDisableCode("");

      showNotification(
        response.data.message ??
          "Two-factor authentication disabled successfully.",
        "success",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.message ??
            error.response?.data?.error ??
            "Unable to disable two-factor authentication.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function copySetupSecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      window.setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      setSecretCopied(false);
    }
  }

  async function copyBackupCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function closeBackupCodes() {
    setShowBackupCodes(false);
    setBackupCodes([]);
    setCopied(false);
  }

  function handlePasswordKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  function handlePasswordKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  async function handleBackupCodeRegeneration(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBackupCodeRegenerationError("");

    const code = backupCodeVerification.trim();
    if (!code) {
      setBackupCodeRegenerationError(
        "Enter your authenticator code or backup code.",
      );
      return;
    }

    setBackupCodeRegenerationLoading(true);

    try {
      const response = await api.post<BackupCodesResponse>(
        "/auth/2fa/backup-codes/regenerate",
        { code },
      );

      setNewBackupCodes(response.data.backupCodes ?? []);
      setBackupCodeVerification("");
      setShowBackupCodeRegeneration(false);

      showNotification(
        response.data.message ?? "Backup codes regenerated successfully.",
        "success",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          error.response?.data?.message ?? error.response?.data?.error;
        setBackupCodeRegenerationError(
          backendMessage ?? "Unable to regenerate backup codes.",
        );
      } else {
        setBackupCodeRegenerationError("Unable to connect to the server.");
      }
    } finally {
      setBackupCodeRegenerationLoading(false);
    }
  }

  async function handleCopyNewBackupCodes() {
    if (!newBackupCodes) return;
    try {
      await navigator.clipboard.writeText(newBackupCodes.join("\n"));
      setBackupCodesCopied(true);
      window.setTimeout(() => setBackupCodesCopied(false), 2000);
    } catch {
      setBackupCodesCopied(false);
    }
  }

  function closeNewBackupCodes() {
    setNewBackupCodes(null);
    setBackupCodesCopied(false);
  }
  return (
    <>
      {/* Top Cinema Strip Banner */}
      <div className="relative h-36 w-full overflow-hidden border-b border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 sm:h-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.08),transparent_50%)]" />
        <div className="mx-auto flex h-full max-w-[1280px] items-start justify-between px-4 pt-6 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase backdrop-blur-md">
            Account Security
          </span>

          {/* Account Sub-Navigation Pills */}
          <nav className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 p-1 backdrop-blur-md">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <UserIcon className="h-3.5 w-3.5 text-amber-400" />
              Profile
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security
            </span>
          </nav>
        </div>
      </div>

      {/* Main 2-Column Workspace (Flush Top Alignment) */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT RAIL: Security Status & Account Shortcuts */}
          <aside className="relative z-10 -mt-14 space-y-5 lg:col-span-4">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                    twoFactorEnabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  }`}
                >
                  {twoFactorEnabled ? (
                    <ShieldCheck className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6" />
                  )}
                </div>

                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">
                    Security Center
                  </h1>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      twoFactorEnabled
                        ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : "border border-amber-400/25 bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        twoFactorEnabled ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    {twoFactorEnabled ? "2FA Protected" : "2FA Not Enabled"}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                {twoFactorEnabled
                  ? "Your account is protected with a password and time-based one-time authenticator verification."
                  : "Strengthen your account against unauthorized access by enabling two-factor authentication."}
              </p>

              <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Password protection</span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Authenticator app (TOTP)</span>
                  <span
                    className={`font-medium ${
                      twoFactorEnabled ? "text-emerald-400" : "text-amber-300"
                    }`}
                  >
                    {twoFactorEnabled ? "Enabled" : "Recommended"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Cinema Library Links */}
            <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-4">
              <p className="px-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                Your Cinema Activity
              </p>
              <div className="mt-2 space-y-1">
                <Link
                  href="/bookmarks"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Bookmark className="h-4 w-4 text-amber-400" />
                    Watchlist & Bookmarks
                  </span>
                  <span className="text-zinc-500">→</span>
                </Link>
                <Link
                  href="/watched"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Eye className="h-4 w-4 text-amber-400" />
                    Watched History
                  </span>
                  <span className="text-zinc-500">→</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Modular Security Cards */}
          <div className="relative z-10 space-y-6 lg:-mt-14 lg:col-span-8">
            {/* Card 1: Password Reset */}
            <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-center gap-2.5 border-b border-white/10 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Password Management
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Update your password to keep your account secure.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <SecurityField
                  id="current-password"
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  autoComplete="current-password"
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  onKeyUp={handlePasswordKeyUp}
                  onBlur={() => setCapsLockOn(false)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <SecurityField
                    id="new-password"
                    label="New password"
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    autoComplete="new-password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                    onKeyUp={handlePasswordKeyUp}
                    onBlur={() => setCapsLockOn(false)}
                  />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="confirm-password"
                        className="text-xs font-semibold text-zinc-300"
                      >
                        Confirm new password
                      </label>
                      {passwordsMatch && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <Check className="h-3 w-3" />
                          Match
                        </span>
                      )}
                    </div>

                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={handlePasswordKeyDown}
                      onKeyUp={handlePasswordKeyUp}
                      onBlur={() => setCapsLockOn(false)}
                      className={`h-11 rounded-xl border bg-zinc-950/90 px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:ring-2 ${
                        passwordsMatch
                          ? "border-emerald-500/40 focus:border-emerald-400 focus:ring-emerald-400/20"
                          : "border-white/10 hover:border-white/20 focus:border-amber-400/60 focus:ring-amber-400/20"
                      }`}
                    />
                  </div>
                </div>

                {capsLockOn && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Caps Lock is on
                  </div>
                )}

                {passwordMessage && (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300">
                    {passwordMessage}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => !prev)}
                    className={secondaryButtonClass}
                  >
                    {showPasswords ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                        Hide Password
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 text-amber-400" />
                        Show Password
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className={primaryButtonClass}
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Card 2: Two-Factor Authentication */}
            <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Two-Factor Authentication (2FA)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Protect sign-ins with an authenticator app code.
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    twoFactorEnabled
                      ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border border-white/10 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  {twoFactorEnabled ? "Enabled" : "Off"}
                </span>
              </div>
              {!platformTwoFactorEnabled && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p>
                    2FA is turned off temporarily right now on the platform,
                    don&apos;t delete any existing authenticator app
                    setup/backup codes. It may cause account lockout. It will
                    start accepting 2FA/backup codes again once it is turned
                    back on. In case you plan to turn on 2FA right now, please keep the
                    setup configuration safe as it will be required in future.
                  </p>
                </div>
              )}

              {!twoFactorEnabled && !setupStarted && (
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="max-w-md text-xs leading-relaxed text-zinc-400">
                    Use Google Authenticator, 1Password, or Authy to generate
                    6-digit verification codes whenever you sign in.
                  </p>

                  <button
                    type="button"
                    onClick={startTwoFactorSetup}
                    disabled={twoFactorLoading}
                    className={primaryButtonClass}
                  >
                    {twoFactorLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Enable 2FA
                      </>
                    )}
                  </button>
                </div>
              )}

              {!twoFactorEnabled && setupStarted && (
                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-12">
                    {/* QR Code Box */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/90 p-5 sm:col-span-5">
                      {qrCode ? (
                        <div className="rounded-xl bg-white p-2.5 shadow-lg">
                          <img
                            src={qrCode}
                            alt="Two-factor authentication QR code"
                            className="h-44 w-44"
                          />
                        </div>
                      ) : (
                        <div className="flex h-44 w-44 items-center justify-center text-xs text-zinc-400">
                          Generating QR...
                        </div>
                      )}
                      <span className="mt-3 text-center text-[11px] text-zinc-400">
                        Scan with your authenticator app
                      </span>
                    </div>

                    {/* Manual Key + Verification Input */}
                    <div className="flex flex-col justify-between space-y-4 sm:col-span-7">
                      <div>
                        <p className="text-xs font-semibold text-zinc-300">
                          Or enter setup key manually
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5">
                          <code className="overflow-x-auto font-mono text-xs tracking-wider text-amber-300">
                            {secret}
                          </code>
                          <button
                            type="button"
                            onClick={copySetupSecret}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
                          >
                            {secretCopied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                        <SecurityField
                          id="setup-code"
                          label="Enter 6-digit verification code"
                          value={setupCode}
                          inputMode="numeric"
                          placeholder="000000"
                          onChange={(e) => setSetupCode(e.target.value)}
                        />

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={verifyTwoFactorSetup}
                            disabled={twoFactorLoading}
                            className={primaryButtonClass}
                          >
                            {twoFactorLoading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              "Verify & Activate"
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSetupStarted(false);
                              setSetupCode("");
                              setOtpauthUrl("");
                              setSecret("");
                              setQrCode("");
                            }}
                            className={secondaryButtonClass}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {twoFactorEnabled && !disableMode && (
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      Two-factor authentication is active on your account.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDisableMode(true)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-xs font-semibold text-red-300 transition hover:border-red-500/45 hover:bg-red-500/20"
                  >
                    Disable 2FA
                  </button>
                </div>
              )}

              {twoFactorEnabled && disableMode && (
                <div className="max-w-md space-y-4">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Enter your current 6-digit authenticator code or backup codes to turn off
                    two-factor authentication.
                  </p>

                  <SecurityField
                    id="disable-code"
                    label="Authentication code"
                    value={disableCode}
                    inputMode="numeric"
                    placeholder="000000"
                    onChange={(e) => setDisableCode(e.target.value)}
                  />

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={disableTwoFactor}
                      disabled={twoFactorLoading}
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-xs font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                    >
                      {twoFactorLoading ? "Disabling..." : "Confirm Disable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDisableMode(false);
                        setDisableCode("");
                      }}
                      className={secondaryButtonClass}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Card 3: Backup Codes (shown when 2FA is enabled) */}
            {twoFactorEnabled && (
              <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-2.5 border-b border-white/10 pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Recovery Backup Codes
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Generate a fresh set of one-time recovery codes if you lose
                      access to your authenticator device.
                    </p>
                  </div>
                </div>

                {!showBackupCodeRegeneration ? (
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <p className="text-xs text-zinc-400">
                      Regenerating invalidates all previously issued backup
                      codes immediately.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBackupCodeRegeneration(true);
                        setBackupCodeRegenerationError("");
                      }}
                      className={secondaryButtonClass}
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                      Generate New Codes
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleBackupCodeRegeneration}
                    className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5"
                  >
                    <div>
                      <h3 className="text-xs font-semibold text-white">
                        Verify your identity
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        Enter a current authenticator code or an unused backup
                        code to generate a new set.
                      </p>
                    </div>

                    <input
                      type="text"
                      value={backupCodeVerification}
                      onChange={(e) =>
                        setBackupCodeVerification(e.target.value)
                      }
                      placeholder="TOTP or backup code"
                      autoComplete="one-time-code"
                      className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                    />

                    {backupCodeRegenerationError && (
                      <p className="text-xs font-medium text-red-400">
                        {backupCodeRegenerationError}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="submit"
                        disabled={backupCodeRegenerationLoading}
                        className={primaryButtonClass}
                      >
                        {backupCodeRegenerationLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate New Codes"
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={backupCodeRegenerationLoading}
                        onClick={() => {
                          setShowBackupCodeRegeneration(false);
                          setBackupCodeVerification("");
                          setBackupCodeRegenerationError("");
                        }}
                        className={secondaryButtonClass}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Initial Setup Backup Codes Modal */}
      {showBackupCodes && (
        <BackupCodesModal
          title="Save your backup codes"
          description="Two-factor authentication is now active. Store these one-time recovery codes in a safe place—they will not be shown again."
          codes={backupCodes}
          copied={copied}
          onCopy={copyBackupCodes}
          onClose={closeBackupCodes}
        />
      )}

      {/* Regenerated Backup Codes Modal */}
      {newBackupCodes !== null && (
        <BackupCodesModal
          title="New recovery backup codes"
          description="Your previous backup codes are now invalid. Save these new codes somewhere secure before closing this window."
          codes={newBackupCodes}
          copied={backupCodesCopied}
          onCopy={handleCopyNewBackupCodes}
          onClose={closeNewBackupCodes}
        />
      )}
    </>
  );
}

function BackupCodesModal({
  title,
  description,
  codes,
  copied,
  onCopy,
  onClose,
}: {
  title: string;
  description: string;
  codes: string[];
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close backup codes"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-white/15 bg-zinc-900 p-6 text-zinc-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <KeyRound className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-zinc-400 transition hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
          {description}
        </p>

        <div className="mt-5 max-h-[45vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-3.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {codes.map((code) => (
              <div
                key={code}
                className="rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2.5 text-center font-mono text-sm tracking-wider text-amber-300"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCopy}
            className={secondaryButtonClass}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied all codes
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-amber-400" />
                Copy all codes
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className={primaryButtonClass}
          >
            I&apos;ve saved them
          </button>
        </div>
      </div>
    </div>
  );
}

type SecurityFieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
};

function SecurityField({
  id,
  label,
  type = "text",
  value,
  placeholder,
  autoComplete,
  inputMode,
  onChange,
  onKeyDown,
  onKeyUp,
  onBlur,
}: SecurityFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-zinc-300">
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
        className="h-11 rounded-xl border border-white/10 bg-zinc-950/90 px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition hover:border-white/20 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
      />
    </div>
  );
}