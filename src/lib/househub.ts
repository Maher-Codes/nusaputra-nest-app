// ============================================================
// househub.ts — Types & Utilities
// All interfaces match Supabase DB column names exactly.
// ============================================================

// --- Types ---

export interface Member {
  id: string;
  name: string;
  house_id: string;
  created_at: string;
}

export interface House {
  id: string;
  name: string;
  house_code: string;      // DB column is house_code, not code
  created_at: string;
}

export interface CleanRecord {
  id: string;
  member_id: string;
  house_id: string;
  date: string;            // DB column is date, not cleaning_date
}

export interface Purchase {
  id: string;
  member_id: string;
  house_id: string;
  item_name: string;       // DB column is item_name (no item_id)
  date: string;            // DB column is date, not purchase_date
}

export interface SupplyResponsibility {
  id: string;
  house_id: string;
  item_name: string;
  next_member_id: string;
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

export interface HouseSettings {
  id:                 string;
  house_id:           string;
  supplies:           Supply[];          // custom supply items
  cleaning_enabled:   boolean;
  cleaning_frequency: "weekly" | "biweekly" | "monthly";
  cleaning_day:       number;            // 0=Sun … 6=Sat
  rotation_type:      "round_robin" | "free_for_all";
  created_at:         string;
}

// Day label helper
export const DAY_LABELS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const DAY_SHORT  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// --- Constants ---

export const AV_COLORS = [
  "#2A9D8F", "#3A86FF", "#F4A261",
  "#21867A", "#2563EB", "#D97706",
  "#1F2937", "#4F46E5",
];

// Supplies list — item_name values must match what's stored in DB
export const SUPPLIES: Supply[] = [
  { id: "Water",       label: "Water",       icon: "💧", bg: "rgba(58, 134, 255, 0.1)",  col: "#3A86FF" },
  { id: "Gas",         label: "Gas",         icon: "🔥", bg: "rgba(244, 162, 97, 0.1)",  col: "#F4A261" },
  { id: "Soap & Sponge", label: "Soap & Sponge", icon: "🫧", bg: "rgba(42, 157, 143, 0.1)", col: "#2A9D8F" },
];

// --- Utility Functions ---

export const avatarColor = (name: string): string => {
  let h = 0;
  for (const c of (name || "")) h = (h * 31 + c.charCodeAt(0)) % AV_COLORS.length;
  return AV_COLORS[h];
};

export const uid = () =>
  `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const now = () => new Date().toISOString();

export const genCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const fmtDate = (
  iso: string | Date,
  opts: Intl.DateTimeFormatOptions = {}
) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  });

export const fmtShort = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

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
  new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const nextSat = (from: Date = new Date()): Date => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 6 ? 7 : 6 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Builds the upcoming cleaning rotation.
 * lastCleanerIdx = index in members[] of who cleaned last.
 * The next person is (lastCleanerIdx + 1) % members.length.
 */
export const buildRotation = (
  members: Member[],
  lastCleanerIdx = 0
): RotationEntry[] => {
  if (!members.length) return [];
  const start = (lastCleanerIdx + 1) % members.length;
  const ordered = [
    ...members.slice(start),
    ...members.slice(0, start),
  ];
  let sat = nextSat();
  return ordered.map((m) => {
    const d = new Date(sat);
    sat = nextSat(new Date(sat.getTime() + 86400000));
    return { memberId: m.id, date: d };
  });
};
