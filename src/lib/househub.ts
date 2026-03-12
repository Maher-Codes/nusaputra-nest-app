// Types
export interface Member {
  id: string;
  name: string;
  joined_at: string;
}

export interface House {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface CleanRecord {
  id: string;
  member_id: string;
  house_id: string;
  cleaning_date: string;
  completed: boolean;
}

export interface Purchase {
  id: string;
  member_id: string;
  item_id: string;
  item_name: string;
  purchase_date: string;
}

export interface ActivityLog {
  id: string;
  member_id: string;
  action: string;
  icon: string;
  created_at: string;
}

export interface RotationEntry {
  memberId: string;
  date: Date;
}

export interface Supply {
  id: string;
  label: string;
  icon: string;
  bg: string;
  col: string;
}

export interface Alert {
  id: number;
  msg: string;
  icon: string;
}

// Constants
export const AV_COLORS = ["#1e40af","#0f766e","#7c3aed","#b45309","#be123c","#0369a1","#4338ca","#15803d"];

export const SUPPLIES: Supply[] = [
  { id: "gas",    label: "Gas",    icon: "🔥", bg: "#fef2f2", col: "#dc2626" },
  { id: "water",  label: "Water",  icon: "💧", bg: "#eff6ff", col: "#2563eb" },
  { id: "soap",   label: "Soap",   icon: "🫧", bg: "#f0fdf4", col: "#16a34a" },
  { id: "sponge", label: "Sponge", icon: "🧽", bg: "#fffbeb", col: "#d97706" },
];

// Utilities
export const avatarColor = (name: string): string => {
  let h = 0;
  for (const c of (name || "")) h = (h * 31 + c.charCodeAt(0)) % AV_COLORS.length;
  return AV_COLORS[h];
};

export const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
export const now = () => new Date().toISOString();
export const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const fmtDate = (iso: string | Date, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", ...opts });

export const fmtShort = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const ago = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy === 1) return "yesterday";
  return `${dy} days ago`;
};

export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export const todayFull = () =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const nextSat = (from: Date = new Date()): Date => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 6 ? 7 : (6 - day);
  d.setDate(d.getDate() + diff);
  return d;
};

export const buildRotation = (members: Member[], lastCleanerIdx = 0): RotationEntry[] => {
  if (!members.length) return [];
  const start = (lastCleanerIdx + 1) % members.length;
  const ordered = [...members.slice(start), ...members.slice(0, start)];
  let sat = nextSat();
  return ordered.map(m => {
    const d = new Date(sat);
    sat = nextSat(new Date(sat.getTime() + 86400000));
    return { memberId: m.id, date: d };
  });
};
