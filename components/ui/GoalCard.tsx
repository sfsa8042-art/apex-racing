"use client";
import { useState } from "react";
import { Target, Plus, X, CheckCircle, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types/extended";
import { GOAL_TEMPLATES, createGoal, addGoal, deleteGoal, abandonGoal } from "@/lib/goals/store";

// ─── Single goal card ─────────────────────────────────────────────────────────

interface GoalCardProps {
  goal:      Goal;
  onDelete:  (id: string) => void;
  compact?:  boolean;
}

export function GoalCard({ goal, onDelete, compact = false }: GoalCardProps) {
  const isAchieved = goal.status === "achieved";
  const pct        = goal.progress;

  const barColor = isAchieved ? "bg-lime-400"
    : pct > 75 ? "bg-lime-400"
    : pct > 40 ? "bg-yellow-400"
    : "bg-zinc-500";

  return (
    <div className={cn(
      "rounded-xl border p-3 transition-all",
      isAchieved ? "border-lime-400/30 bg-lime-400/5" : "border-zinc-800 bg-zinc-900",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          isAchieved ? "bg-lime-400/20" : "bg-zinc-800")}>
          {isAchieved
            ? <CheckCircle size={14} className="text-lime-400" />
            : <Target size={14} className="text-zinc-500" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={cn("text-xs font-medium leading-snug",
              isAchieved ? "text-lime-400" : "text-zinc-200")}>
              {goal.titleEn}
            </p>
            <button onClick={() => onDelete(goal.id)}
              className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors p-0.5">
              <Trash2 size={11} />
            </button>
          </div>

          {!compact && (
            <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">{goal.descriptionEn}</p>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", barColor)}
                style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className={cn("text-[11px] font-mono tabular shrink-0",
              isAchieved ? "text-lime-400" : pct > 75 ? "text-lime-400" : "text-zinc-500")}>
              {isAchieved ? "✓ Done" : `${pct}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Goal setup modal ─────────────────────────────────────────────────────────

interface GoalSetupModalProps {
  onClose:          () => void;
  onGoalCreated:    () => void;
  currentLapTimeMs: number | null;
}

export function GoalSetupModal({ onClose, onGoalCreated, currentLapTimeMs }: GoalSetupModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const handleCreate = () => {
    if (selectedTemplate === null) return;
    const template = GOAL_TEMPLATES[selectedTemplate];
    const goal = createGoal(template, currentLapTimeMs);
    addGoal(goal);
    onGoalCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100">Set a goal</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {GOAL_TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => setSelectedTemplate(i)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                selectedTemplate === i
                  ? "border-lime-400/40 bg-lime-400/8"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900"
              )}>
              <span className="text-lg shrink-0">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{t.titleEn}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{t.descriptionEn}</p>
              </div>
              {selectedTemplate === i && <CheckCircle size={14} className="text-lime-400 shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={selectedTemplate === null}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-40">
            Set goal <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Goals section (used in dashboard) ────────────────────────────────────────

interface GoalsSectionProps {
  goals:         Goal[];
  onRefresh:     () => void;
  lapTimeMs?:    number | null;
}

export function GoalsSection({ goals, onRefresh, lapTimeMs }: GoalsSectionProps) {
  const [showModal, setShowModal] = useState(false);

  const handleDelete = (id: string) => {
    deleteGoal(id);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-400">Goals</p>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
          <Plus size={11} />New goal
        </button>
      </div>

      {goals.length === 0 ? (
        <button onClick={() => setShowModal(true)}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 text-sm text-zinc-600 hover:text-zinc-400 transition-all">
          <Target size={14} className="text-lime-400" />
          Set your first goal
        </button>
      ) : (
        <div className="space-y-2">
          {goals.slice(0, 3).map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} compact />
          ))}
        </div>
      )}

      {showModal && (
        <GoalSetupModal
          onClose={() => setShowModal(false)}
          onGoalCreated={onRefresh}
          currentLapTimeMs={lapTimeMs ?? null}
        />
      )}
    </div>
  );
}
