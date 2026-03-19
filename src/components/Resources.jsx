import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import jsPDF from "jspdf";
import { PRIORITIES, STATUS, ARCHIVE_TYPES, LEAD_SOURCES, BRAND_COLORS, formatDate, renderMarkdown, daysUntil } from "../constants.js";
import { Library, TrendingUp, Palette, Image, CalendarDays, Briefcase, Target, FileText, BookOpen, Search, FolderOpen, Video, Upload, Plus, Pencil, Trash2, Copy, Download, ChevronDown, ExternalLink, Filter, Grid3X3, List, Tag, Star } from "lucide-react";
import { PageHeader } from "./UI.jsx";

export function MarketingArchive({ entries, isAdmin, onManage }) {
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
      <PageHeader icon={<Library size={22} color="#20A39E" />} title="Marketing Archive" subtitle={entries.length + " pieces catalogued"} action={isAdmin && <button onClick={() => onManage()} style={{ padding: "9px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Plus size={14} style={{ display: "inline", marginRight: 4 }} />Add Entry</button>} />
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
        <div className="hub-empty"><div className="hub-empty-icon">{search.trim() ? <Search size={40} /> : <Library size={40} />}</div><p className="hub-empty-title">{search.trim() ? "No entries match your search" : "No archive entries yet"}</p><p className="hub-empty-desc">{search.trim() ? "Try different keywords" : "Add completed campaigns, posts, and materials to build your archive"}</p></div>
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



export function ArchiveForm({ entry, onSave, onCancel, onDelete }) {
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
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{entry ? <><Pencil size={18} style={{ display: "inline" }} /> Edit Entry</> : <><Library size={18} style={{ display: "inline" }} /> Add to Archive</>}</h2>
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



export function LeadForm({ onSave, onBackToHub, currentUser }) {
  const [form, setForm] = useState({ broker: "", enquiry: "", source: "phone", logged_by: "", next_steps: "needs_action" });
  useEffect(() => { if (currentUser?.name && !form.logged_by) setForm((f) => ({ ...f, logged_by: currentUser.name })); }, [currentUser]);
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
      <PageHeader icon={<TrendingUp size={22} color="#20A39E" />} title="Log an Inbound Lead" subtitle="Record details of an inbound marketing lead" />
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>Record an inbound marketing lead for tracking and follow-up.</p>
      <div style={{ marginBottom: 16 }}><label style={labelStyle}>Broker *</label><input style={inputStyle} value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="e.g. Acme Insurance" /></div>
      <div style={{ marginBottom: 16 }}><label style={labelStyle}>Enquiry *</label><textarea rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} value={form.enquiry} onChange={(e) => setForm({ ...form, enquiry: e.target.value })} placeholder="What is the lead about?" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div><label style={labelStyle}>Source</label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>{Object.entries(LEAD_SOURCES).map(([key, s]) => (<button key={key} onClick={() => setForm({ ...form, source: key })} style={{ padding: "6px 4px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.source === key ? s.color : "var(--border)"), background: form.source === key ? s.color + "15" : "var(--bg-input)", color: form.source === key ? s.color : "var(--text-muted)", transition: "all 0.2s", lineHeight: 1.2, textAlign: "center" }}><div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>{s.label}</button>))}</div></div>
        <div><label style={labelStyle}>Next Steps</label><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[["needs_action", "\u{1F7E1} Needs Action", "#ca8a04"], ["passed_through", "\u2705 Passed Through", "#16a34a"], ["closed", "\u{1F6D1} Closed", "#64748b"]].map(([val, label, col]) => (<button key={val} onClick={() => setForm({ ...form, next_steps: val })} style={{ padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.next_steps === val ? col : "var(--border)"), background: form.next_steps === val ? col + "15" : "var(--bg-input)", color: form.next_steps === val ? col : "var(--text-muted)", transition: "all 0.2s", textAlign: "left" }}>{label}</button>))}</div></div>
      </div>
        {currentUser ? <div style={{ marginBottom: 24 }}><label style={labelStyle}>Logged By</label><div style={{ padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)" }}>{currentUser.name}</div></div> : <div style={{ marginBottom: 24 }}><label style={labelStyle}>Logged By *</label><input style={inputStyle} value={form.logged_by} onChange={(e) => setForm({ ...form, logged_by: e.target.value })} placeholder="Your name" /></div>}
      <button onClick={handleSave} disabled={saving || !valid} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: valid ? 1 : 0.5 }}>{saving ? "Saving..." : "Log Lead"}</button>
    </div></div>
  );
}


export function LeadsDashboard({ leads, onUpdate, onDelete }) {
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
      <PageHeader icon={<TrendingUp size={22} color="#20A39E" />} title="Leads Dashboard" subtitle={leads.length + " total lead" + (leads.length !== 1 ? "s" : "") + " logged"} />

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
        <div className="hub-empty">
          <div className="hub-empty-icon"><TrendingUp size={40} /></div>
          <p className="hub-empty-title">{search.trim() ? "No leads match your search" : "No leads logged yet"}</p>
          <p className="hub-empty-desc">{search.trim() ? "Try different keywords" : "Log your first lead using the form"}</p>
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



export function BrandAssets({ assets, isAdmin, onUpload, onDeleteAsset }) {
  const [copied, setCopied] = useState(null);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [uploadMeta, setUploadMeta] = useState({ name: "", category: "main_logo" });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showBgUpload, setShowBgUpload] = useState(false);
  const [bgUploadName, setBgUploadName] = useState("");
  const bgFileRef = useRef(null);
  const [showTplUpload, setShowTplUpload] = useState(false);
  const [tplUploadName, setTplUploadName] = useState("");
  const tplFileRef = useRef(null);

  const copyHex = (hex) => { navigator.clipboard.writeText(hex); setCopied(hex); setTimeout(() => setCopied(null), 1500); };

  const ASSET_CATEGORIES = [
    { key: "main_logo", label: "Main Logo", order: 0 },
    { key: "motor", label: "Motor", order: 1 },
    { key: "commercial", label: "Commercial", order: 2 },
    { key: "property", label: "Property", order: 3 },
    { key: "liability", label: "Liability", order: 4 },
    { key: "travel", label: "Travel", order: 5 },
    { key: "pet", label: "Pet", order: 6 },
    { key: "icons", label: "Icons", order: 7 },
    { key: "other", label: "Other", order: 8 },
    { key: "video_bg", label: "Video Background", order: 90 },
    { key: "template", label: "Branded Template", order: 91 },
  ];
  const categories = {}; ASSET_CATEGORIES.forEach((c) => { categories[c.key] = c.label; });
  const logoAssets = assets.filter((a) => a.category !== "video_bg" && a.category !== "template");
  const filteredAssets = logoAssets.filter((a) => filter === "all" || a.category === filter);
  const groupedByCat = {};
  filteredAssets.forEach((a) => {
    const cat = a.category || "other";
    if (!groupedByCat[cat]) groupedByCat[cat] = {};
    const name = a.asset_name || "Untitled";
    if (!groupedByCat[cat][name]) groupedByCat[cat][name] = [];
    groupedByCat[cat][name].push(a);
  });
  const sortedCatKeys = Object.keys(groupedByCat).sort((a, b) => {
    const aO = ASSET_CATEGORIES.find((c) => c.key === a);
    const bO = ASSET_CATEGORIES.find((c) => c.key === b);
    return (aO ? aO.order : 99) - (bO ? bO.order : 99);
  });

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
      <PageHeader icon={<Palette size={22} color="#20A39E" />} title="Brand Assets" subtitle="Logos, colours, fonts, and brand guidelines" />
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
              <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "transparent", color: filter === "all" ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>All</button>
              {ASSET_CATEGORIES.filter((c) => c.order < 90 && logoAssets.some((a) => a.category === c.key)).map((c) => (
                <button key={c.key} onClick={() => setFilter(c.key)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === c.key ? "var(--brand)" : "transparent", color: filter === c.key ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>{c.label}</button>
              ))}
            </div>
            {isAdmin && <button onClick={() => setShowUploadForm(!showUploadForm)} style={{ padding: "7px 14px", background: showUploadForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showUploadForm ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showUploadForm ? "Cancel" : "\u2795 Upload"}</button>}
          </div>
        </div>

        {showUploadForm && isAdmin && (
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Asset Name</label><input style={inputStyle} value={uploadMeta.name} onChange={(e) => setUploadMeta({ ...uploadMeta, name: e.target.value })} placeholder="e.g. Alps Main Logo" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Category</label><select value={uploadMeta.category} onChange={(e) => setUploadMeta({ ...uploadMeta, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{ASSET_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{"\u{1F4CE}"} Choose Files<input ref={fileRef} type="file" accept="image/*,.svg,.pdf" multiple style={{ display: "none" }} /></label>
              <button onClick={handleUpload} disabled={uploading || !uploadMeta.name.trim()} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: uploading ? "wait" : "pointer", opacity: (uploading || !uploadMeta.name.trim()) ? 0.5 : 1 }}>{uploading ? "Uploading..." : "Upload"}</button>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Upload multiple formats (PNG, SVG, PDF, JPG) under the same name to group them.</span>
            </div>
          </div>
        )}

        {sortedCatKeys.length === 0 ? (
          <div className="hub-empty"><div className="hub-empty-icon"><Palette size={40} /></div><p className="hub-empty-title">No brand assets yet</p><p className="hub-empty-desc">{isAdmin ? "Upload logos, fonts, and brand materials to get started" : "Brand assets will appear here once uploaded by the team"}</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {sortedCatKeys.map((catKey) => {
              const catInfo = ASSET_CATEGORIES.find((c) => c.key === catKey) || { label: catKey };
              const assetGroups = groupedByCat[catKey];
              return (
                <div key={catKey}>
                  {filter === "all" && <h4 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>{catInfo.label}</h4>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {Object.entries(assetGroups).map(([name, files]) => {
                      const previewFile = files.find((f) => /\.png$/i.test(f.file_url)) || files.find((f) => /\.(jpg|jpeg|webp|gif|svg)$/i.test(f.file_url)) || files[0];
                      const isImg = previewFile && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(previewFile.file_url);
                      return (
                        <div key={name} className="hub-card-hover" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                          <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%) 50%/16px 16px", padding: 12 }}>
                            {isImg ? <img src={previewFile.file_url} alt={name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <div style={{ fontSize: 48, opacity: 0.3 }}>{"\u{1F5BC}\uFE0F"}</div>}
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {files.map((f) => (
                                <a key={f.id} href={f.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textDecoration: "none", textTransform: "uppercase", transition: "all 0.15s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>{"\u2B07"} {formatExt(f.file_url)}</a>
                              ))}
                              {isAdmin && <button onClick={() => { if (window.confirm('Delete all formats of "' + name + '"?')) files.forEach((f) => onDeleteAsset(f.id, f.file_url)); }} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #fecaca", borderRadius: 5, fontSize: 10, color: "#dc2626", cursor: "pointer" }}>{"\u2715"}</button>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}><Video size={16} style={{ display: "inline" }} /> Video Backgrounds</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Alps-branded backgrounds for Teams & Zoom calls.</p>
          </div>
          {isAdmin && <button onClick={() => { setShowBgUpload(!showBgUpload); }} style={{ padding: "7px 14px", background: showBgUpload ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showBgUpload ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showBgUpload ? "Cancel" : "\u2795 Upload"}</button>}
        </div>
        {showBgUpload && isAdmin && (
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input style={inputStyle} value={bgUploadName} onChange={(e) => setBgUploadName(e.target.value)} placeholder="Background name..." />
              <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{"\u{1F4CE}"} Choose File<input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} /></label>
              <button onClick={async () => { if (!bgFileRef.current?.files?.length || !bgUploadName.trim()) return; setUploading(true); await onUpload(bgFileRef.current.files[0], bgUploadName.trim(), "video_bg"); setUploading(false); setBgUploadName(""); setShowBgUpload(false); if (bgFileRef.current) bgFileRef.current.value = ""; }} disabled={uploading || !bgUploadName.trim()} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (uploading || !bgUploadName.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}>{uploading ? "Uploading..." : "Upload"}</button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Recommended: 1920x1080 or 1280x720 PNG/JPG for best results on video calls.</p>
          </div>
        )}
        {(() => {
          const bgAssets = assets.filter((a) => a.category === "video_bg");
          const bgGrouped = {};
          bgAssets.forEach((a) => { const n = a.asset_name || "Background"; if (!bgGrouped[n]) bgGrouped[n] = []; bgGrouped[n].push(a); });
          return Object.keys(bgGrouped).length === 0 ? (
            <div className="hub-empty" style={{ padding: "32px 20px" }}><div className="hub-empty-icon"><Video size={36} /></div><p className="hub-empty-desc">No video backgrounds uploaded yet.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {Object.entries(bgGrouped).map(([name, files]) => {
                const previewFile = files.find((f) => /\.(png|jpg|jpeg|webp)$/i.test(f.file_url)) || files[0];
                const isImg = previewFile && /\.(png|jpg|jpeg|webp|gif)$/i.test(previewFile.file_url);
                return (
                  <div key={name} className="hub-card-hover" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e" }}>
                      {isImg ? <img src={previewFile.file_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: 36, opacity: 0.3 }}>{"\u{1F3AC}"}</div>}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{name}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {files.map((f) => (
                          <a key={f.id} href={f.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textDecoration: "none", textTransform: "uppercase", transition: "all 0.15s" }}>{"\u2B07"} {formatExt(f.file_url)}</a>
                        ))}
                        {isAdmin && <button onClick={() => { if (window.confirm('Delete "' + name + '"?')) files.forEach((f) => onDeleteAsset(f.id, f.file_url)); }} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #fecaca", borderRadius: 5, fontSize: 10, color: "#dc2626", cursor: "pointer" }}>{"\u2715"}</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}><FolderOpen size={16} style={{ display: "inline" }} /> Branded Templates</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Ready-to-use Word, PowerPoint, and other document templates.</p>
          </div>
          {isAdmin && <button onClick={() => { setShowTplUpload(!showTplUpload); }} style={{ padding: "7px 14px", background: showTplUpload ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showTplUpload ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showTplUpload ? "Cancel" : "\u2795 Upload"}</button>}
        </div>
        {showTplUpload && isAdmin && (
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input style={inputStyle} value={tplUploadName} onChange={(e) => setTplUploadName(e.target.value)} placeholder="Template name..." />
              <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{"\u{1F4CE}"} Choose File<input ref={tplFileRef} type="file" accept=".docx,.doc,.pptx,.ppt,.xlsx,.xls,.pdf,.zip" style={{ display: "none" }} /></label>
              <button onClick={async () => { if (!tplFileRef.current?.files?.length || !tplUploadName.trim()) return; setUploading(true); await onUpload(tplFileRef.current.files[0], tplUploadName.trim(), "template"); setUploading(false); setTplUploadName(""); setShowTplUpload(false); if (tplFileRef.current) tplFileRef.current.value = ""; }} disabled={uploading || !tplUploadName.trim()} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (uploading || !tplUploadName.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}>{uploading ? "Uploading..." : "Upload"}</button>
            </div>
          </div>
        )}
        {(() => {
          const tplAssets = assets.filter((a) => a.category === "template");
          const tplGrouped = {};
          tplAssets.forEach((a) => { const n = a.asset_name || "Template"; if (!tplGrouped[n]) tplGrouped[n] = []; tplGrouped[n].push(a); });
          const tplIcon = (url) => {
            const ext = (url || "").split(".").pop().split("?")[0].toLowerCase();
            if (ext === "docx" || ext === "doc") return "\u{1F4DD}";
            if (ext === "pptx" || ext === "ppt") return "\u{1F4CA}";
            if (ext === "xlsx" || ext === "xls") return "\u{1F4CA}";
            if (ext === "pdf") return "\u{1F4C4}";
            return "\u{1F4CE}";
          };
          return Object.keys(tplGrouped).length === 0 ? (
            <div className="hub-empty" style={{ padding: "32px 20px" }}><div className="hub-empty-icon"><FolderOpen size={36} /></div><p className="hub-empty-desc">No templates uploaded yet.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(tplGrouped).map(([name, files]) => (
                <div key={name} className="hub-card-hover" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{tplIcon(files[0]?.file_url)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{name}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {files.map((f) => (
                        <a key={f.id} href={f.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textDecoration: "none", textTransform: "uppercase", transition: "all 0.15s" }}>{"\u2B07"} {formatExt(f.file_url)}</a>
                      ))}
                      {isAdmin && <button onClick={() => { if (window.confirm('Delete "' + name + '"?')) files.forEach((f) => onDeleteAsset(f.id, f.file_url)); }} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #fecaca", borderRadius: 5, fontSize: 10, color: "#dc2626", cursor: "pointer" }}>{"\u2715"}</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}



export function ContentTemplates({ templates, isAdmin, onSave, onDelete }) {
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
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{entry ? <><Pencil size={18} style={{ display: "inline" }} /> Edit Template</> : <><FileText size={18} style={{ display: "inline" }} /> New Template</>}</h2>
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
      <PageHeader icon={<FileText size={22} color="#20A39E" />} title="Content Templates" subtitle="Reusable copy snippets, emails, and social captions. Use [BROKER], [PRODUCT], [NAME] as placeholders." action={isAdmin && <button onClick={() => startEdit(null)} style={{ padding: "9px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Plus size={14} style={{ display: "inline", marginRight: 4 }} />New Template</button>} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "transparent", color: filter === "all" ? "#fff" : "var(--text-secondary)" }}>All</button>
          {Object.entries(CATS).map(([k, c]) => (<button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === k ? c.color : "transparent", color: filter === k ? "#fff" : "var(--text-secondary)" }}>{c.icon} {c.label}</button>))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="hub-empty"><div className="hub-empty-icon"><FileText size={40} /></div><p className="hub-empty-title">{search.trim() ? "No matching templates" : "No templates yet"}</p><p className="hub-empty-desc">{search.trim() ? "Try a different search" : "Create reusable copy templates for emails, social posts, and more"}</p></div>
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


export function ContentCalendar({ events, isAdmin, onSave, onDelete, onReschedule, tickets }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", type: "social", description: "", createTicket: false, status: "planned" });
  const [viewMode, setViewMode] = useState("month");
  const [dragItem, setDragItem] = useState(null);

  const EVENT_TYPES = {
    social: { label: "Social Post", color: "#2563eb", icon: "\u{1F4F1}" },
    email: { label: "Email Campaign", color: "#16a34a", icon: "\u2709\uFE0F" },
    event: { label: "Event", color: "#8b5cf6", icon: "\u{1F389}" },
    deadline: { label: "Deadline", color: "#dc2626", icon: "\u23F0" },
    survey: { label: "Survey", color: "#ca8a04", icon: "\u{1F4CB}" },
  };

  const EVENT_STATUS = {
    planned: { label: "Planned", color: "#64748b" },
    in_progress: { label: "In Progress", color: "#ca8a04" },
    published: { label: "Published", color: "#16a34a" },
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
        if (!already) merged.push({ id: "ticket-" + t.id, title: (t.ref || "Ticket") + ": " + t.title, date: t.deadline.substring(0, 10), type: "deadline", description: "Ticket deadline", source: "ticket", ticketRef: t.ref || t.id });
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
    onSave({ ...form, date: dateStr, id: editing || undefined, status: form.status });
    setForm({ title: "", type: "social", description: "", createTicket: false, status: "planned" });
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
          <PageHeader icon={<CalendarDays size={22} color="#20A39E" />} title="Content Calendar" />
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
                <div style={{ marginBottom: 8 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>Status</label><div style={{ display: "flex", gap: 4 }}>{Object.entries(EVENT_STATUS).map(([k, v]) => <button key={k} onClick={() => setForm({ ...form, status: k })} style={{ flex: 1, padding: "5px", borderRadius: 4, border: "1px solid " + (form.status === k ? v.color : "var(--border)"), background: form.status === k ? v.color + "18" : "transparent", fontSize: 10, fontWeight: 600, cursor: "pointer", color: form.status === k ? v.color : "var(--text-muted)" }}>{v.label}</button>)}</div></div>
                {!editing && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}><input type="checkbox" checked={form.createTicket} onChange={(e) => setForm({ ...form, createTicket: e.target.checked })} style={{ accentColor: "var(--brand)" }} />Also create a ticket</label>}
                {editing && <button onClick={() => { setEditing(null); setForm({ title: "", type: "social", description: "", createTicket: false, status: "planned" }); }} style={{ padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>Cancel</button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




export function BrokerToolkit({ items, isAdmin, onSave, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", product: "general", type: "one_pager", description: "", file_url: "" });
  const [editing, setEditing] = useState(null);

  const PRODUCTS = [
    { key: "all", label: "All", icon: "\u{1F4E6}" },
    { key: "general", label: "General", icon: "\u{1F4CB}" },
    { key: "alps", label: "Alps", icon: "\u{1F3D4}\uFE0F" },
    { key: "motor", label: "Motor", icon: "\u{1F697}" },
    { key: "commercial", label: "Commercial", icon: "\u{1F3E2}" },
    { key: "let", label: "Let", icon: "\u{1F3E0}" },
    { key: "personal", label: "Personal", icon: "\u{1F464}" },
  ];

  const ASSET_TYPES = {
    one_pager: { label: "One-Pager", icon: "\u{1F4C4}" },
    email_copy: { label: "Email Copy", icon: "\u{1F4E7}" },
    social_pack: { label: "Social Pack", icon: "\u{1F4F1}" },
    flyer: { label: "Flyer / Print", icon: "\u{1F5A8}\uFE0F" },
    presentation: { label: "Presentation", icon: "\u{1F4CA}" },
    guide: { label: "Guide / PDF", icon: "\u{1F4D6}" },
    other: { label: "Other", icon: "\u{1F4CE}" },
  };

  const filtered = items.filter((item) => filter === "all" || item.product === filter);
  const grouped = {};
  filtered.forEach((item) => {
    const key = item.product || "general";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: editing || undefined });
    setForm({ title: "", product: "general", type: "one_pager", description: "", file_url: "" });
    setShowForm(false); setEditing(null);
  };

  const startEdit = (item) => {
    setForm({ title: item.title, product: item.product, type: item.type, description: item.description || "", file_url: item.file_url || "" });
    setEditing(item.id); setShowForm(true);
  };

  const prodCounts = {};
  items.forEach((item) => { prodCounts[item.product || "general"] = (prodCounts[item.product || "general"] || 0) + 1; });

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <PageHeader icon={<Briefcase size={22} color="#20A39E" />} title="Broker Toolkit" subtitle="Materials and resources for broker partners" />
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Product sheets, email copy, social packs, and broker-facing materials.</p>
        </div>
        {isAdmin && <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title: "", product: "general", type: "one_pager", description: "", file_url: "" }); }} style={{ padding: "8px 16px", background: showForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showForm ? "var(--text-primary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "\u2795 Add Asset"}</button>}
      </div>

      {showForm && isAdmin && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Motor One-Pager" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Product</label><select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}>{PRODUCTS.filter((p) => p.key !== "all").map((p) => <option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}</select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}>{Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>File URL (optional)</label><input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this asset..." rows={2} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} /></div>
          <button onClick={handleSave} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{editing ? "Update Asset" : "Add Asset"}</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {PRODUCTS.map((p) => {
          const count = p.key === "all" ? items.length : (prodCounts[p.key] || 0);
          return <button key={p.key} onClick={() => setFilter(p.key)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + (filter === p.key ? "var(--brand)" : "var(--border)"), background: filter === p.key ? "var(--brand)" : "var(--bg-card)", color: filter === p.key ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}><span>{p.icon}</span> {p.label} {count > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>}</button>;
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: 12, opacity: 0.3 }}><Briefcase size={44} /></div>
          <p style={{ fontSize: 15, margin: "0 0 4px", fontWeight: 600 }}>{items.length === 0 ? "No assets yet" : "No assets for this product"}</p>
          <p style={{ fontSize: 13, margin: 0 }}>{items.length === 0 && isAdmin ? "Add broker-facing materials to get started." : "Try a different filter."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(grouped).sort((a, b) => {
            const order = PRODUCTS.map((p) => p.key);
            return order.indexOf(a[0]) - order.indexOf(b[0]);
          }).map(([prodKey, prodItems]) => {
            const prod = PRODUCTS.find((p) => p.key === prodKey) || PRODUCTS[1];
            return (
              <div key={prodKey}>
                {filter === "all" && <h3 style={{ margin: "8px 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{prod.icon} {prod.label}</h3>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {prodItems.map((item) => {
                    const at = ASSET_TYPES[item.type] || ASSET_TYPES.other;
                    return (
                      <div key={item.id} className="hub-card-hover" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{ fontSize: 24 }}>{at.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{item.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{at.label}</div>
                            {item.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{item.description}</div>}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", background: "var(--brand)", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", transition: "all 0.15s" }}>{"\u2B07\uFE0F"} Download</a>}
                              {isAdmin && <button onClick={() => startEdit(item)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>}
                              {isAdmin && <button onClick={() => { if (window.confirm("Delete \"" + item.title + "\"?")) onDelete(item.id); }} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", borderRadius: 6, fontSize: 11, color: "#dc2626", cursor: "pointer" }}>{"\u2715"}</button>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export function CampaignTracker({ campaigns, tickets, archiveEntries, leads, calendarEvents, isAdmin, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", status: "active", start_date: "", end_date: "" });
  const [expanded, setExpanded] = useState(null);

  const CAMPAIGN_STATUS = {
    planning: { label: "Planning", color: "#64748b" },
    active: { label: "Active", color: "#16a34a" },
    completed: { label: "Completed", color: "#2563eb" },
    paused: { label: "Paused", color: "#ca8a04" },
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: editing || undefined });
    setForm({ name: "", description: "", status: "active", start_date: "", end_date: "" });
    setShowForm(false); setEditing(null);
  };

  const getCampaignData = (c) => {
    const tag = c.name.toLowerCase();
    const cTickets = tickets.filter((t) => (t.title || "").toLowerCase().includes(tag) || (t.description || "").toLowerCase().includes(tag));
    const cArchive = (archiveEntries || []).filter((e) => (e.title || "").toLowerCase().includes(tag));
    const cEvents = (calendarEvents || []).filter((e) => (e.title || "").toLowerCase().includes(tag));
    const cLeads = leads.filter((l) => (l.notes || "").toLowerCase().includes(tag) || (l.product || "").toLowerCase().includes(tag));
    return { tickets: cTickets, archive: cArchive, events: cEvents, leads: cLeads };
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <PageHeader icon={<Target size={22} color="#20A39E" />} title="Campaign Tracker" subtitle="Group tickets, content, and leads by campaign" />
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Group tickets, content, and leads under campaigns.</p>
        </div>
        {isAdmin && <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: "", description: "", status: "active", start_date: "", end_date: "" }); }} style={{ padding: "8px 16px", background: showForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showForm ? "var(--text-primary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "\u2795 New Campaign"}</button>}
      </div>

      {showForm && isAdmin && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Campaign Name</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q2 Motor Push" /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(CAMPAIGN_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Campaign objectives..." style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Start</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>End</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} /></div>
            <button onClick={handleSave} disabled={!form.name.trim()} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: form.name.trim() ? 1 : 0.5 }}>{editing ? "Update" : "Create"}</button>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: 12, opacity: 0.3 }}><Target size={44} /></div>
          <p style={{ fontSize: 15, margin: "0 0 4px", fontWeight: 600 }}>No campaigns yet</p>
          <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)" }}>Create campaigns to group related tickets, content, and leads together</p>
          <p style={{ fontSize: 13, margin: 0 }}>Create a campaign to group related marketing activity.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {campaigns.map((c) => {
            const st = CAMPAIGN_STATUS[c.status] || CAMPAIGN_STATUS.active;
            const data = getCampaignData(c);
            const isExp = expanded === c.id;
            return (
              <div key={c.id} className="hub-card-hover" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div onClick={() => setExpanded(isExp ? null : c.id)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 22 }}>{"\u{1F3AF}"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 20, background: st.color + "18", color: st.color, fontWeight: 600 }}>{st.label}</span>
                      <span>{data.tickets.length} tickets</span>
                      <span>{data.archive.length} content</span>
                      <span>{data.events.length} events</span>
                      <span>{data.leads.length} leads</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: "var(--text-muted)", transition: "transform 0.2s", transform: isExp ? "rotate(180deg)" : "none" }}>{"\u25BC"}</span>
                </div>
                {isExp && (
                  <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--border)" }}>
                    {c.description && <p style={{ margin: "12px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{c.description}</p>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Linked Tickets</div>{data.tickets.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>None found</div> : data.tickets.slice(0, 5).map((t) => <div key={t.id} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0" }}><span style={{ fontWeight: 600, color: "var(--brand)" }}>{t.ref}</span> {t.title}</div>)}</div>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Content Output</div>{data.archive.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>None found</div> : data.archive.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0" }}>{e.title}</div>)}</div>
                    </div>
                    {isAdmin && <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button onClick={() => { setForm({ name: c.name, description: c.description || "", status: c.status, start_date: c.start_date || "", end_date: c.end_date || "" }); setEditing(c.id); setShowForm(true); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 11, cursor: "pointer", color: "var(--text-muted)" }}>Edit</button>
                      <button onClick={() => { if (window.confirm("Delete this campaign?")) onDelete(c.id); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", fontSize: 11, cursor: "pointer", color: "#dc2626" }}>Delete</button>
                    </div>}
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


export function KnowledgeBase({ articles, isAdmin, onSave, onDelete }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", category: "general", content: "", order: 0 });

  const CATEGORIES = [
    { key: "all", label: "All" },
    { key: "general", label: "General" },
    { key: "brand", label: "Brand & Design" },
    { key: "process", label: "Processes" },
    { key: "tools", label: "Tools & How-To" },
    { key: "policies", label: "Policies" },
  ];

  const filtered = articles.filter((a) => {
    if (category !== "all" && a.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (a.title || "").toLowerCase().includes(q) || (a.content || "").toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    onSave({ ...form, id: editing || undefined });
    setForm({ title: "", category: "general", content: "", order: 0 });
    setShowForm(false); setEditing(null);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ width: "100%", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <PageHeader icon={<BookOpen size={22} color="#20A39E" />} title="Knowledge Base" subtitle="Articles and guides for the team" />
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Guides, FAQs, and how-to articles.</p>
        </div>
        {isAdmin && <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title: "", category: "general", content: "", order: 0 }); }} style={{ padding: "8px 16px", background: showForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showForm ? "var(--text-primary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "\u2795 Add Article"}</button>}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          {CATEGORIES.map((c) => <button key={c.key} onClick={() => setCategory(c.key)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "none", background: category === c.key ? "var(--brand)" : "transparent", color: category === c.key ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>{c.label}</button>)}
        </div>
      </div>

      {showForm && isAdmin && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Title</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Article title" /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{CATEGORIES.filter((c) => c.key !== "all").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Content (Markdown supported)</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
          <button onClick={handleSave} disabled={!form.title.trim() || !form.content.trim()} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (form.title.trim() && form.content.trim()) ? 1 : 0.5 }}>{editing ? "Update" : "Publish"}</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="hub-empty">
          <div className="hub-empty-icon"><BookOpen size={40} /></div>
          <p className="hub-empty-title">{search.trim() ? "No articles matching your search" : "No articles yet"}</p>
          <p className="hub-empty-desc">{search.trim() ? "Try different search terms" : "Publish guides and how-tos for your team"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((a) => {
            const isExp = expanded === a.id;
            const cat = CATEGORIES.find((c) => c.key === a.category) || CATEGORIES[1];
            return (
              <div key={a.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => setExpanded(isExp ? null : a.id)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{"\u{1F4C4}"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{cat.label}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", transition: "transform 0.2s", transform: isExp ? "rotate(180deg)" : "none" }}>{"\u25BC"}</span>
                </div>
                {isExp && (
                  <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ margin: "14px 0", fontSize: 14, color: "var(--text-body)", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content || "") }}></div>
                    {isAdmin && <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setForm({ title: a.title, category: a.category, content: a.content, order: a.order || 0 }); setEditing(a.id); setShowForm(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 11, cursor: "pointer", color: "var(--text-muted)" }}>Edit</button>
                      <button onClick={() => { if (window.confirm("Delete this article?")) onDelete(a.id); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", fontSize: 11, cursor: "pointer", color: "#dc2626" }}>Delete</button>
                    </div>}
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


export function AlpsGallery({ images, isAdmin, onUpload, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("general");
  const fileRef = useRef(null);

  const GALLERY_CATEGORIES = [
    { key: "all", label: "All", icon: "\u{1F5BC}\uFE0F" },
    { key: "general", label: "General", icon: "\u{1F4F7}" },
    { key: "events", label: "Events", icon: "\u{1F389}" },
    { key: "products", label: "Products", icon: "\u{1F4E6}" },
    { key: "team", label: "Team", icon: "\u{1F465}" },
    { key: "social", label: "Social Media", icon: "\u{1F4F1}" },
    { key: "branding", label: "Branding", icon: "\u{1F3A8}" },
    { key: "office", label: "Office", icon: "\u{1F3E2}" },
  ];

  const filtered = images.filter((img) => {
    if (filter !== "all" && img.category !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (img.filename || "").toLowerCase().includes(q) || (img.category || "").toLowerCase().includes(q) || (img.caption || "").toLowerCase().includes(q);
    }
    return true;
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      await onUpload(file, uploadCategory);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadImage = async (img) => {
    try {
      const response = await fetch(img.url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = img.filename || "alps-image.jpg";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(img.url, "_blank");
    }
  };

  const catCounts = {};
  images.forEach((img) => { catCounts[img.category] = (catCounts[img.category] || 0) + 1; });

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <PageHeader icon={<Image size={22} color="#20A39E" />} title="Alps Gallery" subtitle="Browse and download team photos" />
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Browse and download photos. Click any image to save it.</p>
        </div>
        <div style={{ position: "relative", minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search images..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {GALLERY_CATEGORIES.map((cat) => {
          const count = cat.key === "all" ? images.length : (catCounts[cat.key] || 0);
          return (
            <button key={cat.key} onClick={() => setFilter(cat.key)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + (filter === cat.key ? "var(--brand)" : "var(--border)"), background: filter === cat.key ? "var(--brand)" : "var(--bg-card)", color: filter === cat.key ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
              <span>{cat.icon}</span> {cat.label}
              {count > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} style={{ padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
            {GALLERY_CATEGORIES.filter((c) => c.key !== "all").map((c) => (
              <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
            ))}
          </select>
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: "8px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.6 : 1, transition: "all 0.15s" }}>
              {uploading ? "Uploading..." : "\u{2B06}\uFE0F Upload Images"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: "none" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>PNG, JPG, WEBP {"\u2022"} Multiple files supported</span>
          </label>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)" }}>
          <div className="hub-empty-icon"><Image size={44} /></div>
          <p style={{ fontSize: 15, margin: "0 0 4px", fontWeight: 600 }}>{images.length === 0 ? "Your gallery is empty" : "No images match your search"}</p><p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)" }}>{images.length === 0 ? "Upload photos to build your team's visual library" : "Try a different search term"}</p>
          <p style={{ fontSize: 13, margin: 0 }}>{images.length === 0 && isAdmin ? "Upload some photos to get started." : "Try a different filter or search term."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }} className="hub-gallery-grid">
          {filtered.map((img) => {
            const cat = GALLERY_CATEGORIES.find((c) => c.key === img.category) || GALLERY_CATEGORIES[1];
            return (
              <div key={img.id} className="hub-card-hover" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => downloadImage(img)}>
                <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "var(--bg-input)" }}>
                  <img src={img.url} alt={img.filename} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }} onMouseOver={(e) => e.target.style.transform = "scale(1.05)"} onMouseOut={(e) => e.target.style.transform = "scale(1)"} />
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{img.caption || img.filename}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: cat.key === "all" ? "var(--text-muted)" : "var(--text-secondary)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{cat.icon} {cat.label}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{"\u2B07\uFE0F"}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this image?")) onDelete(img.id, img.storage_path); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 6, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }} onMouseOver={(e) => e.target.style.opacity = "1"} onMouseOut={(e) => e.target.style.opacity = "0"}>{"\u2715"}</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

