"use client";

import { Mail, User, ShieldAlert, Calendar, Clock, BarChart, Phone, Cake, Key, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTeamMembers, useClientEvents } from "@/hooks/useCollections";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { clsx } from "clsx";

interface ClientOverviewTabProps {
  client: any;
}

export default function ClientOverviewTab({ client }: ClientOverviewTabProps) {
  const { data: teamMembers } = useTeamMembers();
  const { data: events, loading: eventsLoading } = useClientEvents(client.id);
  const { success, error: toastError } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const therapist = (teamMembers || []).find(t => t.id === client.assignedTherapistId);

  // Helper to parse dates (handles ISO strings or Firestore Timestamps)
  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  // Stats Calculations
  const totalSessions = events?.length || 0;
  const completedSessions = events?.filter(e => e.status === 'completed') || [];
  const presentSessions = completedSessions.filter(e => e.attendance === 'present').length;
  const attendanceRate = completedSessions.length > 0 
    ? Math.round((presentSessions / completedSessions.length) * 100) 
    : 0;
  const activeProgramsCount = client.programIds?.length || 0;

  // Upcoming Schedule Logic
  const now = new Date();
  const upcomingEvents = (events || [])
    .filter(e => parseDate(e.startTime) >= now)
    .sort((a, b) => parseDate(a.startTime).getTime() - parseDate(b.startTime).getTime())
    .slice(0, 3); // Show next 3

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      // Logic: Initials + Random 4 digits (e.g. JS-4921)
      const initials = client.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const random = Math.floor(1000 + Math.random() * 9000);
      const newCode = `${initials}-${random}`;

      await updateDoc(doc(db, "clients", client.id), {
        clientCode: newCode
      });
      success("New access code generated!");
    } catch (err) {
      console.error(err);
      toastError("Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInviteLink = () => {
    if (!client.clientCode) return;
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // Use the v2 path for production compatibility
    const path = baseUrl.includes('localhost') ? '/parent' : '/v2/parent';
    const link = `${baseUrl}${path}/?code=${client.clientCode}`;
    
    navigator.clipboard.writeText(link);
    setCopied(true);
    success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* Left Column: Info Cards */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Contact Info */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Parent / Guardian</p>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <User className="w-4 h-4 text-neutral-400" />
                <span className="font-medium">{client.parentName || "Not provided"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Phone Number</p>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Phone className="w-4 h-4 text-neutral-400" />
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {client.phone}
                  </a>
                ) : (
                  <span className="font-medium">Not provided</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Email Address</p>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="font-medium">{client.parentEmail || "Not provided"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Birth Date</p>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Cake className="w-4 h-4 text-neutral-400" />
                <span className="font-medium">
                  {client.birthDate
                    ? new Date(client.birthDate).toLocaleDateString('ro-RO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : "Not provided"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Info */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning-500" />
            Medical Information & Notes
          </h3>
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
              &ldquo;{client.medicalInfo || "No medical alerts or clinical notes provided for this client."}&rdquo;
            </p>
          </div>
        </div>

        {/* Assigned Team */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Assigned Therapy Team</h3>
          {therapist ? (
            <Link 
              href="/team/"
              className="flex items-center gap-4 p-3 border border-neutral-100 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors w-fit pr-8 group"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: therapist.color }}
              >
                {therapist.initials}
              </div>
              <div>
                <p className="font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">{therapist.name}</p>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{therapist.role}</p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-neutral-500 italic">No therapist assigned yet.</p>
          )}
        </div>
      </div>

      {/* Right Column: Stats & Schedule */}
      <div className="space-y-6">
        
        {/* Portal Access Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Key className="w-20 h-24" />
          </div>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-500" />
            Portal Access
          </h3>
          
          {client.clientCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 text-center">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Current Access Code</p>
                <p className="text-2xl font-mono font-bold text-primary-600 tracking-wider uppercase">{client.clientCode}</p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={copyInviteLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Invite Link"}
                </button>
                <button 
                  onClick={generateCode}
                  disabled={isGenerating}
                  className="p-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all disabled:opacity-50"
                  title="Reset Code"
                >
                  <RefreshCw className={clsx("w-5 h-5", isGenerating && "animate-spin")} />
                </button>
              </div>
              <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                Parents can access the portal using this code or by clicking the unique invite link.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="py-4 text-center">
                <p className="text-sm text-neutral-500 mb-4">Portal access is not yet configured for this client.</p>
                <button 
                  onClick={generateCode}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                  Generate Access Code
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Calendar className="w-4 h-4" />
                <span>Total Sessions</span>
              </div>
              <span className="font-bold text-neutral-900 dark:text-white">
                {eventsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : totalSessions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Clock className="w-4 h-4" />
                <span>Attendance Rate</span>
              </div>
              <span className={clsx(
                "font-bold",
                attendanceRate >= 90 ? "text-success-600" : attendanceRate >= 75 ? "text-warning-600" : "text-error-600"
              )}>
                {eventsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${attendanceRate}%`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <BarChart className="w-4 h-4" />
                <span>Active Programs</span>
              </div>
              <span className="font-bold text-primary-600">{activeProgramsCount}</span>
            </div>
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Upcoming Schedule</h3>
          
          {eventsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((evt: any) => {
                const startDate = parseDate(evt.startTime);
                const isToday = startDate.toDateString() === new Date().toDateString();
                
                return (
                  <div key={evt.id} className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-900/50">
                    <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase">
                      {isToday ? "Today" : startDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{evt.type}</p>
                    <p className="text-xs text-neutral-500">
                      {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {evt.duration} min
                    </p>
                  </div>
                );
              })}
              <button className="w-full py-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline">
                View full calendar
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 italic">No upcoming sessions found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
