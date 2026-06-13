"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// Keep in sync with CONSENT_VERSION in src/lib/assistant/gate.ts.
export const CONSENT_VERSION = "2";

/** Tracks whether the current staff user has consented to AI features.
 *  `consented` is null while loading. `grant()` records consent. */
export function useAiConsent() {
  const [consented, setConsented] = useState<boolean | null>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!uid) {
        if (active) setConsented(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "user_consents", uid));
        const d = snap.data();
        if (active) setConsented(!!d?.allowExternalAI && d?.version === CONSENT_VERSION);
      } catch {
        if (active) setConsented(false);
      }
    })();
    return () => {
      active = false;
    };
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
