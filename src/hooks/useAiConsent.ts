"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// Keep in sync with CONSENT_VERSION in src/lib/assistant/gate.ts.
export const CONSENT_VERSION = "2";

/** Tracks whether the current staff user has consented to AI features.
 *  `consented` is null while loading. `grant()` records consent. */
export function useAiConsent() {
  const [consented, setConsented] = useState<boolean | null>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setConsented(false);
      return;
    }
    // Live so a grant in one component is observed by others on the next tick
    // (otherwise the first post-consent action re-opens the consent modal).
    const unsub = onSnapshot(
      doc(db, "user_consents", uid),
      (snap) => {
        const d = snap.data();
        setConsented(!!d?.allowExternalAI && d?.version === CONSENT_VERSION);
      },
      () => setConsented(false),
    );
    return unsub;
  }, [uid]);

  const grant = useCallback(async () => {
    if (!uid) return;
    await setDoc(
      doc(db, "user_consents", uid),
      { allowExternalAI: true, version: CONSENT_VERSION, consentedAt: serverTimestamp() },
      { merge: true }
    );
    setConsented(true);
  }, [uid]);

  return { consented, grant };
}
