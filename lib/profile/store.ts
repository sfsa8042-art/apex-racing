export interface UserProfile {
  name:      string;
  email:     string;
  simulator: string;
  bio:       string;
  apiToken:  string;
  createdAt: string;
}

const KEY = "apex_user_profile";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch { return null; }
}

export function saveProfile(p: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).filter(Boolean)
    .slice(0, 2).join("").toUpperCase() || "?";
}

export function avatarColor(name: string): string {
  const COLORS = ["#a3e635","#60a5fa","#f472b6","#fb923c",
                  "#34d399","#a78bfa","#facc15","#f87171"];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}
