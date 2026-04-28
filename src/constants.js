import { supabase } from "./supabaseClient.js";

export const ALPS_LOGO = "/alps-logo.webp";
export const ALPS_LOGO_REVERSED = "/alps-logo-reversed.webp";

export const DASHBOARD_PASSWORD = "Sunnyside!";

export const PRIORITIES = {
  critical: { label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.25)", icon: "\u{1F534}" },
  high: { label: "High", color: "#ea580c", bg: "rgba(234,88,12,0.08)", border: "rgba(234,88,12,0.25)", icon: "\u{1F7E0}" },
  medium: { label: "Medium", color: "#ca8a04", bg: "rgba(202,138,4,0.08)", border: "rgba(202,138,4,0.25)", icon: "\u{1F7E1}" },
  low: { label: "Low", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.25)", icon: "\u{1F7E2}" },
};

export const STATUS_FALLBACK = { label: "Open", color: "#6366f1", bg: "rgba(99,102,241,0.1)" };
export const STATUS = {
  open: { label: "Open", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  in_progress: { label: "In Progress", color: "#0284c7", bg: "rgba(2,132,199,0.1)" },
  review: { label: "Review", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  completed: { label: "Completed", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
};

export const TEMPLATES = [
  { label: "Social Media Post", icon: "\u{1F4F1}", title: "Social media post", description: "Please create a social media post for the following:\n\n**Platform(s):** \n**Topic/message:** \n**Tone:** \n**Any specific images or links to include:** ", priority: "medium" },
  { label: "Email Campaign", icon: "\u{1F4E7}", title: "Email campaign", description: "Please design an email campaign for:\n\n**Purpose/goal:** \n**Target audience:** \n**Key message:** \n**Call to action:** \n**Send date:** ", priority: "medium" },
  { label: "Print Material", icon: "\u{1F5A8}", title: "Print material design", description: "Please create print material:\n\n**Type:** *(flyer/brochure/poster/banner)*\n**Size/dimensions:** \n**Content/copy:** \n**Brand or broker:** \n**Delivery date needed:** ", priority: "medium" },
  { label: "PowerPoint Design", icon: "\u{1F4CA}", title: "PowerPoint presentation", description: "Please design a PowerPoint presentation:\n\n**Topic/purpose:** \n**Number of slides (approx):** \n**Key content/sections:**\n- Slide 1: \n- Slide 2: \n- Slide 3: \n\n**Audience:** \n**Brand or broker:** ", priority: "medium" },
  { label: "Website Update", icon: "\u{1F310}", title: "Website update", description: "Please make the following website change:\n\n**Page/URL:** \n**What needs updating:** \n**New content/copy:** \n**Any new images needed:** ", priority: "medium" },
  { label: "Video/Photo", icon: "\u{1F3AC}", title: "Video or photo request", description: "Please produce the following:\n\n**Type:** *(video/photo/both)*\n**Purpose:** \n**Location/setting:** \n**Duration or quantity:** \n**Deadline:** ", priority: "high" },
];


export const ARCHIVE_TYPES = {
  email: { label: "Email Campaign", icon: "\u{1F4E7}", color: "#6366f1" },
  social: { label: "Social Post", icon: "\u{1F4F1}", color: "#0284c7" },
  print: { label: "Print Material", icon: "\u{1F5A8}", color: "#ca8a04" },
  video: { label: "Video/Photo", icon: "\u{1F3AC}", color: "#dc2626" },
  presentation: { label: "Presentation", icon: "\u{1F4CA}", color: "#16a34a" },
  other: { label: "Other", icon: "\u{1F4CC}", color: "#64748b" },
};

export const LEAD_SOURCES = {
  phone: { label: "Phone", icon: "\u{1F4DE}", color: "#6366f1" },
  website: { label: "Website", icon: "\u{1F310}", color: "#0284c7" },
  social: { label: "Social Media", icon: "\u{1F4F1}", color: "#ea580c" },
  email: { label: "Email", icon: "\u{1F4E7}", color: "#ca8a04" },
  webinar: { label: "Webinar", icon: "\u{1F3A5}", color: "#16a34a" },
  ad: { label: "Ad Campaign", icon: "\u{1F4E2}", color: "#dc2626" },
  event: { label: "Event", icon: "\u{1F3AA}", color: "#8b5cf6" },
  referral: { label: "Referral", icon: "\u{1F91D}", color: "#0d9488" },
  other: { label: "Other", icon: "\u{1F4CC}", color: "#64748b" },
};

export const BRAND_COLORS = [
  { name: "Alps Main", hex: "#231D68" },
  { name: "Motor", hex: "#E64592" },
  { name: "Commercial", hex: "#20A39E" },
  { name: "Let", hex: "#FAB315" },
  { name: "Personal", hex: "#464B99" },
  { name: "Alt Man", hex: "#27D7F4" },
];

export let SLA_TARGETS = {
  critical: { days: 1, hours: 8, label: "1 day" },
  high: { days: 2, hours: 16, label: "2 days" },
  medium: { days: 5, hours: 40, label: "5 days" },
  low: { days: 7, hours: 56, label: "7 days" },
};

export async function loadSlaSettings() {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "sla_targets").maybeSingle();
  if (data?.value) {
    try {
      const parsed = JSON.parse(data.value);
      SLA_TARGETS = { ...SLA_TARGETS, ...parsed };
    } catch {}
  }
}

export async function saveSlaSettings(targets) {
  SLA_TARGETS = { ...SLA_TARGETS, ...targets };
  const { data: existing } = await supabase.from("app_settings").select("key").eq("key", "sla_targets").maybeSingle();
  const val = JSON.stringify(targets);
  if (existing) { await supabase.from("app_settings").update({ value: val }).eq("key", "sla_targets"); }
  else { await supabase.from("app_settings").insert({ key: "sla_targets", value: val }); }
}

// Business hours between two dates (8h/day, skip weekends)
export function businessHoursBetween(start, end) {
  const s = new Date(start); const e = new Date(end);
  let hours = 0; const d = new Date(s);
  while (d < e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // Not weekend
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      const remaining = Math.min(e - d, dayEnd - d) / 3600000;
      hours += Math.min(remaining, 8);
    }
    d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0);
  }
  return hours;
}

// Add business days to a date (skip weekends)
export function addBusinessDays(date, days) {
  const d = new Date(date); let added = 0;
  while (added < days) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  return d;
}

export function getSlaStatus(ticket) {
  if (ticket.status === "completed" && ticket.completedAt && ticket.createdAt) {
    const bizHours = businessHoursBetween(ticket.createdAt, ticket.completedAt);
    const target = SLA_TARGETS[ticket.priority];
    if (!target) return null;
    return { met: bizHours <= target.hours, hours: Math.round(bizHours), target: target.hours, label: target.label };
  }
  if (ticket.status === "completed") return null;
  if (!ticket.createdAt) return null;
  const bizHours = businessHoursBetween(ticket.createdAt, new Date());
  const target = SLA_TARGETS[ticket.priority];
  if (!target) return null;
  const pct = Math.min(bizHours / target.hours, 1.5);
  return { active: true, elapsed: Math.round(bizHours), target: target.hours, pct, label: target.label, breached: bizHours > target.hours };
}
export function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-card);padding:1px 5px;border-radius:3px;font-size:0.9em">$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--brand)">$1</a>')
    .replace(/^- (.+)$/gm, '<span style="display:block;padding-left:16px">• $1</span>')
    .replace(/\n/g, "<br>");
}

export function formatDate(dateStr) {
  if (!dateStr) return "No deadline";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function getDueBadge(dateStr, status) {
  if (status === "completed") return null;
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return { text: Math.abs(days) + "d overdue", color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.2)" };
  if (days === 0) return { text: "Due today", color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.2)" };
  if (days === 1) return { text: "Due tomorrow", color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.2)" };
  if (days <= 3) return { text: days + "d left", color: "#ea580c", bg: "rgba(234,88,12,0.08)", border: "rgba(234,88,12,0.2)" };
  if (days <= 7) return { text: days + "d left", color: "#0284c7", bg: "rgba(2,132,199,0.08)", border: "rgba(2,132,199,0.2)" };
  return { text: days + "d left", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)" };
}

export async function getNextRef() {
  const { data } = await supabase.from("tickets").select("ref").order("ref", { ascending: false }).limit(1);
  if (!data || data.length === 0) return "M000";
  const last = parseInt(data[0].ref.replace("M", ""), 10);
  return "M" + String(last + 1).padStart(3, "0");
}

export function highlightText(text, query) {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp("(" + escaped + ")", "gi"), '<mark style="background:rgba(234,179,8,0.3);padding:0 1px;border-radius:2px">$1</mark>');
}
