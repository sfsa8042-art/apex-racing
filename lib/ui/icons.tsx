import type { LucideIcon } from "lucide-react";
import {
  Trophy, Activity, BarChart2, Search, Zap, Gauge, RefreshCw, TrendingUp,
  FlaskConical, Megaphone, Headphones, BookOpen, Flag, Target, Wrench,
  Brain, Puzzle, Medal, CircleDot, CheckCircle2, KeyRound, Flame,
  MapPin, GraduationCap,
} from "lucide-react";
import type { CoachTone, DrivingStyle } from "@/types/extended";
import type { PersonalityId } from "@/lib/engineer/personalities";

export const COACH_TONE_ICON: Record<CoachTone, LucideIcon> = {
  celebratory: Trophy,
  encouraging: TrendingUp,
  direct:      Activity,
  analytical:  Search,
};

export const STYLE_ICON: Record<DrivingStyle, LucideIcon> = {
  aggressive:   Zap,
  smooth:       Gauge,
  inconsistent: RefreshCw,
  developing:   TrendingUp,
};

export const PERSONALITY_ICON: Record<PersonalityId, LucideIcon> = {
  calm:          FlaskConical,
  strict:        Zap,
  motivational:  Megaphone,
  race:          Headphones,
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  m1: Target,
  m2: CircleDot,
  m3: Zap,
  m4: Gauge,
  m5: BarChart2,
  m6: Brain,
  m7: Wrench,
  m8: Flag,
  m9: Flame,
  m10: Puzzle,
  m11: Medal,
};

export function moduleIcon(moduleId: string): LucideIcon {
  return MODULE_ICONS[moduleId] ?? BookOpen;
}

export function lessonTypeIcon(type: "theory" | "exercise" | "task"): LucideIcon {
  if (type === "exercise") return Target;
  if (type === "task") return Flag;
  return GraduationCap;
}

export function CoachToneIcon({
  tone, size = 18, className,
}: { tone: CoachTone; size?: number; className?: string }) {
  const Icon = COACH_TONE_ICON[tone] ?? Activity;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function StyleIcon({
  style, size = 14, className,
}: { style: DrivingStyle; size?: number; className?: string }) {
  const Icon = STYLE_ICON[style] ?? Gauge;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function PersonalityIcon({
  id, size = 16, className,
}: { id: PersonalityId; size?: number; className?: string }) {
  const Icon = PERSONALITY_ICON[id] ?? FlaskConical;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function ModuleIcon({
  moduleId, size = 18, className,
}: { moduleId: string; size?: number; className?: string }) {
  const Icon = moduleIcon(moduleId);
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function LessonTypeGlyph({
  type, done, size = 16, className,
}: {
  type: "theory" | "exercise" | "task";
  done?: boolean;
  size?: number;
  className?: string;
}) {
  if (done) return <CheckCircle2 size={size} className={className} aria-hidden="true" />;
  const Icon = lessonTypeIcon(type);
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export { KeyRound, Flame, MapPin, BookOpen };
