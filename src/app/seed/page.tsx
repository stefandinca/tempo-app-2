"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { writeBatch, doc } from "firebase/firestore";
import { Loader2, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { ABLLS_PROTOCOL } from "@/data/ablls-r-protocol";

/**
 * ABLLS-R LIVE ENVIRONMENT INITIALIZER
 * This seeder only populates the protocol definitions.
 * It does NOT create mock clients, team members, or evaluations.
 */

export default function SeedPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const addToLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleInitialize = async () => {
    setStatus("loading");
    setLog([]);
    setProgress(0);
    addToLog(`Initializing ABLLS-R Protocol for LIVE environment...`);
    addToLog(`Firebase Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

    try {
      // We only seed the PROTOCOL metadata to a reference collection
      // This is actual system data, not mock data.
      addToLog(`Preparing ${ABLLS_PROTOCOL.length} category definitions...`);
      
      const batch = writeBatch(db);
      
      ABLLS_PROTOCOL.forEach(cat => {
        // We store the protocol structure in a metadata collection for reference
        // This can be used for dynamic UI generation or admin management
        const protocolRef = doc(db, "evaluation_protocols", `ABLLS-R-${cat.id}`);
        batch.set(protocolRef, {
          id: cat.id,
          title: cat.title,
          itemCount: cat.items.length,
          maxPossibleScore: cat.items.reduce((sum, item) => sum + item.maxScore, 0),
          updatedAt: new Date().toISOString(),
          version: "1.0",
          language: "ro"
        });
      });

      addToLog("Writing protocol metadata to Firestore...");
      await batch.commit();
      setProgress(100);

      addToLog("✓ ABLLS-R Protocol initialized successfully.");
      addToLog("NOTE: No mock clients, team members, or evaluations were created.");

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      addToLog(`Error: ${err.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 text-success-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Live Initializer</h1>
            <p className="text-sm text-neutral-500">ABLLS-R Assessment Protocol</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              This tool will only initialize the ABLLS-R protocol definitions. Existing clinical data (clients, team, programs) will not be modified.
            </p>
          </div>

          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <p>Operations:</p>
            <ul className="list-disc list-inside pl-2 mt-1 space-y-1">
              <li>Register ABLLS-R Categories (A-Z) in system metadata</li>
              <li>Verify Firebase connectivity for assessment feature</li>
              <li>Ensure no mock data generation</li>
            </ul>
          </div>

          {status === "loading" && (
            <div className="space-y-2">
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleInitialize}
            disabled={status === "loading" || status === "success"}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Initializing...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="w-5 h-5" />
                System Ready
              </>
            ) : (
              "Initialize Assessment Protocol"
            )}
          </button>

          <div className="bg-neutral-100 dark:bg-neutral-950 rounded-lg p-4 font-mono text-xs h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            {log.length === 0 ? (
              <span className="text-neutral-400 italic">Ready to initialize...</span>
            ) : (
              log.map((msg, i) => (
                <div key={i} className="mb-1 text-neutral-700 dark:text-neutral-300">
                  {msg}
                </div>
              ))
            )}
          </div>

          {status === "success" && (
            <a href="/" className="block text-center py-2.5 bg-success-500 hover:bg-success-600 text-white rounded-lg font-bold transition-colors">
              Go to Dashboard
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
