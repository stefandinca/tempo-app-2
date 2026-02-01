"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";

// --- DUMMY DATA ---

const TEAM_MEMBERS = [
  { id: "tm1", name: 'Dr. Maria Garcia', initials: 'MG', role: 'Senior ABA Therapist', color: '#4A90E2', sessions: 32, clients: 12, email: "maria@tempo.com" },
  { id: "tm2", name: 'Dr. Andrei Ionescu', initials: 'AI', role: 'Coordinator', color: '#10B981', sessions: 28, clients: 8, email: "andrei@tempo.com" },
  { id: "tm3", name: 'Dr. Elena Popescu', initials: 'EP', role: 'Speech Therapist', color: '#8B5CF6', sessions: 24, clients: 10, email: "elena@tempo.com" },
  { id: "tm4", name: 'Dr. Pavel Stefan', initials: 'PS', role: 'Occupational Therapist', color: '#F59E0B', sessions: 20, clients: 6, email: "pavel@tempo.com" },
];

const CLIENTS = [
  { id: "c1", name: 'John Smith', age: 7, progress: 78, medicalInfo: "Peanut Allergy", parentName: "Mr. Smith", parentEmail: "parent1@example.com", assignedTherapistId: "tm1" },
  { id: "c2", name: 'Jane Doe', age: 5, progress: 65, medicalInfo: "None", parentName: "Mrs. Doe", parentEmail: "parent2@example.com", assignedTherapistId: "tm1" },
  { id: "c3", name: 'Mike Brown', age: 8, progress: 82, medicalInfo: "Asthma", parentName: "Mr. Brown", parentEmail: "parent3@example.com", assignedTherapistId: "tm2" },
  { id: "c4", name: 'Sara Lee', age: 6, progress: 71, medicalInfo: "None", parentName: "Ms. Lee", parentEmail: "parent4@example.com", assignedTherapistId: "tm3" },
  { id: "c5", name: 'Alex Kim', age: 9, progress: 88, medicalInfo: "None", parentName: "Mrs. Kim", parentEmail: "parent5@example.com", assignedTherapistId: "tm4" },
];

// Helper to get today at specific hour
const getTodayAt = (hour: number, minute: number = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const EVENTS = [
  {
    id: "evt1",
    clientId: "c1",
    therapistId: "tm1",
    title: "ABA Session",
    type: "ABA Session",
    status: "completed",
    startTime: getTodayAt(9, 0),
    endTime: getTodayAt(10, 0),
    attendance: "present",
    programScores: { matching: 3, imitation: 2, verbal: 4 },
    notes: "Good focus today."
  },
  {
    id: "evt2",
    clientId: "c2",
    therapistId: "tm1",
    title: "Speech Therapy",
    type: "Speech Therapy",
    status: "in-progress",
    startTime: getTodayAt(10, 30),
    endTime: getTodayAt(11, 30),
    attendance: "present",
    programScores: {},
    notes: ""
  },
  {
    id: "evt3",
    clientId: "c3",
    therapistId: "tm2",
    title: "ABA Session",
    type: "ABA Session",
    status: "upcoming",
    startTime: getTodayAt(13, 0),
    endTime: getTodayAt(14, 0),
    attendance: "unknown",
    programScores: {},
    notes: ""
  },
  {
    id: "evt4",
    clientId: "c4",
    therapistId: "tm3",
    title: "Evaluation",
    type: "Evaluation",
    status: "upcoming",
    startTime: getTodayAt(15, 0),
    endTime: getTodayAt(16, 0),
    attendance: "unknown",
    programScores: {},
    notes: ""
  }
];

export default function SeedPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  const addToLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleSeed = async () => {
    setStatus("loading");
    setLog([]);
    addToLog(`Starting database seed... Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

    try {
      const batch = writeBatch(db);

      // 1. Team Members
      addToLog(`Preparing ${TEAM_MEMBERS.length} team members...`);
      TEAM_MEMBERS.forEach(tm => {
        const ref = doc(db, "team_members", tm.id);
        batch.set(ref, tm);
      });

      // 2. Clients
      addToLog(`Preparing ${CLIENTS.length} clients...`);
      CLIENTS.forEach(client => {
        const ref = doc(db, "clients", client.id);
        batch.set(ref, client);
      });

      // 3. Events
      addToLog(`Preparing ${EVENTS.length} events...`);
      EVENTS.forEach(evt => {
        const ref = doc(db, "events", evt.id);
        batch.set(ref, evt);
      });

      // Commit
      addToLog("Committing batch write to Firestore...");
      await batch.commit();

      addToLog("Success! Database populated.");
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      addToLog(`Error: ${err.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Database Seeder</h1>
            <p className="text-sm text-neutral-500">Populate Firestore with dummy data</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This will overwrite existing data in the following collections: 
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">team_members</code>, 
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">clients</code>, 
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">events</code>.
          </p>

          <button
            onClick={handleSeed}
            disabled={status === "loading" || status === "success"}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Seeding...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Seeding Complete
              </>
            ) : (
              "Run Seed Script"
            )}
          </button>

          {/* Logs */}
          <div className="bg-neutral-100 dark:bg-neutral-950 rounded-lg p-4 font-mono text-xs h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            {log.length === 0 ? (
              <span className="text-neutral-400 italic">Waiting to start...</span>
            ) : (
              log.map((msg, i) => (
                <div key={i} className="mb-1 text-neutral-700 dark:text-neutral-300">
                  {msg}
                </div>
              ))
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-error-600 mt-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                Seeding Failed
              </div>
            )}
          </div>
          
          {status === "success" && (
             <a href="/" className="block text-center text-sm text-primary-600 hover:underline">
               Return to Dashboard
             </a>
          )}
        </div>
      </div>
    </div>
  );
}
