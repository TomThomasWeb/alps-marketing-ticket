import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import jsPDF from "jspdf";

const ALPS_LOGO = "/alps-logo.webp";
const ALPS_LOGO_REVERSED = "/alps-logo-reversed.webp";

const DASHBOARD_PASSWORD = "Sunnyside!";

const PRIORITIES = {
  critical: { label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.25)", icon: "\u{1F534}" },
  high: { label: "High", color: "#ea580c", bg: "rgba(234,88,12,0.08)", border: "rgba(234,88,12,0.25)", icon: "\u{1F7E0}" },
  medium: { label: "Medium", color: "#ca8a04", bg: "rgba(202,138,4,0.08)", border: "rgba(202,138,4,0.25)", icon: "\u{1F7E1}" },
  low: { label: "Low", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.25)", icon: "\u{1F7E2}" },
};

const STATUS_FALLBACK = { label: "Open", color: "#6366f1", bg: "rgba(99,102,241,0.1)" };
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


function HubHome({ onNavigate, tickets, dashUnlocked, leads, onUnlockInline, notifications }) {
  const activeCount = tickets.filter((t) => t.status !== "completed").length;
  const leadsAction = leads.filter((l) => l.next_steps === "needs_action").length;
  const completedThisMonth = (() => { const s = new Date(); s.setDate(1); s.setHours(0,0,0,0); return tickets.filter((t) => t.completedAt && new Date(t.completedAt) >= s).length; })();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loginShake, setLoginShake] = useState(false);

  const tryLogin = () => {
    if (loginPw === DASHBOARD_PASSWORD) {
      onUnlockInline();
      setLoginPw("");
    } else {
      setLoginError(true);
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 500);
      setLoginPw("");
    }
  };

  // Build activity feed from recent data
  const feedItems = (() => {
    const items = [];
    tickets.slice(0, 10).forEach((t) => {
      items.push({ icon: "\u{1F4DD}", text: (t.ref || "Ticket") + " submitted by " + t.name, time: t.createdAt, action: "tracker" });
      if (t.completedAt) items.push({ icon: "\u2705", text: (t.ref || "Ticket") + " completed", time: t.completedAt, action: "dashboard" });
    });
    leads.slice(0, 5).forEach((l) => {
      items.push({ icon: "\u{1F4C8}", text: "Lead from " + l.broker, time: l.created_at, action: "leads_dashboard" });
    });
    return items.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
  })();

  const fmtAgo = (ts) => {
    const diff = (Date.now() - new Date(ts)) / 60000;
    if (diff < 1) return "Just now";
    if (diff < 60) return Math.floor(diff) + "m ago";
    if (diff < 1440) return Math.floor(diff / 60) + "h ago";
    return Math.floor(diff / 1440) + "d ago";
  };

  return (
    <div style={{ width: "100%", maxWidth: 860 }}>

      <div style={{ marginBottom: 32, paddingBottom: 28, borderBottom: "1px solid var(--border)" }}>
        <p style={{ margin: "0 0 2px", fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>{greeting}</p>
        <h2 style={{ margin: "0 0 20px", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Marketing Hub</h2>

        <div className="hub-hero-split" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <button onClick={() => onNavigate("form")} style={{ padding: "22px 20px", background: "var(--brand)", borderRadius: 14, border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.25s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(35,29,104,0.2)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)", marginBottom: 3 }}>{"\u{1F4DD}"} Submit a Ticket</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Request marketing support</div>
              </button>
              <button onClick={() => onNavigate("lead_form")} style={{ padding: "22px 20px", background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", transition: "all 0.25s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-hover)"; e.currentTarget.style.borderColor = "#16a34a"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{"\u{1F4C8}"} Log a Lead</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Record an inbound lead</div>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button onClick={() => onNavigate("tracker")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--brand)", padding: 0, transition: "opacity 0.2s" }} onMouseOver={(e) => e.currentTarget.style.opacity = "0.7"} onMouseOut={(e) => e.currentTarget.style.opacity = "1"}>{"\u{1F50D}"} Track a ticket {"\u2192"}</button>
              {activeCount > 0 && <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--brand)", display: "inline-block" }}></span>{activeCount} active</span>}
              {leadsAction > 0 && <span style={{ fontSize: 12, color: "#ca8a04", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: "#ca8a04", display: "inline-block" }}></span>{leadsAction} need action</span>}
              {completedThisMonth > 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{"\u2705"} {completedThisMonth} this month</span>}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent Activity</span>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: feedItems.length > 0 ? "#22c55e" : "var(--border)", display: "inline-block" }}></span>
            </div>
            <div style={{ maxHeight: 140, overflowY: "auto" }}>
              {feedItems.length === 0 ? (
                <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No recent activity</div>
              ) : feedItems.map((f, i) => (
                <div key={i} onClick={() => onNavigate(f.action)} style={{ padding: "8px 14px", borderBottom: i < feedItems.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s", display: "flex", gap: 8, alignItems: "flex-start" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-input)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{fmtAgo(f.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>RESOURCES</h3>
        <div className="hub-resource-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { id: "archive", icon: "\u{1F4DA}", title: "Marketing Archive", desc: "Campaigns, posts & materials", color: "#8b5cf6" },
            { id: "brand_assets", icon: "\u{1F3A8}", title: "Brand Assets", desc: "Colours, fonts, logos & icons", color: "#E64592" },
            { id: "calendar", icon: "\u{1F4C5}", title: "Content Calendar", desc: "Plan & track marketing output", color: "#2563eb" },
          ].map((r) => (
            <button key={r.id} onClick={() => onNavigate(r.id)} style={{ padding: "18px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.25s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-hover)"; e.currentTarget.style.borderColor = r.color; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>TOOLS</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "templates", icon: "\u{1F4C4}", label: "Content Templates", color: "#0d9488" },
            { id: "converter", icon: "\u{1F504}", label: "File Converter", color: "#64748b" },
            { id: "qr_generator", icon: "\u{1F517}", label: "QR Generator", color: "#231D68" },
            { id: "image_editor", icon: "\u{1F58C}\uFE0F", label: "Image Editor", color: "#e11d48" },
            { id: "guide", icon: "\u{1F4D6}", label: "Self-Service Guide", color: "#ca8a04" },
            { id: "footer", icon: "\u2709\uFE0F", label: "Email Footer", color: "#ea580c", soon: true },
          ].map((t) => (
            <button key={t.id} onClick={() => !t.soon && onNavigate(t.id)} disabled={t.soon} style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, cursor: t.soon ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s", opacity: t.soon ? 0.45 : 1 }} onMouseOver={(e) => { if (!t.soon) { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform = "translateY(-1px)"; } }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.label}</span>
              {t.soon && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Soon</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>DASHBOARDS</h3>
          <div className="hub-dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { id: "dashboard", icon: "\u{1F4CB}", title: "Tickets", stat: activeCount > 0 ? activeCount + " active" : null, color: "#231d68" },
              { id: "leads_dashboard", icon: "\u{1F4C8}", title: "Leads", stat: leads.length > 0 ? leads.length + " logged" : null, color: "#0d9488" },
              { id: "analytics", icon: "\u{1F4CA}", title: "Analytics", stat: "Reports", color: "#dc2626" },
            ].map((d) => (
              <button key={d.id} onClick={() => onNavigate(d.id)} style={{ padding: "14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.25s", opacity: !dashUnlocked ? 0.7 : 1 }} onMouseOver={(e) => { e.currentTarget.style.borderColor = d.color; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{d.icon}</span>
                  {!dashUnlocked && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{"\u{1F512}"}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{d.title}</div>
                {d.stat && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{d.stat}</div>}
              </button>
            ))}
          </div>
        </div>
        {!dashUnlocked ? (
          <div style={{ width: 200, flexShrink: 0 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>ADMIN</h3>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, animation: loginShake ? "shakeAnim 0.4s ease" : "none" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>{"\u{1F512}"} Unlock dashboards</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="password" value={loginPw} onChange={(e) => { setLoginPw(e.target.value); setLoginError(false); }} onKeyDown={(e) => { if (e.key === "Enter") tryLogin(); }} placeholder="Password" style={{ flex: 1, padding: "8px 10px", background: "var(--bg-input)", border: "1px solid " + (loginError ? "#ef4444" : "var(--border)"), borderRadius: 6, color: "var(--text-primary)", fontSize: 12, outline: "none", minWidth: 0 }} />
                <button onClick={tryLogin} style={{ padding: "8px 12px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Go</button>
              </div>
              {loginError && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>Wrong password</div>}
            </div>
          </div>
        ) : (
          <div style={{ width: 200, flexShrink: 0 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>&nbsp;</h3>
            <div style={{ padding: "12px 14px", background: "var(--brand-light)", borderRadius: 10, border: "1px solid var(--brand)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)" }}>{"\u2705"} Admin unlocked</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Dashboards & editing enabled</div>
            </div>
          </div>
        )}
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
  const s = STATUS[ticket.status] || STATUS_FALLBACK;
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
  const s = STATUS[ticket.status] || STATUS_FALLBACK;
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

  // Month-over-month comparison
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  const solm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const eolm = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const tmCreated = tickets.filter((t) => new Date(t.createdAt) >= som).length;
  const lmCreated = tickets.filter((t) => { const c = new Date(t.createdAt); return c >= solm && c <= eolm; }).length;
  const tmDone = ct.filter((t) => new Date(t.completedAt) >= som).length;
  const lmDone = ct.filter((t) => { const c = new Date(t.completedAt); return c >= solm && c <= eolm; }).length;

  // Projected completions
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedDone = dayOfMonth > 0 ? Math.round((tmDone / dayOfMonth) * daysInMonth) : 0;
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
        <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ ...mb, background: "var(--bg-card)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>This Month vs Last</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--text-secondary)" }}>Submitted</span><span style={{ fontWeight: 700, color: tmCreated >= lmCreated ? "#16a34a" : "#dc2626" }}>{tmCreated} {tmCreated >= lmCreated ? "\u2191" : "\u2193"} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>vs {lmCreated}</span></span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "var(--text-secondary)" }}>Completed</span><span style={{ fontWeight: 700, color: tmDone >= lmDone ? "#16a34a" : "#dc2626" }}>{tmDone} {tmDone >= lmDone ? "\u2191" : "\u2193"} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>vs {lmDone}</span></span></div>
          </div>
          <div style={{ ...mb, background: "var(--bg-card)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Projected This Month</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)" }}>{projectedDone}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>completions at current pace</div>
          </div>
          <div style={{ ...mb, background: "var(--bg-card)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Speed</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--text-secondary)" }}>Fastest</span><span style={{ fontWeight: 700, color: "#16a34a" }}>{fmtH(fH)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "var(--text-secondary)" }}>Slowest</span><span style={{ fontWeight: 700, color: "#dc2626" }}>{fmtH(sH)}</span></div>
          </div>
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

        const exportPDF = () => {
          const doc = new jsPDF("p", "mm", "a4");
          const w = doc.internal.pageSize.getWidth();
          const brandColor = [35, 29, 104];
          const motorColor = [230, 69, 146];
          const tealColor = [32, 163, 158];

          // Header bar
          doc.setFillColor(...brandColor);
          doc.rect(0, 0, w, 32, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text("ALPS MARKETING REPORT", 16, 18);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(monthName, 16, 26);
          doc.text("Generated: " + now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), w - 16, 26, { align: "right" });

          let y = 46;
          const section = (title, color, items) => {
            doc.setFillColor(...color);
            doc.rect(16, y, 4, 8, "F");
            doc.setTextColor(...color);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(title, 24, y + 6);
            y += 14;
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            items.forEach(([label, value]) => {
              doc.text(label, 24, y);
              doc.setFont("helvetica", "bold");
              doc.text(String(value), 90, y);
              doc.setFont("helvetica", "normal");
              y += 7;
            });
            y += 6;
          };

          section("Tickets", brandColor, [
            ["Submitted", mtTC], ["Completed", mtTD], ["Active Backlog", at.length], ["Avg Turnaround", fmtH(mtAvg)],
            ...Object.entries(mtPri).map(([k, v]) => [(PRIORITIES[k] ? PRIORITIES[k].label : k), v]),
          ]);
          section("Outbound Content", motorColor, [
            ["Pieces Published", mtA],
            ...Object.entries(mtAT).map(([k, v]) => [k, v]),
          ]);
          section("Inbound Leads", tealColor, [
            ["Total", mtL], ["Needs Action", mtLA], ["Passed Through", mtLP],
            ...Object.entries(mtLS).map(([k, v]) => [k, v]),
          ]);

          // Footer
          doc.setDrawColor(200, 200, 200);
          doc.line(16, 280, w - 16, 280);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Alps Marketing Hub - Confidential", 16, 286);
          doc.text("Page 1 of 1", w - 16, 286, { align: "right" });

          doc.save("Alps-Marketing-Report-" + monthName.replace(/\s/g, "-") + ".pdf");
        };

        return (<>
          <div style={{ ...card, marginBottom: 20, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4CB}"} Monthly Marketing Report</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>{monthName} summary across all marketing activity</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={copyReport} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4CB}"} Copy to Clipboard</button>
              <button onClick={exportPDF} style={{ padding: "10px 24px", background: "#dc2626", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4C4}"} Export PDF</button>
            </div>
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
          const s = STATUS[ticket.status] || STATUS_FALLBACK;
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
  const [campaignFilter, setCampaignFilter] = useState("all");

  const campaigns = [...new Set(entries.map((e) => e.campaign).filter(Boolean))].sort();
  const PERF_BADGE = { strong: { label: "Strong", color: "#16a34a", bg: "rgba(22,163,74,0.1)" }, average: { label: "Average", color: "#ca8a04", bg: "rgba(202,138,4,0.1)" }, weak: { label: "Weak", color: "#dc2626", bg: "rgba(220,38,38,0.1)" } };

  const filtered = entries.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (campaignFilter !== "all" && (e.campaign || "") !== campaignFilter) return false;
    if (search.trim()) { const q = search.toLowerCase(); return e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q) || (e.tags || []).some((tag) => tag.toLowerCase().includes(q)) || (e.campaign || "").toLowerCase().includes(q); }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  // Group by campaign if campaignFilter is "all" and there are campaigns
  const groupedByCampaign = (() => {
    if (campaignFilter !== "all") return null;
    const groups = {};
    sorted.forEach((e) => { const c = e.campaign || "Ungrouped"; if (!groups[c]) groups[c] = []; groups[c].push(e); });
    return Object.keys(groups).length > 1 ? groups : null;
  })();

  const renderEntry = (entry) => {
    const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other;
    const perf = PERF_BADGE[entry.performance];
    return (
      <div key={entry.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s", cursor: "default" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = t.color; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: t.color }}>{t.label}</span>
            <span>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {entry.campaign && <span style={{ padding: "1px 6px", borderRadius: 4, background: "var(--brand-light)", color: "var(--brand)", fontWeight: 600 }}>{entry.campaign}</span>}
            {perf && <span style={{ padding: "1px 6px", borderRadius: 4, background: perf.bg, color: perf.color, fontWeight: 600 }}>{perf.label}</span>}
            {entry.tags && entry.tags.length > 0 && entry.tags.map((tag) => <span key={tag} style={{ padding: "1px 6px", borderRadius: 4, background: "var(--bg-input)", color: "var(--text-muted)" }}>{tag}</span>)}
          </div>
        </div>
        {entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "6px 12px", background: "var(--brand-light)", border: "none", borderRadius: 6, color: "var(--brand)", fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>{"\u{1F517}"} Link</a>}
        {isAdmin && <button onClick={() => onManage(entry.id)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Edit</button>}
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4DA}"} Marketing Archive</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{entries.length} pieces catalogued</p></div>
        {isAdmin && <button onClick={() => onManage()} style={{ padding: "9px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u2795"} Add Entry</button>}
      </div>
      <div className="hub-filter-row" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>{"\u{1F50D}"}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search archive..." style={{ width: "100%", padding: "9px 14px 9px 36px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
        <div className="hub-type-filter" style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "transparent", color: filter === "all" ? "#fff" : "var(--text-muted)" }}>All</button>
          {Object.entries(ARCHIVE_TYPES).map(([key, t]) => (<button key={key} onClick={() => setFilter(key)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === key ? t.color : "transparent", color: filter === key ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>{t.icon} {t.label}</button>))}
        </div>
        {campaigns.length > 0 && (
          <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} style={{ padding: "7px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, cursor: "pointer", outline: "none" }}>
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", borderRadius: 6, padding: 2, border: "1px solid var(--border)" }}>
          <button onClick={() => setViewMode("list")} style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "list" ? "var(--brand)" : "transparent", color: viewMode === "list" ? "#fff" : "var(--text-muted)", fontSize: 14 }}>{"\u2630"}</button>
          <button onClick={() => setViewMode("grid")} style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "grid" ? "var(--brand)" : "transparent", color: viewMode === "grid" ? "#fff" : "var(--text-muted)", fontSize: 14 }}>{"\u25A6"}</button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{search.trim() ? "\u{1F50D}" : "\u{1F4DA}"}</div><p style={{ margin: 0, fontSize: 14 }}>{search.trim() ? "No entries match your search" : "No archive entries yet"}</p></div>
      ) : viewMode === "list" ? (
        groupedByCampaign ? (
          <div>
            {Object.entries(groupedByCampaign).map(([campaign, items]) => (
              <div key={campaign} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{campaign}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({items.length})</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map(renderEntry)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{sorted.map(renderEntry)}</div>
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {sorted.map((entry) => { const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other; const perf = PERF_BADGE[entry.performance]; return (
            <div key={entry.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 8, cursor: "default" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = t.color; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}><span style={{ fontSize: 22 }}>{t.icon}</span><div style={{ display: "flex", gap: 4 }}>{perf && <span style={{ fontSize: 10, fontWeight: 600, color: perf.color }}>{perf.label}</span>}{entry.campaign && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--brand)" }}>{entry.campaign}</span>}</div></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{entry.title}</div>
              {entry.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.description}</div>}
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>{isAdmin && <button onClick={() => onManage(entry.id)} style={{ fontSize: 11, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", color: "var(--text-muted)" }}>Edit</button>}</div>
            </div>); })}
        </div>
      )}
    </div>
  );
}


function ArchiveForm({ entry, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(entry ? { title: entry.title, type: entry.type, description: entry.description || "", date: entry.date || "", link: entry.link || "", tags: (entry.tags || []).join(", "), campaign: entry.campaign || "", performance: entry.performance || "" } : { title: "", type: "social_post", description: "", date: "", link: "", tags: "", campaign: "", performance: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const handleSave = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ title: form.title.trim(), type: form.type, description: form.description.trim(), date: form.date || null, link: form.link.trim() || null, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), campaign: form.campaign.trim() || null, performance: form.performance || null }, entry?.id); setSaving(false); };
  const inputStyle = { width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none" };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 };
  const PERF = [{ value: "", label: "Not tracked" }, { value: "strong", label: "\u{1F7E2} Strong" }, { value: "average", label: "\u{1F7E1} Average" }, { value: "weak", label: "\u{1F534} Weak" }];
  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{entry ? "\u270E Edit Entry" : "\u{1F4DA} Add to Archive"}</h2>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Title *</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q1 LinkedIn Campaign Post" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><label style={labelStyle}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(ARCHIVE_TYPES).map(([k, t]) => <option key={k} value={k}>{t.icon} {t.label}</option>)}</select></div>
          <div><label style={labelStyle}>Date</label><input type="date" style={{ ...inputStyle, cursor: "pointer" }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Description</label><textarea rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this piece" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><label style={labelStyle}>Campaign <span style={{ fontWeight: 400, opacity: 0.6 }}>(group)</span></label><input style={inputStyle} value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="e.g. Q1 Motor Push" /></div>
          <div><label style={labelStyle}>Performance</label><select value={form.performance} onChange={(e) => setForm({ ...form, performance: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{PERF.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Link / URL</label><input style={inputStyle} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
        <div style={{ marginBottom: 24 }}><label style={labelStyle}>Tags <span style={{ fontWeight: 400, opacity: 0.6 }}>(comma separated)</span></label><input style={inputStyle} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. social, motor, q1" /></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ flex: 1, padding: "12px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : entry ? "Update Entry" : "Add to Archive"}</button>
          <button onClick={onCancel} style={{ padding: "12px 20px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          {entry && onDelete && (confirmDel ? <button onClick={() => onDelete(entry.id)} style={{ padding: "12px 16px", background: "#dc2626", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirm</button> : <button onClick={() => setConfirmDel(true)} style={{ padding: "12px 16px", background: "transparent", border: "1px solid #dc2626", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>)}
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
        <div><label style={labelStyle}>Next Steps</label><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[["needs_action", "\u{1F7E1} Needs Action", "#ca8a04"], ["passed_through", "\u2705 Passed Through", "#16a34a"], ["closed", "\u{1F6D1} Closed", "#64748b"]].map(([val, label, col]) => (<button key={val} onClick={() => setForm({ ...form, next_steps: val })} style={{ padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.next_steps === val ? col : "var(--border)"), background: form.next_steps === val ? col + "15" : "var(--bg-input)", color: form.next_steps === val ? col : "var(--text-muted)", transition: "all 0.2s", textAlign: "left" }}>{label}</button>))}</div></div>
      </div>
      <div style={{ marginBottom: 24 }}><label style={labelStyle}>Logged By *</label><input style={inputStyle} value={form.logged_by} onChange={(e) => setForm({ ...form, logged_by: e.target.value })} placeholder="Your name" /></div>
      <button onClick={handleSave} disabled={saving || !valid} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: valid ? 1 : 0.5 }}>{saving ? "Saving..." : "Log Lead"}</button>
    </div></div>
  );
}

function LeadsDashboard({ leads, onUpdate, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [expandedLead, setExpandedLead] = useState(null);
  const [noteText, setNoteText] = useState("");

  const filtered = leads.filter((l) => {
    if (filter === "needs_action" && l.next_steps !== "needs_action") return false;
    if (filter === "passed_through" && l.next_steps !== "passed_through") return false;
    if (filter === "closed" && l.next_steps !== "closed") return false;
    if (search.trim()) { const q = search.toLowerCase(); return l.broker.toLowerCase().includes(q) || l.enquiry.toLowerCase().includes(q) || l.logged_by.toLowerCase().includes(q); }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const needsAction = leads.filter((l) => l.next_steps === "needs_action").length;
  const passedThrough = leads.filter((l) => l.next_steps === "passed_through").length;
  const closed = leads.filter((l) => l.next_steps === "closed").length;

  // Sparkline: last 14 days
  const sparkData = (() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      days.push({ date: d, count: leads.filter((l) => { const c = new Date(l.created_at); return c >= d && c < next; }).length });
    }
    return days;
  })();
  const sparkMax = Math.max(...sparkData.map((d) => d.count), 1);

  // This week vs last week
  const now = new Date();
  const sow = new Date(now); sow.setDate(now.getDate() - now.getDay()); sow.setHours(0,0,0,0);
  const slw = new Date(sow); slw.setDate(slw.getDate() - 7);
  const thisWeek = leads.filter((l) => new Date(l.created_at) >= sow).length;
  const lastWeek = leads.filter((l) => { const c = new Date(l.created_at); return c >= slw && c < sow; }).length;

  const toggleStatus = (lead, newStatus) => {
    if (onUpdate) onUpdate(lead.id, { next_steps: newStatus });
  };

  const addNote = (lead) => {
    if (!noteText.trim() || !onUpdate) return;
    const existing = lead.notes || "";
    const ts = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const updated = (existing ? existing + "\n" : "") + "[" + ts + "] " + noteText.trim();
    onUpdate(lead.id, { notes: updated });
    setNoteText("");
  };

  const [followUpDraft, setFollowUpDraft] = useState({});

  const updateFollowUp = (lead) => {
    const text = followUpDraft[lead.id];
    if (text !== undefined && text !== (lead.follow_up || "") && onUpdate) onUpdate(lead.id, { follow_up: text });
  };

  const STATUS_OPTS = [
    { key: "needs_action", label: "Needs Action", color: "#ca8a04", bg: "rgba(202,138,4,0.1)" },
    { key: "passed_through", label: "Passed", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
    { key: "closed", label: "Closed", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4C8}"} Leads Dashboard</h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{leads.length} total lead{leads.length !== 1 ? "s" : ""} logged</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="hub-analytics-cols">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand)" }}>{leads.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Total</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ca8a04" }}>{needsAction}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Needs Action</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{passedThrough}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Passed</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>14-day trend</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: thisWeek >= lastWeek ? "#16a34a" : "#dc2626" }}>{thisWeek >= lastWeek ? "\u2191" : "\u2193"} {thisWeek} this wk</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
            {sparkData.map((d, i) => (
              <div key={i} style={{ flex: 1, background: d.count > 0 ? "var(--brand)" : "var(--bar-bg)", borderRadius: 2, height: Math.max(2, (d.count / sparkMax) * 32), opacity: d.count > 0 ? 0.8 : 0.3, transition: "height 0.3s" }} title={d.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ": " + d.count}></div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>{"\u{1F50D}"}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." style={{ width: "100%", padding: "9px 14px 9px 36px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          {[["all", "All"], ["needs_action", "\u{1F7E1} Action"], ["passed_through", "\u2705 Passed"], ["closed", "\u{1F6D1} Closed"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === k ? "var(--brand)" : "transparent", color: filter === k ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          {[["list", "\u2630"], ["timeline", "\u{1F4C5}"]].map(([k, ic]) => (
            <button key={k} onClick={() => setViewMode(k)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 14, cursor: "pointer", border: "none", background: viewMode === k ? "var(--brand)" : "transparent", color: viewMode === k ? "#fff" : "var(--text-muted)" }}>{ic}</button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{"\u{1F4C8}"}</div>
          <p style={{ margin: 0, fontSize: 14 }}>{search.trim() ? "No leads match your search" : "No leads logged yet"}</p>
        </div>
      ) : viewMode === "timeline" ? (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: "var(--border)" }}></div>
          {sorted.map((lead) => {
            const s = LEAD_SOURCES[lead.source] || LEAD_SOURCES.other;
            const st = STATUS_OPTS.find((o) => o.key === lead.next_steps) || STATUS_OPTS[0];
            return (
              <div key={lead.id} style={{ position: "relative", marginBottom: 16, paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: -4, top: 8, width: 10, height: 10, borderRadius: 5, background: st.color, border: "2px solid var(--bg-page)" }}></div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{lead.broker}</span>
                    <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-body)", lineHeight: 1.4 }}>{lead.enquiry}</p>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Logged by {lead.logged_by} via {s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((lead) => {
            const s = LEAD_SOURCES[lead.source] || LEAD_SOURCES.other;
            const expanded = expandedLead === lead.id;
            const st = STATUS_OPTS.find((o) => o.key === lead.next_steps) || STATUS_OPTS[0];
            return (
              <div key={lead.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", cursor: "pointer" }} onClick={() => setExpandedLead(expanded ? null : lead.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{lead.broker}</div>
                      <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>{s.label}</span><span>{"\u00B7"}</span><span>{new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span><span>{"\u00B7"}</span><span>{lead.logged_by}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {STATUS_OPTS.map((opt) => (
                        <button key={opt.key} onClick={(e) => { e.stopPropagation(); toggleStatus(lead, opt.key); }} style={{ padding: "4px 10px", borderRadius: 16, fontSize: 10, fontWeight: 700, border: "1px solid " + (lead.next_steps === opt.key ? opt.color : "var(--border)"), background: lead.next_steps === opt.key ? opt.bg : "transparent", color: lead.next_steps === opt.key ? opt.color : "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" }}>{opt.label}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>{"\u25BC"}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5 }}>{lead.enquiry}</p>
                </div>

                {expanded && (
                  <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ padding: "12px 0" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Follow-up Outcome</div>
                      <textarea value={followUpDraft[lead.id] !== undefined ? followUpDraft[lead.id] : (lead.follow_up || "")} onChange={(e) => setFollowUpDraft({ ...followUpDraft, [lead.id]: e.target.value })} onBlur={() => updateFollowUp(lead)} placeholder="What happened with this lead? Anyone can edit this..." rows={2} style={{ width: "100%", padding: "10px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Notes</div>
                      {lead.notes && <div style={{ padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8, marginBottom: 8, fontSize: 12, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{lead.notes}</div>}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={expandedLead === lead.id ? noteText : ""} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(lead); }} placeholder="Add a note..." style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                        <button onClick={() => addNote(lead)} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Add</button>
                      </div>
                    </div>
                    {onDelete && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                        <button onClick={() => { if (window.confirm("Delete this lead from " + lead.broker + "? This cannot be undone.")) onDelete(lead.id); }} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseOver={(e) => { e.target.style.background = "#fef2f2"; }} onMouseOut={(e) => { e.target.style.background = "transparent"; }}>{"\u{1F5D1}"} Delete Lead</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

  const downloadBrandPack = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const w = doc.internal.pageSize.getWidth();
    // Header
    doc.setFillColor(35, 29, 104);
    doc.rect(0, 0, w, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ALPS BRAND GUIDELINES", 16, 18);
    // Colors section
    let y = 40;
    doc.setTextColor(35, 29, 104);
    doc.setFontSize(14);
    doc.text("Brand Colours", 16, y); y += 10;
    BRAND_COLORS.forEach((c) => {
      const r = parseInt(c.hex.slice(1, 3), 16), g = parseInt(c.hex.slice(3, 5), 16), b = parseInt(c.hex.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.roundedRect(16, y, 20, 12, 2, 2, "F");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(c.name, 40, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(c.hex, 40, y + 10);
      y += 16;
    });
    y += 6;
    // Typography
    doc.setTextColor(35, 29, 104);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Typography", 16, y); y += 8;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [["Primary", "Inter / Proxima Nova / Helvetica Neue"], ["Headings", "Bold 700-800, tight letter-spacing"], ["Body", "Regular 400, 14-16px, 1.5 line-height"], ["Monospace", "JetBrains Mono / SF Mono"]].forEach(([label, val]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label + ":", 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(val, 50, y);
      y += 7;
    });
    y += 8;
    // Assets list
    if (assets.length > 0) {
      doc.setTextColor(35, 29, 104);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Available Assets", 16, y); y += 8;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      assets.forEach((a) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text("\u2022 " + (a.asset_name || "Asset") + " (" + (a.category || "file") + ") - " + formatExt(a.file_url), 16, y);
        y += 6;
      });
    }
    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(16, 284, w - 16, 284);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Alps Marketing Hub - Brand Pack - " + new Date().toLocaleDateString("en-GB"), 16, 290);
    doc.save("Alps-Brand-Pack.pdf");
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ width: "100%" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F3A8}"} Brand Assets</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Alps brand colours, typography, logos, and icons.</p>
        <button onClick={downloadBrandPack} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>{"\u{1F4E6}"} Download Brand Pack</button>
      </div>

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


function FileConverter() {
  const [files, setFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState("png");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [batchMode, setBatchMode] = useState(false);

  const formats = [
    { value: "png", label: "PNG", mime: "image/png" },
    { value: "jpeg", label: "JPG", mime: "image/jpeg" },
    { value: "webp", label: "WEBP", mime: "image/webp" },
  ];

  const SOCIAL_PRESETS = [
    { label: "LinkedIn Post", w: 1200, h: 627, icon: "\u{1F4BC}" },
    { label: "LinkedIn Cover", w: 1584, h: 396, icon: "\u{1F4BC}" },
    { label: "Facebook Post", w: 1200, h: 630, icon: "\u{1F4D8}" },
    { label: "Facebook Cover", w: 820, h: 312, icon: "\u{1F4D8}" },
    { label: "Instagram Post", w: 1080, h: 1080, icon: "\u{1F4F7}" },
    { label: "Instagram Story", w: 1080, h: 1920, icon: "\u{1F4F7}" },
    { label: "X / Twitter Post", w: 1600, h: 900, icon: "\u{1D54F}" },
    { label: "X / Twitter Header", w: 1500, h: 500, icon: "\u{1D54F}" },
    { label: "Email Banner", w: 600, h: 250, icon: "\u2709\uFE0F" },
  ];
  const [showPresets, setShowPresets] = useState(false);
  const applyPreset = (p) => { setWidth(String(p.w)); setHeight(String(p.h)); setLockAspect(false); setShowPresets(false); };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    if (selected.length === 0) return;
    setResults([]);
    const loaded = [];
    selected.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          loaded.push({ file: f, img, preview: ev.target.result, origW: img.width, origH: img.height });
          if (loaded.length === selected.length) {
            setFiles(loaded);
            if (!batchMode && loaded.length === 1) {
              setWidth(String(loaded[0].origW));
              setHeight(String(loaded[0].origH));
            }
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });
  };

  const handleWidthChange = (v) => {
    setWidth(v);
    if (lockAspect && files.length === 1 && v && files[0].origW) {
      setHeight(String(Math.round((parseInt(v) / files[0].origW) * files[0].origH)));
    }
  };
  const handleHeightChange = (v) => {
    setHeight(v);
    if (lockAspect && files.length === 1 && v && files[0].origH) {
      setWidth(String(Math.round((parseInt(v) / files[0].origH) * files[0].origW)));
    }
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const fmt = formats.find((f) => f.value === outputFormat);
    const output = [];

    for (const item of files) {
      const targetW = width ? parseInt(width) : item.origW;
      const targetH = height ? parseInt(height) : item.origH;
      canvas.width = targetW;
      canvas.height = targetH;
      if (outputFormat === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, targetW, targetH); }
      ctx.drawImage(item.img, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL(fmt.mime, 0.92);
      const baseName = item.file.name.replace(/\.[^.]+$/, "");
      output.push({
        name: baseName + "-" + targetW + "x" + targetH + "." + outputFormat,
        dataUrl,
        size: Math.round((dataUrl.length * 3) / 4 / 1024),
        w: targetW,
        h: targetH,
      });
    }
    setResults(output);
    setProcessing(false);
  };

  const downloadOne = (r) => {
    const a = document.createElement("a"); a.href = r.dataUrl; a.download = r.name; a.click();
  };
  const downloadAll = () => { results.forEach((r, i) => setTimeout(() => downloadOne(r), i * 200)); };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" };

  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F504}"} File Converter</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Resize, convert, and batch-process images for social media and web.</p>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setBatchMode(false); setFiles([]); setResults([]); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + (!batchMode ? "var(--brand)" : "var(--border)"), background: !batchMode ? "var(--brand-light)" : "transparent", color: !batchMode ? "var(--brand)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Single Image</button>
          <button onClick={() => { setBatchMode(true); setFiles([]); setResults([]); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + (batchMode ? "var(--brand)" : "var(--border)"), background: batchMode ? "var(--brand-light)" : "transparent", color: batchMode ? "var(--brand)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4DA}"} Batch Mode</button>
        </div>

        {files.length === 0 ? (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: 12, cursor: "pointer", marginBottom: 16, transition: "border-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--brand)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ fontSize: 32, opacity: 0.4 }}>{batchMode ? "\u{1F4DA}" : "\u{1F5BC}\uFE0F"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{batchMode ? "Select multiple images" : "Select an image"}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>PNG, JPG, WEBP, GIF</div>
            <input ref={fileRef} type="file" accept="image/*" multiple={batchMode} onChange={handleFiles} style={{ display: "none" }} />
          </label>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{files.length} image{files.length !== 1 ? "s" : ""} selected</span>
              <button onClick={() => { setFiles([]); setResults([]); if (fileRef.current) fileRef.current.value = ""; }} style={{ fontSize: 12, background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: "var(--text-muted)" }}>Clear</button>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {files.map((f, i) => (
                <div key={i} style={{ flexShrink: 0, width: 80, textAlign: "center" }}>
                  <img src={f.preview} alt={f.file.name} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{f.origW}x{f.origH}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Width (px)</label>
                <input style={inputStyle} type="number" value={width} onChange={(e) => handleWidthChange(e.target.value)} placeholder={files[0] ? String(files[0].origW) : ""} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Height (px)</label>
                <input style={inputStyle} type="number" value={height} onChange={(e) => handleHeightChange(e.target.value)} placeholder={files[0] ? String(files[0].origH) : ""} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Format</label>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>{formats.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              {!batchMode && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}><input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} style={{ accentColor: "var(--brand)" }} />Lock aspect ratio</label>}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowPresets(!showPresets)} style={{ padding: "6px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600 }}>Social Presets {showPresets ? "\u25B2" : "\u25BC"}</button>
                {showPresets && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 240, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow-hover)", zIndex: 10, maxHeight: 280, overflowY: "auto" }}>
                    {SOCIAL_PRESETS.map((p) => (
                      <button key={p.label} onClick={() => applyPreset(p)} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left", fontSize: 12, color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}>
                        <span>{p.icon} {p.label}</span><span style={{ color: "var(--text-muted)" }}>{p.w}x{p.h}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={convert} disabled={processing} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: processing ? 0.6 : 1 }}>{processing ? "Processing..." : "Convert" + (files.length > 1 ? " All (" + files.length + ")" : "")}</button>
          </>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{results.length} file{results.length !== 1 ? "s" : ""} ready</span>
              {results.length > 1 && <button onClick={downloadAll} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4E6}"} Download All</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {results.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8 }}>
                  <img src={r.dataUrl} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.w}x{r.h} {"\u00B7"} ~{r.size}KB</div>
                  </div>
                  <button onClick={() => downloadOne(r)} style={{ padding: "6px 14px", background: "var(--brand-light)", border: "none", borderRadius: 6, color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function QRCodeGenerator() {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(300);
  const [color, setColor] = useState("231D68");
  const [bgColor, setBgColor] = useState("ffffff");
  const [generated, setGenerated] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);

  const presetColors = [
    { label: "Alps Main", hex: "231D68" },
    { label: "Motor", hex: "E64592" },
    { label: "Commercial", hex: "20A39E" },
    { label: "Black", hex: "000000" },
  ];

  const generate = () => {
    if (!url.trim()) return;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(url.trim()) + "&color=" + color + "&bgcolor=" + bgColor + "&format=png&margin=1";
    setGenerated({ url: qrUrl, inputUrl: url.trim() });
  };

  const handleLogo = (e) => {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const renderWithLogo = useCallback(() => {
    if (!generated || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      canvas.width = qrImg.width;
      canvas.height = qrImg.height;
      ctx.drawImage(qrImg, 0, 0);
      if (logoPreview) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const logoSize = Math.round(qrImg.width * 0.22);
          const x = (qrImg.width - logoSize) / 2;
          const y = (qrImg.height - logoSize) / 2;
          const pad = 6;
          ctx.fillStyle = "#" + bgColor;
          ctx.beginPath();
          ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
          ctx.fill();
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        };
        logoImg.src = logoPreview;
      }
    };
    qrImg.src = generated.url;
  }, [generated, logoPreview, bgColor]);

  useEffect(() => { renderWithLogo(); }, [renderWithLogo]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob((blob) => {
        if (!blob) { window.open(generated.url, "_blank"); return; }
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qr-code-" + size + "px.png";
        link.click();
      });
    } catch (e) { window.open(generated.url, "_blank"); }
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" };

  return (
    <div style={{ width: "100%", maxWidth: 560 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F517}"} QR Code Generator</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Generate QR codes with optional logo overlay for print materials and campaigns.</p>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>URL or Text *</label>
          <input style={inputStyle} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" onKeyDown={(e) => e.key === "Enter" && generate()} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Size</label>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value={200}>200 x 200px</option>
              <option value={300}>300 x 300px</option>
              <option value={500}>500 x 500px</option>
              <option value={800}>800 x 800px (print)</option>
              <option value={1000}>1000 x 1000px (large print)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>QR Colour</label>
            <div style={{ display: "flex", gap: 4 }}>
              {presetColors.map((c) => (
                <button key={c.hex} onClick={() => setColor(c.hex)} title={c.label} style={{ width: 32, height: 32, borderRadius: 6, background: "#" + c.hex, border: "2px solid " + (color === c.hex ? "var(--brand)" : "var(--border)"), cursor: "pointer" }}></button>
              ))}
              <div style={{ position: "relative", flex: 1 }}>
                <input type="text" value={"#" + color} onChange={(e) => { const v = e.target.value.replace("#", ""); if (/^[0-9a-fA-F]{0,6}$/.test(v)) setColor(v); }} style={{ ...inputStyle, paddingLeft: 8, fontFamily: "monospace", fontSize: 12 }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Centre Logo <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ flex: 1, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
              {logoFile ? logoFile.name : "Choose logo image..."}
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            </label>
            {logoFile && (
              <button onClick={() => { setLogoFile(null); setLogoPreview(null); if (logoRef.current) logoRef.current.value = ""; }} style={{ padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#ef4444" }}>Remove</button>
            )}
          </div>
          {logoPreview && <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}><img src={logoPreview} alt="Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", background: "#fff", border: "1px solid var(--border)" }} /><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Logo will appear at ~22% of QR size</span></div>}
        </div>

        <button onClick={generate} disabled={!url.trim()} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: url.trim() ? 1 : 0.5, marginBottom: generated ? 16 : 0, transition: "opacity 0.2s" }}>Generate QR Code</button>

        {generated && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: 16, background: "#fff", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 12 }}>
              <canvas ref={canvasRef} style={{ display: "block", width: Math.min(size, 280), height: Math.min(size, 280) }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, wordBreak: "break-all" }}>{generated.inputUrl}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={downloadQR} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4BE}"} Download PNG</button>
              <button onClick={() => { navigator.clipboard.writeText(generated.url); }} style={{ padding: "10px 20px", background: "var(--brand-light)", border: "none", borderRadius: 8, color: "var(--brand)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4CB}"} Copy URL</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function ContentCalendar({ events, isAdmin, onSave, onDelete, onReschedule, tickets }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", type: "social", description: "", createTicket: false });
  const [viewMode, setViewMode] = useState("month");
  const [dragItem, setDragItem] = useState(null);

  const EVENT_TYPES = {
    social: { label: "Social Post", color: "#2563eb", icon: "\u{1F4F1}" },
    email: { label: "Email Campaign", color: "#16a34a", icon: "\u2709\uFE0F" },
    event: { label: "Event", color: "#8b5cf6", icon: "\u{1F389}" },
    deadline: { label: "Deadline", color: "#dc2626", icon: "\u23F0" },
    survey: { label: "Survey", color: "#ca8a04", icon: "\u{1F4CB}" },
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const monthLabel = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Merge calendar events with ticket deadlines
  const allEvents = (() => {
    const merged = [...events.map((e) => ({ ...e, source: "calendar" }))];
    if (tickets) {
      tickets.filter((t) => t.deadline && t.status !== "completed").forEach((t) => {
        const already = events.some((e) => e.ticket_ref === t.ref || e.ticket_ref === t.id);
        if (!already) merged.push({ id: "ticket-" + t.id, title: (t.ref || "Ticket") + ": " + t.title, date: t.deadline, type: "deadline", description: "Ticket deadline", source: "ticket", ticketRef: t.ref || t.id });
      });
    }
    return merged;
  })();

  const getEventsForDay = (day) => {
    const dateStr = "" + year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    return allEvents.filter((e) => e.date === dateStr);
  };

  const handleSave = () => {
    if (!form.title.trim() || !selectedDate) return;
    const dateStr = "" + year + "-" + String(month + 1).padStart(2, "0") + "-" + String(selectedDate).padStart(2, "0");
    onSave({ ...form, date: dateStr, id: editing || undefined });
    setForm({ title: "", type: "social", description: "", createTicket: false });
    setEditing(null);
  };

  const handleDrop = (day) => {
    if (!dragItem) return;
    const newDate = "" + year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    if (dragItem.source === "ticket") {
      if (onReschedule) onReschedule(dragItem.id, newDate, dragItem.ticketRef);
    } else {
      if (onReschedule) onReschedule(dragItem.id, newDate);
    }
    setDragItem(null);
  };

  const prevPeriod = () => viewMode === "month" ? setCurrentDate(new Date(year, month - 1, 1)) : setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
  const nextPeriod = () => viewMode === "month" ? setCurrentDate(new Date(year, month + 1, 1)) : setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  // Week view helpers
  const weekStart = (() => { const d = new Date(currentDate); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0,0,0,0); return d; })();
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const weekLabel = weekDays[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " \u2013 " + weekDays[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const getEventsForDate = (d) => { const ds = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); return allEvents.filter((e) => e.date === ds); };

  const inputStyle = { padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 12, outline: "none", width: "100%" };

  const renderDayCell = (day, dateObj) => {
    const dayEvents = dateObj ? getEventsForDate(dateObj) : getEventsForDay(day);
    const isTodayCell = dateObj ? (dateObj.toDateString() === today.toDateString()) : isToday(day);
    const selDay = dateObj ? dateObj.getDate() : day;
    const selMonth = dateObj ? dateObj.getMonth() : month;
    const sel = selectedDate === selDay && (dateObj ? dateObj.getMonth() === month : true);
    const busyLevel = dayEvents.length === 0 ? "" : dayEvents.length <= 2 ? "rgba(35,29,104,0.02)" : dayEvents.length <= 4 ? "rgba(35,29,104,0.05)" : "rgba(35,29,104,0.08)";
    const tooltipText = dayEvents.length > 0 ? dayEvents.map((ev) => (EVENT_TYPES[ev.type] || EVENT_TYPES.social).icon + " " + ev.title).join("\n") : "";
    return (
      <div key={day} onClick={() => { setSelectedDate(selDay); if (dateObj) setCurrentDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)); }}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "var(--brand-light)"; }}
        onDragLeave={(e) => { e.currentTarget.style.background = ""; }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = ""; handleDrop(selDay); }}
        title={tooltipText}
        style={{ minHeight: viewMode === "week" ? 120 : 80, padding: "4px 6px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", cursor: "pointer", background: sel ? "var(--brand-light)" : isTodayCell ? "rgba(34,197,94,0.04)" : busyLevel, transition: "background 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: isTodayCell ? 800 : 500, color: isTodayCell ? "#22c55e" : "var(--text-primary)" }}>{dateObj ? dateObj.getDate() : day}</span>
          {dayEvents.length > 0 && viewMode === "month" && <span style={{ width: 6, height: 6, borderRadius: 3, background: dayEvents.length > 3 ? "#dc2626" : dayEvents.length > 1 ? "#ca8a04" : "var(--brand)", flexShrink: 0 }}></span>}
        </div>
        {dayEvents.slice(0, viewMode === "week" ? 6 : 3).map((ev, j) => {
          const t = EVENT_TYPES[ev.type] || EVENT_TYPES.social;
          return <div key={j} draggable={isAdmin} onDragStart={() => setDragItem(ev)} style={{ fontSize: 10, padding: "2px 4px", marginBottom: 2, borderRadius: 3, background: t.color + "18", color: t.color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: isAdmin ? "grab" : "default", borderLeft: ev.source === "ticket" ? "2px solid " + t.color : "none" }}>{t.icon} {ev.title}</div>;
        })}
        {dayEvents.length > (viewMode === "week" ? 6 : 3) && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>+{dayEvents.length - (viewMode === "week" ? 6 : 3)} more</div>}
      </div>
    );
  };

  return (
    <div style={{ width: "100%", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F4C5}"} Content Calendar</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Plan and track marketing output. {isAdmin ? "Drag events to reschedule." : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", borderRadius: 6, padding: 2, border: "1px solid var(--border)", marginRight: 8 }}>
            <button onClick={() => setViewMode("month")} style={{ padding: "5px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: viewMode === "month" ? "var(--brand)" : "transparent", color: viewMode === "month" ? "#fff" : "var(--text-muted)" }}>Month</button>
            <button onClick={() => setViewMode("week")} style={{ padding: "5px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: viewMode === "week" ? "var(--brand)" : "transparent", color: viewMode === "week" ? "#fff" : "var(--text-muted)" }}>Week</button>
          </div>
          <button onClick={prevPeriod} style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--text-secondary)" }}>{"\u2190"}</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", minWidth: 160, textAlign: "center" }}>{viewMode === "month" ? monthLabel : weekLabel}</span>
          <button onClick={nextPeriod} style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--text-secondary)" }}>{"\u2192"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(EVENT_TYPES).map(([k, v]) => (
          <span key={k} style={{ padding: "4px 10px", borderRadius: 20, background: v.color + "18", color: v.color, fontSize: 11, fontWeight: 600 }}>{v.icon} {v.label}</span>
        ))}
        <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(220,38,38,0.08)", color: "#dc2626", fontSize: 11, fontWeight: 600, borderLeft: "2px solid #dc2626" }}>{"\u{1F4CB}"} From tickets</span>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>
        {viewMode === "month" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {Array.from({ length: startOffset }, (_, i) => (
              <div key={"e" + i} style={{ minHeight: 80, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-input)" }}></div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => renderDayCell(i + 1, null))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDays.map((d, i) => renderDayCell(i, d))}
          </div>
        )}
      </div>

      {selectedDate && (
        <div style={{ marginTop: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{selectedDate} {monthLabel}</h3>
          {getEventsForDay(selectedDate).length > 0 ? (
            <div style={{ marginBottom: isAdmin ? 16 : 0 }}>
              {getEventsForDay(selectedDate).map((ev) => {
                const t = EVENT_TYPES[ev.type] || EVENT_TYPES.social;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6, background: "var(--bg-input)", borderRadius: 8, borderLeft: "3px solid " + t.color }}>
                    <span style={{ fontSize: 16 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{ev.title}</div>
                      {ev.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{ev.description}</div>}
                    </div>
                    <span style={{ fontSize: 10, color: t.color, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: t.color + "18" }}>{ev.source === "ticket" ? "Ticket" : t.label}</span>
                    {isAdmin && ev.source !== "ticket" && <button onClick={(e) => { e.stopPropagation(); setForm({ title: ev.title, type: ev.type, description: ev.description || "", createTicket: false }); setEditing(ev.id); }} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>}
                    {isAdmin && ev.source !== "ticket" && <button onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, color: "#ef4444", cursor: "pointer" }}>Del</button>}
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>No events scheduled</p>}
          {isAdmin && (
            <div style={{ borderTop: getEventsForDay(selectedDate).length > 0 ? "1px solid var(--border)" : "none", paddingTop: getEventsForDay(selectedDate).length > 0 ? 12 : 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" style={inputStyle} />
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
                  {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={handleSave} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editing ? "Update" : "Add Event"}</button>
                {!editing && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}><input type="checkbox" checked={form.createTicket} onChange={(e) => setForm({ ...form, createTicket: e.target.checked })} style={{ accentColor: "var(--brand)" }} />Also create a ticket</label>}
                {editing && <button onClick={() => { setEditing(null); setForm({ title: "", type: "social", description: "", createTicket: false }); }} style={{ padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



function ImageEditor() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileRef = useRef(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [overlayColor, setOverlayColor] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(30);
  const [textOverlay, setTextOverlay] = useState("");
  const [textSize, setTextSize] = useState(48);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPos, setTextPos] = useState("center");
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [cropRatio, setCropRatio] = useState("free");
  const imgRef = useRef(null);
  const [watermark, setWatermark] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState("br");
  const [watermarkSize, setWatermarkSize] = useState(15);
  const [watermarkOpacity, setWatermarkOpacity] = useState(60);
  const watermarkImgRef = useRef(null);
  const [undoStack, setUndoStack] = useState([]);

  const EDITOR_BRAND_COLORS = [
    { label: "Alps Main", color: "#231D68" },
    { label: "Motor", color: "#E64592" },
    { label: "Commercial", color: "#20A39E" },
    { label: "White", color: "#ffffff" },
    { label: "Black", color: "#000000" },
  ];

  const CROP_RATIOS = [
    { label: "Free", value: "free" },
    { label: "1:1", value: "1:1" },
    { label: "16:9", value: "16:9" },
    { label: "4:3", value: "4:3" },
    { label: "9:16", value: "9:16" },
  ];

  // Load watermark logo
  useEffect(() => {
    const wImg = new Image();
    wImg.src = ALPS_LOGO_REVERSED;
    wImg.onload = () => { watermarkImgRef.current = wImg; };
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => { setOrigW(img.width); setOrigH(img.height); imgRef.current = img; setPreview(ev.target.result); resetEdits(); setUndoStack([]); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  const saveUndo = () => {
    if (!imgRef.current) return;
    setUndoStack((prev) => [...prev.slice(-4), { brightness, contrast, saturation, overlayColor, overlayOpacity, textOverlay, textSize, textColor, textPos, watermark, watermarkPos, watermarkSize, watermarkOpacity, imgSrc: imgRef.current.src, w: origW, h: origH }]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setBrightness(last.brightness); setContrast(last.contrast); setSaturation(last.saturation);
    setOverlayColor(last.overlayColor); setOverlayOpacity(last.overlayOpacity);
    setTextOverlay(last.textOverlay); setTextSize(last.textSize); setTextColor(last.textColor); setTextPos(last.textPos);
    setWatermark(last.watermark); setWatermarkPos(last.watermarkPos); setWatermarkSize(last.watermarkSize); setWatermarkOpacity(last.watermarkOpacity);
    if (last.imgSrc !== imgRef.current?.src) {
      const img = new Image();
      img.onload = () => { imgRef.current = img; setOrigW(last.w); setOrigH(last.h); };
      img.src = last.imgSrc;
    }
  };

  const resetEdits = () => {
    setBrightness(100); setContrast(100); setSaturation(100);
    setOverlayColor(""); setOverlayOpacity(30); setTextOverlay("");
    setTextSize(48); setTextColor("#ffffff"); setTextPos("center");
    setCropMode(false); setCropStart(null); setCropEnd(null); setCropRatio("free");
    setWatermark(false); setWatermarkPos("br"); setWatermarkSize(15); setWatermarkOpacity(60);
  };

  const drawWatermark = (ctx, w, h, scale) => {
    if (!watermark || !watermarkImgRef.current) return;
    const wImg = watermarkImgRef.current;
    const wSize = Math.round(w * watermarkSize / 100);
    const aspect = wImg.width / wImg.height;
    const wW = wSize;
    const wH = wSize / aspect;
    const pad = Math.round(w * 0.03);
    let x = pad, y = pad;
    if (watermarkPos === "br" || watermarkPos === "tr") x = w - wW - pad;
    if (watermarkPos === "bl" || watermarkPos === "br") y = h - wH - pad;
    ctx.globalAlpha = watermarkOpacity / 100;
    ctx.drawImage(wImg, x, y, wW, wH);
    ctx.globalAlpha = 1;
  };

  const renderPreview = useCallback(() => {
    if (!imgRef.current || !previewCanvasRef.current) return;
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    const maxW = 600, maxH = 420;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%)";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    if (overlayColor) { ctx.globalAlpha = overlayOpacity / 100; ctx.fillStyle = overlayColor; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (textOverlay) {
      ctx.font = "bold " + Math.round(textSize * scale) + "px Inter, sans-serif";
      ctx.fillStyle = textColor; ctx.textAlign = "center";
      const x = canvas.width / 2;
      let y = canvas.height / 2;
      if (textPos === "top") y = Math.round(textSize * scale) + 20;
      else if (textPos === "bottom") y = canvas.height - 20;
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.fillText(textOverlay, x, y);
      ctx.shadowColor = "transparent";
    }
    drawWatermark(ctx, canvas.width, canvas.height, scale);
    if (cropMode && cropStart && cropEnd) {
      ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      const cx = Math.min(cropStart.x, cropEnd.x), cy = Math.min(cropStart.y, cropEnd.y);
      const cw = Math.abs(cropEnd.x - cropStart.x), ch = Math.abs(cropEnd.y - cropStart.y);
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, canvas.width, cy);
      ctx.fillRect(0, cy + ch, canvas.width, canvas.height - cy - ch);
      ctx.fillRect(0, cy, cx, ch);
      ctx.fillRect(cx + cw, cy, canvas.width - cx - cw, ch);
    }
  }, [brightness, contrast, saturation, overlayColor, overlayOpacity, textOverlay, textSize, textColor, textPos, cropMode, cropStart, cropEnd, watermark, watermarkPos, watermarkSize, watermarkOpacity]);

  useEffect(() => { renderPreview(); }, [renderPreview]);

  const handleCropMouseDown = (e) => {
    if (!cropMode) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropEnd(null); setCropping(true);
  };
  const handleCropMouseMove = (e) => {
    if (!cropping || !cropMode) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    let nx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    let ny = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    if (cropRatio !== "free" && cropStart) {
      const [rw, rh] = cropRatio.split(":").map(Number);
      const dx = nx - cropStart.x;
      const dy = Math.abs(dx) * (rh / rw) * (ny > cropStart.y ? 1 : -1);
      ny = cropStart.y + dy;
    }
    setCropEnd({ x: nx, y: ny });
  };
  const handleCropMouseUp = () => { setCropping(false); };

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !imgRef.current) return;
    saveUndo();
    const canvas = previewCanvasRef.current;
    const scaleX = imgRef.current.width / canvas.width, scaleY = imgRef.current.height / canvas.height;
    const sx = Math.min(cropStart.x, cropEnd.x) * scaleX, sy = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const sw = Math.abs(cropEnd.x - cropStart.x) * scaleX, sh = Math.abs(cropEnd.y - cropStart.y) * scaleY;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = sw; tmpCanvas.height = sh;
    tmpCanvas.getContext("2d").drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    const newImg = new Image();
    newImg.onload = () => { imgRef.current = newImg; setOrigW(sw); setOrigH(sh); setCropMode(false); setCropStart(null); setCropEnd(null); renderPreview(); };
    newImg.src = tmpCanvas.toDataURL("image/png");
  };

  const exportImage = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%)";
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
    if (overlayColor) { ctx.globalAlpha = overlayOpacity / 100; ctx.fillStyle = overlayColor; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (textOverlay) {
      ctx.font = "bold " + textSize + "px Inter, sans-serif";
      ctx.fillStyle = textColor; ctx.textAlign = "center";
      let y = canvas.height / 2;
      if (textPos === "top") y = textSize + 40; else if (textPos === "bottom") y = canvas.height - 40;
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8;
      ctx.fillText(textOverlay, canvas.width / 2, y);
    }
    drawWatermark(ctx, canvas.width, canvas.height, 1);
    canvas.toBlob((blob) => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "edited-" + (file ? file.name : "image.png"); a.click();
    }, "image/png");
  };

  const sliderStyle = { width: "100%", accentColor: "var(--brand)", cursor: "pointer" };
  const labelStyle = { display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 };
  const inputStyle = { padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 12, outline: "none", width: "100%" };
  const panelStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 };
  const panelTitle = { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 };

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{"\u{1F58C}\uFE0F"} Image Editor</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Crop, adjust, add text, brand overlays, and watermarks. Works entirely in your browser.</p>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {!file ? (
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 20px", border: "2px dashed var(--border)", borderRadius: 14, cursor: "pointer", background: "var(--bg-card)", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
          <div style={{ fontSize: 40, opacity: 0.4 }}>{"\u{1F5BC}\uFE0F"}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Click to upload an image</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>PNG, JPG, WEBP, GIF</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 16 }} className="hub-editor-grid">
          <div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{origW} x {origH}px</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {undoStack.length > 0 && <button onClick={undo} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--text-muted)" }}>{"\u21A9"} Undo</button>}
                  <button onClick={() => setCropMode(!cropMode)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid " + (cropMode ? "var(--brand)" : "var(--border)"), background: cropMode ? "var(--brand-light)" : "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: cropMode ? "var(--brand)" : "var(--text-muted)" }}>Crop</button>
                  {cropMode && cropStart && cropEnd && <button onClick={applyCrop} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "var(--brand)", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Apply Crop</button>}
                </div>
              </div>
              {cropMode && (
                <div style={{ padding: "4px 10px", borderBottom: "1px solid var(--border)", display: "flex", gap: 4, background: "var(--bg-input)" }}>
                  {CROP_RATIOS.map((r) => (
                    <button key={r.value} onClick={() => setCropRatio(r.value)} style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid " + (cropRatio === r.value ? "var(--brand)" : "var(--border)"), background: cropRatio === r.value ? "var(--brand-light)" : "transparent", fontSize: 10, fontWeight: 600, cursor: "pointer", color: cropRatio === r.value ? "var(--brand)" : "var(--text-muted)" }}>{r.label}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", background: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%) 50%/16px 16px", padding: 8, cursor: cropMode ? "crosshair" : "default" }} onMouseDown={handleCropMouseDown} onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp}>
                <canvas ref={previewCanvasRef} style={{ maxWidth: "100%", display: "block", borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={exportImage} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{"\u{1F4BE}"} Download</button>
              <button onClick={() => { saveUndo(); resetEdits(); }} style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)", transition: "all 0.2s" }}>Reset</button>
              <button onClick={() => { setFile(null); setPreview(null); imgRef.current = null; if (fileRef.current) fileRef.current.value = ""; setUndoStack([]); }} style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)", transition: "all 0.2s" }}>New Image</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={panelStyle}>
              <div style={panelTitle}>Adjust</div>
              <div style={{ marginBottom: 10 }}><div style={labelStyle}><span>Brightness</span><span>{brightness}%</span></div><input type="range" min="20" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={sliderStyle} /></div>
              <div style={{ marginBottom: 10 }}><div style={labelStyle}><span>Contrast</span><span>{contrast}%</span></div><input type="range" min="20" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={sliderStyle} /></div>
              <div><div style={labelStyle}><span>Saturation</span><span>{saturation}%</span></div><input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} style={sliderStyle} /></div>
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Brand Overlay</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <button onClick={() => setOverlayColor("")} style={{ width: 28, height: 28, borderRadius: 6, border: "2px solid " + (!overlayColor ? "var(--brand)" : "var(--border)"), background: "repeating-conic-gradient(#80808030 0% 25%, transparent 0% 50%) 50%/8px 8px", cursor: "pointer" }}></button>
                {EDITOR_BRAND_COLORS.map((c) => (
                  <button key={c.color} onClick={() => setOverlayColor(c.color)} style={{ width: 28, height: 28, borderRadius: 6, border: "2px solid " + (overlayColor === c.color ? "var(--brand)" : "var(--border)"), background: c.color, cursor: "pointer" }}></button>
                ))}
              </div>
              {overlayColor && <div><div style={labelStyle}><span>Opacity</span><span>{overlayOpacity}%</span></div><input type="range" min="5" max="80" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} style={sliderStyle} /></div>}
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>{"\u{1F3F7}\uFE0F"} Watermark</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", marginBottom: watermark ? 10 : 0 }}>
                <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} style={{ accentColor: "var(--brand)" }} />
                Alps logo watermark
              </label>
              {watermark && <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 8 }}>
                  {[{ key: "tl", label: "\u2196" }, { key: "tr", label: "\u2197" }, { key: "bl", label: "\u2199" }, { key: "br", label: "\u2198" }].map((p) => (
                    <button key={p.key} onClick={() => setWatermarkPos(p.key)} style={{ padding: "5px", borderRadius: 4, border: "1px solid " + (watermarkPos === p.key ? "var(--brand)" : "var(--border)"), background: watermarkPos === p.key ? "var(--brand-light)" : "transparent", fontSize: 14, cursor: "pointer", color: watermarkPos === p.key ? "var(--brand)" : "var(--text-muted)" }}>{p.label}</button>
                  ))}
                </div>
                <div style={{ marginBottom: 6 }}><div style={labelStyle}><span>Size</span><span>{watermarkSize}%</span></div><input type="range" min="5" max="40" value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value))} style={sliderStyle} /></div>
                <div><div style={labelStyle}><span>Opacity</span><span>{watermarkOpacity}%</span></div><input type="range" min="10" max="100" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(Number(e.target.value))} style={sliderStyle} /></div>
              </>}
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Text</div>
              <input value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} placeholder="Add text..." style={{ ...inputStyle, marginBottom: 8 }} />
              {textOverlay && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Size</div><input type="number" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Colour</div><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ ...inputStyle, padding: 4, height: 36, cursor: "pointer" }} /></div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["top", "center", "bottom"].map((p) => (
                    <button key={p} onClick={() => setTextPos(p)} style={{ flex: 1, padding: "5px", borderRadius: 4, border: "1px solid " + (textPos === p ? "var(--brand)" : "var(--border)"), background: textPos === p ? "var(--brand-light)" : "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: textPos === p ? "var(--brand)" : "var(--text-muted)" }}>{p}</button>
                  ))}
                </div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast({ toasts, onDismiss }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: t.type === "error" ? "#fef2f2" : t.type === "success" ? "#f0fdf4" : "var(--bg-card)", border: "1px solid " + (t.type === "error" ? "#fecaca" : t.type === "success" ? "#bbf7d0" : "var(--border)"), borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: 380, animation: "fadeIn 0.2s ease", minWidth: 260 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{t.type === "error" ? "\u274C" : t.type === "success" ? "\u2705" : "\u2139\uFE0F"}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.type === "error" ? "#991b1b" : t.type === "success" ? "#166534" : "var(--text-primary)", lineHeight: 1.4 }}>{t.message}</div>
          <button onClick={() => onDismiss(t.id)} style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "var(--text-muted)", padding: "2px 6px", flexShrink: 0, lineHeight: 1 }}>{"\u2715"}</button>
        </div>
      ))}
    </div>
  );
}

function OnboardingOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "\u{1F44B}", title: "Welcome to the Marketing Hub", desc: "Your central place for marketing requests, brand assets, and tools. Here's a quick overview of what you can do." },
    { icon: "\u{1F4DD}", title: "Submit a Ticket", desc: "Need marketing support? Submit a ticket with your request, set the priority, and track its progress all the way through to completion." },
    { icon: "\u{1F4DA}", title: "Browse Resources", desc: "Access the Marketing Archive for past campaigns, Brand Assets for logos and colours, and the Self-Service Guide for image sizes and FAQs." },
    { icon: "\u{1F6E0}\uFE0F", title: "Use the Tools", desc: "Convert and resize images, generate QR codes, edit images with brand overlays, plan content on the calendar, and access reusable copy templates." },
    { icon: "\u{1F4C8}", title: "Log Leads", desc: "Record inbound marketing leads with source tracking. Leads are visible in the Leads Dashboard for reporting." },
  ];
  const s = steps[step];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, backdropFilter: "blur(4px)" }} onClick={onDismiss}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "40px 36px 32px", maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", animation: "fadeIn 0.3s ease" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{s.title}</h2>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{s.desc}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          {steps.map((_, i) => <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? "var(--brand)" : "var(--bar-bg)", transition: "all 0.3s" }}></div>)}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ padding: "10px 20px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}>Back</button>}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Next</button>
          ) : (
            <button onClick={onDismiss} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Get Started</button>
          )}
          {step < steps.length - 1 && <button onClick={onDismiss} style={{ padding: "10px 16px", background: "transparent", border: "none", fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>Skip</button>}
        </div>
      </div>
    </div>
  );
}


function NotificationsCenter({ notifications, onClear, onNavigate, isAdmin }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fmtTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 60000;
    if (diff < 1) return "Just now";
    if (diff < 60) return Math.floor(diff) + "m ago";
    if (diff < 1440) return Math.floor(diff / 60) + "h ago";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => { if (isAdmin) setOpen(!open); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: open ? "var(--brand-light)" : "var(--bg-card)", cursor: isAdmin ? "pointer" : "default", position: "relative", fontSize: 16, lineHeight: 1, color: "var(--text-secondary)", transition: "all 0.2s" }} title={isAdmin ? "Notifications" : unread + " new notification" + (unread !== 1 ? "s" : "")}>
        {"\u{1F514}"}
        {unread > 0 && <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>}
      </button>
      {open && isAdmin && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 420, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-hover)", zIndex: 100, display: "flex", flexDirection: "column", animation: "fadeIn 0.15s ease" }}>
          <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{"\u{1F514}"} Notifications</span>
            {notifications.length > 0 && <button onClick={onClear} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}>Clear all</button>}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>{"\u{1F514}"}</div>
                <p style={{ fontSize: 13, margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 30).map((n, i) => (
                <div key={i} onClick={() => { if (n.action) { onNavigate(n.action); setOpen(false); } }}
                  style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: n.action ? "pointer" : "default", background: !n.read ? "var(--brand-light)" : "transparent", transition: "background 0.15s" }}
                  onMouseOver={(e) => { if (n.action) e.currentTarget.style.background = "var(--brand-light)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = !n.read ? "var(--brand-light)" : "transparent"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{n.body}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{fmtTime(n.time)}</div>
                    </div>
                    {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--brand)", flexShrink: 0, marginTop: 4 }}></div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [dashboardTab, setDashboardTab] = useState("tickets");
  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem("alps_hub_onboarded"); } catch { return false; } });
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches || false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Close tools dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addNotification = (icon, title, body, action) => {
    setNotifications((prev) => [{ icon, title, body, action, time: new Date().toISOString(), read: false }, ...prev].slice(0, 50));
  };
  const clearNotifications = () => setNotifications([]);
  const toast = (message, type = "info") => { const id = Date.now(); setToasts((prev) => [...prev, { id, message, type }]); setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000); };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

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
        if (payload.new) {
          const t = payload.new;
          const p = PRIORITIES[t.priority];
          setNotifications((prev) => [{ icon: "\u{1F4DD}", title: "New Ticket: " + t.ref, body: (p ? p.icon + " " + p.label + " \u2022 " : "") + t.title + " from " + t.name, action: "dashboard", time: new Date().toISOString(), read: false }, ...prev].slice(0, 50));
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Ticket: " + t.ref, {
              body: (p ? p.icon + " " + p.label + " \u2022 " : "") + t.title + "\nFrom: " + t.name,
              icon: "/alps-logo.webp",
            });
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets" }, (payload) => {
        fetchTickets();
        if (payload.new && payload.old && payload.new.status !== payload.old.status) {
          const t = payload.new;
          const statusLabels = { new: "New", open: "In Progress", completed: "Completed" };
          setNotifications((prev) => [{ icon: t.status === "completed" ? "\u2705" : "\u{1F504}", title: (t.ref || "Ticket") + " \u2192 " + (statusLabels[t.status] || t.status), body: t.title, action: "dashboard", time: new Date().toISOString(), read: false }, ...prev].slice(0, 50));
        }
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
    const ch = supabase.channel("leads-rt").on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => { fl(); if (payload.new) { const l = payload.new; setNotifications((prev) => [{ icon: "\u{1F4C8}", title: "New Lead Logged", body: l.broker + " \u2022 " + l.enquiry, action: "leads_dashboard", time: new Date().toISOString(), read: false }, ...prev].slice(0, 50)); } }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, () => { fl(); }).on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, () => { fl(); }).subscribe();
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

  // Load calendar events
  useEffect(() => {
    async function fc() { const { data } = await supabase.from("calendar_events").select("*").order("date", { ascending: true }); if (data) setCalendarEvents(data); }
    fc();
    const ch = supabase.channel("calendar-rt").on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => { fc(); }).subscribe();
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
      toast("Ticket " + ref + " submitted", "success");
    } else { toast("Failed to submit ticket", "error"); }
  };

  const handleStatusChange = async (id, status) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const { error } = await supabase.from("tickets").update({ status }).eq("id", ticket.dbId);
      if (error) toast("Failed to update status", "error");
    }
  };

  const handleComplete = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const { error } = await supabase.from("tickets").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", ticket.dbId);
      if (error) toast("Failed to complete ticket", "error"); else toast("Ticket completed", "success");
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
    let error;
    if (editArchiveEntry && editArchiveEntry !== "new") { ({ error } = await supabase.from("archive_entries").update(data).eq("id", editArchiveEntry)); }
    else { ({ error } = await supabase.from("archive_entries").insert(data)); }
    if (error) { toast("Failed to save archive entry", "error"); return; }
    toast("Archive entry saved", "success");
    setEditArchiveEntry(null); setView("archive");
  };
  const handleArchiveDelete = async (id) => { await supabase.from("archive_entries").delete().eq("id", id); setEditArchiveEntry(null); setView("archive"); };
  const handleLeadSave = async (data) => { const { error } = await supabase.from("leads").insert(data); if (error) toast("Failed to save lead: " + error.message, "error"); else toast("Lead logged successfully", "success"); };
  const handleLeadUpdate = async (id, updates) => { const { error } = await supabase.from("leads").update(updates).eq("id", id); if (error) toast("Failed to update lead", "error"); };
  const handleLeadDelete = async (id) => { const { error } = await supabase.from("leads").delete().eq("id", id); if (error) toast("Failed to delete lead", "error"); else toast("Lead deleted", "success"); };
  const handleAssetUpload = async (file, name, category) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = "brand/" + Date.now() + "_" + safeName;
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, file);
    if (error) { toast("Upload failed: " + error.message, "error"); return; }
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

  const handleCalendarSave = async (event) => {
    if (event.id) {
      await supabase.from("calendar_events").update({ title: event.title, type: event.type, description: event.description, date: event.date }).eq("id", event.id);
    } else {
      const { data: inserted } = await supabase.from("calendar_events").insert([{ title: event.title, type: event.type, description: event.description || "", date: event.date }]).select();
      if (event.createTicket && inserted && inserted[0]) {
        const nextRef = tickets.length > 0 ? "M" + String(Math.max(...tickets.map((t) => parseInt((t.ref || "M000").slice(1)) || 0)) + 1).padStart(3, "0") : "M001";
        await supabase.from("tickets").insert({ ref: nextRef, name: "Calendar", title: event.title, description: event.description || "Auto-created from content calendar", priority: "medium", status: "open", deadline: event.date, calendar_event_id: inserted[0].id });
      }
    }
  };
  const handleCalendarReschedule = async (eventId, newDate, ticketRef) => {
    await supabase.from("calendar_events").update({ date: newDate }).eq("id", eventId);
    if (ticketRef) {
      const t = tickets.find((tk) => tk.ref === ticketRef || tk.id === ticketRef);
      if (t) await supabase.from("tickets").update({ deadline: newDate }).eq("id", t.dbId || t.id);
    }
  };
  const handleCalendarDelete = async (id) => { await supabase.from("calendar_events").delete().eq("id", id); };

  const dismissOnboarding = () => { setShowOnboarding(false); try { localStorage.setItem("alps_hub_onboarded", "1"); } catch {} };

  const handleDashboardClick = () => {
    if (dashUnlocked) {
      setView("dashboard");
    } else {
      setView("password");
    }
  };

  const handleUnlock = () => {
    setDashUnlocked(true);
    if (view === "password") setView("hub");
  };

  const ticketViews = ["form", "submitted", "tracker", "dashboard", "password", "activity"];
  const archiveViews = ["archive", "archive_add", "archive_edit"];
  const leadViews = ["lead_form", "leads_dashboard"];
  const templateViews = ["templates"];
  const guideViews = ["guide"];
  const activeCount = tickets.filter((t) => t.status !== "completed").length;
  const currentSection = view === "hub" ? "hub" : ticketViews.includes(view) ? "tickets" : archiveViews.includes(view) ? "archive" : view === "analytics" ? "analytics" : leadViews.includes(view) ? "leads" : view === "brand_assets" ? "brand" : view === "calendar" ? "calendar" : (view === "templates" || view === "converter" || view === "qr_generator" || view === "image_editor" || view === "guide") ? "tools" : "hub";

  return (
    <div data-theme={dark ? "dark" : "light"} style={{ minHeight: "100vh", background: "var(--bg-page)", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "var(--text-primary)", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: #231d68; color: white; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(35,29,104,0.15); border-radius: 3px; }
        @keyframes shakeAnim { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        [data-theme="light"] {
          --bg-page: #f8f9fb; --bg-card: #ffffff; --bg-input: #f4f5f7; --bg-header: #ffffff;
          --bg-completed: #fafafa; --bg-hover: #f1f3f9;
          --border: #e2e6ee; --border-light: #f0f2f6;
          --text-primary: #1a1d2e; --text-body: #4a5068; --text-secondary: #6b7190; --text-muted: #9399b2;
          --brand: #231d68; --brand-light: rgba(35,29,104,0.06); --brand-glow: rgba(35,29,104,0.1);
          --shadow: 0 1px 3px rgba(0,0,0,0.04); --shadow-hover: 0 4px 16px rgba(35,29,104,0.1);
          --nav-bg: #ffffff; --nav-inactive: #6b7190;
          --bar-bg: #e8ebf0;
          --card-radius: 12px; --btn-radius: 8px; --input-radius: 8px;
        }
        [data-theme="dark"] {
          --bg-page: #0c1021; --bg-card: #161b2e; --bg-input: #0c1021; --bg-header: #131729;
          --bg-completed: #141828; --bg-hover: #1a2038;
          --border: #252d45; --border-light: #1a2038;
          --text-primary: #e4e8f0; --text-body: #b4bcd0; --text-secondary: #8892b0; --text-muted: #5a6380;
          --brand: #818cf8; --brand-light: rgba(129,140,248,0.12); --brand-glow: rgba(129,140,248,0.15);
          --shadow: 0 1px 3px rgba(0,0,0,0.3); --shadow-hover: 0 4px 16px rgba(0,0,0,0.4);
          --nav-bg: #0c1021; --nav-inactive: #8892b0;
          --bar-bg: #252d45;
          --card-radius: 12px; --btn-radius: 8px; --input-radius: 8px;
        }
        [data-theme="dark"] ::-webkit-scrollbar-thumb { background: rgba(129,140,248,0.2); }
        [data-theme="dark"] ::selection { background: #818cf8; }
        [data-theme="dark"] input, [data-theme="dark"] textarea, [data-theme="dark"] select { color-scheme: dark; }

        /* Transition defaults */
        button { transition: all 0.15s ease; }
        button:hover:not(:disabled) { filter: brightness(1.05); }
        button:active:not(:disabled) { transform: scale(0.98); }
        input, textarea, select { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        input:focus, textarea:focus, select:focus { border-color: var(--brand) !important; box-shadow: 0 0 0 3px var(--brand-light); }

        /* Card hover micro-interaction */
        .hub-card-hover { transition: all 0.2s ease; }
        .hub-card-hover:hover { transform: translateY(-1px); box-shadow: var(--shadow-hover); border-color: var(--brand) !important; }

        /* View transition */
        .hub-view-enter { animation: fadeIn 0.2s ease forwards; }

        /* Secondary nav bar */
        .hub-secondary-nav { display: flex; gap: 2px; padding: 2px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border); }
        .hub-secondary-nav button { padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; background: transparent; color: var(--nav-inactive); white-space: nowrap; }
        .hub-secondary-nav button.active { background: var(--brand); color: #fff; }
        .hub-secondary-nav button:hover:not(.active) { background: var(--brand-light); color: var(--brand); }

        /* Skeleton loader */
        .hub-skeleton { background: linear-gradient(90deg, var(--bar-bg) 25%, var(--bg-card) 50%, var(--bar-bg) 75%); background-size: 200% 100%; animation: pulse 1.5s ease infinite; border-radius: 6px; }

        @media (max-width: 900px) {
          .hub-layout-main { grid-template-columns: 1fr !important; }
          .hub-dash-grid { grid-template-columns: 1fr 1fr !important; }
          .hub-resource-grid { grid-template-columns: 1fr 1fr !important; }
          .hub-hero-split { grid-template-columns: 1fr !important; }
          .hub-editor-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .hub-header { padding: 10px 16px !important; }
          .hub-nav { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .hub-nav button { padding: 7px 12px !important; font-size: 12px !important; white-space: nowrap; }
          .hub-home-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-hero-grid { grid-template-columns: 1fr !important; }
          .hub-hero-split { grid-template-columns: 1fr !important; }
          .hub-editor-grid { grid-template-columns: 1fr !important; }
          .hub-resource-grid { grid-template-columns: 1fr !important; }
          .hub-tickets-grid { grid-template-columns: 1fr !important; }
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
          .hub-secondary-nav { overflow-x: auto; flex-wrap: nowrap; }
        }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg-header)", borderBottom: "1px solid var(--border)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="hub-header" style={{ padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={ALPS_LOGO} alt="Alps" style={{ height: 36, objectFit: "contain", cursor: "pointer", transition: "opacity 0.15s" }} onClick={() => setView("hub")} onMouseOver={(e) => e.target.style.opacity = "0.8"} onMouseOut={(e) => e.target.style.opacity = "1"} />
            <div style={{ width: 1, height: 24, background: "var(--border)" }}></div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--brand)", lineHeight: 1.2 }}>Marketing Hub</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setDark(!dark)} title={dark ? "Light mode" : "Dark mode"} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 15, lineHeight: 1, color: "var(--text-secondary)" }}>
              {dark ? "\u2600" : "\u{1F319}"}
            </button>
            <NotificationsCenter notifications={notifications} onClear={clearNotifications} onNavigate={(v) => { markAllRead(); setView(v); }} isAdmin={dashUnlocked} />
          </div>
        </div>
        {view !== "hub" && (
          <div style={{ padding: "0 32px 8px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
            <button onClick={() => setView("hub")} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-muted)", flexShrink: 0 }}>{"\u2190"} Home</button>
            <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }}></div>
            <nav className="hub-secondary-nav" style={{ flex: 1 }}>
              {currentSection === "tickets" && <>
                <button className={view === "form" ? "active" : ""} onClick={() => setView("form")}>Submit</button>
                <button className={view === "dashboard" ? "active" : ""} onClick={handleDashboardClick} style={{ position: "relative" }}>
                  {dashUnlocked ? "" : "\u{1F512} "}Dashboard
                  {dashUnlocked && activeCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
                </button>
                {dashUnlocked && <button className={view === "activity" ? "active" : ""} onClick={() => setView("activity")}>Activity</button>}
                <button className={view === "tracker" ? "active" : ""} onClick={() => { setLastSubmittedRef(null); setView("tracker"); }}>Track</button>
              </>}
              {currentSection === "archive" && <>
                <button className={view === "archive" ? "active" : ""} onClick={() => setView("archive")}>Browse</button>
                {dashUnlocked && <button className={(view === "archive_add" || view === "archive_edit") ? "active" : ""} onClick={() => { setEditArchiveEntry("new"); setView("archive_add"); }}>Add Entry</button>}
              </>}
              {currentSection === "leads" && <>
                <button className={view === "lead_form" ? "active" : ""} onClick={() => setView("lead_form")}>Log Lead</button>
                <button className={view === "leads_dashboard" ? "active" : ""} onClick={() => { if (dashUnlocked) setView("leads_dashboard"); else setView("password"); }}>Dashboard</button>
              </>}
              {currentSection === "tools" && <>
                {[
                  { id: "templates", label: "Templates" },
                  { id: "converter", label: "Converter" },
                  { id: "qr_generator", label: "QR Code" },
                  { id: "image_editor", label: "Image Editor" },
                  { id: "guide", label: "Self-Service Guide" },
                ].map((t) => <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>{t.label}</button>)}
              </>}
              {currentSection === "analytics" && <button className="active">Analytics</button>}
              {currentSection === "brand" && <button className="active">Brand Assets</button>}
              {currentSection === "calendar" && <button className="active">Content Calendar</button>}
            </nav>
          </div>
        )}
      </header>

      <main key={view} className="hub-main hub-view-enter" style={{ maxWidth: (view === "archive" || view === "brand_assets" || view === "analytics" || view === "leads_dashboard" || view === "templates" || view === "calendar" || view === "dashboard") ? 1000 : 900, margin: "0 auto", padding: "32px 24px", display: "flex", justifyContent: "center" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)" }}>
            <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}></div>
            <p style={{ fontSize: 14, margin: 0 }}>Loading tickets...</p>
          </div>
        ) : view === "hub" ? (
          <HubHome onNavigate={(id) => { if (id === "dashboard" || id === "leads_dashboard" || id === "analytics") { if (!dashUnlocked) { setView("password"); return; } } setView(id); }} tickets={tickets} dashUnlocked={dashUnlocked} leads={leads} onUnlockInline={() => setDashUnlocked(true)} notifications={notifications} />
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
          <LeadsDashboard leads={leads} onUpdate={handleLeadUpdate} onDelete={handleLeadDelete} />
        ) : view === "brand_assets" ? (
          <BrandAssets assets={brandAssets} isAdmin={dashUnlocked} onUpload={handleAssetUpload} onDeleteAsset={handleAssetDelete} />
        ) : view === "templates" ? (
          <ContentTemplates templates={contentTemplates} isAdmin={dashUnlocked} onSave={handleTemplateSave} onDelete={handleTemplateDelete} />
        ) : view === "guide" ? (
          <SelfServiceGuide />
        ) : view === "converter" ? (
          <FileConverter />
        ) : view === "qr_generator" ? (
          <QRCodeGenerator />
        ) : view === "image_editor" ? (
          <ImageEditor />
        ) : view === "calendar" ? (
          <ContentCalendar events={calendarEvents} isAdmin={dashUnlocked} onSave={handleCalendarSave} onDelete={handleCalendarDelete} onReschedule={handleCalendarReschedule} tickets={tickets} />
        ) : (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", marginBottom: 20, width: "fit-content" }}>
              {[{ key: "tickets", label: "\u{1F4CB} Tickets" }, { key: "leads", label: "\u{1F4C8} Leads" }, { key: "analytics", label: "\u{1F4CA} Analytics" }].map((tab) => (
                <button key={tab.key} onClick={() => setDashboardTab(tab.key)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: dashboardTab === tab.key ? "var(--brand)" : "transparent", color: dashboardTab === tab.key ? "#fff" : "var(--nav-inactive)" }}>{tab.label}</button>
              ))}
            </div>
            {dashboardTab === "tickets" ? (
              <Dashboard tickets={tickets} onStatusChange={handleStatusChange} onComplete={handleComplete} onAddNote={handleAddNote} onDelete={handleDelete} onUpdatePriority={handleUpdatePriority} onUpdateDeadline={handleUpdateDeadline} onReopen={handleReopen} onTogglePin={handleTogglePin} />
            ) : dashboardTab === "leads" ? (
              <LeadsDashboard leads={leads} onUpdate={handleLeadUpdate} onDelete={handleLeadDelete} />
            ) : (
              <AnalyticsPanel tickets={tickets} archiveEntries={archiveEntries} leads={leads} />
            )}
          </div>
        )}
      </main>
      {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} />}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
