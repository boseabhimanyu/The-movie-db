"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";
import api from "@/lib/api";
import { useNotification } from "@/components/notifications/notification-provider";

type MenuMaxDepth = {
  top: number;
  left: number;
  bottom: number;
};

type Settings = {
  registration_enabled: boolean;
  two_factor_enabled: boolean;
  login_with_primary_email: boolean;
  login_with_username: boolean;
  login_with_phone: boolean;
  unverified_max_reviews: number;
  menu_max_depth: MenuMaxDepth;
};

const defaultSettings: Settings = {
  registration_enabled: false,
  two_factor_enabled: false,
  login_with_primary_email: false,
  login_with_username: false,
  login_with_phone: false,
  unverified_max_reviews: 3,
  menu_max_depth: {
    top: 1,
    left: 1,
    bottom: 1,
  },
};

const REVIEW_LIMIT_PRESETS = [0, 1, 2, 3, 5, 10, 20, 50];

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ??
      error.response?.data?.message ??
      fallback
    );
  }

  return fallback;
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-4 backdrop-blur-xl transition-all ${
        enabled
          ? "border-green-200/80 bg-green-50/60"
          : "border-red-200/80 bg-red-50/60"
      }`}
    >
      <div className="min-w-0">
        <p
          className={`text-sm font-medium ${
            enabled
              ? "text-green-900"
              : "text-red-900"
          }`}
        >
          {label}
        </p>

        {description && (
          <p
            className={`mt-1 text-sm ${
              enabled
                ? "text-green-800/70"
                : "text-red-800/70"
            }`}
          >
            {description}
          </p>
        )}
      </div>

      <Switch
        checked={enabled}
        onChange={onChange}
        aria-label={label}
        className={`group relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
          enabled
            ? "bg-green-500/80"
            : "bg-red-400/80"
        }`}
      >
        <span
          className={`inline-block size-6 rounded-full bg-white shadow-md transition-transform ${
            enabled
              ? "translate-x-7"
              : "translate-x-1"
          }`}
        />
      </Switch>
    </div>
  );
}

function MenuDepthSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            Number(event.target.value),
          )
        }
        className="mt-2 h-11 w-full rounded-xl border border-white/70 bg-white/60 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-white focus:ring-2 focus:ring-white/60"
      >
        {[1, 2, 3, 4, 5].map(
          (depth) => (
            <option
              key={depth}
              value={depth}
            >
              {depth}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

export default function SettingsPage() {
  const { showNotification } =
    useNotification();

  const [settings, setSettings] =
    useState<Settings>(
      defaultSettings,
    );

  const [
    originalSettings,
    setOriginalSettings,
  ] = useState<Settings>(
    defaultSettings,
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response =
          await api.get<Settings>(
            "/admin/settings",
          );

        const loaded: Settings = {
          ...defaultSettings,
          ...response.data,
          unverified_max_reviews:
            typeof response.data?.unverified_max_reviews === "number"
              ? response.data.unverified_max_reviews
              : defaultSettings.unverified_max_reviews,
        };

        setSettings(loaded);
        setOriginalSettings(loaded);
      } catch (error) {
        showNotification(
          getErrorMessage(
            error,
            "Unable to load settings.",
          ),
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [showNotification]);

  function updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateMenuDepth(
    key: keyof MenuMaxDepth,
    value: number,
  ) {
    setSettings((current) => ({
      ...current,
      menu_max_depth: {
        ...current.menu_max_depth,
        [key]: value,
      },
    }));
  }

  function handleUnverifiedMaxReviewsChange(rawValue: string) {
    if (rawValue === "") {
      updateSetting("unverified_max_reviews", 0);
      return;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    updateSetting("unverified_max_reviews", Math.max(0, parsed));
  }

  function handleCancel() {
    setSettings(
      originalSettings,
    );
  }

  async function handleSave() {
    setSaving(true);

    try {
      const payload: Settings = {
        ...settings,
        unverified_max_reviews: Math.max(
          0,
          Math.floor(settings.unverified_max_reviews || 0),
        ),
      };

      const response =
        await api.patch(
          "/admin/settings",
          payload,
        );

      const updatedSettings: Settings = {
        ...payload,
        ...(response.data ?? {}),
      };

      setSettings(updatedSettings);
      setOriginalSettings(
        updatedSettings,
      );

      showNotification(
        response.data?.message ??
          "Settings updated successfully.",
        "success",
      );
    } catch (error) {
      showNotification(
        getErrorMessage(
          error,
          "Unable to update settings.",
        ),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="glass rounded-3xl p-6">
          <p className="text-sm text-zinc-600">
            Loading settings...
          </p>
        </div>
      </main>
    );
  }

  const isPresetValue = REVIEW_LIMIT_PRESETS.includes(
    settings.unverified_max_reviews,
  );

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Settings
        </h1>

        <p className="mt-1 text-sm text-zinc-600">
          Manage application settings.
        </p>
      </div>

      <div className="space-y-6">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">
              Registration
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Control whether new users can register.
            </p>
          </div>

          <div className="mt-5">
            <ToggleRow
              label="Registration"
              description="Allow new users to create an account."
              enabled={
                settings.registration_enabled
              }
              onChange={(value) =>
                updateSetting(
                  "registration_enabled",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">
              Login methods
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Choose which identifiers users can use to
              sign in.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <ToggleRow
              label="Primary email"
              enabled={
                settings.login_with_primary_email
              }
              onChange={(value) =>
                updateSetting(
                  "login_with_primary_email",
                  value,
                )
              }
            />

            <ToggleRow
              label="Username"
              enabled={
                settings.login_with_username
              }
              onChange={(value) =>
                updateSetting(
                  "login_with_username",
                  value,
                )
              }
            />

            <ToggleRow
              label="Phone"
              enabled={
                settings.login_with_phone
              }
              onChange={(value) =>
                updateSetting(
                  "login_with_phone",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">
              Two-factor authentication
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Control whether two-factor authentication is
              enabled for the application.
            </p>
          </div>

          <div className="mt-5">
            <ToggleRow
              label="Two-factor authentication"
              description="Enable the application's 2FA configuration."
              enabled={
                settings.two_factor_enabled
              }
              onChange={(value) =>
                updateSetting(
                  "two_factor_enabled",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">
              Unverified account limits
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Set the maximum number of reviews a user can submit before
              verifying their email address.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">
                Quick preset
              </span>

              <select
                value={
                  isPresetValue
                    ? String(settings.unverified_max_reviews)
                    : "custom"
                }
                onChange={(event) => {
                  const val = event.target.value;
                  if (val !== "custom") {
                    updateSetting(
                      "unverified_max_reviews",
                      Number(val),
                    );
                  }
                }}
                className="mt-2 h-11 w-full rounded-xl border border-white/70 bg-white/60 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-white focus:ring-2 focus:ring-white/60"
              >
                {REVIEW_LIMIT_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset === 0
                      ? "0 (Require verification first)"
                      : `${preset} ${preset === 1 ? "review" : "reviews"}`}
                  </option>
                ))}
                {!isPresetValue && (
                  <option value="custom">
                    Custom ({settings.unverified_max_reviews})
                  </option>
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">
                Max reviews (manual entry)
              </span>

              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={settings.unverified_max_reviews}
                onChange={(event) =>
                  handleUnverifiedMaxReviewsChange(
                    event.target.value,
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-white/70 bg-white/60 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-white focus:ring-2 focus:ring-white/60"
              />
            </label>
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">
              Menu depth
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Set the maximum nesting depth for each menu
              position.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MenuDepthSelect
              label="Top"
              value={
                settings.menu_max_depth.top
              }
              onChange={(value) =>
                updateMenuDepth(
                  "top",
                  value,
                )
              }
            />

            <MenuDepthSelect
              label="Left"
              value={
                settings.menu_max_depth.left
              }
              onChange={(value) =>
                updateMenuDepth(
                  "left",
                  value,
                )
              }
            />

            <MenuDepthSelect
              label="Bottom"
              value={
                settings.menu_max_depth.bottom
              }
              onChange={(value) =>
                updateMenuDepth(
                  "bottom",
                  value,
                )
              }
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="h-11 rounded-xl border border-white/80 bg-white/60 px-5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-lg shadow-black/10 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </div>
    </main>
  );
}