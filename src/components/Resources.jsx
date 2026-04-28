import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import jsPDF from "jspdf";
import { PRIORITIES, STATUS, ARCHIVE_TYPES, LEAD_SOURCES, BRAND_COLORS, formatDate, renderMarkdown, daysUntil, highlightText } from "../constants.js";
import { Library, TrendingUp, Palette, Image, CalendarDays, Briefcase, Target, FileText, BookOpen, Search, FolderOpen, Video, Upload, Plus, Pencil, Trash2, Copy, Download, ChevronDown, ExternalLink, Filter, Grid3X3, List, Tag, Star } from "lucide-react";
import { PageHeader } from "./UI.jsx";

export function MarketingArchive({ entries, isAdmin, onManage }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const campaigns = [...new Set(entries.map((e) => e.campaign).filter(Boolean))].sort();
  const allTags = [...new Set(entries.flatMap((e) => e.tags || []))].sort();
  const PERF_BADGE = { strong: { label: "Strong", color: "#16a34a", bg: "rgba(22,163,74,0.1)" }, average: { label: "Average", color: "#ca8a04", bg: "rgba(202,138,4,0.1)" }, weak: { label: "Weak", color: "#dc2626", bg: "rgba(220,38,38,0.1)" } };

  const filtered = entries.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (campaignFilter !== "all" && (e.campaign || "") !== campaignFilter) return false;
    if (tagFilter && !(e.tags || []).includes(tagFilter)) return false;
    if (dateFrom) { const d = new Date(e.date || e.created_at); if (d < new Date(dateFrom + "T00:00:00")) return false; }
    if (dateTo) { const d = new Date(e.date || e.created_at); if (d > new Date(dateTo + "T23:59:59")) return false; }
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

  const [previewId, setPreviewId] = useState(null);
  const previewTimer = useRef(null);
  const showPreview = (id) => { previewTimer.current = setTimeout(() => setPreviewId(id), 400); };
  const hidePreview = () => { clearTimeout(previewTimer.current); setPreviewId(null); };

  const renderEntry = (entry) => {
    const t = ARCHIVE_TYPES[entry.type] || ARCHIVE_TYPES.other;
    const perf = PERF_BADGE[entry.performance];
    return (
      <div key={entry.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid " + t.color, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s", cursor: "default", position: "relative" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = t.color; showPreview(entry.id); }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.borderLeftColor = t.color; hidePreview(); }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: search.trim() ? highlightText(entry.title, search) : entry.title }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: t.color }}>{t.label}</span>
            <span>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {entry.campaign && <span style={{ padding: "1px 6px", borderRadius: 4, background: "var(--brand-light)", color: "var(--brand)", fontWeight: 600 }}>{entry.campaign}</span>}
            {perf && <span style={{ padding: "1px 6px", borderRadius: 4, background: perf.bg, color: perf.color, fontWeight: 600 }}>{perf.label}</span>}
            {entry.tags && entry.tags.length > 0 && entry.tags.map((tag) => <span key={tag} style={{ padding: "1px 6px", borderRadius: 4, background: "var(--bg-input)", color: "var(--text-muted)" }}>{tag}</span>)}
          </div>
        </div>
        {entry.file_url && <a href={entry.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "6px 12px", background: "rgba(22,163,74,0.08)", border: "none", borderRadius: 6, color: "#16a34a", fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}><Download size={12} style={{display:"inline",verticalAlign:"-1px"}} /> File</a>}
        {entry.link && <a href={entry.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "6px 12px", background: "var(--brand-light)", border: "none", borderRadius: 6, color: "var(--brand)", fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}><ExternalLink size={12} style={{display:"inline",verticalAlign:"-1px"}} /> Link</a>}
        {isAdmin && <button onClick={() => onManage(entry.id)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Edit</button>}
        {previewId === entry.id && entry.description && (
          <div style={{ position: "absolute", left: 60, top: "100%", marginTop: 4, zIndex: 80, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: "12px 16px", maxWidth: 360, minWidth: 200, animation: "fadeInScale 0.12s ease" }}>
            <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.6, maxHeight: 120, overflow: "hidden" }}>{entry.description}</div>
            {entry.files && entry.files.length > 0 && entry.files[0].match(/\.(png|jpg|jpeg|webp|gif)$/i) && (
              <img src={entry.files[0]} alt="" style={{ width: "100%", maxHeight: 100, objectFit: "cover", borderRadius: 6, marginTop: 8, border: "1px solid var(--border)" }} />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      <PageHeader icon={<Library size={22} color="#20A39E" />} title="Marketing Archive" subtitle={entries.length + " pieces catalogued"} action={isAdmin && <button onClick={() => onManage()} style={{ padding: "9px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Plus size={14} style={{ display: "inline", marginRight: 4 }} />Add Entry</button>} />
      <div className="hub-filter-row" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}><Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search archive..." style={{ width: "100%", padding: "9px 14px 9px 36px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
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
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "6px 8px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 11, outline: "none" }} title="From date" />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "6px 8px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 11, outline: "none" }} title="To date" />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding: "4px 8px", background: "none", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", fontSize: 10, cursor: "pointer" }}>Clear</button>}
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", borderRadius: 6, padding: 2, border: "1px solid var(--border)" }}>
          <button onClick={() => setViewMode("list")} style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "list" ? "var(--brand)" : "transparent", color: viewMode === "list" ? "#fff" : "var(--text-muted)", fontSize: 14 }}>{"☰"}</button>
          <button onClick={() => setViewMode("grid")} style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "grid" ? "var(--brand)" : "transparent", color: viewMode === "grid" ? "#fff" : "var(--text-muted)", fontSize: 14 }}>{"\u25A6"}</button>
        </div>
      </div>
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, padding: "4px 0", marginRight: 4 }}>Tags:</span>
          {tagFilter && <button onClick={() => setTagFilter("")} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid var(--brand)", background: "var(--brand-light)", color: "var(--brand)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All ×</button>}
          {allTags.map((tag) => {
            const count = entries.filter((e) => (e.tags || []).includes(tag)).length;
            return <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid " + (tagFilter === tag ? "var(--brand)" : "var(--border)"), background: tagFilter === tag ? "var(--brand)" : "var(--bg-card)", color: tagFilter === tag ? "#fff" : "var(--text-secondary)", fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>{tag} <span style={{ opacity: 0.6 }}>({count})</span></button>;
          })}
        </div>
      )}
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
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: search.trim() ? highlightText(entry.title, search) : entry.title }}></div>
              {entry.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.description}</div>}
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(entry.date || entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>{isAdmin && <button onClick={() => onManage(entry.id)} style={{ fontSize: 11, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", color: "var(--text-muted)" }}>Edit</button>}</div>
            </div>); })}
        </div>
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
      <PageHeader icon={<TrendingUp size={22} color="#20A39E" />} title="Log an Inbound Lead" subtitle="Record details of an inbound marketing lead" />
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Alps brand colours, typography, logos, and icons.</p>
        <button onClick={downloadBrandPack} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}><Download size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Download Brand Pack</button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ id: "brand-colours", label: "Colours", icon: "🎨" }, { id: "brand-typography", label: "Typography", icon: "Aa" }, { id: "brand-logos", label: "Logos & Icons", icon: "◆" }, { id: "brand-videos", label: "Video Backgrounds", icon: "▶" }, { id: "brand-templates", label: "Templates", icon: "📄" }, { id: "brand-signatures", label: "Signatures", icon: "✉" }].map((s) => (
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
    </div>
  );
}


export function BrokerToolkit({ items, isAdmin, onSave, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", product: "general", type: "one_pager", description: "", file_url: "" });
  const [editing, setEditing] = useState(null);

  const PRODUCTS = [
    { key: "all", label: "All", icon: "📦" },
    { key: "general", label: "General", icon: "📋" },
    { key: "alps", label: "Alps", icon: "⛰" },
    { key: "motor", label: "Motor", icon: "🚗" },
    { key: "commercial", label: "Commercial", icon: "🏢" },
    { key: "let", label: "Let", icon: "🏠" },
    { key: "personal", label: "Personal", icon: "👤" },
  ];

  const ASSET_TYPES = {
    one_pager: { label: "One-Pager", icon: "📄" },
    email_copy: { label: "Email Copy", icon: "✉" },
    social_pack: { label: "Social Pack", icon: "📱" },
    flyer: { label: "Flyer / Print", icon: "🖨" },
    presentation: { label: "Presentation", icon: "📊" },
    guide: { label: "Guide / PDF", icon: "📖" },
    other: { label: "Other", icon: "📎" },
  };

  const filtered = items.filter((item) => filter === "all" || item.product === filter);
  const grouped = {};
  filtered.forEach((item) => {
    const key = item.product || "general";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const [showVersions, setShowVersions] = useState(null);

  const handleSave = () => {
    if (!form.title.trim()) return;
    // If editing and file_url changed, archive the previous version
    if (editing) {
      const existing = items.find((i) => i.id === editing);
      if (existing && existing.file_url && form.file_url !== existing.file_url) {
        const prevVersions = existing.previous_versions ? [...existing.previous_versions] : [];
        prevVersions.push({ file_url: existing.file_url, archived_at: new Date().toISOString() });
        onSave({ ...form, previous_versions: prevVersions, id: editing });
      } else {
        onSave({ ...form, id: editing });
      }
    } else {
      onSave({ ...form, previous_versions: [] });
    }
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
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{at.label}{item.updated_at && <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.7 }}>Updated {new Date(item.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}</div>
                            {item.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{item.description}</div>}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              {item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", background: "var(--brand)", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", transition: "all 0.15s" }}><Download size={11} /> Download</a>}
                              {(item.previous_versions || []).length > 0 && <button onClick={(e) => { e.stopPropagation(); setShowVersions(showVersions === item.id ? null : item.id); }} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 10, color: "var(--text-muted)", cursor: "pointer" }}>{item.previous_versions.length} older version{item.previous_versions.length !== 1 ? "s" : ""}</button>}
                              {isAdmin && <button onClick={() => startEdit(item)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>}
                              {isAdmin && <button onClick={() => { if (window.confirm("Delete \"" + item.title + "\"?")) onDelete(item.id); }} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", borderRadius: 6, fontSize: 11, color: "#dc2626", cursor: "pointer" }}>{"\u2715"}</button>}
                            </div>
                            {showVersions === item.id && (item.previous_versions || []).length > 0 && (
                              <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--bg-input)", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Previous Versions</div>
                                {item.previous_versions.map((v, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: i < item.previous_versions.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Archived {new Date(v.archived_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    <a href={v.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 600, color: "var(--brand)", textDecoration: "none" }}>Download</a>
                                  </div>
                                ))}
                              </div>
                            )}
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
          <PageHeader icon={<Image size={22} color="#20A39E" />} title="Alps Gallery" subtitle="Browse and download team photos" />
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

