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

export interface MemberProfile {
  id: string;               // matches member.id
  nickname: string;         // display name
  avatar_type: "color" | "flag"; 
  avatar_color: string;     // swatch color hex
  avatar_flag: string;      // emoji or country code
  language: "en" | "ar" | "id";
  reminders: {
    cleaning: boolean;
    supplies: boolean;
    travel: boolean;
    reports: boolean;
  };
  pin?: string;             // 4-digit security PIN
  updated_at: string;
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
  created_at?: string;
}

export interface Purchase {
  id: string;
  member_id: string;
  house_id: string;
  item_name: string;       // DB column is item_name (no item_id)
  date: string;            // DB column is date, not purchase_date
  created_at?: string;
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
  house_id:                string;
  supplies:                Supply[];          // custom supply items
  cleaning_enabled:        boolean;
  cleaning_frequency:      "weekly" | "biweekly" | "monthly";
  cleaning_day:            number;            // 0=Sun … 6=Sat
  rotation_type:           "round_robin" | "free_for_all";
  cleaning_rotation_order: string[];          // ordered member IDs for cleaning
  supplies_rotation_order: string[];          // ordered member IDs for supplies
  excluded_members:        Record<string, string[]>; // key = item name or "cleaning", value = array of excluded member IDs
}

export interface Report {
  id: string;
  house_id: string;
  reporter_member_id: string;       // stored but NEVER shown to students
  reported_member_id: string;
  issue_type: "cleaning" | "supplies" | "behavior" | "other";
  severity: "minor" | "moderate" | "serious";
  description: string;              // optional, max 200 chars
  duration: "once" | "few_times" | "ongoing";
  co_signers: string[];             // array of member IDs who agreed to co-sign
  co_signer_requests: string[];     // array of member IDs who were asked to co-sign
  status: "pending" | "under_review" | "resolved";
  university_response: string;      // message from university staff, empty by default
  reference_number: string;         // format: NNN-YYYY-XXXX (e.g. NNN-2024-0047)
  created_at: string;
}

export interface TravelMode {
  id: string;
  house_id: string;
  member_id: string;                          // who is travelling
  departure_date: string;                     // ISO date string YYYY-MM-DD
  return_date: string;                        // ISO date string YYYY-MM-DD (approximate)
  status: "active" | "returned";
  supply_decisions: Record<string, "skip" | "cover">;   // key = supply item id
  cover_assignments: Record<string, string>;             // key = supply item id, value = covering member id
  created_by: string;                         // member_id of whoever activated Travel Mode
  created_at: string;
}

export interface TravelIOU {
  id: string;
  house_id: string;
  traveler_member_id: string;
  cover_member_id: string;
  supply_item_label: string;                  // human readable e.g. "Gas 🔥"
  supply_item_icon: string;                   // emoji icon
  travel_id: string;                          // reference to TravelMode id
  period: string;                             // human readable e.g. "12–19 Jan"
  settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export interface ReportNotification {
  id: string;
  house_id: string;
  member_id: string;                // who this notification is for
  type: "co_sign_request" | "reported_notice" | "report_confirmed" | "university_response";
  report_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface MemberMonthlyStats {
  memberId: string;
  memberName: string;
  period: string;                          // "YYYY-MM" or "all-time"
  cleaning: {
    completed: number;                     // how many times they cleaned
    expected: number;                      // their fair share based on rotation
    dates: string[];                       // ISO date strings of each clean
  };
  supplies: SupplyStats[];
  overallScore: number;                    // 0–100, calculated on frontend
  rank: number;                            // 1 = best in house for this period
}

export interface SupplyStats {
  itemId: string;
  itemLabel: string;
  itemIcon: string;
  completed: number;                       // how many times they bought this item
  expected: number;                        // their fair share
  dates: string[];                         // ISO date strings of each purchase
  missed: boolean;                         // true if completed < expected
}

export interface TopContributor {
  member_id: string;
  month: string;                           // "YYYY-MM"
  score: number;
}

// Day label helper
export const DAY_LABELS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const DAY_SHORT  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// --- Constants ---

export const AV_COLORS = [
  "#770042",  // Maroon
  "#D4A373",  // Gold
  "#2D6A4F",  // Forest Green
  "#1D3557",  // Deep Navy
  "#E76F51",  // Warm Coral
  "#457B9D",  // Steel Blue
  "#6D4C41",  // Warm Brown
  "#5E548E",  // Soft Purple
  "#2B9348",  // Emerald
  "#CB4335",  // Crimson
];

export const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "PS", name: "Palestine", flag: "🇵🇸" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
];

// Supplies list — item_name values must match what's stored in DB
export const SUPPLIES: Supply[] = [
  { id: "Water",       label: "Water",       icon: "💧", bg: "rgba(58, 134, 255, 0.1)",  col: "#3A86FF" },
  { id: "Gas",         label: "Gas",         icon: "🔥", bg: "rgba(244, 162, 97, 0.1)",  col: "#F4A261" },
  { id: "Soap & Sponge", label: "Soap & Sponge", icon: "🫧", bg: "rgba(212, 163, 115, 0.1)", col: "#D4A373" },
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

export function capitalizeName(name: string): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getDisplayName(
  memberId: string,
  members: Member[],
  memberProfiles: Record<string, MemberProfile>
): string {
  const profile = memberProfiles[memberId];
  const member = members.find(m => m.id === memberId);
  const rawName = profile?.nickname?.trim() || member?.name || "";
  return capitalizeName(rawName);
}

export const getAutoColor = (name: string) => avatarColor(name);

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
 * Pass members[] already in the user-defined rotation order.
 * lastCleanerIdx = index of who cleaned last in that ordered array.
 * skippingMemberIds = members currently traveling (skip them).
 * The next person is the first available (lastCleanerIdx + 1) % members.length.
 */
export const buildRotation = (
  members: Member[],
  lastCleanerIdx = 0,
  skippingMemberIds: string[] = []
): RotationEntry[] => {
  if (!members.length) return [];
  
  // If everyone is skipped, we can't build a rotation. 
  // We'll return empty or handled in UI.
  const activeMembers = members.filter(m => !skippingMemberIds.includes(m.id));
  if (!activeMembers.length) return [];

  const start = (lastCleanerIdx + 1) % members.length;
  const ordered = [
    ...members.slice(start),
    ...members.slice(0, start),
  ].filter(m => !skippingMemberIds.includes(m.id));

  let sat = nextSat();
  return ordered.map((m) => {
    const d = new Date(sat);
    sat = nextSat(new Date(sat.getTime() + 86400000));
    return { memberId: m.id, date: d };
  });
};

/**
 * Calculate fairness score for a member in a given period.
 * Score = (completed turns / expected turns) * 100
 * Capped at 100 — doing extra is great but does not penalize others.
 * If expected = 0, score = 100 (no turns expected = perfect).
 */
export function calculateMemberScore(stats: Omit<MemberMonthlyStats, "overallScore" | "rank">): number {
  let totalCompleted = stats.cleaning.completed;
  let totalExpected = stats.cleaning.expected;

  stats.supplies.forEach(s => {
    totalCompleted += s.completed;
    totalExpected += s.expected;
  });

  if (totalExpected === 0) return 100;
  const score = (totalCompleted / totalExpected) * 100;
  return Math.min(100, Math.round(score));
}

/**
 * Calculate expected turns for a member.
 * Expected = total house turns in period / number of eligible members.
 * Eligible members = all members NOT excluded from that rotation.
 */
export function calculateExpectedTurns(
  totalTurns: number,
  eligibleMemberCount: number
): number {
  if (eligibleMemberCount === 0) return 0;
  // Fair share is total turns divided by number of people.
  // We use floor to be conservative, or just direct division.
  // Prompt says "fair share based on rotation". 
  return totalTurns / eligibleMemberCount;
}

/**
 * Filter clean_records and purchases by a date range.
 * For monthly: filter where date starts with "YYYY-MM"
 * For all-time: no filter
 */
export function filterRecordsByPeriod<T extends { date: string }>(
  records: T[],
  period: string | "all-time"
): T[] {
  if (period === "all-time") return records;
  return records.filter(r => r.date.startsWith(period));
}

/**
 * Build MemberMonthlyStats array for all members in the house.
 * Takes members, cleanRecs, purchases, supplies, excluded_members as input.
 * Returns sorted array by overallScore descending, with rank assigned.
 */
export function buildHouseStats(
  members: Member[],
  cleanRecs: CleanRecord[],
  purchases: Purchase[],
  supplies: Supply[],
  excludedMembers: Record<string, string[]>,
  period: string | "all-time",
  memberProfiles: Record<string, MemberProfile> = {}
): MemberMonthlyStats[] {
  const filteredCleans = filterRecordsByPeriod(cleanRecs, period);
  const filteredPurchases = filterRecordsByPeriod(purchases, period);

  const stats: MemberMonthlyStats[] = members.map(m => {
    // Cleaning stats
    const myCleans = filteredCleans.filter(c => c.member_id === m.id);
    const excludedFromCleaning = excludedMembers["cleaning"] || [];
    const eligibleCleaningMembers = members.filter(mem => !excludedFromCleaning.includes(mem.id)).length;
    const expectedCleaning = calculateExpectedTurns(filteredCleans.length, eligibleCleaningMembers);

    // Supply stats
    const supplyStats: SupplyStats[] = supplies.map(s => {
      const myPurchases = filteredPurchases.filter(p => p.member_id === m.id && p.item_name === s.label);
      const housePurchases = filteredPurchases.filter(p => p.item_name === s.label);
      const excludedFromSupply = excludedMembers[s.label] || [];
      const eligibleSupplyMembers = members.filter(mem => !excludedFromSupply.includes(mem.id)).length;
      const expectedSupply = calculateExpectedTurns(housePurchases.length, eligibleSupplyMembers);
      
      return {
        itemId: s.id,
        itemLabel: s.label,
        itemIcon: s.icon,
        completed: myPurchases.length,
        expected: expectedSupply,
        dates: myPurchases.map(p => p.date),
        missed: myPurchases.length < expectedSupply
      };
    });

    const baseStats = {
      memberId: m.id,
      memberName: getDisplayName(m.id, members, memberProfiles),
      period,
      cleaning: {
        completed: myCleans.length,
        expected: expectedCleaning,
        dates: myCleans.map(c => c.date)
      },
      supplies: supplyStats
    };

    return {
      ...baseStats,
      overallScore: calculateMemberScore(baseStats),
      rank: 0 // Will assign after sorting
    };
  });

  // Sort by score descending
  stats.sort((a, b) => b.overallScore - a.overallScore);

  // Assign rank
  stats.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return stats;
}
