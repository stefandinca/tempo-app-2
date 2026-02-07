"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import ProgramCard, { Program } from "./ProgramCard";
import { Search, Plus, BookOpen } from "lucide-react";

interface ProgramListProps {
  onAdd: () => void;
  onEdit: (program: Program) => void;
}

export default function ProgramList({ onAdd, onEdit }: ProgramListProps) {
  const { programs: programsState } = useData();
  const loading = programsState.loading;
  const programs = programsState.data as Program[];
  const [search, setSearch] = useState("");

  const filteredPrograms = useMemo(() => {
    let result = programs.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [programs, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Programs</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Manage therapy programs
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="w-full sm:w-72 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-32 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl mt-5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Programs</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage therapy programs
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search programs..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Program</span>
        </button>
      </div>

      {/* Grid */}
      {filteredPrograms.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            No programs found
          </h3>
          <p className="text-neutral-500 max-w-xs mt-1">
            {search
              ? "Try a different search term"
              : "No programs yet. Add your first program to get started."}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-4 text-primary-600 font-bold hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onEdit={() => onEdit(program)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
