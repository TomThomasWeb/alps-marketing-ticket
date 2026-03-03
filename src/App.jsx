import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const ALPS_LOGO = "/alps-logo.webp";

const DASHBOARD_PASSWORD = "Sunnyside!";

const PRIORITIES = {
  critical: { label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.25)", icon: "\u{1F534}" },
  high: { label: "High", color: "#ea580c", bg: "rgba(234,88,12,0.08)", border: "rgba(234,88,12,0.25)", icon: "\u{1F7E0}" },
  medium: { label: "Medium", color: "#ca8a04", bg: "rgba(202,138,4,0.08)", border: "rgba(202,138,4,0.25)", icon: "\u{1F7E1}" },
  low: { label: "Low", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.25)", icon: "\u{1F7E2}" },
};

const STATUS = {
  open: { label: "Open", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  in_progress: { label: "In Progress", color: "#0284c7", bg: "rgba(2,132,199,0.1)" },
  completed: { label: "Completed", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
};

const TEMPLATES = [
  { label: "Social Media Post", icon: "\u{1F4F1}", title: "Social media post", description: "Please create a social media post for the following:\n\n**Platform(s):** \n**Topic/message:** \n**Tone:** \n**Any specific images or links to include:** ", priority: "medium" },
  { label: "Email Campaign", icon: "\u{1F4E7}", title: "Email campaign", description: "Please design an email campaign for:\n\n**Purpose/goal:** \n**Target audience:** \n**Key message:** \n**Call to action:** \n**Send date:** ", priority: "medium" },
  { label: "Print Material", icon: "\u{1F5A8}", title: "Print material design", description: "Please create print material:\n\n**Type:** *(flyer/brochure/poster/banner)*\n**Size/dimensions:** \n**Content/copy:** \n**Brand or broker:** \n**Delivery date needed:** ", priority: "medium" },
  { label: "PowerPoint Design", icon: "\u{1F4CA}", title: "PowerPoint presentation", description: "Please design a PowerPoint presentation:\n\n**Topic/purpose:** \n**Number of slides (approx):** \n**Key content/sections:**\n- Slide 1: \n- Slide 2: \n- Slide 3: \n\n**Audience:** \n**Brand or broker:** ", priority: "medium" },
  { label: "Website Update", icon: "\u{1F310}", title: "Website update", description: "Please make the following website change:\n\n**Page/URL:** \n**What needs updating:** \n**New content/copy:** \n**Any new images needed:** ", priority: "medium" },
  { label: "Video/Photo", icon: "\u{1F3AC}", title: "Video or photo request", description: "Please produce the following:\n\n**Type:** *(video/photo/both)*\n**Purpose:** \n**Location/setting:** \n**Duration or quantity:** \n**Deadline:** ", priority: "high" },
];


const ARCHIVE_TYPES = {
  email: { label: "Email Campaign", icon: "\u{1F4E7}", color: "#6366f1" },
  social: { label: "Social Post", icon: "\u{1F4F1}", color: "#0284c7" },
  print: { label: "Print Material", icon: "\u{1F5A8}", color: "#ca8a04" },
  video: { label: "Video/Photo", icon: "\u{1F3AC}", color: "#dc2626" },
  presentation: { label: "Presentation", icon: "\u{1F4CA}", color: "#16a34a" },
  other: { label: "Other", icon: "\u{1F4CC}", color: "#64748b" },
};

const LEAD_SOURCES = {
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

const BRAND_COLORS = [
  { name: "Alps Main", hex: "#231D68" },
  { name: "Motor", hex: "#E64592" },
  { name: "Commercial", hex: "#20A39E" },
  { name: "Let", hex: "#FAB315" },
  { name: "Personal", hex: "#464B99" },
  { name: "Alt Man", hex: "#27D7F4" },
];

function renderMarkdown(text) {
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

async function getNextRef() {
  const { data } = await supabase.from("tickets").select("ref").order("ref", { ascending: false }).limit(1);
  if (!data || data.length === 0) return "M000";
  const last = parseInt(data[0].ref.replace("M", ""), 10);
  return "M" + String(last + 1).padStart(3, "0");
}

function formatDate(dateStr) {
  if (!dateStr) return "No deadline";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getDueBadge(dateStr, status) {
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

function FileChip({ name, url, onRemove }) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = { pdf: "\u{1F4C4}", doc: "\u{1F4DD}", docx: "\u{1F4DD}", xls: "\u{1F4CA}", xlsx: "\u{1F4CA}", png: "\u{1F5BC}", jpg: "\u{1F5BC}", jpeg: "\u{1F5BC}", gif: "\u{1F5BC}", mp4: "\u{1F3AC}", zip: "\u{1F4E6}" };
  const content = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: url ? "var(--brand)" : "#475569", cursor: url ? "pointer" : "default", transition: "all 0.2s", textDecoration: "none" }}>
      <span>{icons[ext] || "\u{1F4CE}"}</span>
      <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      {url && <span style={{ fontSize: 11, opacity: 0.5 }}>{"\u2197"}</span>}
      {onRemove && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>{"\u00D7"}</button>}
    </span>
  );
  if (url) return <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{content}</a>;
  return content;
}


function HubHome({ onNavigate, tickets, dashUnlocked, leads }) {
  const activeCount = tickets.filter((t) => t.status !== "completed").length;

  const cardBtn = (id, opts) => {
    const isSoon = opts.soon;
    return (
      <button key={id} onClick={() => !isSoon && onNavigate(id)} disabled={isSoon}
        style={{ position: "relative", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: opts.compact ? "14px 16px" : "24px 20px", textAlign: "left", cursor: isSoon ? "default" : "pointer", transition: "all 0.2s", opacity: isSoon ? 0.55 : 1, display: "flex", flexDirection: opts.compact ? "row" : "column", gap: opts.compact ? 12 : 0, alignItems: opts.compact ? "center" : "flex-start" }}
        onMouseOver={(e) => { if (!isSoon) { e.currentTarget.style.boxShadow = "var(--shadow-hover)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = opts.color; } }}
        onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
        <div style={{ fontSize: opts.compact ? 22 : 28, marginBottom: opts.compact ? 0 : 10, flexShrink: 0 }}>{opts.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: opts.compact ? 13 : 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: opts.compact ? 1 : 4 }}>{opts.title}</div>
          <div style={{ fontSize: opts.compact ? 11 : 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>{opts.desc}</div>
        </div>
        {isSoon && <span style={{ position: "absolute", top: opts.compact ? 8 : 12, right: opts.compact ? 8 : 12, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--bar-bg)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Soon</span>}
        {opts.badge && <span style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{opts.badge}</span>}
      </button>
    );
  };

  const sectionLabel = (icon, text) => (
    <h3 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>{icon} {text}</h3>
  );

  return (
    <div style={{ width: "100%", maxWidth: 820 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "var(--brand)", letterSpacing: "-0.01em" }}>Marketing Hub</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Your central place for marketing requests, resources, and tools.</p>
      </div>

      <button onClick={() => onNavigate("guide")} style={{ width: "100%", background: "linear-gradient(135deg, #ca8a04 0%, #a16207 100%)", border: "none", borderRadius: 12, padding: "16px 24px", marginBottom: 24, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s", textAlign: "left" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(161,98,7,0.25)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
        <div style={{ fontSize: 28 }}>{"\u{1F4D6}"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Self-Service Guide</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Image sizes, brand rules, request process, FAQs, and everything you need before submitting a ticket.</div>
        </div>
        <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)" }}>{"\u2192"}</div>
      </button>

      <div className="hub-layout-main" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, marginBottom: 24 }}>

        <div>
          {sectionLabel("\u{1F4CB}", "Tickets & Leads")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {cardBtn("form", { icon: "\u{1F4DD}", title: "Submit a Ticket", desc: "Request marketing support", color: "#6366f1" })}
            {cardBtn("tracker", { icon: "\u{1F50D}", title: "Track a Ticket", desc: "Check request status", color: "#0284c7" })}
            {cardBtn("lead_form", { icon: "\u{1F4C8}", title: "Log a Lead", desc: "Record an inbound lead", color: "#16a34a" })}
          </div>

          <div style={{ marginTop: 20 }}>
            {sectionLabel("\u{1F4DA}", "Resources")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {cardBtn("archive", { icon: "\u{1F4DA}", title: "Marketing Archive", desc: "Browse campaigns, posts, and materials", color: "#8b5cf6" })}
              {cardBtn("brand_assets", { icon: "\u{1F3A8}", title: "Brand Assets", desc: "Colours, fonts, logos, and icons", color: "#E64592" })}
            </div>
          </div>
        </div>

        <div>
          {sectionLabel("\u{1F6E0}\uFE0F", "Marketing Tools")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cardBtn("templates", { icon: "\u{1F4C4}", title: "Content Templates", desc: "Reusable copy and snippets", color: "#0d9488", compact: true })}
            {cardBtn("footer", { icon: "\u2709\uFE0F", title: "Email Footer Generator", desc: "Branded email signatures", color: "#ea580c", compact: true, soon: true })}
            {cardBtn("planner", { icon: "\u{1F5D3}", title: "Campaign Planner", desc: "Multi-channel campaign tracking", color: "#7c3aed", compact: true, soon: true })}
            {cardBtn("converter", { icon: "\u{1F504}", title: "File Converter", desc: "Resize and convert files", color: "#64748b", compact: true, soon: true })}
          </div>
        </div>

      </div>

      <div style={{ paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        {sectionLabel("\u{1F4CA}", "Dashboards")}
        <div className="hub-dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {cardBtn("dashboard", { icon: "\u{1F4CB}", title: "Ticket Dashboard", desc: activeCount > 0 ? activeCount + " active" : "Manage tickets", color: "#231d68", badge: dashUnlocked && activeCount > 0 ? activeCount : null })}
          {cardBtn("leads_dashboard", { icon: "\u{1F4C8}", title: "Leads Dashboard", desc: leads.length > 0 ? leads.length + " logged" : "View leads", color: "#0d9488" })}
          {cardBtn("analytics", { icon: "\u{1F4CA}", title: "Analytics", desc: "Metrics & monthly report", color: "#dc2626" })}
        </div>
      </div>
    </div>
  );
}


function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (pw === DASHBOARD_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPw("");
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", padding: 24 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", animation: shake ? "shakeAnim 0.4s ease" : "none" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(35,29,104,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>{"\u{1F512}"}</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>Dashboard Access</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Enter the password to view the ticket dashboard.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={inputRef} type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="Password" style={{ flex: 1, padding: "11px 14px", background: "var(--bg-input)", border: "1px solid " + (error ? "#ef4444" : "var(--border)"), borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none", transition: "border 0.2s, box-shadow 0.2s" }} onFocus={(e) => { e.target.style.borderColor = error ? "#ef4444" : "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px " + (error ? "rgba(239,68,68,0.1)" : "var(--brand-glow)"); }} onBlur={(e) => { e.target.style.borderColor = error ? "#ef4444" : "var(--border)"; e.target.style.boxShadow = "none"; }} />
          <button onClick={handleSubmit} style={{ padding: "11px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }} onMouseOver={(e) => e.target.style.background = "var(--brand)"} onMouseOut={(e) => e.target.style.background = "var(--brand)"}>
            Unlock
          </button>
        </div>
        {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#ef4444", fontWeight: 500 }}>Incorrect password. Please try again.</p>}
      </div>
    </div>
  );
}

function TicketForm({ onSubmit }) {
  const [form, setForm] = useState({ name: "", title: "", description: "", priority: "medium", deadline: "", files: [] });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    setForm((f) => ({ ...f, files: [...f.files, ...newFiles].slice(0, 5) }));
    e.target.value = "";
  };

  const removeFile = (idx) => setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== idx) }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.title.trim()) e.title = "Task title is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await onSubmit({ ...form, actualFiles: form.files });
    setForm({ name: "", title: "", description: "", priority: "medium", deadline: "", files: [] });
    setSubmitting(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const inputStyle = (field) => ({ width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid " + (errors[field] ? "#ef4444" : "var(--border)"), borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none", transition: "border 0.2s, box-shadow 0.2s", boxSizing: "border-box" });
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6, letterSpacing: "0.02em" };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, maxWidth: 560, width: "100%" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Submit a Request</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>Please fill in the form to submit a ticket, and I'll get right on it. Once your ticket is complete, I will notify you.</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ ...labelStyle, marginBottom: 8 }}>Quick Templates</label>
        <div className="hub-template-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {TEMPLATES.map((tmpl, i) => (
            <button key={i} onClick={() => { update("title", tmpl.title); update("description", tmpl.description); update("priority", tmpl.priority); }} style={{ padding: "10px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-body)", lineHeight: 1.3 }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "rgba(35,29,104,0.03)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#fff"; }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{tmpl.icon}</div>
              {tmpl.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Your Name *</label>
        <input style={inputStyle("name")} placeholder="e.g. Sarah Johnson" value={form.name} onChange={(e) => update("name", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = errors.name ? "#ef4444" : "var(--border)"; e.target.style.boxShadow = "none"; }} />
        {errors.name && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>{errors.name}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Task Title *</label>
        <input style={inputStyle("title")} placeholder="e.g. Update Q1 social media calendar" value={form.title} onChange={(e) => update("title", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = errors.title ? "#ef4444" : "var(--border)"; e.target.style.boxShadow = "none"; }} />
        {errors.title && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>{errors.title}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description *</label>
        <textarea rows={4} style={{ ...inputStyle("description"), resize: "vertical", fontFamily: "inherit" }} placeholder="Describe what you need - include any relevant details, links, or specs..." value={form.description} onChange={(e) => update("description", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = errors.description ? "#ef4444" : "var(--border)"; e.target.style.boxShadow = "none"; }} />
        {errors.description && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>{errors.description}</span>}
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>Supports **bold**, *italic*, `code`, - bullet lists, and [links](url)</span>
      </div>

      <div className="hub-priority-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Priority</label>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(PRIORITIES).map(([key, p]) => (
              <button key={key} onClick={() => update("priority", key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", background: form.priority === key ? p.bg : "var(--bg-input)", border: "1.5px solid " + (form.priority === key ? p.color : "var(--border)"), color: form.priority === key ? p.color : "var(--text-muted)" }}>
                <span style={{ display: "block", fontSize: 14, marginBottom: 2 }}>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Deadline</label>
          <input type="date" min={today} style={{ ...inputStyle(null), cursor: "pointer" }} value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Attachments <span style={{ fontWeight: 400, opacity: 0.6 }}>(max 5 files)</span></label>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={handleFiles} />
        <button onClick={() => fileRef.current?.click()} style={{ padding: "10px 18px", background: "var(--bg-input)", border: "1px dashed var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, transition: "all 0.2s", width: "100%" }} onMouseOver={(e) => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "var(--brand)"; }} onMouseOut={(e) => { e.target.style.background = "#fff"; e.target.style.borderColor = "var(--border)"; }}>
          {"\u{1F4CE}"} Click to attach files
        </button>
        {form.files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {form.files.map((f, i) => <FileChip key={i} name={f.name} onRemove={() => removeFile(i)} />)}
          </div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", padding: "13px", background: submitting ? "var(--brand)" : "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "wait" : "pointer", transition: "all 0.2s", letterSpacing: "0.02em", boxShadow: "0 4px 14px var(--brand-glow)" }} onMouseOver={(e) => { if (!submitting) { e.target.style.background = "var(--brand)"; e.target.style.boxShadow = "0 6px 20px var(--brand-glow)"; } }} onMouseOut={(e) => { e.target.style.background = "var(--brand)"; e.target.style.boxShadow = "0 4px 14px var(--brand-glow)"; }}>
        {submitting ? "Submitting\u2026" : "Submit Ticket \u2192"}
      </button>
    </div>
  );
}

function TicketCard({ ticket, onStatusChange, onComplete, onAddNote, onDelete, onUpdatePriority, onUpdateDeadline, onReopen, onTogglePin }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState(ticket.deadline || "");
  const p = PRIORITIES[ticket.priority];
  const s = STATUS[ticket.status];
  const dueBadge = getDueBadge(ticket.deadline, ticket.status);
  const today = new Date().toISOString().split("T")[0];

  const submitNote = () => {
    if (!noteText.trim() || !noteName.trim()) return;
    onAddNote(ticket.id, noteName.trim(), noteText.trim());
    setNoteText("");
    setNoteName("");
  };

  const handlePriorityChange = (newPriority) => {
    if (newPriority !== ticket.priority) {
      onUpdatePriority(ticket.id, newPriority);
    }
    setEditingPriority(false);
  };

  const handleDeadlineSave = () => {
    if (newDeadline !== ticket.deadline) {
      onUpdateDeadline(ticket.id, newDeadline);
    }
    setEditingDeadline(false);
  };

  return (
    <div onClick={() => setExpanded(!expanded)} style={{ background: ticket.status === "completed" ? "var(--bg-completed)" : "var(--bg-card)", border: "1px solid " + (ticket.status === "completed" ? "var(--border-light)" : dueBadge && dueBadge.color === "#dc2626" ? "rgba(220,38,38,0.25)" : "var(--border)"), borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "all 0.2s", opacity: ticket.status === "completed" ? 0.65 : 1 }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-hover)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--brand)", fontWeight: 700, letterSpacing: "0.04em", background: "var(--brand-light)", padding: "2px 7px", borderRadius: 4 }}>{ticket.id}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: p.bg, color: p.color, border: "1px solid " + p.border, letterSpacing: "0.03em" }}>{p.icon} {p.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, letterSpacing: "0.03em" }}>{s.label}</span>
            {dueBadge && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: dueBadge.bg, color: dueBadge.color, border: "1px solid " + dueBadge.border }}>{dueBadge.text}</span>}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--brand)", textDecoration: ticket.status === "completed" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>{ticket.title}</h3>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>{"\u{1F464}"} {ticket.name}</span>
            <span>{"\u{1F4C5}"} {formatDate(ticket.deadline)}</span>
            <span style={{ opacity: 0.6 }}>Created {new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            {ticket.completedAt && <span style={{ color: "#16a34a" }}>{"\u2713"} Completed {new Date(ticket.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 4 }}>
          <span onClick={(e) => { e.stopPropagation(); onTogglePin(ticket.id); }} style={{ fontSize: 16, cursor: "pointer", transition: "all 0.15s", color: ticket.pinned ? "#eab308" : "#d1d5db", filter: ticket.pinned ? "drop-shadow(0 0 2px rgba(234,179,8,0.4))" : "none" }} title={ticket.pinned ? "Unpin ticket" : "Pin ticket"}>{ticket.pinned ? "\u2605" : "\u2606"}</span>
          <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>{"\u25BE"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(ticket.description) }}></div>

          {ticket.status !== "completed" && (
            <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Priority</div>
                {editingPriority ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    {Object.entries(PRIORITIES).map(([key, pr]) => (
                      <button key={key} onClick={() => handlePriorityChange(key)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1.5px solid " + (ticket.priority === key ? pr.color : "var(--border)"), background: ticket.priority === key ? pr.bg : "var(--bg-input)", color: ticket.priority === key ? pr.color : "var(--text-muted)", transition: "all 0.15s" }}>
                        {pr.icon} {pr.label}
                      </button>
                    ))}
                    <button onClick={() => setEditingPriority(false)} style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-input)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>{"\u2715"}</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingPriority(true)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1.5px solid " + p.border, background: p.bg, color: p.color, transition: "all 0.15s" }} title="Click to change priority">
                    {p.icon} {p.label} {"\u270E"}
                  </button>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Deadline</div>
                {editingDeadline ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input type="date" min={today} value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} style={{ padding: "5px 10px", border: "1px solid var(--brand)", borderRadius: 6, fontSize: 12, color: "var(--text-primary)", outline: "none", boxShadow: "0 0 0 3px var(--brand-glow)" }} />
                    <button onClick={handleDeadlineSave} style={{ padding: "5px 10px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u2713"} Save</button>
                    <button onClick={() => { setEditingDeadline(false); setNewDeadline(ticket.deadline || ""); }} style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-input)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>{"\u2715"}</button>
                  </div>
                ) : (
                  <button onClick={() => { setNewDeadline(ticket.deadline || ""); setEditingDeadline(true); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-body)", transition: "all 0.15s" }} title="Click to change deadline">
                    {"\u{1F4C5}"} {ticket.deadline ? formatDate(ticket.deadline) : "No deadline"} {"\u270E"}
                  </button>
                )}
              </div>
            </div>
          )}

          {ticket.files?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {ticket.files.map((f, i) => <FileChip key={i} name={f.name} url={f.url} />)}
            </div>
          )}

          {ticket.notes && ticket.notes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
              {ticket.notes.map((note, i) => (
                <div key={i} style={{ background: note.auto ? "var(--brand-light)" : "var(--bg-input)", border: "1px solid " + (note.auto ? "rgba(35,29,104,0.1)" : "var(--border)"), borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: note.auto ? "#6366f1" : "var(--brand)" }}>{note.author}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(note.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5, fontStyle: note.auto ? "italic" : "normal" }}>{note.text}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={noteName} onChange={(e) => setNoteName(e.target.value)} placeholder="Your name" style={{ width: 130, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", flexShrink: 0 }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }} style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
              <button onClick={submitNote} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }} onMouseOver={(e) => e.target.style.background = "var(--brand)"} onMouseOut={(e) => e.target.style.background = "var(--brand)"}>
                + Add
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {ticket.status === "completed" && (
              <button onClick={() => onReopen(ticket.id)} style={{ padding: "8px 16px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(99,102,241,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(99,102,241,0.1)"}>
                {"\u21A9"} Reopen Ticket
              </button>
            )}
            {ticket.status !== "completed" && (
              <>
                {ticket.status === "open" && (
                  <button onClick={() => onStatusChange(ticket.id, "in_progress")} style={{ padding: "8px 16px", background: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.25)", borderRadius: 8, color: "#0284c7", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(2,132,199,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(2,132,199,0.1)"}>
                    {"\u25B6"} Start Progress
                  </button>
                )}
                <button onClick={() => onComplete(ticket.id)} style={{ padding: "8px 16px", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 8, color: "#16a34a", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(22,163,74,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(22,163,74,0.1)"}>
                  {"\u2713"} Mark Complete
                </button>
              </>
            )}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: "8px 16px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", marginLeft: "auto" }} onMouseOver={(e) => e.target.style.background = "rgba(220,38,38,0.12)"} onMouseOut={(e) => e.target.style.background = "rgba(220,38,38,0.06)"}>
                {"\u{1F5D1}"} Delete
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
                <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Are you sure?</span>
                <button onClick={() => { onDelete(ticket.id); setConfirmDelete(false); }} style={{ padding: "6px 12px", background: "#dc2626", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GridCard({ ticket, onStatusChange, onComplete, onDelete, onReopen, onTogglePin }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = PRIORITIES[ticket.priority];
  const s = STATUS[ticket.status];
  const dueBadge = getDueBadge(ticket.deadline, ticket.status);
  const isOverdue = dueBadge && dueBadge.color === "#dc2626";

  return (
    <div style={{ background: ticket.status === "completed" ? "var(--bg-completed)" : "var(--bg-card)", border: isOverdue ? "2px solid rgba(220,38,38,0.5)" : "1px solid " + (ticket.status === "completed" ? "var(--border-light)" : "var(--border)"), borderRadius: 10, padding: 14, opacity: ticket.status === "completed" ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 8, transition: "all 0.2s", minHeight: 140, boxShadow: isOverdue ? "0 0 8px rgba(220,38,38,0.12)" : "none" }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = isOverdue ? "0 2px 14px rgba(220,38,38,0.2)" : "0 2px 12px rgba(35,29,104,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = isOverdue ? "0 0 8px rgba(220,38,38,0.12)" : "none"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--brand)", fontWeight: 700, background: "var(--brand-light)", padding: "1px 6px", borderRadius: 3 }}>{ticket.id}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 12, background: p.bg, color: p.color, border: "1px solid " + p.border }}>{p.icon} {p.label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 12, background: s.bg, color: s.color }}>{s.label}</span>
        <span onClick={() => onTogglePin(ticket.id)} style={{ fontSize: 13, cursor: "pointer", marginLeft: "auto", color: ticket.pinned ? "#eab308" : "#d1d5db" }}>{ticket.pinned ? "\u2605" : "\u2606"}</span>
      </div>
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: ticket.status === "completed" ? "line-through" : "none", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ticket.title}</h4>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 2, marginTop: "auto" }}>
        <span>{"\u{1F464}"} {ticket.name}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>{"\u{1F4C5}"} {formatDate(ticket.deadline)}</span>
          {dueBadge && <span style={{ fontSize: 10, fontWeight: 700, color: dueBadge.color }}>{dueBadge.text}</span>}
        </div>
        {ticket.completedAt && <span style={{ color: "#16a34a", fontSize: 10 }}>{"\u2713"} {new Date(ticket.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
      </div>
      {ticket.notes && ticket.notes.length > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{"\u{1F4DD}"} {ticket.notes.length} note{ticket.notes.length !== 1 ? "s" : ""}</span>}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
        {ticket.status === "completed" && <button onClick={() => onReopen(ticket.id)} style={{ padding: "4px 8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 5, color: "#6366f1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{"\u21A9"}</button>}
        {ticket.status === "open" && <button onClick={() => onStatusChange(ticket.id, "in_progress")} style={{ padding: "4px 8px", background: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 5, color: "#0284c7", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{"\u25B6"}</button>}
        {ticket.status !== "completed" && <button onClick={() => onComplete(ticket.id)} style={{ padding: "4px 8px", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 5, color: "#16a34a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{"\u2713"}</button>}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ padding: "4px 8px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 5, color: "#dc2626", fontSize: 11, cursor: "pointer", marginLeft: "auto" }}>{"\u{1F5D1}"}</button>
        ) : (
          <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
            <button onClick={() => { onDelete(ticket.id); setConfirmDelete(false); }} style={{ padding: "4px 8px", background: "#dc2626", border: "none", borderRadius: 5, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: "4px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-secondary)", fontSize: 10, cursor: "pointer" }}>No</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsBar({ tickets }) {
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    critical: tickets.filter((t) => t.priority === "critical" && t.status !== "completed").length,
  };
  const statCards = [
    { label: "Total", value: stats.total, color: "var(--brand)", bg: "rgba(35,29,104,0.06)" },
    { label: "Open", value: stats.open, color: "#6366f1", bg: "rgba(99,102,241,0.06)" },
    { label: "In Progress", value: stats.inProgress, color: "#0284c7", bg: "rgba(2,132,199,0.06)" },
    { label: "Completed", value: stats.completed, color: "#16a34a", bg: "rgba(22,163,74,0.06)" },
    { label: "Critical", value: stats.critical, color: "#dc2626", bg: "rgba(220,38,38,0.06)" },
  ];
  return (
    <div className="hub-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
      {statCards.map((s) => (
        <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "14px 16px", border: "1px solid " + s.color + "15", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPanel({ tickets, archiveEntries, leads }) {
  const [tab, setTab] = useState("tickets");
  const ts = (key) => ({ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: tab === key ? "var(--brand)" : "transparent", color: tab === key ? "#fff" : "var(--text-secondary)" });
  const card = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };
  const mb = { background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", textAlign: "center" };
  const mv = { fontSize: 26, fontWeight: 800, color: "var(--brand)", lineHeight: 1 };
  const ml = { fontSize: 11, color: "var(--text-secondary)", fontWeight: 500, marginTop: 4 };
  const st = { fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" };
  const now = new Date();
  const sow = new Date(now); sow.setDate(now.getDate() - now.getDay()); sow.setHours(0, 0, 0, 0);
  const slw = new Date(sow); slw.setDate(slw.getDate() - 7);
  const fmtH = (h) => h === 0 ? "--" : h < 24 ? Math.round(h) + "h" : (h / 24).toFixed(1) + "d";

  // Ticket metrics
  const ct = tickets.filter((t) => t.completedAt && t.createdAt);
  const at = tickets.filter((t) => t.status !== "completed");
  const avgH = ct.length > 0 ? ct.reduce((s, t) => s + (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000, 0) / ct.length : 0;
  const cTimes = ct.map((t) => (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000);
  const fH = cTimes.length > 0 ? Math.min(...cTimes) : 0;
  const sH = cTimes.length > 0 ? Math.max(...cTimes) : 0;
  const twC = tickets.filter((t) => new Date(t.createdAt) >= sow).length;
  const lwC = tickets.filter((t) => { const d = new Date(t.createdAt); return d >= slw && d < sow; }).length;
  const twD = ct.filter((t) => new Date(t.completedAt) >= sow).length;
  const lwD = ct.filter((t) => { const d = new Date(t.completedAt); return d >= slw && d < sow; }).length;
  const od = at.filter((t) => { const d = daysUntil(t.deadline); return d !== null && d < 0; }).length;
  const cr = tickets.length > 0 ? Math.round(ct.length / tickets.length * 100) : 0;
  const pb = { critical: 0, high: 0, medium: 0, low: 0 }; at.forEach((t) => { if (pb[t.priority] !== undefined) pb[t.priority]++; }); const mp = Math.max(...Object.values(pb), 1);
  const pa = {}; Object.keys(PRIORITIES).forEach((k) => { const pts = ct.filter((t) => t.priority === k); pa[k] = pts.length > 0 ? fmtH(pts.reduce((s, t) => s + (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000, 0) / pts.length) : "--"; });
  const sc = {}; tickets.forEach((t) => { sc[t.name] = (sc[t.name] || 0) + 1; }); const topS = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 8); const msub = topS.length > 0 ? topS[0][1] : 1;
  const mt = []; for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59); const lb = d.toLocaleDateString("en-GB", { month: "short" }); mt.push({ label: lb, c: tickets.filter((t) => { const x = new Date(t.createdAt); return x >= d && x <= end; }).length, done: ct.filter((t) => { const x = new Date(t.completedAt); return x >= d && x <= end; }).length }); } const mmt = Math.max(...mt.map((m) => Math.max(m.c, m.done)), 1);

  // Archive metrics
  const atw = archiveEntries.filter((e) => new Date(e.date || e.created_at) >= sow).length;
  const alw = archiveEntries.filter((e) => { const d = new Date(e.date || e.created_at); return d >= slw && d < sow; }).length;
  const atb = {}; Object.keys(ARCHIVE_TYPES).forEach((k) => { atb[k] = 0; }); archiveEntries.forEach((e) => { atb[e.type] = (atb[e.type] || 0) + 1; }); const mat = Math.max(...Object.values(atb), 1);
  const ma = []; for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59); ma.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), v: archiveEntries.filter((e) => { const x = new Date(e.date || e.created_at); return x >= d && x <= end; }).length }); } const mma = Math.max(...ma.map((m) => m.v), 1);

  // Leads metrics
  const ltw = leads.filter((l) => new Date(l.created_at) >= sow).length;
  const llw = leads.filter((l) => { const d = new Date(l.created_at); return d >= slw && d < sow; }).length;
  const lna = leads.filter((l) => l.next_steps === "needs_action").length;
  const lpt = leads.filter((l) => l.next_steps === "passed_through").length;
  const lsb = {}; Object.keys(LEAD_SOURCES).forEach((k) => { lsb[k] = 0; }); leads.forEach((l) => { lsb[l.source] = (lsb[l.source] || 0) + 1; }); const mls = Math.max(...Object.values(lsb), 1);
  const mld = []; for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59); mld.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), v: leads.filter((l) => { const x = new Date(l.created_at); return x >= d && x <= end; }).length }); } const mml = Math.max(...mld.map((m) => m.v), 1);
  const ll = {}; leads.forEach((l) => { ll[l.logged_by] = (ll[l.logged_by] || 0) + 1; }); const topL = Object.entries(ll).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const barChart = (data, maxV, color, vKey) => (<div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>{data.map((m, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: "60%", background: color, borderRadius: "3px 3px 0 0", height: (m[vKey] / maxV * 90) + "px", minHeight: m[vKey] > 0 ? 4 : 0, opacity: 0.7 }}></div><span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{m.label}</span></div>))}</div>);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4CA}"} Analytics Dashboard</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Performance metrics across all areas</p></div>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: 10, padding: 3, border: "1px solid var(--border)" }}><button onClick={() => setTab("tickets")} style={ts("tickets")}>{"\u{1F4CB}"} Tickets</button><button onClick={() => setTab("archive")} style={ts("archive")}>{"\u{1F4DA}"} Archive</button><button onClick={() => setTab("leads")} style={ts("leads")}>{"\u{1F4C8}"} Leads</button><button onClick={() => setTab("report")} style={ts("report")}>{"\u{1F4CB}"} Report</button></div>
      </div>

      {tab === "tickets" && (<>
        <div className="hub-analytics-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 20 }}>
          <div style={mb}><div style={mv}>{tickets.length}</div><div style={ml}>Total</div></div>
          <div style={mb}><div style={mv}>{at.length}</div><div style={ml}>Active</div></div>
          <div style={mb}><div style={mv}>{cr}%</div><div style={ml}>Completion Rate</div></div>
          <div style={mb}><div style={mv}>{fmtH(avgH)}</div><div style={ml}>Avg. Turnaround</div></div>
          <div style={{ ...mb, borderColor: od > 0 ? "rgba(220,38,38,0.3)" : "var(--border)" }}><div style={{ ...mv, color: od > 0 ? "#dc2626" : "var(--brand)" }}>{od}</div><div style={ml}>Overdue</div></div>
        </div>
        <div className="hub-week-compare" style={{ ...card, padding: "14px 20px", marginBottom: 20, display: "flex", gap: 24, justifyContent: "center", alignItems: "center", fontSize: 13, color: "var(--text-secondary)" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Last Week</div><span><strong style={{ color: "var(--brand)", fontSize: 18 }}>{lwC}</strong> in</span><span style={{ margin: "0 6px", opacity: 0.3 }}>|</span><span><strong style={{ color: "#16a34a", fontSize: 18 }}>{lwD}</strong> out</span></div>
          <div style={{ width: 1, height: 32, background: "var(--border)" }}></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>This Week</div><span><strong style={{ color: "var(--brand)", fontSize: 18 }}>{twC}</strong> in</span><span style={{ margin: "0 6px", opacity: 0.3 }}>|</span><span><strong style={{ color: "#16a34a", fontSize: 18 }}>{twD}</strong> out</span></div>
        </div>
        <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={card}><div style={st}>Monthly Trend</div><div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>{mt.map((m, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ display: "flex", gap: 2, alignItems: "flex-end", width: "100%", justifyContent: "center", height: 90 }}><div style={{ width: "40%", background: "var(--brand)", borderRadius: "3px 3px 0 0", height: (m.c / mmt * 90) + "px", minHeight: m.c > 0 ? 4 : 0, opacity: 0.7 }}></div><div style={{ width: "40%", background: "#16a34a", borderRadius: "3px 3px 0 0", height: (m.done / mmt * 90) + "px", minHeight: m.done > 0 ? 4 : 0, opacity: 0.7 }}></div></div><span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{m.label}</span></div>))}</div><div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}><span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--brand)", marginRight: 4, opacity: 0.7 }}></span>Submitted</span><span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#16a34a", marginRight: 4, opacity: 0.7 }}></span>Completed</span></div></div>
          <div style={card}><div style={st}>Turnaround by Priority</div>{Object.entries(PRIORITIES).map(([key, p]) => (<div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{p.icon} {p.label}</span><span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{pa[key]}</span></div>))}<div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}><span>Fastest: <strong style={{ color: "#16a34a" }}>{fmtH(fH)}</strong></span><span>Slowest: <strong style={{ color: "#dc2626" }}>{fmtH(sH)}</strong></span></div></div>
        </div>
        <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}><div style={st}>Active by Priority</div>{Object.entries(PRIORITIES).map(([key, p]) => (<div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 11, fontWeight: 600, color: p.color, width: 60, flexShrink: 0 }}>{p.icon} {p.label}</span><div style={{ flex: 1, height: 10, background: "var(--bar-bg)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: (pb[key] / mp * 100) + "%", height: "100%", background: p.color, borderRadius: 5 }}></div></div><span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-body)", width: 24, textAlign: "right" }}>{pb[key]}</span></div>))}</div>
          <div style={card}><div style={st}>Top Submitters</div>{topS.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No tickets yet</p> : topS.map(([name, count]) => (<div key={name} style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 12, color: "var(--text-body)", fontWeight: 500 }}>{name}</span><span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)" }}>{count}</span></div><div style={{ height: 4, background: "var(--bar-bg)", borderRadius: 2, overflow: "hidden" }}><div style={{ width: (count / msub * 100) + "%", height: "100%", background: "var(--brand)", borderRadius: 2, opacity: 0.5 }}></div></div></div>))}</div>
        </div>
      </>)}

      {tab === "archive" && (<>
        <div className="hub-analytics-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
          <div style={mb}><div style={mv}>{archiveEntries.length}</div><div style={ml}>Total Entries</div></div>
          <div style={mb}><div style={mv}>{atw}</div><div style={ml}>This Week</div></div>
          <div style={mb}><div style={mv}>{alw}</div><div style={ml}>Last Week</div></div>
          <div style={mb}><div style={mv}>{atw > alw ? "\u2191" : atw < alw ? "\u2193" : "\u2192"}</div><div style={ml}>Trend</div></div>
        </div>
        <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}><div style={st}>Monthly Output</div>{barChart(ma, mma, "#8b5cf6", "v")}</div>
          <div style={card}><div style={st}>By Type</div>{Object.entries(ARCHIVE_TYPES).map(([key, t]) => (<div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 11, fontWeight: 600, color: t.color, width: 80, flexShrink: 0 }}>{t.icon} {t.label}</span><div style={{ flex: 1, height: 10, background: "var(--bar-bg)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: ((atb[key] || 0) / mat * 100) + "%", height: "100%", background: t.color, borderRadius: 5 }}></div></div><span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-body)", width: 24, textAlign: "right" }}>{atb[key] || 0}</span></div>))}</div>
        </div>
      </>)}

      {tab === "leads" && (<>
        <div className="hub-analytics-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
          <div style={mb}><div style={mv}>{leads.length}</div><div style={ml}>Total Leads</div></div>
          <div style={mb}><div style={mv}>{ltw}</div><div style={ml}>This Week</div></div>
          <div style={{ ...mb, borderColor: lna > 0 ? "rgba(202,138,4,0.3)" : "var(--border)" }}><div style={{ ...mv, color: lna > 0 ? "#ca8a04" : "var(--brand)" }}>{lna}</div><div style={ml}>Needs Action</div></div>
          <div style={mb}><div style={mv}>{lpt}</div><div style={ml}>Passed Through</div></div>
          <div style={mb}><div style={mv}>{leads.length > 0 ? Math.round(lpt / leads.length * 100) + "%" : "--"}</div><div style={ml}>Pass-Through Rate</div></div>
        </div>
        <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={card}><div style={st}>Monthly Leads</div>{barChart(mld, mml, "#0d9488", "v")}</div>
          <div style={card}><div style={st}>By Source</div>{Object.entries(LEAD_SOURCES).map(([key, s]) => { const cnt = lsb[key] || 0; if (cnt === 0 && key === "other") return null; return (<div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 600, color: s.color, width: 70, flexShrink: 0 }}>{s.icon} {s.label}</span><div style={{ flex: 1, height: 10, background: "var(--bar-bg)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: (cnt / mls * 100) + "%", height: "100%", background: s.color, borderRadius: 5 }}></div></div><span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-body)", width: 24, textAlign: "right" }}>{cnt}</span></div>); })}</div>
        </div>
        <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}><div style={st}>Week Comparison</div><div style={{ display: "flex", gap: 20, justifyContent: "center", fontSize: 13, color: "var(--text-secondary)" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Last Week</div><div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)" }}>{llw}</div></div><div style={{ width: 1, background: "var(--border)" }}></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>This Week</div><div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)" }}>{ltw}</div></div></div></div>
          <div style={card}><div style={st}>Top Loggers</div>{topL.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No leads yet</p> : topL.map(([name, count]) => (<div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, color: "var(--text-body)" }}>{name}</span><span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "1px 8px", borderRadius: 10 }}>{count}</span></div>))}</div>
        </div>
      </>)}

      {tab === "report" && (() => {
        const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        const som = new Date(now.getFullYear(), now.getMonth(), 1);
        const mtTC = tickets.filter((t) => new Date(t.createdAt) >= som).length;
        const mtTD = ct.filter((t) => new Date(t.completedAt) >= som).length;
        const mtA = archiveEntries.filter((e) => new Date(e.date || e.created_at) >= som).length;
        const mtL = leads.filter((l) => new Date(l.created_at) >= som).length;
        const mtLA = leads.filter((l) => new Date(l.created_at) >= som && l.next_steps === "needs_action").length;
        const mtLP = leads.filter((l) => new Date(l.created_at) >= som && l.next_steps === "passed_through").length;
        const mtAT = {};
        archiveEntries.filter((e) => new Date(e.date || e.created_at) >= som).forEach((e) => { const t = ARCHIVE_TYPES[e.type] || ARCHIVE_TYPES.other; mtAT[t.label] = (mtAT[t.label] || 0) + 1; });
        const mtLS = {};
        leads.filter((l) => new Date(l.created_at) >= som).forEach((l) => { const s = LEAD_SOURCES[l.source] || LEAD_SOURCES.other; mtLS[s.label] = (mtLS[s.label] || 0) + 1; });
        const mtAvg = (() => { const m = ct.filter((t) => new Date(t.completedAt) >= som); return m.length > 0 ? m.reduce((s, t) => s + (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000, 0) / m.length : 0; })();
        const mtPri = {};
        tickets.filter((t) => new Date(t.createdAt) >= som).forEach((t) => { mtPri[t.priority] = (mtPri[t.priority] || 0) + 1; });

        const reportLines = [
          "ALPS MARKETING REPORT - " + monthName.toUpperCase(),
          "=".repeat(50), "",
          "TICKETS",
          "  Submitted: " + mtTC, "  Completed: " + mtTD,
          "  Active Backlog: " + at.length, "  Avg Turnaround: " + fmtH(mtAvg),
          ...Object.entries(mtPri).map(([k, v]) => "  " + (PRIORITIES[k] ? PRIORITIES[k].label : k) + ": " + v), "",
          "OUTBOUND CONTENT",
          "  Pieces Published: " + mtA,
          ...Object.entries(mtAT).map(([k, v]) => "  " + k + ": " + v), "",
          "INBOUND LEADS",
          "  Total: " + mtL, "  Needs Action: " + mtLA, "  Passed Through: " + mtLP,
          ...Object.entries(mtLS).map(([k, v]) => "  " + k + ": " + v), "",
          "Generated: " + now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        ].join("\n");

        const copyReport = () => { navigator.clipboard.writeText(reportLines); };

        return (<>
          <div style={{ ...card, marginBottom: 20, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4CB}"} Monthly Marketing Report</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>{monthName} summary across all marketing activity</p>
            <button onClick={copyReport} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4CB}"} Copy Report to Clipboard</button>
          </div>
          <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={card}>
              <div style={st}>{"\u{1F4CB}"} Tickets</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={mb}><div style={mv}>{mtTC}</div><div style={ml}>Submitted</div></div>
                <div style={mb}><div style={mv}>{mtTD}</div><div style={ml}>Completed</div></div>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Avg Turnaround</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{fmtH(mtAvg)}</div>
              </div>
              {Object.entries(mtPri).length > 0 && <div style={{ marginTop: 10 }}>{Object.entries(mtPri).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}><span style={{ color: PRIORITIES[k] ? PRIORITIES[k].color : "var(--text-body)" }}>{PRIORITIES[k] ? PRIORITIES[k].icon + " " + PRIORITIES[k].label : k}</span><span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{v}</span></div>)}</div>}
            </div>
            <div style={card}>
              <div style={st}>{"\u{1F4DA}"} Content Output</div>
              <div style={mb}><div style={mv}>{mtA}</div><div style={ml}>Pieces Published</div></div>
              {Object.entries(mtAT).length > 0 && <div style={{ marginTop: 12 }}>{Object.entries(mtAT).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}><span style={{ color: "var(--text-secondary)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{v}</span></div>)}</div>}
            </div>
            <div style={card}>
              <div style={st}>{"\u{1F4C8}"} Inbound Leads</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={mb}><div style={mv}>{mtL}</div><div style={ml}>Total</div></div>
                <div style={mb}><div style={mv}>{mtLP}</div><div style={ml}>Passed</div></div>
              </div>
              {mtLA > 0 && <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(202,138,4,0.08)", border: "1px solid rgba(202,138,4,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#ca8a04" }}>{"\u{1F7E1}"} {mtLA} still need{mtLA !== 1 ? "" : "s"} action</div>}
              {Object.entries(mtLS).length > 0 && <div style={{ marginTop: 10 }}>{Object.entries(mtLS).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}><span style={{ color: "var(--text-secondary)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{v}</span></div>)}</div>}
            </div>
          </div>
          <div style={card}>
            <div style={st}>Full Report Preview</div>
            <pre style={{ margin: 0, fontSize: 12, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace", background: "var(--bg-input)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>{reportLines}</pre>
          </div>
        </>);
      })()}
    </div>
  );
}


function Dashboard({ tickets, onStatusChange, onComplete, onAddNote, onDelete, onUpdatePriority, onUpdateDeadline, onReopen, onTogglePin }) {
  const [filter, setFilter] = useState("active");
  const [sortBy, setSortBy] = useState("priority");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = tickets.filter((t) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!t.id.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) return false;
    }
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "completed";
    return t.status === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Pinned tickets always come first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const effectiveSort = viewMode === "grid" ? "deadline" : sortBy;
    if (effectiveSort === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (effectiveSort === "deadline") return (a.deadline || "9999") < (b.deadline || "9999") ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filterTabs = [
    { key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" }, { key: "completed", label: "Completed" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Ticket Dashboard</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Manage and track all marketing requests</p>
        </div>
        <div style={{ position: "relative", minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ref, name, or title..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", transition: "border 0.2s, box-shadow 0.2s" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <StatsBar tickets={tickets} />
      </div>

      <div className="hub-filter-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          {filterTabs.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.2s", background: filter === tab.key ? "var(--brand)" : "transparent", color: filter === tab.key ? "#fff" : "var(--text-secondary)" }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", borderRadius: 6, padding: 2, border: "1px solid var(--border)" }}>
            <button onClick={() => setViewMode("list")} title="List view" style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "list" ? "var(--brand)" : "transparent", color: viewMode === "list" ? "#fff" : "var(--text-muted)", fontSize: 14, lineHeight: 1, transition: "all 0.2s" }}>{"\u2630"}</button>
            <button onClick={() => setViewMode("grid")} title="Grid view" style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "grid" ? "var(--brand)" : "transparent", color: viewMode === "grid" ? "#fff" : "var(--text-muted)", fontSize: 14, lineHeight: 1, transition: "all 0.2s" }}>{"\u25A6"}</button>
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--brand)", fontSize: 13, cursor: "pointer", outline: "none" }}>
            <option value="priority">Sort: Priority</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{search.trim() ? "\u{1F50D}" : "\u{1F4CB}"}</div>
          <p style={{ fontSize: 15, margin: 0 }}>{search.trim() ? 'No tickets matching "' + search.trim() + '"' : "No tickets found" + (filter !== "all" ? " for this filter" : "")}</p>
        </div>
      ) : viewMode === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((t) => <TicketCard key={t.id} ticket={t} onStatusChange={onStatusChange} onComplete={onComplete} onAddNote={onAddNote} onDelete={onDelete} onUpdatePriority={onUpdatePriority} onUpdateDeadline={onUpdateDeadline} onReopen={onReopen} onTogglePin={onTogglePin} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {sorted.map((t) => <GridCard key={t.id} ticket={t} onStatusChange={onStatusChange} onComplete={onComplete} onDelete={onDelete} onReopen={onReopen} onTogglePin={onTogglePin} />)}
        </div>
      )}
    </div>
  );
}

function SubmitterView({ tickets, submittedRef, onAddNote, onBackToForm }) {
  const [trackRef, setTrackRef] = useState(submittedRef || "");
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState("");

  const ticket = tickets.find((t) => t.id.toLowerCase() === trackRef.trim().toLowerCase());

  const submitNote = () => {
    if (!noteText.trim() || !noteName.trim() || !ticket) return;
    onAddNote(ticket.id, noteName.trim(), noteText.trim());
    setNoteText("");
    setNoteName("");
  };

  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      {submittedRef && (
        <div style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 12, padding: 24, marginBottom: 20, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22 }}>{"\u2713"}</div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>Ticket Submitted!</h2>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--text-secondary)" }}>Your reference number is:</p>
          <div style={{ display: "inline-block", background: "var(--brand)", color: "#fff", padding: "10px 28px", borderRadius: 10, fontSize: 28, fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.08em" }}>{submittedRef}</div>
          <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Keep this reference to track your ticket's progress below.</p>
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--brand)" }}>{submittedRef ? "Your Ticket" : "Track a Ticket"}</h3>
        {!submittedRef && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={trackRef} onChange={(e) => setTrackRef(e.target.value.toUpperCase())} placeholder="Enter ticket ref e.g. M001" style={{ flex: 1, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "monospace", fontWeight: 600, outline: "none", letterSpacing: "0.04em" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
          </div>
        )}

        {trackRef.trim() && !ticket && (
          <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
            <p style={{ fontSize: 14, margin: 0 }}>No ticket found with reference "{trackRef.trim()}"</p>
          </div>
        )}

        {ticket && (() => {
          const p = PRIORITIES[ticket.priority];
          const s = STATUS[ticket.status];
          const dueBadge = getDueBadge(ticket.deadline, ticket.status);
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--brand)", fontWeight: 700, background: "var(--brand-light)", padding: "3px 9px", borderRadius: 5 }}>{ticket.id}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: p.bg, color: p.color, border: "1px solid " + p.border }}>{p.icon} {p.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                {dueBadge && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: dueBadge.bg, color: dueBadge.color, border: "1px solid " + dueBadge.border }}>{dueBadge.text}</span>}
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--brand)" }}>{ticket.title}</h4>
              <div style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(ticket.description) }}></div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                <span>{"\u{1F464}"} {ticket.name}</span>
                <span>{"\u{1F4C5}"} {formatDate(ticket.deadline)}</span>
                <span style={{ opacity: 0.6 }}>Created {new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                {ticket.completedAt && <span style={{ color: "#16a34a" }}>{"\u2713"} Completed {new Date(ticket.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
              </div>

              {/* Status timeline */}
              <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
                {[
                  { key: "open", label: "Submitted", icon: "\u{1F4E5}" },
                  { key: "in_progress", label: "In Progress", icon: "\u{1F528}" },
                  { key: "completed", label: "Completed", icon: "\u2713" },
                ].map((step, idx) => {
                  const statusOrder = { open: 0, in_progress: 1, completed: 2 };
                  const current = statusOrder[ticket.status];
                  const active = idx <= current;
                  return (
                    <div key={step.key} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: active ? "var(--brand)" : "var(--bar-bg)", color: active ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 14, fontWeight: 700, transition: "all 0.3s" }}>{step.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--brand)" : "var(--text-muted)" }}>{step.label}</div>
                      {idx < 2 && <div style={{ position: "absolute", top: 15, left: "60%", right: "-40%", height: 2, background: idx < current ? "var(--brand)" : "var(--bar-bg)", zIndex: -1 }}></div>}
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {ticket.notes && ticket.notes.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Updates & Notes</div>
                  {ticket.notes.map((note, i) => (
                    <div key={i} style={{ background: note.auto ? "var(--brand-light)" : "var(--bg-input)", border: "1px solid " + (note.auto ? "rgba(35,29,104,0.1)" : "var(--border)"), borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: note.auto ? "#6366f1" : "var(--brand)" }}>{note.author}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(note.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5, fontStyle: note.auto ? "italic" : "normal" }}>{note.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add note */}
              <div style={{ display: "flex", gap: 8 }}>
                <input value={noteName} onChange={(e) => setNoteName(e.target.value)} placeholder="Your name" style={{ width: 130, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", flexShrink: 0 }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }} style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
                <button onClick={submitNote} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }} onMouseOver={(e) => e.target.style.background = "var(--brand)"} onMouseOut={(e) => e.target.style.background = "var(--brand)"}>+ Add</button>
              </div>
            </div>
          );
        })()}
      </div>

      <button onClick={onBackToForm} style={{ width: "100%", padding: "11px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "var(--brand)"} onMouseOut={(e) => e.target.style.background = "var(--brand)"}>
        {"\u2190"} Submit Another Ticket
      </button>
    </div>
  );
}


function MarketingArchive({ entries, isAdmin, onManage }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const filtered = entries.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search.trim()) { const q = search.toLowerCase(); return e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q) || (e.tags || []).some((tag) => tag.toLowerCase().includes(q)); }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4DA}"} Marketing Archive</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{entries.length} item{entries.length !== 1 ? "s" : ""} in the archive</p></div>
        {isAdmin && <button onClick={() => onManage()} style={{ padding: "9px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Entry</button>}
      </div>
      <div className="hub-filter-row" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search archive..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
        <div className="hub-type-filter" style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "transparent", color: filter === "all" ? "#fff" : "var(--text-secondary)" }}>All</button>
          {Object.entries(ARCHIVE_TYPES).map(([key, t]) => (<button key={key} onClick={() => setFilter(key)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === key ? t.color : "transparent", color: filter === key ? "#fff" : "var(--text-secondary)" }}>{t.icon} {t.label}</button>))}
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", borderRadius: 6, padding: 2, border: "1px solid var(--border)" }}>
          <button onClick={() => setViewMode("list")} style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "list" ? "var(--brand)" : "transparent", color: viewMode === "list" ? "#fff" : "var(--text-muted)", fontSize: 14, lineHeight: 1 }}>{"\u2630"}</button>
          <button onClick={() => setViewMode("grid")} style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "grid" ? "var(--brand)" : "transparent", color: viewMode === "grid" ? "#fff" : "var(--text-muted)", fontSize: 14, lineHeight: 1 }}>{"\u25A6"}</button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{search.trim() ? "\u{1F50D}" : "\u{1F4DA}"}</div><p style={{ fontSize: 15, margin: 0 }}>{search.trim() ? "No items matching \"" + search.trim() + "\"" : "No archive entries yet"}</p></div>
      ) : viewMode === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((entry) => { const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other; return (
            <div key={entry.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-hover)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: t.color }}>{t.label}</span>
                  <span>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {entry.tags && entry.tags.length > 0 && entry.tags.map((tag) => <span key={tag} style={{ padding: "1px 6px", borderRadius: 4, background: "var(--brand-light)", color: "var(--brand)", fontSize: 10, fontWeight: 600 }}>{tag}</span>)}
                </div>
              </div>
              {entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "6px 12px", background: "var(--brand-light)", border: "none", borderRadius: 6, color: "var(--brand)", fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>{"\u2197"} View</a>}
              {isAdmin && <button onClick={() => onManage(entry.id)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>{"\u270E"}</button>}
            </div>); })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {sorted.map((entry) => { const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other; return (
            <div key={entry.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 10 }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-hover)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 22 }}>{t.icon}</span><span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>{isAdmin && <button onClick={() => onManage(entry.id)} style={{ marginLeft: "auto", padding: "3px 7px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", fontSize: 10, cursor: "pointer" }}>{"\u270E"}</button>}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{entry.title}</div>
              {entry.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.description}</div>}
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>{entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", textDecoration: "none" }}>{"\u2197"} View</a>}</div>
            </div>); })}
        </div>
      )}
    </div>
  );
}

function ArchiveForm({ entry, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(entry ? { title: entry.title, type: entry.type, description: entry.description || "", date: entry.date || "", link: entry.link || "", tags: (entry.tags || []).join(", ") } : { title: "", type: "email", description: "", date: new Date().toISOString().split("T")[0], link: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const handleSave = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ title: form.title.trim(), type: form.type, description: form.description.trim(), date: form.date || null, link: form.link.trim() || null, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }); setSaving(false); };
  const inputStyle = { width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 };
  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{entry ? "\u270E Edit Entry" : "\u{1F4DA} Add to Archive"}</h2>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Title *</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. March Newsletter" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><label style={labelStyle}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(ARCHIVE_TYPES).map(([key, t]) => <option key={key} value={key}>{t.icon} {t.label}</option>)}</select></div>
          <div><label style={labelStyle}>Date</label><input type="date" style={{ ...inputStyle, cursor: "pointer" }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Description</label><textarea rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief summary..." /></div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Link / URL</label><input style={inputStyle} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
        <div style={{ marginBottom: 24 }}><label style={labelStyle}>Tags <span style={{ fontWeight: 400, opacity: 0.6 }}>(comma separated)</span></label><input style={inputStyle} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. Q1, product launch" /></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ flex: 1, padding: "12px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: !form.title.trim() ? 0.5 : 1 }}>{saving ? "Saving..." : entry ? "Update Entry" : "Add to Archive"}</button>
          <button onClick={onCancel} style={{ padding: "12px 20px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          {entry && onDelete && (confirmDel ? <button onClick={() => onDelete(entry.id)} style={{ padding: "12px 16px", background: "#dc2626", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Confirm</button> : <button onClick={() => setConfirmDel(true)} style={{ padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>)}
        </div>
      </div>
    </div>
  );
}

function LeadForm({ onSave, onBackToHub }) {
  const [form, setForm] = useState({ broker: "", enquiry: "", source: "phone", logged_by: "", next_steps: "needs_action" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = async () => { if (!form.broker.trim() || !form.enquiry.trim() || !form.logged_by.trim()) return; setSaving(true); await onSave({ broker: form.broker.trim(), enquiry: form.enquiry.trim(), source: form.source, logged_by: form.logged_by.trim(), next_steps: form.next_steps }); setSaving(false); setSaved(true); };
  const inputStyle = { width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 };
  if (saved) return (
    <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}><div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u2705"}</div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Lead Logged!</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>The lead from <strong>{form.broker}</strong> has been recorded.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => { setForm({ broker: "", enquiry: "", source: "phone", logged_by: "", next_steps: "needs_action" }); setSaved(false); }} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Log Another</button>
        <button onClick={onBackToHub} style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Back to Hub</button>
      </div>
    </div></div>);
  const valid = form.broker.trim() && form.enquiry.trim() && form.logged_by.trim();
  return (
    <div style={{ maxWidth: 560, width: "100%" }}><div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4C8}"} Log an Inbound Lead</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>Record an inbound marketing lead for tracking and follow-up.</p>
      <div style={{ marginBottom: 16 }}><label style={labelStyle}>Broker *</label><input style={inputStyle} value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="e.g. Acme Insurance" /></div>
      <div style={{ marginBottom: 16 }}><label style={labelStyle}>Enquiry *</label><textarea rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} value={form.enquiry} onChange={(e) => setForm({ ...form, enquiry: e.target.value })} placeholder="What is the lead about?" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div><label style={labelStyle}>Source</label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>{Object.entries(LEAD_SOURCES).map(([key, s]) => (<button key={key} onClick={() => setForm({ ...form, source: key })} style={{ padding: "6px 4px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.source === key ? s.color : "var(--border)"), background: form.source === key ? s.color + "15" : "var(--bg-input)", color: form.source === key ? s.color : "var(--text-muted)", transition: "all 0.2s", lineHeight: 1.2, textAlign: "center" }}><div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>{s.label}</button>))}</div></div>
        <div><label style={labelStyle}>Next Steps</label><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[["needs_action", "\u{1F7E1} Needs Action", "#ca8a04"], ["passed_through", "\u2705 Passed Through", "#16a34a"]].map(([val, label, col]) => (<button key={val} onClick={() => setForm({ ...form, next_steps: val })} style={{ padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.next_steps === val ? col : "var(--border)"), background: form.next_steps === val ? col + "15" : "var(--bg-input)", color: form.next_steps === val ? col : "var(--text-muted)", transition: "all 0.2s", textAlign: "left" }}>{label}</button>))}</div></div>
      </div>
      <div style={{ marginBottom: 24 }}><label style={labelStyle}>Logged By *</label><input style={inputStyle} value={form.logged_by} onChange={(e) => setForm({ ...form, logged_by: e.target.value })} placeholder="Your name" /></div>
      <button onClick={handleSave} disabled={saving || !valid} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: valid ? 1 : 0.5 }}>{saving ? "Saving..." : "Log Lead"}</button>
    </div></div>
  );
}

function LeadsDashboard({ leads }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = leads.filter((l) => {
    if (filter === "needs_action" && l.next_steps !== "needs_action") return false;
    if (filter === "passed_through" && l.next_steps !== "passed_through") return false;
    if (search.trim()) { const q = search.toLowerCase(); return l.broker.toLowerCase().includes(q) || l.enquiry.toLowerCase().includes(q) || l.logged_by.toLowerCase().includes(q); }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const needsAction = leads.filter((l) => l.next_steps === "needs_action").length;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 20 }}><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4C8}"} Leads Dashboard</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{leads.length} lead{leads.length !== 1 ? "s" : ""} logged{needsAction > 0 ? " \u2022 " : ""}{needsAction > 0 && <span style={{ color: "#ca8a04", fontWeight: 600 }}>{needsAction} need{needsAction !== 1 ? "" : "s"} action</span>}</p></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>{[["all", "All"], ["needs_action", "\u{1F7E1} Needs Action"], ["passed_through", "\u2705 Passed"]].map(([key, label]) => (<button key={key} onClick={() => setFilter(key)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === key ? "var(--brand)" : "transparent", color: filter === key ? "#fff" : "var(--text-secondary)" }}>{label}</button>))}</div>
      </div>
      {sorted.length === 0 ? <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{"\u{1F4C8}"}</div><p style={{ fontSize: 15, margin: 0 }}>{search.trim() ? "No matching leads" : "No leads logged yet"}</p></div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{sorted.map((lead) => { const s = LEAD_SOURCES[lead.source] || LEAD_SOURCES.other; return (
          <div key={lead.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{lead.broker}</div><div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}><span style={{ fontWeight: 600, color: s.color }}>{s.label}</span><span>{new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span><span>by {lead.logged_by}</span></div></div>
              <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: lead.next_steps === "needs_action" ? "rgba(202,138,4,0.1)" : "rgba(22,163,74,0.1)", color: lead.next_steps === "needs_action" ? "#ca8a04" : "#16a34a", flexShrink: 0 }}>{lead.next_steps === "needs_action" ? "\u{1F7E1} Needs Action" : "\u2705 Passed Through"}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5 }}>{lead.enquiry}</p>
          </div>); })}</div>
      )}
    </div>
  );
}

function BrandAssets({ assets, isAdmin, onUpload, onDeleteAsset }) {
  const [copied, setCopied] = useState(null);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [uploadMeta, setUploadMeta] = useState({ name: "", category: "logo" });
  const [showUploadForm, setShowUploadForm] = useState(false);

  const copyHex = (hex) => { navigator.clipboard.writeText(hex); setCopied(hex); setTimeout(() => setCopied(null), 1500); };

  const categories = { logo: "Logos", icon: "Icons" };
  const filteredAssets = assets.filter((a) => filter === "all" || a.category === filter);
  const grouped = {};
  filteredAssets.forEach((a) => { const g = a.asset_name || "Untitled"; if (!grouped[g]) grouped[g] = []; grouped[g].push(a); });

  const handleUpload = async () => {
    if (!fileRef.current?.files?.length || !uploadMeta.name.trim()) return;
    setUploading(true);
    for (const file of fileRef.current.files) {
      await onUpload(file, uploadMeta.name.trim(), uploadMeta.category);
    }
    setUploading(false); setShowUploadForm(false); setUploadMeta({ name: "", category: "logo" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const formatExt = (url) => { const ext = (url || "").split(".").pop().split("?")[0].toLowerCase(); return ext.length <= 4 ? ext.toUpperCase() : "FILE"; };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ width: "100%" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F3A8}"} Brand Assets</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Alps brand colours, typography, logos, and icons.</p>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Brand Colours</h3>
        <div className="hub-color-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {BRAND_COLORS.map((c) => (
            <button key={c.hex} onClick={() => copyHex(c.hex)} style={{ background: c.hex, borderRadius: 10, padding: "18px 14px", border: "2px solid " + (copied === c.hex ? "#fff" : "transparent"), cursor: "pointer", transition: "all 0.2s", position: "relative", textAlign: "left" }} title={"Click to copy " + c.hex}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.3)", marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>{c.hex}</div>
              {copied === c.hex && <span style={{ position: "absolute", top: 8, right: 10, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 10 }}>Copied!</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Typography</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>Headlines</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Museo Sans 700</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Used for headings and display text</div>
          </div>
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>Body Copy</div>
            <div style={{ fontSize: 24, fontWeight: 400, color: "var(--text-primary)", marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>Montserrat Regular</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Used for body text and paragraphs</div>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Logos & Icons</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 3, background: "var(--bg-input)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
              <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "transparent", color: filter === "all" ? "#fff" : "var(--text-secondary)" }}>All</button>
              <button onClick={() => setFilter("logo")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "logo" ? "var(--brand)" : "transparent", color: filter === "logo" ? "#fff" : "var(--text-secondary)" }}>Logos</button>
              <button onClick={() => setFilter("icon")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "icon" ? "var(--brand)" : "transparent", color: filter === "icon" ? "#fff" : "var(--text-secondary)" }}>Icons</button>
            </div>
            {isAdmin && <button onClick={() => setShowUploadForm(!showUploadForm)} style={{ padding: "7px 14px", background: showUploadForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showUploadForm ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showUploadForm ? "Cancel" : "+ Upload"}</button>}
          </div>
        </div>

        {showUploadForm && isAdmin && (
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Asset Name</label><input style={inputStyle} value={uploadMeta.name} onChange={(e) => setUploadMeta({ ...uploadMeta, name: e.target.value })} placeholder="e.g. Alps Main Logo" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Category</label><select value={uploadMeta.category} onChange={(e) => setUploadMeta({ ...uploadMeta, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="logo">Logo</option><option value="icon">Icon</option></select></div>
              <div style={{ display: "flex", gap: 8, paddingBottom: 1 }}>
                <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{"\u{1F4CE}"} Choose Files<input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.svg,.pdf,.webp" style={{ display: "none" }} /></label>
                <button onClick={handleUpload} disabled={uploading || !uploadMeta.name.trim()} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: uploading ? "wait" : "pointer", opacity: uploadMeta.name.trim() ? 1 : 0.5 }}>{uploading ? "Uploading..." : "Upload"}</button>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Upload multiple format variants (JPG, PNG, SVG, PDF) under the same asset name. They will be grouped together for download.</p>
          </div>
        )}

        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>{"\u{1F3A8}"}</div><p style={{ fontSize: 14, margin: 0 }}>No assets uploaded yet{isAdmin ? ". Click Upload to add logos and icons." : "."}</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(grouped).map(([name, files]) => (
              <div key={name} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: files[0]?.category === "icon" ? "#0284c7" : "#E64592", textTransform: "uppercase", letterSpacing: "0.04em", background: (files[0]?.category === "icon" ? "#0284c7" : "#E64592") + "12", padding: "2px 8px", borderRadius: 4 }}>{files[0]?.category === "icon" ? "Icon" : "Logo"}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{files.length} format{files.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {files.map((f) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a href={f.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, textDecoration: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--brand)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>{"\u2B07"} {formatExt(f.file_url)}</a>
                      {isAdmin && <button onClick={() => onDeleteAsset(f.id, f.file_url)} style={{ padding: "4px 6px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>{"\u2715"}</button>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function ContentTemplates({ templates, isAdmin, onSave, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ title: "", category: "email", content: "", tags: "" });
  const [saving, setSaving] = useState(false);

  const CATS = {
    email: { label: "Email", icon: "\u{1F4E7}", color: "#6366f1" },
    social: { label: "Social", icon: "\u{1F4F1}", color: "#0284c7" },
    product: { label: "Product Copy", icon: "\u{1F4E6}", color: "#16a34a" },
    broker: { label: "Broker Comms", icon: "\u{1F91D}", color: "#ea580c" },
    internal: { label: "Internal", icon: "\u{1F3E2}", color: "#8b5cf6" },
    other: { label: "Other", icon: "\u{1F4CC}", color: "#64748b" },
  };

  const filtered = templates.filter((t) => {
    if (filter !== "all" && t.category !== filter) return false;
    if (search.trim()) { const q = search.toLowerCase(); return t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || (t.tags || []).some((tag) => tag.toLowerCase().includes(q)); }
    return true;
  });

  const handleCopy = (content) => { navigator.clipboard.writeText(content); setCopied(content); setTimeout(() => setCopied(null), 1500); };
  const startEdit = (t) => { setEditing(t ? t.id : "new"); setForm(t ? { title: t.title, category: t.category, content: t.content, tags: (t.tags || []).join(", ") } : { title: "", category: "email", content: "", tags: "" }); };
  const handleSave = async () => { if (!form.title.trim() || !form.content.trim()) return; setSaving(true); await onSave({ title: form.title.trim(), category: form.category, content: form.content.trim(), tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }, editing !== "new" ? editing : null); setSaving(false); setEditing(null); };
  const handleDelete = async (id) => { await onDelete(id); setEditing(null); };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  if (editing !== null) {
    const entry = editing !== "new" ? templates.find((t) => t.id === editing) : null;
    return (
      <div style={{ maxWidth: 600, width: "100%" }}><div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{entry ? "\u270E Edit Template" : "\u{1F4C4} New Template"}</h2>
        <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Title *</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New Broker Welcome Email" /></div>
        <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(CATS).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}</select></div>
        <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Content *</label><textarea rows={8} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Template content... Use [BROKER], [PRODUCT], [NAME] as placeholders" /></div>
        <div style={{ marginBottom: 24 }}><label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Tags <span style={{ fontWeight: 400, opacity: 0.6 }}>(comma separated)</span></label><input style={inputStyle} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. welcome, onboarding" /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} style={{ flex: 1, padding: "12px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: form.title.trim() && form.content.trim() ? 1 : 0.5 }}>{saving ? "Saving..." : entry ? "Update" : "Save Template"}</button>
          <button onClick={() => setEditing(null)} style={{ padding: "12px 20px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          {entry && <button onClick={() => handleDelete(entry.id)} style={{ padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>}
        </div>
      </div></div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4C4}"} Content Templates</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Reusable copy snippets, emails, and social captions. Use [BROKER], [PRODUCT], [NAME] as placeholders.</p></div>
        {isAdmin && <button onClick={() => startEdit(null)} style={{ padding: "9px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ New Template</button>}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "transparent", color: filter === "all" ? "#fff" : "var(--text-secondary)" }}>All</button>
          {Object.entries(CATS).map(([k, c]) => (<button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === k ? c.color : "transparent", color: filter === k ? "#fff" : "var(--text-secondary)" }}>{c.icon} {c.label}</button>))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{"\u{1F4C4}"}</div><p style={{ fontSize: 15, margin: 0 }}>{search.trim() ? "No matching templates" : "No templates yet"}</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((t) => { const c = CATS[t.category] || CATS.other; return (
            <div key={t.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: "uppercase", background: c.color + "12", padding: "2px 8px", borderRadius: 4 }}>{c.icon} {c.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{t.title}</span>
                <button onClick={() => handleCopy(t.content)} style={{ padding: "6px 12px", background: copied === t.content ? "#16a34a" : "var(--brand-light)", border: "none", borderRadius: 6, color: copied === t.content ? "#fff" : "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{copied === t.content ? "\u2713 Copied" : "\u{1F4CB} Copy"}</button>
                {isAdmin && <button onClick={() => startEdit(t)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>{"\u270E"}</button>}
              </div>
              <pre style={{ margin: 0, fontSize: 12, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace", background: "var(--bg-input)", padding: 14, borderRadius: 8, border: "1px solid var(--border)", maxHeight: 160, overflow: "auto" }}>{t.content}</pre>
              {t.tags && t.tags.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>{t.tags.map((tag) => <span key={tag} style={{ padding: "1px 8px", borderRadius: 4, background: "var(--brand-light)", color: "var(--brand)", fontSize: 10, fontWeight: 600 }}>{tag}</span>)}</div>}
            </div>); })}
        </div>
      )}
    </div>
  );
}

function SelfServiceGuide() {
  const [open, setOpen] = useState(null);
  const toggle = (id) => setOpen(open === id ? null : id);

  const sections = [
    { id: "sizes", title: "\u{1F4D0} Image & Asset Sizes", items: [
      { q: "Social media image sizes", a: "LinkedIn: 1200x627px (post), 1584x396px (cover)\nFacebook: 1200x630px (post), 820x312px (cover)\nInstagram: 1080x1080px (post), 1080x1920px (story)\nX/Twitter: 1600x900px (post), 1500x500px (header)" },
      { q: "Email banner size", a: "Standard email banner: 600px wide, 200-300px tall. Keep file size under 200KB for fast loading." },
      { q: "Print material specs", a: "A4 flyer: 210x297mm (3mm bleed)\nA5 flyer: 148x210mm (3mm bleed)\nDL leaflet: 99x210mm\nBusiness card: 85x55mm\nAlways supply at 300dpi with CMYK colour." },
      { q: "PowerPoint slide dimensions", a: "Standard: 16:9 (33.867cm x 19.05cm)\nWe use widescreen by default. Fonts should be minimum 18pt for body text on slides." },
    ]},
    { id: "brand", title: "\u{1F3A8} Brand & Logo Usage", items: [
      { q: "Where do I find Alps logos?", a: "Go to Brand Assets in the Marketing Hub. You can download logos in PNG, SVG, JPG, and PDF formats." },
      { q: "Can I edit the Alps logo?", a: "No. The logo should not be stretched, recoloured, rotated, or modified in any way. Always use the approved versions from the Brand Assets page." },
      { q: "What fonts does Alps use?", a: "Headlines: Museo Sans 700\nBody copy: Montserrat Regular\nThese are listed in the Brand Assets section with the full colour palette." },
      { q: "How do I use the brand colours?", a: "Main: #231D68\nMotor: #E64592\nCommercial: #20A39E\nLet: #FAB315\nPersonal: #464B99\nAlt Man: #27D7F4\nClick any colour in Brand Assets to copy the hex code." },
    ]},
    { id: "requests", title: "\u{1F4DD} Marketing Requests", items: [
      { q: "How do I request marketing work?", a: "Use the Submit a Ticket feature on the Marketing Hub homepage. Fill in the form with as much detail as possible, and select the appropriate template and priority." },
      { q: "What's the typical turnaround?", a: "Low priority: 5-7 working days\nMedium priority: 3-5 working days\nHigh priority: 1-2 working days\nCritical/urgent: Same day where possible\nThese are estimates and depend on current workload." },
      { q: "How do I track my request?", a: "Use Track a Ticket on the Hub homepage. Enter the reference number (e.g. M001) you received when you submitted. You can also add notes to your ticket." },
      { q: "What if I need changes to completed work?", a: "Add a note to your existing ticket via the tracker. If it's a new piece of work, submit a new ticket referencing the original." },
    ]},
    { id: "content", title: "\u{1F4DA} Content & Campaigns", items: [
      { q: "How do I get content published?", a: "Submit a ticket with the content, target audience, channel, and any deadlines. Include all copy, images, and links needed." },
      { q: "What's the approvals process?", a: "All external-facing content goes through marketing review before publishing. Allow at least 1 working day for review and revisions." },
      { q: "How do I log a marketing lead?", a: "Use Log a Lead on the Hub homepage. Fill in the broker name, what the enquiry is about, the source channel, and set next steps." },
    ]},
    { id: "tools", title: "\u{1F6E0}\uFE0F Tools & Access", items: [
      { q: "What can I do without the dashboard password?", a: "Anyone can: submit tickets, track tickets, log leads, browse the archive, view brand assets, and read this guide. The dashboard, analytics, and admin features (editing/deleting) require the password." },
      { q: "How do I get the dashboard password?", a: "Contact the marketing team. The password gives you access to the ticket dashboard, leads dashboard, analytics, and content management features." },
    ]},
  ];

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4D6}"} Self-Service Guide</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Everything you need to know about working with the marketing team. Click a section to expand.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sections.map((section) => (
          <div key={section.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => toggle(section.id)} style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{section.title}</span>
              <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: open === section.id ? "rotate(180deg)" : "none" }}>{"\u25BC"}</span>
            </button>
            {open === section.id && (
              <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>{item.q}</div>
                    <pre style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{item.a}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityLog({ tickets }) {
  // Build activity entries from ticket data
  const activities = [];

  tickets.forEach((t) => {
    // Ticket created
    activities.push({
      time: t.createdAt,
      type: "created",
      icon: "\u{1F4E5}",
      color: "#6366f1",
      ref: t.id,
      title: t.title,
      text: t.name + " submitted a new ticket",
    });

    // Ticket completed
    if (t.completedAt) {
      activities.push({
        time: t.completedAt,
        type: "completed",
        icon: "\u2713",
        color: "#16a34a",
        ref: t.id,
        title: t.title,
        text: "Ticket marked as completed",
      });
    }

    // Notes (both manual and system)
    (t.notes || []).forEach((note) => {
      activities.push({
        time: note.timestamp,
        type: note.auto ? "system" : "note",
        icon: note.auto ? "\u2699" : "\u{1F4DD}",
        color: note.auto ? "#8b5cf6" : "#0284c7",
        ref: t.id,
        title: t.title,
        text: note.auto ? note.text : note.author + ": " + note.text,
      });
    });
  });

  // Sort newest first
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return diffMins + "m ago";
    if (diffHrs < 24) return diffHrs + "h ago";
    if (diffDays < 7) return diffDays + "d ago";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Activity Log</h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Recent actions across all tickets</p>
      </div>

      {activities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{"\u{1F4CB}"}</div>
          <p style={{ fontSize: 15, margin: 0 }}>No activity yet</p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 9, top: 6, bottom: 6, width: 2, background: "var(--bar-bg)", borderRadius: 1 }}></div>

          {activities.slice(0, 50).map((a, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 16, paddingBottom: 0 }}>
              {/* Dot */}
              <div style={{ position: "absolute", left: -23, top: 4, width: 14, height: 14, borderRadius: "50%", background: "var(--bg-input)", border: "2.5px solid " + a.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7 }}></div>

              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", transition: "all 0.15s" }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(35,29,104,0.06)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--brand)", fontWeight: 700, background: "var(--brand-light)", padding: "1px 6px", borderRadius: 3 }}>{a.ref}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatTime(a.time)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.4 }}>{a.text}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
              </div>
            </div>
          ))}

          {activities.length > 50 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>Showing 50 of {activities.length} activities</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("hub");
  const [tickets, setTickets] = useState([]);
  const [dashUnlocked, setDashUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSubmittedRef, setLastSubmittedRef] = useState(null);
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [editArchiveEntry, setEditArchiveEntry] = useState(null);
  const [leads, setLeads] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [contentTemplates, setContentTemplates] = useState([]);
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches || false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Load tickets from Supabase and subscribe to real-time changes
  useEffect(() => {
    async function fetchTickets() {
      const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
      if (data) setTickets(data.map(mapRow));
      setLoading(false);
    }
    fetchTickets();

    const channel = supabase.channel("tickets-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, (payload) => {
        fetchTickets();
        if ("Notification" in window && Notification.permission === "granted" && payload.new) {
          const t = payload.new;
          const p = PRIORITIES[t.priority];
          new Notification("New Ticket: " + t.ref, {
            body: (p ? p.icon + " " + p.label + " — " : "") + t.title + "\nFrom: " + t.name,
            icon: "/alps-logo.webp",
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets" }, () => {
        fetchTickets();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tickets" }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);


  // Load archive
  useEffect(() => {
    async function fa() { const { data } = await supabase.from("archive_entries").select("*").order("date", { ascending: false }); if (data) setArchiveEntries(data); }
    fa();
    const ch = supabase.channel("archive-rt").on("postgres_changes", { event: "*", schema: "public", table: "archive_entries" }, () => { fa(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load leads
  useEffect(() => {
    async function fl() { const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false }); if (data) setLeads(data); }
    fl();
    const ch = supabase.channel("leads-rt").on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => { fl(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load brand assets
  useEffect(() => {
    async function fb() { const { data } = await supabase.from("brand_assets").select("*").order("asset_name", { ascending: true }); if (data) setBrandAssets(data); }
    fb();
    const ch = supabase.channel("brand-rt").on("postgres_changes", { event: "*", schema: "public", table: "brand_assets" }, () => { fb(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);


  // Load content templates
  useEffect(() => {
    async function ft() { const { data } = await supabase.from("content_templates").select("*").order("title", { ascending: true }); if (data) setContentTemplates(data); }
    ft();
    const ch = supabase.channel("templates-rt").on("postgres_changes", { event: "*", schema: "public", table: "content_templates" }, () => { ft(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function mapRow(row) {
    // Handle both old format (["filename.pdf"]) and new format ([{name, url}])
    const rawFiles = row.file_names || [];
    const files = rawFiles.map((f) => typeof f === "string" ? { name: f, url: null } : f);
    return {
      id: row.ref,
      dbId: row.id,
      name: row.name,
      title: row.title,
      description: row.description,
      priority: row.priority,
      deadline: row.deadline || "",
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at || null,
      pinned: row.pinned || false,
      files,
      notes: row.notes || [],
    };
  }

  const handleSubmit = async (formData) => {
    const ref = await getNextRef();

    // Upload files to Supabase Storage
    const uploadedFiles = [];
    if (formData.actualFiles && formData.actualFiles.length > 0) {
      for (const file of formData.actualFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = ref + "/" + Date.now() + "_" + safeName;
        const { error: uploadError } = await supabase.storage.from("ticket-attachments").upload(path, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
          uploadedFiles.push({ name: file.name, url: urlData.publicUrl });
        }
      }
    }

    const { error } = await supabase.from("tickets").insert({
      ref,
      name: formData.name,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      deadline: formData.deadline || null,
      status: "open",
      file_names: uploadedFiles,
      notes: [],
    });
    if (!error) {
      setLastSubmittedRef(ref);
      setView("submitted");
    }
  };

  const handleStatusChange = async (id, status) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      await supabase.from("tickets").update({ status }).eq("id", ticket.dbId);
    }
  };

  const handleComplete = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      await supabase.from("tickets").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", ticket.dbId);
    }
  };

  const handleReopen = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const autoNote = { author: "System", text: "Ticket reopened", timestamp: new Date().toISOString(), auto: true };
      const newNotes = [...(ticket.notes || []), autoNote];
      await supabase.from("tickets").update({ status: "open", completed_at: null, notes: newNotes }).eq("id", ticket.dbId);
    }
  };

  const handleTogglePin = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      await supabase.from("tickets").update({ pinned: !ticket.pinned }).eq("id", ticket.dbId);
    }
  };

  const handleDelete = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      await supabase.from("tickets").delete().eq("id", ticket.dbId);
    }
  };

  const handleAddNote = async (id, author, text) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const newNotes = [...(ticket.notes || []), { author, text, timestamp: new Date().toISOString() }];
      await supabase.from("tickets").update({ notes: newNotes }).eq("id", ticket.dbId);
    }
  };

  const handleUpdatePriority = async (id, newPriority) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const oldLabel = PRIORITIES[ticket.priority]?.label || ticket.priority;
      const newLabel = PRIORITIES[newPriority]?.label || newPriority;
      const autoNote = { author: "System", text: "Priority changed from " + oldLabel + " to " + newLabel, timestamp: new Date().toISOString(), auto: true };
      const newNotes = [...(ticket.notes || []), autoNote];
      await supabase.from("tickets").update({ priority: newPriority, notes: newNotes }).eq("id", ticket.dbId);
    }
  };

  const handleUpdateDeadline = async (id, newDeadline) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const oldDate = ticket.deadline ? formatDate(ticket.deadline) : "No deadline";
      const newDate = newDeadline ? formatDate(newDeadline) : "No deadline";
      const autoNote = { author: "System", text: "Deadline changed from " + oldDate + " to " + newDate, timestamp: new Date().toISOString(), auto: true };
      const newNotes = [...(ticket.notes || []), autoNote];
      await supabase.from("tickets").update({ deadline: newDeadline || null, notes: newNotes }).eq("id", ticket.dbId);
    }
  };


  const handleArchiveSave = async (data) => {
    if (editArchiveEntry && editArchiveEntry !== "new") { await supabase.from("archive_entries").update(data).eq("id", editArchiveEntry); }
    else { await supabase.from("archive_entries").insert(data); }
    setEditArchiveEntry(null); setView("archive");
  };
  const handleArchiveDelete = async (id) => { await supabase.from("archive_entries").delete().eq("id", id); setEditArchiveEntry(null); setView("archive"); };
  const handleLeadSave = async (data) => { await supabase.from("leads").insert(data); };
  const handleAssetUpload = async (file, name, category) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = "brand/" + Date.now() + "_" + safeName;
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
      await supabase.from("brand_assets").insert({ asset_name: name, category, file_url: urlData.publicUrl, file_path: path });
    }
  };
  const handleAssetDelete = async (id, fileUrl) => {
    const asset = brandAssets.find((a) => a.id === id);
    if (asset && asset.file_path) { await supabase.storage.from("ticket-attachments").remove([asset.file_path]); }
    await supabase.from("brand_assets").delete().eq("id", id);
  };

  const handleTemplateSave = async (data, id) => {
    if (id) { await supabase.from("content_templates").update(data).eq("id", id); }
    else { await supabase.from("content_templates").insert(data); }
  };
  const handleTemplateDelete = async (id) => { await supabase.from("content_templates").delete().eq("id", id); };

  const handleDashboardClick = () => {
    if (dashUnlocked) {
      setView("dashboard");
    } else {
      setView("password");
    }
  };

  const handleUnlock = () => {
    setDashUnlocked(true);
    setView("dashboard");
  };

  const ticketViews = ["form", "submitted", "tracker", "dashboard", "password", "activity"];
  const archiveViews = ["archive", "archive_add", "archive_edit"];
  const leadViews = ["lead_form", "leads_dashboard"];
  const templateViews = ["templates"];
  const guideViews = ["guide"];
  const activeCount = tickets.filter((t) => t.status !== "completed").length;
  const currentSection = view === "hub" ? "hub" : ticketViews.includes(view) ? "tickets" : archiveViews.includes(view) ? "archive" : view === "analytics" ? "analytics" : leadViews.includes(view) ? "leads" : view === "brand_assets" ? "brand" : view === "templates" ? "templates" : view === "guide" ? "guide" : "hub";

  return (
    <div data-theme={dark ? "dark" : "light"} style={{ minHeight: "100vh", background: "var(--bg-page)", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "var(--text-primary)", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: #231d68; color: white; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(35,29,104,0.15); border-radius: 3px; }
        @keyframes shakeAnim { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        [data-theme="light"] {
          --bg-page: #ffffff; --bg-card: #f6f6f6; --bg-input: #ffffff; --bg-header: #ffffff;
          --bg-completed: #fafafa; --bg-hover: #f8fafc;
          --border: #e2e8f0; --border-light: #f1f5f9;
          --text-primary: #1e293b; --text-body: #475569; --text-secondary: #64748b; --text-muted: #94a3b8;
          --brand: #231d68; --brand-light: rgba(35,29,104,0.07); --brand-glow: rgba(35,29,104,0.1);
          --shadow: 0 1px 3px rgba(0,0,0,0.04); --shadow-hover: 0 2px 12px rgba(35,29,104,0.08);
          --nav-bg: #f6f6f6; --nav-inactive: #64748b;
          --bar-bg: #e2e8f0;
        }
        [data-theme="dark"] {
          --bg-page: #0f172a; --bg-card: #1e293b; --bg-input: #0f172a; --bg-header: #1e293b;
          --bg-completed: #1a2332; --bg-hover: #1e293b;
          --border: #334155; --border-light: #1e293b;
          --text-primary: #e2e8f0; --text-body: #cbd5e1; --text-secondary: #94a3b8; --text-muted: #64748b;
          --brand: #818cf8; --brand-light: rgba(129,140,248,0.15); --brand-glow: rgba(129,140,248,0.15);
          --shadow: 0 1px 3px rgba(0,0,0,0.2); --shadow-hover: 0 2px 12px rgba(0,0,0,0.3);
          --nav-bg: #0f172a; --nav-inactive: #94a3b8;
          --bar-bg: #334155;
        }
        [data-theme="dark"] ::-webkit-scrollbar-thumb { background: rgba(129,140,248,0.2); }
        [data-theme="dark"] ::selection { background: #818cf8; }
        [data-theme="dark"] input, [data-theme="dark"] textarea, [data-theme="dark"] select {
          color-scheme: dark;
        }
        @media (max-width: 640px) {
          .hub-header { padding: 10px 16px !important; flex-wrap: wrap; gap: 8px; }
          .hub-nav { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .hub-nav button { padding: 7px 14px !important; font-size: 12px !important; white-space: nowrap; }
          .hub-home-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-layout-main { grid-template-columns: 1fr !important; }
          .hub-dash-grid { grid-template-columns: 1fr !important; }
          .hub-type-filter { display: none !important; }
          .hub-color-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .hub-main { padding: 20px 14px !important; }
          .hub-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .hub-filter-bar { flex-direction: column; align-items: stretch !important; }
          .hub-template-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-priority-grid { grid-template-columns: 1fr 1fr !important; }
          .hub-analytics-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-analytics-cols { grid-template-columns: 1fr !important; }
          .hub-week-compare { flex-direction: column; gap: 4px !important; }
        }
      `}</style>

      <header className="hub-header" style={{ padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "var(--bg-header)", position: "sticky", top: 0, zIndex: 50, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={ALPS_LOGO} alt="Alps" style={{ height: 38, objectFit: "contain" }} />
          <div style={{ width: 1, height: 28, background: "var(--border)" }}></div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--brand)", lineHeight: 1.2 }}>Marketing Hub</h1>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{currentSection === "tickets" ? "Ticket Management" : currentSection === "archive" ? "Marketing Archive" : currentSection === "analytics" ? "Analytics" : currentSection === "leads" ? "Lead Management" : currentSection === "brand" ? "Brand Assets" : currentSection === "templates" ? "Content Templates" : currentSection === "guide" ? "Self-Service Guide" : "Your marketing toolkit"}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setDark(!dark)} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 16, lineHeight: 1, transition: "all 0.2s", color: "var(--text-secondary)" }}>
            {dark ? "\u2600" : "\u{1F319}"}
          </button>
          <nav className="hub-nav" style={{ display: "flex", gap: 4, background: "var(--nav-bg)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", alignItems: "center" }}>
          {view !== "hub" && <button onClick={() => setView("hub")} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", color: "var(--nav-inactive)" }}>{"\u2190"} Hub</button>}
          {view !== "hub" && currentSection !== "hub" && <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }}></div>}
          {currentSection === "tickets" && (<>
            <button onClick={() => setView("form")} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: view === "form" ? "var(--brand)" : "transparent", color: view === "form" ? "#fff" : "var(--nav-inactive)" }}>+ New</button>
            <button onClick={handleDashboardClick} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: (view === "dashboard" || view === "password") ? "var(--brand)" : "transparent", color: (view === "dashboard" || view === "password") ? "#fff" : "var(--nav-inactive)", position: "relative" }}>
              {dashUnlocked ? "" : "\u{1F512} "}Dashboard
              {dashUnlocked && activeCount > 0 && (<span style={{ position: "absolute", top: 0, right: 2, width: 18, height: 18, borderRadius: "50%", background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>)}
            </button>
            {dashUnlocked && <button onClick={() => setView("activity")} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: view === "activity" ? "var(--brand)" : "transparent", color: view === "activity" ? "#fff" : "var(--nav-inactive)" }}>Activity</button>}
            <button onClick={() => { setLastSubmittedRef(null); setView("tracker"); }} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: (view === "tracker" || view === "submitted") ? "var(--brand)" : "transparent", color: (view === "tracker" || view === "submitted") ? "#fff" : "var(--nav-inactive)" }}>{"\u{1F50D}"} Track</button>
          </>)}
          {currentSection === "archive" && (<>
            <button onClick={() => setView("archive")} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: view === "archive" ? "var(--brand)" : "transparent", color: view === "archive" ? "#fff" : "var(--nav-inactive)" }}>Browse</button>
            {dashUnlocked && <button onClick={() => { setEditArchiveEntry("new"); setView("archive_add"); }} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: (view === "archive_add" || view === "archive_edit") ? "var(--brand)" : "transparent", color: (view === "archive_add" || view === "archive_edit") ? "#fff" : "var(--nav-inactive)" }}>+ Add</button>}
          </>)}
          {currentSection === "leads" && (<>
            <button onClick={() => setView("lead_form")} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: view === "lead_form" ? "var(--brand)" : "transparent", color: view === "lead_form" ? "#fff" : "var(--nav-inactive)" }}>+ Log Lead</button>
            <button onClick={() => { if (dashUnlocked) setView("leads_dashboard"); else setView("password"); }} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: view === "leads_dashboard" ? "var(--brand)" : "transparent", color: view === "leads_dashboard" ? "#fff" : "var(--nav-inactive)" }}>{dashUnlocked ? "" : "\u{1F512} "}Dashboard</button>
          </>)}
          {(currentSection === "analytics" || currentSection === "brand" || currentSection === "hub" || currentSection === "templates" || currentSection === "guide") && <button style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "var(--brand)", color: "#fff", cursor: "default" }}>{currentSection === "analytics" ? "Analytics" : currentSection === "brand" ? "Brand Assets" : currentSection === "templates" ? "Templates" : currentSection === "guide" ? "Guide" : "Home"}</button>}
        </nav>
        </div>
      </header>

      <main className="hub-main" style={{ maxWidth: (view === "archive" || view === "brand_assets" || view === "analytics" || view === "leads_dashboard" || view === "templates") ? 1000 : 900, margin: "0 auto", padding: "32px 24px", display: "flex", justifyContent: "center" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)" }}>
            <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}></div>
            <p style={{ fontSize: 14, margin: 0 }}>Loading tickets...</p>
          </div>
        ) : view === "hub" ? (
          <HubHome onNavigate={(id) => { if (id === "dashboard" || id === "leads_dashboard" || id === "analytics") { if (!dashUnlocked) { setView("password"); return; } } setView(id); }} tickets={tickets} dashUnlocked={dashUnlocked} leads={leads} />
        ) : view === "form" ? (
          <div style={{ maxWidth: 560, width: "100%" }}>
            <TicketForm onSubmit={handleSubmit} />
            {tickets.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--brand)", letterSpacing: "0.02em" }}>Ticket Overview</h3>
                <StatsBar tickets={tickets} />
              </div>
            )}
          </div>
        ) : view === "submitted" ? (
          <SubmitterView tickets={tickets} submittedRef={lastSubmittedRef} onAddNote={handleAddNote} onBackToForm={() => setView("form")} />
        ) : view === "tracker" ? (
          <SubmitterView tickets={tickets} submittedRef={null} onAddNote={handleAddNote} onBackToForm={() => setView("form")} />
        ) : view === "password" ? (
          <PasswordGate onUnlock={handleUnlock} />
        ) : view === "activity" ? (
          <ActivityLog tickets={tickets} />
        ) : view === "analytics" ? (
          <AnalyticsPanel tickets={tickets} archiveEntries={archiveEntries} leads={leads} />
        ) : view === "archive" ? (
          <MarketingArchive entries={archiveEntries} isAdmin={dashUnlocked} onManage={(id) => { if (id) { setEditArchiveEntry(id); setView("archive_edit"); } else { setEditArchiveEntry("new"); setView("archive_add"); } }} />
        ) : (view === "archive_add" || view === "archive_edit") ? (
          <ArchiveForm entry={editArchiveEntry !== "new" ? archiveEntries.find((e) => e.id === editArchiveEntry) : null} onSave={handleArchiveSave} onCancel={() => setView("archive")} onDelete={handleArchiveDelete} />
        ) : view === "lead_form" ? (
          <LeadForm onSave={handleLeadSave} onBackToHub={() => setView("hub")} />
        ) : view === "leads_dashboard" ? (
          <LeadsDashboard leads={leads} />
        ) : view === "brand_assets" ? (
          <BrandAssets assets={brandAssets} isAdmin={dashUnlocked} onUpload={handleAssetUpload} onDeleteAsset={handleAssetDelete} />
        ) : view === "templates" ? (
          <ContentTemplates templates={contentTemplates} isAdmin={dashUnlocked} onSave={handleTemplateSave} onDelete={handleTemplateDelete} />
        ) : view === "guide" ? (
          <SelfServiceGuide />
        ) : (
          <Dashboard tickets={tickets} onStatusChange={handleStatusChange} onComplete={handleComplete} onAddNote={handleAddNote} onDelete={handleDelete} onUpdatePriority={handleUpdatePriority} onUpdateDeadline={handleUpdateDeadline} onReopen={handleReopen} onTogglePin={handleTogglePin} />
        )}
      </main>
    </div>
  );
}
