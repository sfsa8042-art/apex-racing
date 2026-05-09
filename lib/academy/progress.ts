/**
 * Academy progress — stored in localStorage.
 * Key: "apex_academy_progress"
 * Shape: Record<moduleId, Set<lessonId>>
 */

export interface AcademyProgress {
  completedLessons: Record<string, string[]>; // moduleId -> lessonId[]
  startedModules: string[];
  lastAccessedModuleId: string | null;
  lastUpdated: string;
}

const STORAGE_KEY = "apex_academy_progress";

function defaultProgress(): AcademyProgress {
  return {
    completedLessons: { m1: ["m1l1", "m1l2", "m1l3", "m1l4"], m2: ["m2l1", "m2l2", "m2l3", "m2l4", "m2l5"] },
    startedModules: ["m1", "m2", "m3"],
    lastAccessedModuleId: "m3",
    lastUpdated: new Date().toISOString(),
  };
}

export function loadProgress(): AcademyProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = defaultProgress();
      saveProgress(def);
      return def;
    }
    return JSON.parse(raw) as AcademyProgress;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: AcademyProgress): void {
  if (typeof window === "undefined") return;
  try {
    progress.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage full or unavailable
  }
}

export function completeLesson(moduleId: string, lessonId: string): AcademyProgress {
  const progress = loadProgress();
  if (!progress.completedLessons[moduleId]) {
    progress.completedLessons[moduleId] = [];
  }
  if (!progress.completedLessons[moduleId].includes(lessonId)) {
    progress.completedLessons[moduleId].push(lessonId);
  }
  if (!progress.startedModules.includes(moduleId)) {
    progress.startedModules.push(moduleId);
  }
  progress.lastAccessedModuleId = moduleId;
  saveProgress(progress);
  return progress;
}

export function isLessonCompleted(progress: AcademyProgress, moduleId: string, lessonId: string): boolean {
  return progress.completedLessons[moduleId]?.includes(lessonId) ?? false;
}

export function getModuleCompletedCount(progress: AcademyProgress, moduleId: string, totalLessons: number): number {
  return Math.min(progress.completedLessons[moduleId]?.length ?? 0, totalLessons);
}

export function getModuleStatus(
  progress: AcademyProgress,
  moduleId: string,
  lessonCount: number,
  prevModuleId: string | null
): "completed" | "in_progress" | "available" | "locked" {
  const completed = progress.completedLessons[moduleId]?.length ?? 0;
  if (completed >= lessonCount) return "completed";
  if (progress.startedModules.includes(moduleId)) return "in_progress";

  // First module always available
  return "available"; // all modules unlocked
}

export function resetProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
