"use client";

import { useRef, useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Loader2, ImageIcon, Upload, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { logActivity } from "@/lib/activityService";
import { useClinicBranding, BRANDING_DOC } from "@/components/ClinicLogo";

/**
 * Superadmin-only: the clinic's logo.
 *
 * One logo per clinic, stored in that clinic's own Storage bucket, so a centre
 * sees its own identity across the app instead of ours. Uploaded by us rather
 * than by the clinic: it is part of what they are sold, and it appears on the
 * signed-out login screen where nothing else is editable.
 */

/** Comfortably above any sane logo, low enough to stop someone uploading a photo. */
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export default function BrandingTab() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error } = useToast();
  const { logoUrl, logoPath, loading } = useClinicBranding();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      error(t("settings.branding.wrong_type"));
      return;
    }
    if (file.size > MAX_BYTES) {
      error(t("settings.branding.too_large"));
      return;
    }

    setBusy(true);
    try {
      // A fresh path per upload: overwriting one name would leave every cached
      // copy — browsers, service worker, any parent's open tab — on the old image.
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `branding/logo-${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);

      await setDoc(
        doc(db, "system_settings", BRANDING_DOC),
        { logoUrl: url, logoPath: path, updatedAt: serverTimestamp(), updatedBy: user?.uid || "" },
        { merge: true },
      );

      // Best-effort: the new logo is already live, so a failure here costs an
      // orphaned file, not a broken screen.
      if (logoPath && logoPath !== path) {
        deleteObject(ref(storage, logoPath)).catch(() => {});
      }

      if (user && userData) {
        logActivity({
          type: "team_member_updated",
          userId: user.uid,
          userName: userData.name || user.email || "Unknown",
          userPhotoURL: userData.photoURL || undefined,
          targetId: BRANDING_DOC,
          targetName: "logo",
          metadata: { action: "logo_updated" },
        }).catch((err) => console.error("Failed to log branding change:", err));
      }

      success(t("settings.branding.saved"));
    } catch (err) {
      console.error(err);
      error(t("settings.branding.save_error"));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await setDoc(
        doc(db, "system_settings", BRANDING_DOC),
        { logoUrl: "", logoPath: "", updatedAt: serverTimestamp(), updatedBy: user?.uid || "" },
        { merge: true },
      );
      if (logoPath) deleteObject(ref(storage, logoPath)).catch(() => {});
      success(t("settings.branding.removed"));
    } catch (err) {
      console.error(err);
      error(t("settings.branding.save_error"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t("settings.branding.title")}
          </h3>
          <p className="text-sm text-neutral-500">{t("settings.branding.subtitle")}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
          {t("settings.branding.current")}
        </p>

        <div className="flex items-center gap-6 flex-wrap">
          {/* Shown on the same neutral tile the app uses, so what you see here is
              what a clinic sees in the sidebar and on the login screen. */}
          <div className="w-20 h-20 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-2xl font-display">T</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              onClick={() => !busy && fileInput.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {logoUrl ? t("settings.branding.replace") : t("settings.branding.upload")}
            </button>

            {logoUrl && (
              <button
                onClick={() => !busy && handleRemove()}
                disabled={busy}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {t("settings.branding.remove")}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-neutral-500 mt-4">{t("settings.branding.hint")}</p>
      </div>
    </div>
  );
}
