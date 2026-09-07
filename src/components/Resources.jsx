import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import jsPDF from "jspdf";
import { PRIORITIES, STATUS, ARCHIVE_TYPES, LEAD_SOURCES, BRAND_COLORS, formatDate, renderMarkdown, daysUntil, highlightText } from "../constants.js";
import { Library, TrendingUp, Palette, Image, CalendarDays, Briefcase, Target, FileText, BookOpen, Search, FolderOpen, Video, Upload, Plus, Pencil, Trash2, Copy, Download, ChevronDown, ExternalLink, Filter, Grid3X3, List, Tag, Star } from "lucide-react";
import { PageHeader } from "./UI.jsx";


export function MarketingArchive({ entries, isAdmin, onManage }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("timeline");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const campaigns = [...new Set(entries.map((e) => e.campaign).filter(Boolean))].sort();
  const allTags = [...new Set(entries.flatMap((e) => e.tags || []))].sort();

  const filtered = entries.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (campaignFilter !== "all" && (e.campaign || "") !== campaignFilter) return false;
    if (tagFilter && !(e.tags || []).includes(tagFilter)) return false;
    if (dateFrom) { const d = new Date(e.date || e.created_at); if (d < new Date(dateFrom + "T00:00:00")) return false; }
    if (dateTo) { const d = new Date(e.date || e.created_at); if (d > new Date(dateTo + "T23:59:59")) return false; }
    if (search.trim()) { const q = search.toLowerCase(); return e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q) || (e.tags || []).some((tag) => tag.toLowerCase().includes(q)); }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  // Group by month for timeline
  const byMonth = {};
  sorted.forEach((e) => { const d = new Date(e.date || e.created_at); const key = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }); if (!byMonth[key]) byMonth[key] = []; byMonth[key].push(e); });

  // Group by type
  const byType = {};
  sorted.forEach((e) => { const t = e.type || "other"; if (!byType[t]) byType[t] = []; byType[t].push(e); });

  // Parse stats from description
  const getStats = (entry) => { if (entry.description && entry.description.includes("---STATS---")) { try { return JSON.parse(entry.description.split("---STATS---")[1]); } catch {} } return null; };

  const renderCompact = (entry) => {
    const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other;
    const stats = getStats(entry);
    return (
      <div key={entry.id} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} style={{ background: "var(--bg-card)", borderLeft: "4px solid " + t.color, borderRadius: 14, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)", borderLeftWidth: 4, borderLeftColor: t.color }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)"; }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: search.trim() ? highlightText(entry.title, search) : entry.title }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)", marginTop: 2, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: t.color }}>{t.label}</span>
              <span>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              {entry.tags && entry.tags.filter((tag) => tag !== "auto-synced").slice(0, 3).map((tag) => <span key={tag} style={{ padding: "1px 6px", borderRadius: 4, background: "var(--bg-input)", fontSize: 10 }}>{tag}</span>)}
            </div>
            {stats && stats.sent !== "0" && (
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 600, background: "rgba(100,116,139,0.08)", color: "#64748b" }}>Sent {stats.sent}</span>
                <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 600, background: "rgba(22,163,74,0.08)", color: "#16a34a" }}>Opens {stats.opens}{stats.openRate && stats.openRate !== "0" ? " (" + stats.openRate + "%)" : ""}</span>
                <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 600, background: "rgba(2,132,199,0.08)", color: "#0284c7" }}>Clicks {stats.clicks}{stats.clickRate && stats.clickRate !== "0" ? " (" + stats.clickRate + "%)" : ""}</span>
                {stats.unsubs && stats.unsubs !== "0" && <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 600, background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>Unsubs {stats.unsubs}</span>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {entry.file_url && <a href={entry.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "5px 10px", background: "rgba(22,163,74,0.08)", borderRadius: 6, color: "#16a34a", fontSize: 11, fontWeight: 600, textDecoration: "none" }}><Download size={11} style={{display:"inline",verticalAlign:"-1px"}} /> File</a>}
            {entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "5px 10px", background: "var(--brand-light)", borderRadius: 6, color: "var(--brand)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}><ExternalLink size={11} style={{display:"inline",verticalAlign:"-1px"}} /> Link</a>}
            {isAdmin && <button onClick={(e) => { e.stopPropagation(); onManage(entry.id); }} style={{ padding: "5px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>Edit</button>}
          </div>
        </div>
        {expandedId === entry.id && entry.description && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, fontSize: 12, color: "var(--text-body)", lineHeight: 1.6 }}>{entry.description.split("---STATS---")[0].trim()}</div>
        )}
      </div>
    );
  };

  const renderGridCard = (entry) => {
    const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other;
    const stats = getStats(entry);
    return (
      <div key={entry.id} style={{ background: "var(--bg-card)", borderTop: "4px solid " + t.color, borderRadius: 14, padding: 16, transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)"; }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 20 }}>{t.icon}</span><span style={{ fontSize: 10, fontWeight: 600, color: t.color }}>{t.label}</span></div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: search.trim() ? highlightText(entry.title, search) : entry.title }}></div>
        {stats && stats.sent !== "0" && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 20, background: "rgba(22,163,74,0.08)", color: "#16a34a" }}>O:{stats.opens}</span>
          <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 20, background: "rgba(2,132,199,0.08)", color: "#0284c7" }}>C:{stats.clicks}</span>
        </div>}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--brand)", textDecoration: "none", fontWeight: 600 }}>Link</a>}
            {isAdmin && <button onClick={() => onManage(entry.id)} style={{ fontSize: 10, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>}
          </div>
        </div>
      </div>
    );
  };

  const viewBtns = [
    { id: "timeline", label: "Timeline", icon: "⏱" },
    { id: "list", label: "List", icon: "☰" },
    { id: "grid", label: "Grid", icon: "▦" },
    { id: "type", label: "By Type", icon: "◫" },
  ];

  const now = new Date();
  const thisMonth = entries.filter((e) => { const d = new Date(e.date || e.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const emailCount = entries.filter((e) => e.type === "email").length;
  const socialCount = entries.filter((e) => e.type === "social" || e.type === "social_post").length;
  const archiveStats = [{ label: "Total Entries", value: entries.length, color: "#8b5cf6" }, { label: "This Month", value: thisMonth, color: "#7c3aed" }, { label: "Email Campaigns", value: emailCount, color: "#0284c7" }, { label: "Social Posts", value: socialCount, color: "#16a34a" }];

  return (
    <div style={{ width: "100%" }}>
      <PageHeader icon={<Library size={22} />} title="Marketing Archive" subtitle={entries.length + " pieces catalogued"} gradient="linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)" stats={archiveStats} action={<div style={{ display: "flex", gap: 8 }}><button onClick={() => { const rows = (entries || []).map((e) => [new Date(e.date || e.created_at).toLocaleDateString("en-GB"), e.title, e.link || "", (e.tags || []).join(", ")].join("\t")); const csv = "Date\tTitle\tLink\tTags\n" + rows.join("\n"); const blob = new Blob([csv], { type: "text/tab-separated-values" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "marketing-archive-export.tsv"; a.click(); }} style={{ padding: "9px 14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Download size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Export</button>{isAdmin && <button onClick={() => onManage()} style={{ padding: "9px 18px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Plus size={14} style={{ display: "inline", marginRight: 4 }} />Add Entry</button>}</div>} />

      {/* Filters */}
      <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "14px 16px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search archive..." style={{ width: "100%", padding: "10px 14px 10px 36px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} /></div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: filter === "all" ? "var(--brand)" : "var(--bg-input)", color: filter === "all" ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>All</button>
          {Object.entries(ARCHIVE_TYPES).map(([key, t]) => (<button key={key} onClick={() => setFilter(key)} style={{ padding: "7px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: filter === key ? t.color : "var(--bg-input)", color: filter === key ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>{t.icon} {t.label}</button>))}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "7px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "7px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding: "5px 10px", background: "none", border: "1px solid var(--border)", borderRadius: 20, color: "var(--text-muted)", fontSize: 10, cursor: "pointer" }}>Clear</button>}
        </div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-input)", borderRadius: 10, padding: 3 }}>
          {viewBtns.map((v) => <button key={v.id} onClick={() => setViewMode(v.id)} title={v.label} style={{ padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: viewMode === v.id ? "var(--brand)" : "transparent", color: viewMode === v.id ? "#fff" : "var(--text-muted)", fontSize: 12, transition: "all 0.15s" }}>{v.icon}</button>)}
        </div>
      </div>

      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {tagFilter && <button onClick={() => setTagFilter("")} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid var(--brand)", background: "var(--brand-light)", color: "var(--brand)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>All ×</button>}
          {allTags.filter((t) => t !== "auto-synced").map((tag) => {
            const count = entries.filter((e) => (e.tags || []).includes(tag)).length;
            return <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid " + (tagFilter === tag ? "var(--brand)" : "var(--border)"), background: tagFilter === tag ? "var(--brand)" : "var(--bg-card)", color: tagFilter === tag ? "#fff" : "var(--text-muted)", fontSize: 10, fontWeight: 500, cursor: "pointer" }}>{tag} ({count})</button>;
          })}
        </div>
      )}

      {/* Results */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <Library size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{search.trim() ? "No entries match your search" : "No archive entries yet"}</div>
        </div>
      ) : viewMode === "timeline" ? (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: "var(--border)", borderRadius: 1 }}></div>
          {Object.entries(byMonth).map(([month, items]) => (
            <div key={month} style={{ marginBottom: 28 }}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: -24, top: 2, width: 14, height: 14, borderRadius: 7, background: "var(--brand)", border: "3px solid var(--bg-main)" }}></div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{month}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{items.length} {items.length === 1 ? "entry" : "entries"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((entry) => {
                  const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other;
                  return (
                    <div key={entry.id} style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: -22, top: 14, width: 8, height: 8, borderRadius: 4, background: t.color, border: "2px solid var(--bg-main)" }}></div>
                      {renderCompact(entry)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {sorted.map(renderGridCard)}
        </div>
      ) : viewMode === "type" ? (
        <div>
          {Object.entries(byType).map(([typeKey, items]) => {
            const t = ARCHIVE_TYPES[typeKey] || ARCHIVE_TYPES.other;
            return (
              <div key={typeKey} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid " + t.color + "30" }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: t.color }}>{t.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>({items.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{items.map(renderCompact)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{sorted.map(renderCompact)}</div>
      )}
    </div>
  );
}

export function ArchiveForm({ entry, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(entry ? { title: entry.title, type: entry.type, description: entry.description || "", date: entry.date || "", link: entry.link || "", tags: (entry.tags || []).join(", "), campaign: entry.campaign || "", performance: entry.performance || "", file_url: entry.file_url || "" } : { title: "", type: "social_post", description: "", date: "", link: "", tags: "", campaign: "", performance: "", file_url: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);
    const path = "archive/" + Date.now() + "-" + f.name.replace(/\s+/g, "-");
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, f);
    if (!error) { const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path); setForm({ ...form, file_url: data.publicUrl }); }
    setUploading(false);
  };
  const handleSave = async () => { if (!form.title.trim()) return; setSaving(true); await onSave({ title: form.title.trim(), type: form.type, description: form.description.trim(), date: form.date || null, link: form.link.trim() || null, file_url: form.file_url || null, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), campaign: form.campaign.trim() || null, performance: form.performance || null }, entry?.id); setSaving(false); };
  const inputStyle = { width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none" };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 };
  const PERF = [{ value: "", label: "Not tracked" }, { value: "strong", label: "● Strong" }, { value: "average", label: "● Average" }, { value: "weak", label: "● Weak" }];
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><label style={labelStyle}>Link / URL</label><input style={inputStyle} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
          <div>
            <label style={labelStyle}>File Attachment</label>
            {form.file_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: "#16a34a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✓ File attached</span>
                <button onClick={() => setForm({ ...form, file_url: "" })} style={{ padding: "4px 8px", background: "none", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10, color: "#dc2626", cursor: "pointer" }}>Remove</button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                <Upload size={13} /> {uploading ? "Uploading..." : "Choose file"}
                <input ref={fileRef} type="file" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
              </label>
            )}
          </div>
        </div>
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
      <PageHeader icon={<TrendingUp size={22} />} title="Log an Inbound Lead" subtitle="Record details of an inbound marketing lead" gradient="linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)" />
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>Record an inbound marketing lead for tracking and follow-up.</p>
      <div style={{ marginBottom: 16 }}><label style={labelStyle}>Broker *</label><input style={inputStyle} value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="e.g. Acme Insurance" /></div>
      <div style={{ marginBottom: 16 }}><label style={labelStyle}>Enquiry *</label><textarea rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} value={form.enquiry} onChange={(e) => setForm({ ...form, enquiry: e.target.value })} placeholder="What is the lead about?" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div><label style={labelStyle}>Source</label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>{Object.entries(LEAD_SOURCES).map(([key, s]) => (<button key={key} onClick={() => setForm({ ...form, source: key })} style={{ padding: "6px 4px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.source === key ? s.color : "var(--border)"), background: form.source === key ? s.color + "15" : "var(--bg-input)", color: form.source === key ? s.color : "var(--text-muted)", transition: "all 0.2s", lineHeight: 1.2, textAlign: "center" }}><div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>{s.label}</button>))}</div></div>
        <div><label style={labelStyle}>Next Steps</label><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[["needs_action", "● Needs Action", "#ca8a04"], ["passed_through", "\u2705 Passed Through", "#16a34a"], ["closed", "● Closed", "#64748b"]].map(([val, label, col]) => (<button key={val} onClick={() => setForm({ ...form, next_steps: val })} style={{ padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (form.next_steps === val ? col : "var(--border)"), background: form.next_steps === val ? col + "15" : "var(--bg-input)", color: form.next_steps === val ? col : "var(--text-muted)", transition: "all 0.2s", textAlign: "left" }}>{label}</button>))}</div></div>
      </div>
        {currentUser ? <div style={{ marginBottom: 24 }}><label style={labelStyle}>Logged By</label><div style={{ padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)" }}>{currentUser.name}</div></div> : <div style={{ marginBottom: 24 }}><label style={labelStyle}>Logged By *</label><input style={inputStyle} value={form.logged_by} onChange={(e) => setForm({ ...form, logged_by: e.target.value })} placeholder="Your name" /></div>}
      <button onClick={handleSave} disabled={saving || !valid} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: valid ? 1 : 0.5 }}>{saving ? "Saving..." : "Log Lead"}</button>
    </div></div>
  );
}


export function LeadsDashboard({ leads, onUpdate, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [expandedLead, setExpandedLead] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [leadSort, setLeadSort] = useState({ key: "created_at", dir: "desc" });
  const toggleSort = (key) => setLeadSort((prev) => prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });

  const filtered = leads.filter((l) => {
    if (filter === "needs_action" && l.next_steps !== "needs_action") return false;
    if (filter === "passed_through" && l.next_steps !== "passed_through") return false;
    if (filter === "closed" && l.next_steps !== "closed") return false;
    if (search.trim()) { const q = search.toLowerCase(); return l.broker.toLowerCase().includes(q) || l.enquiry.toLowerCase().includes(q) || l.logged_by.toLowerCase().includes(q); }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const dir = leadSort.dir === "asc" ? 1 : -1;
    if (leadSort.key === "created_at") return dir * (new Date(b.created_at) - new Date(a.created_at));
    if (leadSort.key === "broker") return dir * a.broker.localeCompare(b.broker);
    if (leadSort.key === "source") return dir * (a.source || "").localeCompare(b.source || "");
    if (leadSort.key === "status") return dir * (a.next_steps || "").localeCompare(b.next_steps || "");
    return 0;
  });
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
      <PageHeader icon={<TrendingUp size={22} />} title="Leads Dashboard" subtitle={leads.length + " total lead" + (leads.length !== 1 ? "s" : "") + " logged"} gradient="linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)" />

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
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." style={{ width: "100%", padding: "9px 14px 9px 36px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          {[["all", "All"], ["needs_action", "● Action"], ["passed_through", "\u2705 Passed"], ["closed", "● Closed"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: filter === k ? "var(--brand)" : "transparent", color: filter === k ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          {[["table", "☰"], ["list", "▤"], ["timeline", <CalendarDays size={13} />]].map(([k, ic]) => (
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
      ) : viewMode === "table" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {[{ key: "created_at", label: "Date" }, { key: "broker", label: "Broker" }, { key: "source", label: "Source" }, { key: "status", label: "Status" }].map((col) => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none", background: "var(--bg-input)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{col.label}{leadSort.key === col.key && <span style={{ fontSize: 10 }}>{leadSort.dir === "asc" ? "↑" : "↓"}</span>}</span>
                  </th>
                ))}
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", background: "var(--bg-input)" }}>Enquiry</th>
                <th style={{ padding: "10px 14px", background: "var(--bg-input)", width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => {
                const s = LEAD_SOURCES[lead.source] || LEAD_SOURCES.other;
                const st = STATUS_OPTS.find((o) => o.key === lead.next_steps) || STATUS_OPTS[0];
                return (
                  <tr key={lead.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-input)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-primary)" }} dangerouslySetInnerHTML={{ __html: search.trim() ? highlightText(lead.broker, search) : lead.broker }}></td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.icon} {s.label}</span></td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span></td>
                    <td style={{ padding: "10px 14px", color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: search.trim() ? highlightText(lead.enquiry, search) : lead.enquiry }}></td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>{expandedLead === lead.id ? "▴" : "▾"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                        <button onClick={() => { if (window.confirm("Delete this lead from " + lead.broker + "? This cannot be undone.")) onDelete(lead.id); }} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseOver={(e) => { e.target.style.background = "#fef2f2"; }} onMouseOut={(e) => { e.target.style.background = "transparent"; }}><><Trash2 size={12} style={{display:"inline",verticalAlign:"-1px"}} /> Delete Lead</></button>
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



export function BrandAssets({ assets, isAdmin, onUpload, onDeleteAsset, galleryImages, onGalleryUpload, onGalleryDelete }) {
  const [activeSection, setActiveSection] = useState("colours");
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
      <PageHeader icon={<Palette size={22} />} title="Brand Assets" subtitle="Logos, colours, fonts, and brand guidelines" gradient="linear-gradient(135deg, #115e59 0%, #20A39E 100%)" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Alps brand colours, typography, logos, and icons.</p>
        <button onClick={downloadBrandPack} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}><Download size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Download Brand Pack</button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ id: "brand-colours", label: "Colours", icon: "🎨" }, { id: "brand-typography", label: "Typography", icon: "Aa" }, { id: "brand-logos", label: "Logos & Icons", icon: "◆" }, { id: "brand-videos", label: "Video Backgrounds", icon: "▶" }, { id: "brand-templates", label: "Templates", icon: "📄" }, { id: "brand-signatures", label: "Signatures", icon: "✉" }, { id: "brand-gallery", label: "Gallery", icon: "🖼" }].map((s) => (
          <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      <div id="brand-colours" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 20, scrollMarginTop: 80 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Brand Colours</h3>
        <div className="hub-color-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {BRAND_COLORS.map((c) => {
            const r = parseInt(c.hex.slice(1,3),16), g = parseInt(c.hex.slice(3,5),16), b = parseInt(c.hex.slice(5,7),16);
            const rf=r/255,gf=g/255,bf=b/255,mx=Math.max(rf,gf,bf),mn=Math.min(rf,gf,bf),d=mx-mn,l=(mx+mn)/2;
            let h=0,s=0; if(d!==0){s=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===rf)h=((gf-bf)/d+(gf<bf?6:0))*60;else if(mx===gf)h=((bf-rf)/d+2)*60;else h=((rf-gf)/d+4)*60;}
            const k=1-mx,ck=mx===0?0:(mx-rf)/mx,mk=mx===0?0:(mx-gf)/mx,yk=mx===0?0:(mx-bf)/mx;
            const fmts = [
              { l: "HEX", v: c.hex },
              { l: "RGB", v: r+", "+g+", "+b },
              { l: "HSL", v: Math.round(h)+"°, "+Math.round(s*100)+"%, "+Math.round(l*100)+"%" },
              { l: "CMYK", v: Math.round(ck*100)+", "+Math.round(mk*100)+", "+Math.round(yk*100)+", "+Math.round(k*100) },
            ];
            return (
              <div key={c.hex} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                <button onClick={() => copyHex(c.hex)} style={{ width: "100%", background: c.hex, padding: "16px 14px", border: "none", cursor: "pointer", textAlign: "left", position: "relative" }} title={"Click to copy " + c.hex}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.3)", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>{c.hex}</div>
                  {copied === c.hex && <span style={{ position: "absolute", top: 8, right: 10, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 10 }}>Copied!</span>}
                </button>
                <div style={{ padding: "8px 12px", background: "var(--bg-input)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {fmts.map((f) => (
                    <button key={f.l} onClick={() => { navigator.clipboard.writeText(f.v); setCopied(c.hex + f.l); setTimeout(() => setCopied(null), 1500); }} style={{ padding: "3px 6px", background: "transparent", border: "1px solid transparent", borderRadius: 4, cursor: "pointer", textAlign: "left", fontSize: 10, color: "var(--text-muted)", transition: "all 0.1s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--border)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "transparent"} title={"Copy " + f.l}>
                      <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{f.l}</span> <span style={{ fontFamily: "monospace" }}>{f.v}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div id="brand-typography" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 20, scrollMarginTop: 80 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Typography</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>Headlines</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Museo Sans 700</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Used for headings and display text</div>
            <a href="https://fonts.adobe.com/fonts/museo-sans" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "var(--brand-light)", borderRadius: 6, color: "var(--brand)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}><Download size={12} /> Get from Adobe Fonts</a>
          </div>
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>Body Copy</div>
            <div style={{ fontSize: 24, fontWeight: 400, color: "var(--text-primary)", marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>Montserrat Regular</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Used for body text and paragraphs</div>
            <a href="https://fonts.google.com/specimen/Montserrat" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "var(--brand-light)", borderRadius: 6, color: "var(--brand)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}><Download size={12} /> Get from Google Fonts</a>
          </div>
        </div>
      </div>

      <div id="brand-logos" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, scrollMarginTop: 80 }}>
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
              <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}><Upload size={12} style={{display:"inline",verticalAlign:"-1px"}} /> Choose Files<input ref={fileRef} type="file" accept="image/*,.svg,.pdf" multiple style={{ display: "none" }} /></label>
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
                  {filter === "all" && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 12 }}><h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{catInfo.label}</h4><button onClick={() => { Object.values(assetGroups).flat().forEach((f) => { const a = document.createElement("a"); a.href = f.file_url; a.download = ""; a.target = "_blank"; a.click(); }); }} style={{ padding: "3px 10px", background: "var(--brand-light)", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 600, color: "var(--brand)", cursor: "pointer" }}><Download size={10} style={{display:"inline",verticalAlign:"-1px"}} /> Download all {catInfo.label}</button></div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {Object.entries(assetGroups).map(([name, files]) => {
                      const previewFile = files.find((f) => /\.png$/i.test(f.file_url)) || files.find((f) => /\.(jpg|jpeg|webp|gif|svg)$/i.test(f.file_url)) || files[0];
                      const isImg = previewFile && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(previewFile.file_url);
                      return (
                        <div key={name} className="hub-card-hover" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                          <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%) 50%/16px 16px", padding: 12 }}>
                            {isImg ? <img src={previewFile.file_url} alt={name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <div style={{ opacity: 0.3 }}><Image size={40} /></div>}
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {files.map((f) => (
                                <a key={f.id} href={f.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textDecoration: "none", textTransform: "uppercase", transition: "all 0.15s", cursor: "pointer" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>{"\u2B07"} {formatExt(f.file_url)}</a>
                              ))}
                              {files.length > 1 && <button onClick={() => files.forEach((f) => { const a = document.createElement("a"); a.href = f.file_url; a.download = ""; a.target = "_blank"; a.click(); })} style={{ padding: "3px 10px", background: "var(--brand-light)", border: "1px solid var(--brand-glow)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "var(--brand)", cursor: "pointer" }}>All</button>}
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

      <div id="brand-videos" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 20, scrollMarginTop: 80 }}>
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
              <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}><Upload size={12} style={{display:"inline",verticalAlign:"-1px"}} /> Choose File<input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} /></label>
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
                      {isImg ? <img src={previewFile.file_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ opacity: 0.3 }}><Video size={32} /></div>}
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

      <div id="brand-templates" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 20, scrollMarginTop: 80 }}>
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
              <label style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}><Upload size={12} style={{display:"inline",verticalAlign:"-1px"}} /> Choose File<input ref={tplFileRef} type="file" accept=".docx,.doc,.pptx,.ppt,.xlsx,.xls,.pdf,.zip" style={{ display: "none" }} /></label>
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
            if (ext === "docx" || ext === "doc") return "📄";
            if (ext === "pptx" || ext === "ppt") return "📊";
            if (ext === "xlsx" || ext === "xls") return "📊";
            if (ext === "pdf") return "📄";
            return "📎";
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

      {/* Email Signatures */}
      <div id="brand-signatures" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 20, scrollMarginTop: 80 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Email Signatures</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>Create your branded email signature using our signature builders.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <a href="https://alpsltd.signature.email" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px", textAlign: "center", transition: "all 0.15s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "#231d68"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#231d68", marginBottom: 4 }}>Alps Ltd</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>Insurance services</div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", background: "#231d68", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Open Builder <ExternalLink size={11} /></span>
            </div>
          </a>
          <a href="https://alpslegal.signature.email" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px", textAlign: "center", transition: "all 0.15s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "#e64592"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e64592", marginBottom: 4 }}>Alps Legal</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>Legal services</div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", background: "#e64592", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Open Builder <ExternalLink size={11} /></span>
            </div>
          </a>
        </div>
      </div>

      {/* Gallery */}
      <div id="brand-gallery" style={{ background: "var(--bg-card)", borderRadius: 16, padding: 28, marginTop: 24, scrollMarginTop: 80, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Alps Gallery</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{(galleryImages || []).length} images</p>
          </div>
          {isAdmin && <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "linear-gradient(135deg, #231d68, #464B99)", borderRadius: 10, cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 12px rgba(35,29,104,0.2)" }}><Upload size={13} /> Upload Photos<input type="file" accept="image/*" multiple onChange={async (e) => { if (onGalleryUpload) for (const f of e.target.files) await onGalleryUpload(f); e.target.value = ""; }} style={{ display: "none" }} /></label>}
        </div>
        {(!galleryImages || galleryImages.length === 0) ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
            <span style={{ fontSize: 40, display: "block", marginBottom: 12, opacity: 0.3 }}>🖼</span>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No gallery images yet</div>
            <div style={{ fontSize: 12 }}>{isAdmin ? "Upload photos to build the Alps image library." : "Gallery images will appear here."}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {(galleryImages || []).map((img) => (
              <div key={img.id} className="hub-gallery-card" style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1", border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}>
                <img src={img.url} alt={img.filename || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "24px 10px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <a href={img.url} download={img.filename} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 600, color: "#fff", textDecoration: "none", opacity: 0.8 }}><Download size={11} style={{display:"inline",verticalAlign:"-1px"}} /> Download</a>
                  {img.category && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.2)", color: "#fff" }}>{img.category}</span>}
                </div>
                {isAdmin && <button className="hub-gallery-delete" onClick={() => onGalleryDelete(img.id)} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, background: "rgba(220,38,38,0.9)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", opacity: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




export function Testimonials({ items, isAdmin, onSave, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ broker: "", name: "", submitted_date: new Date().toISOString().split("T")[0], consent: false, text: "", file_url: "" });
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const fileRef = useRef(null);

  const handleFileUpload = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setUploading(true);
    const path = "testimonials/" + Date.now() + "-" + f.name.replace(/\s+/g, "-");
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, f);
    if (!error) { const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path); setForm({ ...form, file_url: data.publicUrl }); }
    setUploading(false);
  };

  const handleSave = () => {
    if (!form.broker.trim() || !form.name.trim()) return;
    onSave({ broker: form.broker.trim(), name: form.name.trim(), submitted_date: form.submitted_date, consent: form.consent, text: form.text.trim() || null, file_url: form.file_url || null, type: form.file_url && form.file_url.match(/\.(mp4|mov|webm|avi)$/i) ? "video" : "text" });
    setForm({ broker: "", name: "", submitted_date: new Date().toISOString().split("T")[0], consent: false, text: "", file_url: "" });
    setShowAdd(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const sorted = [...(items || [])].sort((a, b) => new Date(b.submitted_date || b.created_at) - new Date(a.submitted_date || a.created_at));
  const filtered = sorted.filter((t) => {
    if (filter === "consent" && !t.consent) return false;
    if (filter === "video" && t.type !== "video") return false;
    if (filter === "text" && t.type !== "text") return false;
    if (search.trim()) {
      const q = search.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = ((t.text || "") + " " + (t.broker || "") + " " + (t.name || "")).toLowerCase();
      if (!q.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
  const counts = { all: sorted.length, consent: sorted.filter((t) => t.consent).length, video: sorted.filter((t) => t.type === "video").length, text: sorted.filter((t) => t.type === "text").length };

  return (
    <div style={{ width: "100%", maxWidth: 800 }}>
      <PageHeader icon={<Star size={22} />} title="Testimonials" subtitle="Broker testimonials and feedback" gradient="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" stats={[{ label: "Total", value: items.length, color: "#ca8a04" }, { label: "Written", value: items.filter(function(x){return x.text;}).length, color: "#b45309" }, { label: "Video", value: items.filter(function(x){return x.file_url;}).length, color: "#0284c7" }, { label: "With Consent", value: items.filter(function(x){return x.consent;}).length, color: "#16a34a" }]} action={isAdmin && <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "7px 14px", background: showAdd ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showAdd ? "Cancel" : "+ Add Testimonial"}</button>} />

      {showAdd && isAdmin && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Broker <span style={{ color: "#dc2626" }}>*</span></label>
              <input value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="e.g. Howden Reading" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Name <span style={{ color: "#dc2626" }}>*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Date Submitted</label>
              <input type="date" value={form.submitted_date} onChange={(e) => setForm({ ...form, submitted_date: e.target.value })} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--brand)", cursor: "pointer" }} />
                <span style={{ color: form.consent ? "#16a34a" : "var(--text-secondary)", fontWeight: 600 }}>Consent given for marketing use</span>
              </label>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Testimonial Text <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(or upload video below)</span></label>
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={4} placeholder="Paste the testimonial here..." style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
              <Upload size={13} /> {form.file_url ? "Change file" : "Upload video/file"}
              <input ref={fileRef} type="file" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
            {form.file_url && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ File attached</span>}
            {form.file_url && <button onClick={() => { setForm({ ...form, file_url: "" }); if (fileRef.current) fileRef.current.value = ""; }} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>Remove</button>}
            {uploading && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Uploading...</span>}
          </div>
          <button onClick={handleSave} disabled={!form.broker.trim() || !form.name.trim()} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: form.broker.trim() && form.name.trim() ? 1 : 0.4 }}>Save Testimonial</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search keywords... e.g. Claim Motor" style={{ width: "100%", padding: "8px 12px 8px 30px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
        </div>
        {search.trim() && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ id: "all", label: "All" }, { id: "consent", label: "Consented" }, { id: "text", label: "Written" }, { id: "video", label: "Video" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + (filter === f.id ? "var(--brand)" : "var(--border)"), background: filter === f.id ? "var(--brand)" : "var(--bg-card)", color: filter === f.id ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{f.label} ({counts[f.id]})</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <Star size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No testimonials yet</div>
          <div style={{ fontSize: 13 }}>{isAdmin ? "Click \"+ Add Testimonial\" to get started." : "Testimonials from brokers will appear here."}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((t) => (
            <div key={t.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid " + (t.consent ? "#16a34a" : "#ca8a04"), borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "var(--brand)" }}>{t.broker}</span>
                    <span>{new Date(t.submitted_date || t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {t.consent ? <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "rgba(22,163,74,0.08)", color: "#16a34a" }}>✓ Consent</span> : <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "rgba(202,138,4,0.08)", color: "#ca8a04" }}>No consent</span>}
                  {t.type === "video" && <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>🎬 Video</span>}
                  {isAdmin && <button onClick={() => { if (window.confirm("Delete this testimonial?")) onDelete(t.id); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", padding: 0, opacity: 0.5 }}>✕</button>}
                </div>
              </div>
              {t.text && <div style={{ fontSize: 14, color: "var(--text-body)", lineHeight: 1.7, fontStyle: "italic", padding: "12px 16px", background: "var(--bg-input)", borderRadius: 8, borderLeft: "3px solid var(--border)" }}>"{t.text}"</div>}
              {t.file_url && (
                <div style={{ marginTop: 10 }}>
                  {t.file_url.match(/\.(mp4|mov|webm)$/i) ? (
                    <video src={t.file_url} controls style={{ width: "100%", maxHeight: 300, borderRadius: 8, background: "#000" }} />
                  ) : (
                    <a href={t.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--brand-light)", borderRadius: 6, color: "var(--brand)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}><Download size={13} /> Download File</a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export function ContentStockroom({ items, currentUser, isAdmin, onAdd, onUpdateStatus, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileRef = useRef(null);

  const CONTENT_TAGS = [
    { id: "social", label: "Social Post", color: "#0284c7" },
    { id: "email", label: "Email Campaign", color: "#6366f1" },
    { id: "blog", label: "Blog", color: "#16a34a" },
    { id: "video", label: "Video/Photo", color: "#dc2626" },
    { id: "presentation", label: "Presentation", color: "#ca8a04" },
    { id: "print", label: "Print", color: "#ea580c" },
    { id: "other", label: "Other", color: "#64748b" },
  ];

  const STATUSES = [
    { id: "stockroom", label: "In Stockroom", color: "#ca8a04", bg: "rgba(202,138,4,0.08)" },
    { id: "scheduled", label: "Scheduled", color: "#0284c7", bg: "rgba(2,132,199,0.08)" },
    { id: "posted", label: "Posted", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  ];

  const toggleTag = (id) => setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setUploading(true);
    let file_url = null;
    if (file) {
      const path = "stockroom/" + Date.now() + "-" + file.name.replace(/\s+/g, "-");
      const { error } = await supabase.storage.from("ticket-attachments").upload(path, file);
      if (!error) { const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path); file_url = data.publicUrl; }
    }
    await onAdd({ title: title.trim(), text: text.trim() || null, file_url, submitted_by: currentUser?.name || "Anonymous", status: "stockroom", tags: selectedTags });
    setTitle(""); setText(""); setFile(null); setSelectedTags([]); setShowAdd(false); setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    setJustSubmitted(true);
  };

  const sorted = [...(items || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const filtered = sorted.filter((i) => {
    if (filter !== "all" && i.status !== filter) return false;
    if (tagFilter !== "all" && !(i.tags || []).includes(tagFilter)) return false;
    return true;
  });
  const statusCounts = { all: sorted.length, stockroom: sorted.filter((i) => i.status === "stockroom").length, scheduled: sorted.filter((i) => i.status === "scheduled").length, posted: sorted.filter((i) => i.status === "posted").length };
  const tagCounts = {};
  CONTENT_TAGS.forEach((t) => { tagCounts[t.id] = sorted.filter((i) => (i.tags || []).includes(t.id)).length; });

  return (
    <div style={{ width: "100%", maxWidth: 900 }}>
      <PageHeader icon={<FolderOpen size={22} />} title="Content Stockroom" subtitle="Submit content ideas, files, and text for the marketing team" gradient="linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)" stats={[{ label: "Total Items", value: items.length, color: "#0d9488" }, { label: "Pending", value: items.filter(function(x){return x.status==="stockroom";}).length, color: "#ca8a04" }, { label: "Scheduled", value: items.filter(function(x){return x.status==="scheduled";}).length, color: "#0284c7" }, { label: "Posted", value: items.filter(function(x){return x.status==="posted";}).length, color: "#16a34a" }]} action={<button onClick={() => setShowAdd(!showAdd)} style={{ padding: "7px 14px", background: showAdd ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showAdd ? "Cancel" : "+ Add Content"}</button>} />

      {justSubmitted && (
        <div style={{ padding: "10px 14px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Content submitted! Refresh the page to see your submission in the list.</span>
          <button onClick={() => window.location.reload()} style={{ padding: "5px 12px", background: "#16a34a", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
        </div>
      )}

      {showAdd && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Title <span style={{ color: "#dc2626" }}>*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's this content about?" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Tags</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CONTENT_TAGS.map((t) => (
                <button key={t.id} onClick={() => toggleTag(t.id)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid " + (selectedTags.includes(t.id) ? t.color : "var(--border)"), background: selectedTags.includes(t.id) ? t.color + "15" : "var(--bg-input)", color: selectedTags.includes(t.id) ? t.color : "var(--text-muted)" }}>{t.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Text / Copy <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the text, copy, or talking points here..." rows={4} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
              <Upload size={13} /> {file ? file.name : "Attach a file"}
              <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files[0] || null)} style={{ display: "none" }} />
            </label>
            {file && <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>Remove</button>}
          </div>
          <button onClick={handleAdd} disabled={!title.trim() || uploading} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: title.trim() ? 1 : 0.4 }}>{uploading ? "Uploading..." : "Submit to Stockroom"}</button>
        </div>
      )}

      {/* Status filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {[{ id: "all", label: "All" }, ...STATUSES].map((s) => (
          <button key={s.id} onClick={() => setFilter(s.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + (filter === s.id ? "var(--brand)" : "var(--border)"), background: filter === s.id ? "var(--brand)" : "var(--bg-card)", color: filter === s.id ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{s.label} ({statusCounts[s.id]})</button>
        ))}
      </div>

      {/* Tag filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setTagFilter("all")} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1px solid " + (tagFilter === "all" ? "var(--brand)" : "var(--border)"), background: tagFilter === "all" ? "var(--brand)" : "transparent", color: tagFilter === "all" ? "#fff" : "var(--text-muted)" }}>All</button>
        {CONTENT_TAGS.map((t) => (
          <button key={t.id} onClick={() => setTagFilter(t.id)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1px solid " + (tagFilter === t.id ? t.color : "var(--border)"), background: tagFilter === t.id ? t.color + "15" : "transparent", color: tagFilter === t.id ? t.color : "var(--text-muted)" }}>{t.label} ({tagCounts[t.id]})</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <FolderOpen size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No content here yet</div>
          <div style={{ fontSize: 13 }}>Submit content ideas, text, or files for the marketing team to use.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {filtered.map((item) => {
            const st = STATUSES.find((s) => s.id === item.status) || STATUSES[0];
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} onClick={() => { if (item.text) setExpandedId(isExpanded ? null : item.id); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "3px solid " + st.color, borderRadius: 10, padding: "14px", cursor: item.text ? "pointer" : "default", transition: "all 0.15s" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.4 }}>{item.title}</div>
                {isExpanded && item.text && (
                  <div style={{ padding: "10px 12px", background: "var(--bg-input)", borderRadius: 6, fontSize: 12, color: "var(--text-body)", lineHeight: 1.6, marginBottom: 10, maxHeight: 200, overflow: "auto", border: "1px solid var(--border)" }}>{item.text}</div>
                )}
                {item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--brand)", textDecoration: "none", marginBottom: 8 }}><Download size={11} /> File</a>}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {(item.tags || []).map((tag) => { const ct = CONTENT_TAGS.find((t) => t.id === tag); return ct ? <span key={tag} style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: ct.color + "12", color: ct.color }}>{ct.label}</span> : null; })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {isAdmin && <select value={item.status} onChange={(e) => { e.stopPropagation(); onUpdateStatus(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()} style={{ padding: "3px 6px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 9, color: "var(--text-primary)", outline: "none" }}>
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>}
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete?")) onDelete(item.id); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", opacity: 0.5 }}>✕</button>}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 6 }}>by {item.submitted_by} · {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



export function BrandAssetManagement({ isAdmin }) {
  const [touchpoints, setTouchpoints] = useState([]);
  const [changelog, setChangelog] = useState([]);
  const [versionedAssets, setVersionedAssets] = useState([]);
  const [updateCampaigns, setUpdateCampaigns] = useState([]);
  const [showAddTp, setShowAddTp] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showLogChange, setShowLogChange] = useState(null);
  const [showUploadVersion, setShowUploadVersion] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(null);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [tpForm, setTpForm] = useState({ name: "", category: "social", elements: "", admin_url: "", status: "up_to_date", tags: [] });
  const [logForm, setLogForm] = useState({ description: "", user_name: "" });
  const [assetForm, setAssetForm] = useState({ name: "", type: "brochure", version: "1.0", notes: "" });
  const [versionForm, setVersionForm] = useState({ version: "", notes: "" });
  const [campaignForm, setCampaignForm] = useState({ description: "" });
  const [assetFile, setAssetFile] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("touchpoints");
  const [tagInput, setTagInput] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const assetFileRef = useRef(null);
  const versionFileRef = useRef(null);

  const CATEGORIES = [
    { id: "social", label: "Social Media", icon: "📱" },
    { id: "reviews", label: "Review Sites", icon: "⭐" },
    { id: "internal", label: "Internal Tools", icon: "🔧" },
    { id: "web", label: "Website Pages", icon: "🌐" },
    { id: "print", label: "Print & Physical", icon: "🖨" },
    { id: "email", label: "Email & Comms", icon: "✉" },
    { id: "other", label: "Other", icon: "📌" },
  ];
  const STATUSES = [
    { id: "up_to_date", label: "Up to Date", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
    { id: "needs_update", label: "Needs Updating", color: "#ca8a04", bg: "rgba(202,138,4,0.08)" },
    { id: "outdated", label: "Outdated", color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  ];
  const ASSET_TYPES = [
    { id: "brochure", label: "Brochure", icon: "📄" },
    { id: "one_pager", label: "One-Pager", icon: "📋" },
    { id: "flyer", label: "Flyer", icon: "📰" },
    { id: "poster", label: "Poster", icon: "🪧" },
    { id: "presentation", label: "Presentation", icon: "📊" },
    { id: "template", label: "Template", icon: "📐" },
    { id: "letterhead", label: "Letterhead", icon: "📝" },
    { id: "guidelines", label: "Guidelines", icon: "📖" },
    { id: "other", label: "Other", icon: "📦" },
  ];

  useEffect(() => {
    async function load() {
      for (const key of ["brand_touchpoints", "brand_changelog", "brand_versioned_assets", "brand_update_campaigns"]) {
        const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
        if (data?.value) { try { const p = JSON.parse(data.value); if (key === "brand_touchpoints") setTouchpoints(p); if (key === "brand_changelog") setChangelog(p); if (key === "brand_versioned_assets") setVersionedAssets(p); if (key === "brand_update_campaigns") setUpdateCampaigns(p); } catch {} }
      }
      setLoading(false);
    }
    load();
  }, []);

  const saveData = async (key, data) => { const val = JSON.stringify(data); const { data: ex } = await supabase.from("app_settings").select("key").eq("key", key).maybeSingle(); if (ex) await supabase.from("app_settings").update({ value: val }).eq("key", key); else await supabase.from("app_settings").insert({ key, value: val }); };
  const saveTp = (l) => { setTouchpoints(l); saveData("brand_touchpoints", l); };
  const saveCl = (l) => { setChangelog(l); saveData("brand_changelog", l); };
  const saveAs = (l) => { setVersionedAssets(l); saveData("brand_versioned_assets", l); };
  const saveCa = (l) => { setUpdateCampaigns(l); saveData("brand_update_campaigns", l); };

  // All unique tags across touchpoints
  const allTags = [...new Set(touchpoints.flatMap((tp) => tp.tags || []))].sort();

  // Touchpoint handlers
  const addTag = () => { if (tagInput.trim() && !tpForm.tags.includes(tagInput.trim())) { setTpForm({ ...tpForm, tags: [...tpForm.tags, tagInput.trim()] }); setTagInput(""); } };
  const addTouchpoint = () => { if (!tpForm.name.trim()) return; saveTp([...touchpoints, { id: Date.now().toString(), ...tpForm, name: tpForm.name.trim(), elements: tpForm.elements.trim(), admin_url: tpForm.admin_url.trim(), last_updated: null }]); setTpForm({ name: "", category: "social", elements: "", admin_url: "", status: "up_to_date", tags: [] }); setShowAddTp(false); };
  const updateTpStatus = (id, status) => saveTp(touchpoints.map((tp) => tp.id === id ? { ...tp, status, last_updated: status === "up_to_date" ? new Date().toISOString() : tp.last_updated } : tp));
  const deleteTp = (id) => saveTp(touchpoints.filter((tp) => tp.id !== id));

  const logChange = () => { if (!logForm.description.trim()) return; const tp = touchpoints.find((t) => t.id === showLogChange); saveCl([{ id: Date.now().toString(), touchpoint_id: showLogChange, touchpoint_name: tp?.name || "Unknown", description: logForm.description.trim(), user_name: logForm.user_name.trim() || "Admin", date: new Date().toISOString() }, ...changelog].slice(0, 200)); if (tp) saveTp(touchpoints.map((t) => t.id === showLogChange ? { ...t, status: "up_to_date", last_updated: new Date().toISOString() } : t)); setLogForm({ description: "", user_name: "" }); setShowLogChange(null); };

  // Versioned assets
  const addAsset = async () => { if (!assetForm.name.trim() || !assetFile) return; setUploading(true); const path = "brand-assets/" + Date.now() + "-" + assetFile.name.replace(/\s+/g, "-"); const { error } = await supabase.storage.from("ticket-attachments").upload(path, assetFile); if (error) { setUploading(false); return; } const { data: u } = supabase.storage.from("ticket-attachments").getPublicUrl(path); saveAs([...versionedAssets, { id: Date.now().toString(), name: assetForm.name.trim(), type: assetForm.type, current_version: assetForm.version.trim() || "1.0", current_file: u.publicUrl, current_notes: assetForm.notes.trim(), updated_at: new Date().toISOString(), versions: [{ version: assetForm.version.trim() || "1.0", file: u.publicUrl, notes: assetForm.notes.trim() || "Initial version", date: new Date().toISOString() }] }]); setAssetForm({ name: "", type: "brochure", version: "1.0", notes: "" }); setAssetFile(null); setShowAddAsset(false); setUploading(false); if (assetFileRef.current) assetFileRef.current.value = ""; };

  const uploadNewVersion = async (assetId) => { if (!versionForm.version.trim() || !versionFile) return; setUploading(true); const path = "brand-assets/" + Date.now() + "-" + versionFile.name.replace(/\s+/g, "-"); const { error } = await supabase.storage.from("ticket-attachments").upload(path, versionFile); if (error) { setUploading(false); return; } const { data: u } = supabase.storage.from("ticket-attachments").getPublicUrl(path); const nv = { version: versionForm.version.trim(), file: u.publicUrl, notes: versionForm.notes.trim(), date: new Date().toISOString() }; const asset = versionedAssets.find((a) => a.id === assetId); saveAs(versionedAssets.map((a) => a.id === assetId ? { ...a, current_version: nv.version, current_file: nv.file, current_notes: nv.notes, updated_at: nv.date, versions: [nv, ...(a.versions || [])] } : a)); if (asset) saveCl([{ id: Date.now().toString(), touchpoint_id: assetId, touchpoint_name: asset.name, description: "Updated to v" + nv.version + (nv.notes ? ": " + nv.notes : ""), user_name: "Admin", date: new Date().toISOString() }, ...changelog].slice(0, 200)); setVersionForm({ version: "", notes: "" }); setVersionFile(null); setShowUploadVersion(null); setUploading(false); };

  // Update campaigns
  const createCampaign = (tagName) => {
    const affected = touchpoints.filter((tp) => (tp.tags || []).includes(tagName));
    if (affected.length === 0) return;
    const campaign = { id: Date.now().toString(), tag: tagName, description: campaignForm.description.trim() || tagName + " has been updated", created: new Date().toISOString(), items: affected.map((tp) => ({ id: tp.id, name: tp.name, done: false })), completed: false };
    saveCa([campaign, ...updateCampaigns]);
    setCampaignForm({ description: "" }); setShowCreateCampaign(null);
  };
  const toggleCampaignItem = (campaignId, itemId) => saveCa(updateCampaigns.map((c) => c.id === campaignId ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, done: !i.done } : i) } : c));
  const completeCampaign = (campaignId) => { saveCa(updateCampaigns.map((c) => c.id === campaignId ? { ...c, completed: true } : c)); const camp = updateCampaigns.find((c) => c.id === campaignId); if (camp) { camp.items.forEach((item) => { if (item.done) updateTpStatus(item.id, "up_to_date"); }); } };

  const upToDate = touchpoints.filter((t) => t.status === "up_to_date").length;
  const needsAttention = touchpoints.length - upToDate;
  const activeCampaigns = updateCampaigns.filter((c) => !c.completed);
  const grouped = {}; touchpoints.forEach((tp) => { if (!grouped[tp.category]) grouped[tp.category] = []; grouped[tp.category].push(tp); });

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>;

  const renderTouchpoint = (tp) => {
    const st = STATUSES.find((s) => s.id === tp.status) || STATUSES[0];
    const lastUp = tp.last_updated ? new Date(tp.last_updated) : null;
    const stale = lastUp ? Math.floor((Date.now() - lastUp.getTime()) / 86400000) > 180 : false;
    return (
      <div key={tp.id} style={{ background: "var(--bg-card)", borderLeft: "4px solid " + st.color, borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>{tp.name}{stale && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 20, background: "rgba(202,138,4,0.08)", color: "#ca8a04" }}>6+ months</span>}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{tp.elements && <span>{tp.elements} · </span>}{lastUp ? "Updated " + lastUp.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never updated"}</div>
            {(tp.tags || []).length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>{tp.tags.map((tag) => <span key={tag} onClick={() => { setTab("tags"); setSelectedTag(tag); }} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 600, background: "rgba(139,92,246,0.08)", color: "#8b5cf6", cursor: "pointer" }}>{tag}</span>)}</div>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
          {tp.admin_url && <a href={tp.admin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--brand)", textDecoration: "none", fontWeight: 600 }}><ExternalLink size={11} style={{display:"inline",verticalAlign:"-1px"}} /> Admin</a>}
          {isAdmin && <button onClick={() => setShowLogChange(tp.id)} style={{ padding: "4px 10px", background: "var(--brand-light)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 5, color: "var(--brand)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Log</button>}
          {isAdmin && <select value={tp.status} onChange={(e) => updateTpStatus(tp.id, e.target.value)} style={{ padding: "4px 6px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10, color: "var(--text-primary)", outline: "none" }}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}
          {isAdmin && <button onClick={() => { if (window.confirm("Remove?")) deleteTp(tp.id); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", opacity: 0.4 }}>✕</button>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <PageHeader icon={<Target size={22} />} title="Brand Asset Management" subtitle="Track where the Alps brand lives and keep it consistent" gradient="linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)" />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[{ label: "Touchpoints", value: touchpoints.length, color: "var(--brand)" }, { label: "Up to Date", value: upToDate, color: "#16a34a" }, { label: "Need Attention", value: needsAttention, color: needsAttention > 0 ? "#ca8a04" : "#16a34a" }, { label: "Active Campaigns", value: activeCampaigns.length, color: activeCampaigns.length > 0 ? "#dc2626" : "#16a34a" }].map((s) => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--bg-card)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
        {[{ id: "touchpoints", label: "Touchpoints" }, { id: "tags", label: "Tags (" + allTags.length + ")" }, { id: "campaigns", label: "Updates" + (activeCampaigns.length > 0 ? " (" + activeCampaigns.length + ")" : "") }, { id: "assets", label: "Versioned Assets" }, { id: "changelog", label: "Log" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 6, border: "none", background: tab === t.id ? "var(--brand)" : "transparent", color: tab === t.id ? "#fff" : "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>

      {/* Modals */}
      {showLogChange && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLogChange(null)}><div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: 14, padding: 24, width: 400, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Log a Change</h3>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>{touchpoints.find((t) => t.id === showLogChange)?.name}</div>
        <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>What was updated?</label><input value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} placeholder="e.g. Updated logo" onKeyDown={(e) => e.key === "Enter" && logChange()} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
        <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Updated by</label><input value={logForm.user_name} onChange={(e) => setLogForm({ ...logForm, user_name: e.target.value })} placeholder="Your name" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => setShowLogChange(null)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>Cancel</button><button onClick={logChange} disabled={!logForm.description.trim()} style={{ padding: "8px 18px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: logForm.description.trim() ? 1 : 0.4 }}>Log & Mark Updated</button></div>
      </div></div>)}

      {showUploadVersion && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowUploadVersion(null)}><div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Upload New Version</h3>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>{versionedAssets.find((a) => a.id === showUploadVersion)?.name} (v{versionedAssets.find((a) => a.id === showUploadVersion)?.current_version})</div>
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, marginBottom: 12 }}><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Version</label><input value={versionForm.version} onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })} placeholder="e.g. 2.0" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>What changed?</label><input value={versionForm.notes} onChange={(e) => setVersionForm({ ...versionForm, notes: e.target.value })} placeholder="e.g. Updated logo, new pricing" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div></div>
        <div style={{ marginBottom: 16 }}><label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}><Upload size={13} /> {versionFile ? versionFile.name : "Choose file"}<input ref={versionFileRef} type="file" onChange={(e) => setVersionFile(e.target.files[0] || null)} style={{ display: "none" }} /></label></div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => { setShowUploadVersion(null); setVersionFile(null); setVersionForm({ version: "", notes: "" }); }} style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button><button onClick={() => uploadNewVersion(showUploadVersion)} disabled={!versionForm.version.trim() || !versionFile || uploading} style={{ padding: "8px 18px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: versionForm.version.trim() && versionFile ? 1 : 0.4 }}>{uploading ? "Uploading..." : "Upload"}</button></div>
      </div></div>)}

      {showCreateCampaign && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreateCampaign(null)}><div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: 14, padding: 24, width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Create Update Campaign</h3>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Something tagged <strong style={{ color: "#8b5cf6" }}>"{showCreateCampaign}"</strong> has changed.</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>{touchpoints.filter((tp) => (tp.tags || []).includes(showCreateCampaign)).length} touchpoints will need updating.</div>
        <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>What changed?</label><input value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} placeholder={"e.g. " + showCreateCampaign + " information has been updated"} onKeyDown={(e) => e.key === "Enter" && createCampaign(showCreateCampaign)} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Touchpoints to update:</div>
          {touchpoints.filter((tp) => (tp.tags || []).includes(showCreateCampaign)).map((tp) => <div key={tp.id} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0" }}>• {tp.name}</div>)}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => setShowCreateCampaign(null)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button><button onClick={() => createCampaign(showCreateCampaign)} style={{ padding: "8px 18px", background: "#dc2626", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create Update Campaign</button></div>
      </div></div>)}

      {/* TOUCHPOINTS */}
      {tab === "touchpoints" && (<>
        {isAdmin && <button onClick={() => setShowAddTp(!showAddTp)} style={{ padding: "8px 16px", background: showAddTp ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showAddTp ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>{showAddTp ? "Cancel" : "+ Add Touchpoint"}</button>}
        {showAddTp && isAdmin && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Platform / Page *</label><input value={tpForm.name} onChange={(e) => setTpForm({ ...tpForm, name: e.target.value })} placeholder="e.g. Feefo, Website – Homepage" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Category</label><select value={tpForm.category} onChange={(e) => setTpForm({ ...tpForm, category: e.target.value })} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Brand Elements</label><input value={tpForm.elements} onChange={(e) => setTpForm({ ...tpForm, elements: e.target.value })} placeholder="e.g. Logo, Description, Banner" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Admin URL</label><input value={tpForm.admin_url} onChange={(e) => setTpForm({ ...tpForm, admin_url: e.target.value })} placeholder="https://..." style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Tags (what brand elements/info does this contain?)</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>{tpForm.tags.map((t) => <span key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "rgba(139,92,246,0.08)", color: "#8b5cf6", fontSize: 11, fontWeight: 600 }}>{t}<button onClick={() => setTpForm({ ...tpForm, tags: tpForm.tags.filter((x) => x !== t) })} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button></span>)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="e.g. Logo, Motor Legal Protection" list="existing-tags" style={{ flex: 1, padding: "6px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text-primary)", outline: "none" }} />
                <datalist id="existing-tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
                <button onClick={addTag} disabled={!tagInput.trim()} style={{ padding: "6px 12px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: tagInput.trim() ? 1 : 0.4 }}>Add Tag</button>
              </div>
            </div>
            <button onClick={addTouchpoint} disabled={!tpForm.name.trim()} style={{ padding: "8px 20px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: tpForm.name.trim() ? 1 : 0.4 }}>Add Touchpoint</button>
          </div>
        )}
        {Object.entries(grouped).map(([catId, items]) => { const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[6]; return (<div key={catId} style={{ marginBottom: 20 }}><div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span>{cat.icon}</span> {cat.label} ({items.length})</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{items.map(renderTouchpoint)}</div></div>); })}
        {touchpoints.length === 0 && <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><Target size={36} style={{ opacity: 0.2, marginBottom: 12 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>No touchpoints yet</div></div>}
      </>)}

      {/* TAGS VIEW */}
      {tab === "tags" && (
        allTags.length === 0 ? <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 15, fontWeight: 600 }}>No tags yet</div><div style={{ fontSize: 13, marginTop: 4 }}>Add tags to touchpoints to see them here.</div></div> : (<>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {allTags.map((tag) => { const count = touchpoints.filter((tp) => (tp.tags || []).includes(tag)).length; return (
              <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid " + (selectedTag === tag ? "#8b5cf6" : "var(--border)"), background: selectedTag === tag ? "rgba(139,92,246,0.08)" : "var(--bg-card)", color: selectedTag === tag ? "#8b5cf6" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tag} <span style={{ opacity: 0.6 }}>({count})</span></button>
            ); })}
          </div>
          {selectedTag && (<>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div><div style={{ fontSize: 16, fontWeight: 800, color: "#8b5cf6" }}>{selectedTag}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Used by {touchpoints.filter((tp) => (tp.tags || []).includes(selectedTag)).length} touchpoints</div></div>
              {isAdmin && <button onClick={() => setShowCreateCampaign(selectedTag)} style={{ padding: "8px 16px", background: "#dc2626", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>This Has Changed →</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{touchpoints.filter((tp) => (tp.tags || []).includes(selectedTag)).map(renderTouchpoint)}</div>
          </>)}
          {!selectedTag && <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: 13 }}>Select a tag to see all touchpoints that use it</div>}
        </>)
      )}

      {/* UPDATE CAMPAIGNS */}
      {tab === "campaigns" && (
        updateCampaigns.length === 0 ? <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 15, fontWeight: 600 }}>No update campaigns</div><div style={{ fontSize: 13, marginTop: 4 }}>When a tagged element changes, create an update campaign from the Tags tab to track what needs updating.</div></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {updateCampaigns.map((camp) => { const done = camp.items.filter((i) => i.done).length; const total = camp.items.length; const pct = Math.round(done / total * 100); return (
              <div key={camp.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", opacity: camp.completed ? 0.5 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div><div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{camp.description || camp.tag + " update"}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8 }}><span style={{ fontWeight: 600, color: "#8b5cf6" }}>{camp.tag}</span><span>{new Date(camp.created).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: pct === 100 ? "#16a34a" : pct > 50 ? "#ca8a04" : "#dc2626" }}>{pct}%</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>{done}/{total}</div></div>
                </div>
                <div style={{ background: "var(--bg-input)", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 14 }}><div style={{ height: "100%", background: pct === 100 ? "#16a34a" : pct > 50 ? "#ca8a04" : "#dc2626", borderRadius: 6, width: pct + "%", transition: "width 0.3s" }}></div></div>
                {!camp.completed && <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  {camp.items.map((item) => (
                    <div key={item.id} onClick={() => toggleCampaignItem(camp.id, item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: item.done ? "rgba(22,163,74,0.04)" : "var(--bg-input)", border: "1px solid " + (item.done ? "rgba(22,163,74,0.15)" : "var(--border)"), borderRadius: 8, cursor: "pointer" }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: item.done ? "#16a34a" : "var(--bg-card)", border: "2px solid " + (item.done ? "#16a34a" : "var(--border)"), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0 }}>{item.done ? "✓" : ""}</span>
                      <span style={{ fontSize: 13, color: item.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none" }}>{item.name}</span>
                    </div>
                  ))}
                </div>}
                {!camp.completed && pct === 100 && <button onClick={() => completeCampaign(camp.id)} style={{ padding: "8px 18px", background: "#16a34a", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Mark Campaign Complete</button>}
                {camp.completed && <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>✓ Completed</div>}
              </div>
            ); })}
          </div>
        )
      )}

      {/* VERSIONED ASSETS */}
      {tab === "assets" && (<>
        {isAdmin && <button onClick={() => setShowAddAsset(!showAddAsset)} style={{ padding: "8px 16px", background: showAddAsset ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showAddAsset ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>{showAddAsset ? "Cancel" : "+ Add Asset"}</button>}
        {showAddAsset && isAdmin && (<div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10, marginBottom: 12 }}><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Asset Name *</label><input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="e.g. Motor Insurance Brochure" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Type</label><select value={assetForm.type} onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}>{ASSET_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></div><div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Version</label><input value={assetForm.version} onChange={(e) => setAssetForm({ ...assetForm, version: e.target.value })} placeholder="1.0" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div></div><div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Notes</label><input value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} placeholder="e.g. Initial release" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}><Upload size={13} /> {assetFile ? assetFile.name : "Choose file *"}<input ref={assetFileRef} type="file" onChange={(e) => setAssetFile(e.target.files[0] || null)} style={{ display: "none" }} /></label><button onClick={addAsset} disabled={!assetForm.name.trim() || !assetFile || uploading} style={{ padding: "8px 20px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: assetForm.name.trim() && assetFile ? 1 : 0.4 }}>{uploading ? "Uploading..." : "Add Asset"}</button></div></div>)}
        {versionedAssets.length === 0 ? <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 15, fontWeight: 600 }}>No versioned assets yet</div></div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {versionedAssets.map((asset) => { const at = ASSET_TYPES.find((t) => t.id === asset.type) || ASSET_TYPES[8]; const isExp = expandedAsset === asset.id; return (
              <div key={asset.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 24 }}>{at.icon}</span><div><div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{asset.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{at.label}</div></div></div><span style={{ fontSize: 13, fontWeight: 800, color: "#8b5cf6", background: "rgba(139,92,246,0.08)", padding: "3px 10px", borderRadius: 20 }}>v{asset.current_version}</span></div>
                  {asset.current_notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{asset.current_notes}</div>}
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>Updated {new Date(asset.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  <div style={{ display: "flex", gap: 6 }}><a href={asset.current_file} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "8px", background: "var(--brand)", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Download size={12} /> Download</a>{isAdmin && <button onClick={() => setShowUploadVersion(asset.id)} style={{ padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>New Ver.</button>}</div>
                </div>
                {asset.versions && asset.versions.length > 1 && <div style={{ borderTop: "1px solid var(--border)" }}><button onClick={() => setExpandedAsset(isExp ? null : asset.id)} style={{ width: "100%", padding: "8px 18px", background: "var(--bg-input)", border: "none", color: "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>{isExp ? "▼" : "▶"} History ({asset.versions.length})</button>{isExp && <div style={{ padding: "0 18px 14px" }}>{asset.versions.map((v, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < asset.versions.length - 1 ? "1px solid var(--border)" : "none" }}><span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#8b5cf6" : "var(--text-muted)", minWidth: 36 }}>v{v.version}</span><div style={{ flex: 1, fontSize: 11, color: "var(--text-secondary)" }}>{v.notes || "—"}</div><span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(v.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span><a href={v.file} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--brand)", textDecoration: "none", fontWeight: 600 }}>DL</a></div>)}</div>}</div>}
                {isAdmin && <div style={{ borderTop: "1px solid var(--border)", padding: "6px 18px", textAlign: "right" }}><button onClick={() => { if (window.confirm("Delete?")) saveAs(versionedAssets.filter((a) => a.id !== asset.id)); }} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 10, cursor: "pointer", opacity: 0.5 }}>Delete</button></div>}
              </div>); })}
          </div>
        )}
      </>)}

      {/* CHANGELOG */}
      {tab === "changelog" && (changelog.length === 0 ? <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}><div style={{ fontSize: 15, fontWeight: 600 }}>No changes logged yet</div></div> : (
        <div style={{ position: "relative", paddingLeft: 24 }}><div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "var(--border)" }}></div>
          {changelog.map((entry) => <div key={entry.id} style={{ position: "relative", marginBottom: 14 }}><div style={{ position: "absolute", left: -20, top: 4, width: 10, height: 10, borderRadius: 5, background: "#16a34a", border: "2px solid var(--bg-main)" }}></div><div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{entry.description}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 8 }}><span style={{ fontWeight: 600, color: "var(--brand)" }}>{entry.touchpoint_name}</span><span>by {entry.user_name}</span><span>{new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div></div></div>)}
        </div>
      ))}
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
    { key: "all", label: "All", icon: "🖼" },
    { key: "general", label: "General", icon: "📷" },
    { key: "events", label: "Events", icon: "🎉" },
    { key: "products", label: "Products", icon: "📦" },
    { key: "team", label: "Team", icon: "👥" },
    { key: "social", label: "Social Media", icon: "📱" },
    { key: "branding", label: "Branding", icon: "🎨" },
    { key: "office", label: "Office", icon: "🏢" },
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
          <PageHeader icon={<Image size={22} />} title="Alps Gallery" subtitle="Browse and download Alps team photos" gradient="linear-gradient(135deg, #115e59 0%, #20A39E 100%)" />
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Browse and download photos. Click any image to save it.</p>
        </div>
        <div style={{ position: "relative", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
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
              {uploading ? "Uploading..." : "Upload Images"}
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
              <div key={img.id} className="hub-card-hover hub-gallery-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => downloadImage(img)}>
                <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "var(--bg-input)" }}>
                  <img src={img.url} alt={img.filename} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }} onMouseOver={(e) => e.target.style.transform = "scale(1.05)"} onMouseOut={(e) => e.target.style.transform = "scale(1)"} />
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{img.caption || img.filename}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: cat.key === "all" ? "var(--text-muted)" : "var(--text-secondary)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{cat.icon} {cat.label}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}><Download size={12} /></span>
                  </div>
                </div>
                {isAdmin && (
                  <button className="hub-gallery-delete" onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this image?")) onDelete(img.id, img.storage_path); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 6, background: "rgba(220,38,38,0.85)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}><Trash2 size={14} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

