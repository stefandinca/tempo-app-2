"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { Loader2, CheckCircle, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * One-time backfill: populate /client_codes/{CODE} for every existing client that
 * has a clientCode. Must be run by an Admin or Superadmin after the firestore.rules
 * change that opens write access to /client_codes. Safe to re-run.
 */
export default function BackfillClientCodesPage() {
  const { user, userRole } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const isAdmin = userRole === "Admin" || userRole === "Superadmin";

  const append = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleBackfill = async () => {
    setStatus("loading");
    setLog([]);
    setProgress(0);

    try {
      append("Reading /clients collection...");
      const clientsSnap = await getDocs(collection(db, "clients"));
      append(`Found ${clientsSnap.size} clients.`);

      const withCode = clientsSnap.docs.filter((d) => {
        const data = d.data();
        return typeof data.clientCode === "string" && data.clientCode.trim().length > 0;
      });
      append(`${withCode.length} clients have a clientCode. Backfilling lookup docs...`);

      if (withCode.length === 0) {
        append("Nothing to backfill.");
        setStatus("success");
        setProgress(100);
        return;
      }

      // Firestore batch caps at 500 operations; chunk if larger
      const CHUNK = 400;
      let written = 0;
      for (let i = 0; i < withCode.length; i += CHUNK) {
        const chunk = withCode.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          const data = d.data();
          const upperCode = String(data.clientCode).toUpperCase();
          batch.set(doc(db, "client_codes", upperCode), {
            clientId: d.id,
            clientName: data.name || "",
          });
        });
        await batch.commit();
        written += chunk.length;
        setProgress(Math.round((written / withCode.length) * 100));
        append(`Wrote batch ${i / CHUNK + 1}: ${written}/${withCode.length}`);
      }

      append(`Done. ${written} lookup docs written.`);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      append(`Error: ${err.message || err}`);
      setStatus("error");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <p className="text-neutral-500">Please sign in as an administrator.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-error-500 mx-auto" />
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Admin access required</h1>
          <p className="text-neutral-500">This backfill tool is restricted to Admin or Superadmin roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Client Code Backfill</h1>
            <p className="text-sm text-neutral-500">Populates /client_codes lookup docs</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-200">
            Run this once after deploying the new firestore.rules that grant write access to
            /client_codes. Re-running is safe — each run overwrites the lookup doc with the
            current value. Expected run time: a few seconds per 100 clients.
          </div>

          {status === "loading" && (
            <div className="flex items-center gap-3 text-primary-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Backfilling... {progress}%</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-3 text-success-600">
              <CheckCircle className="w-5 h-5" />
              <span>Backfill completed.</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-3 text-error-600">
              <AlertCircle className="w-5 h-5" />
              <span>Backfill failed — see log below.</span>
            </div>
          )}

          <button
            onClick={handleBackfill}
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
          >
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {status === "loading" ? "Running..." : status === "success" ? "Run again" : "Run backfill"}
          </button>

          {log.length > 0 && (
            <pre className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-xs text-neutral-700 dark:text-neutral-300 max-h-64 overflow-auto font-mono whitespace-pre-wrap">
              {log.join("\n")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
