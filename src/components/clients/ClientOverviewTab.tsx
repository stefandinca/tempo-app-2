"use client";

import { Mail, User, ShieldAlert, Calendar, Clock, BarChart, Phone, Cake } from "lucide-react";
import { useTeamMembers } from "@/hooks/useCollections";

interface ClientOverviewTabProps {
  client: any;
}

export default function ClientOverviewTab({ client }: ClientOverviewTabProps) {
  const { data: teamMembers } = useTeamMembers();
  const therapist = teamMembers.find(t => t.id === client.assignedTherapistId);

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
            <div className="flex items-center gap-4 p-3 border border-neutral-100 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors w-fit pr-8">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: therapist.color }}
              >
                {therapist.initials}
              </div>
              <div>
                <p className="font-bold text-neutral-900 dark:text-white">{therapist.name}</p>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{therapist.role}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 italic">No therapist assigned yet.</p>
          )}
        </div>
      </div>

      {/* Right Column: Stats & Schedule */}
      <div className="space-y-6">
        
        {/* Quick Stats */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Calendar className="w-4 h-4" />
                <span>Total Sessions</span>
              </div>
              <span className="font-bold">24</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Clock className="w-4 h-4" />
                <span>Attendance Rate</span>
              </div>
              <span className="font-bold text-success-600">92%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <BarChart className="w-4 h-4" />
                <span>Active Programs</span>
              </div>
              <span className="font-bold text-primary-600">5</span>
            </div>
          </div>
        </div>

        {/* Schedule Summary Placeholder */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Upcoming Schedule</h3>
          <div className="space-y-3">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-900/50">
              <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase">Tomorrow</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">ABA Session</p>
              <p className="text-xs text-neutral-500">09:00 AM - 10:00 AM</p>
            </div>
            <button className="w-full py-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline">
              View full calendar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
