import { useState, useRef, useEffect } from "react";
import { PRIORITIES, STATUS, STATUS_FALLBACK, SLA_TARGETS, TEMPLATES, getDueBadge, getSlaStatus, formatDate, renderMarkdown } from "../constants.js";
import { FileChip, FilePreview } from "./UI.jsx";

export function TicketForm({ onSubmit, currentUser, duplicateData, onClearDuplicate }) {
  const [form, setForm] = useState({ name: "", title: "", description: "", priority: "medium", deadline: "", files: [] });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileRef = useRef();
  useEffect(() => { if (currentUser?.name && !form.name) setForm((f) => ({ ...f, name: currentUser.name })); }, [currentUser]);
  useEffect(() => {
    if (duplicateData) {
      setForm((f) => ({ ...f, title: duplicateData.title || "", description: duplicateData.description || "", priority: duplicateData.priority || "medium", deadline: duplicateData.deadline || "" }));
      setShowAdvanced(true);
      if (onClearDuplicate) onClearDuplicate();
    }
  }, [duplicateData]);

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
    if (!currentUser && !form.name.trim()) e.name = "Name is required";
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
            <button key={i} onClick={() => { update("title", tmpl.title); update("description", tmpl.description); update("priority", tmpl.priority); }} style={{ padding: "10px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-body)", lineHeight: 1.3 }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--brand-light)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-input)"; }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{tmpl.icon}</div>
              {tmpl.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {currentUser ? (
          <div>
            <label style={labelStyle}>Submitting as</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 12, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>{currentUser.name?.charAt(0)?.toUpperCase()}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{currentUser.name}</span>
            </div>
          </div>
        ) : (
          <div>
        <label style={labelStyle}>Your Name *</label>
        <input style={inputStyle("name")} placeholder="e.g. Sarah Johnson" value={form.name} onChange={(e) => update("name", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = errors.name ? "#ef4444" : "var(--border)"; e.target.style.boxShadow = "none"; }} />
          </div>
        )}
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

      <button onClick={() => setShowAdvanced(!showAdvanced)} type="button" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--brand)" }}>
        {showAdvanced ? "▼" : "▶"} {showAdvanced ? "Hide options" : "Priority, deadline & attachments"}
      </button>
      {showAdvanced && <>
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
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            {"\u23F1"} Expected turnaround: <strong style={{ color: PRIORITIES[form.priority]?.color || "var(--text-primary)" }}>{SLA_TARGETS[form.priority]?.label || "N/A"}</strong>
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
        <button onClick={() => fileRef.current?.click()} style={{ padding: "10px 18px", background: "var(--bg-input)", border: "1px dashed var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, transition: "all 0.2s", width: "100%" }} onMouseOver={(e) => { e.target.style.background = "var(--brand-light)"; e.target.style.borderColor = "var(--brand)"; }} onMouseOut={(e) => { e.target.style.background = "var(--bg-input)"; e.target.style.borderColor = "var(--border)"; }}>
          {"\u{1F4CE}"} Click to attach files
        </button>
        {form.files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {form.files.map((f, i) => <FileChip key={i} name={f.name} onRemove={() => removeFile(i)} />)}
          </div>
        )}
      </div>

      </>}

      <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", padding: "13px", background: submitting ? "var(--brand)" : "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "wait" : "pointer", transition: "all 0.2s", letterSpacing: "0.02em", boxShadow: "0 4px 14px var(--brand-glow)" }} onMouseOver={(e) => { if (!submitting) { e.target.style.background = "var(--brand)"; e.target.style.boxShadow = "0 6px 20px var(--brand-glow)"; } }} onMouseOut={(e) => { e.target.style.background = "var(--brand)"; e.target.style.boxShadow = "0 4px 14px var(--brand-glow)"; }}>
        {submitting ? "Submitting\u2026" : "Submit Ticket \u2192"}
      </button>
    </div>
  );
}


export function TicketCard({ ticket, onStatusChange, onComplete, onAddNote, onDelete, onUpdatePriority, onUpdateDeadline, onReopen, onTogglePin, onDuplicate, onEditTicket, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState(currentUser?.name || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [timeSpent, setTimeSpent] = useState("");
  const [newDeadline, setNewDeadline] = useState(ticket.deadline || "");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: ticket.title, description: ticket.description });
  const p = PRIORITIES[ticket.priority];
  const s = STATUS[ticket.status] || STATUS_FALLBACK;
  const dueBadge = getDueBadge(ticket.deadline, ticket.status);
  const sla = getSlaStatus(ticket);
  const TIME_LABELS = { "15m": "15 min", "30m": "30 min", "1h": "1 hour", "2h": "2 hours", "half_day": "Half day", "full_day": "Full day", "multi_day": "Multi-day" };
  const today = new Date().toISOString().split("T")[0];

  const submitNote = () => {
    const author = currentUser?.name || noteName.trim();
    if (!noteText.trim() || !author) return;
    onAddNote(ticket.id, author, noteText.trim());
    setNoteText("");
    if (!currentUser) setNoteName("");
  };

  const saveEdit = () => {
    if (!editForm.title.trim()) return;
    onEditTicket(ticket.id, { title: editForm.title.trim(), description: editForm.description.trim() });
    setEditing(false);
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
            {sla && sla.active && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: sla.breached ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)", color: sla.breached ? "#dc2626" : "#16a34a", border: "1px solid " + (sla.breached ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)") }}>{sla.breached ? "\u23F0 SLA breached" : "\u23F1 " + Math.round(sla.pct * 100) + "% of " + sla.label}</span>}
            {sla && sla.met !== undefined && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: sla.met ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", color: sla.met ? "#16a34a" : "#dc2626" }}>{sla.met ? "\u2713 SLA met" : "\u2717 SLA missed"}</span>}
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
          {editing ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Title</label>
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={saveEdit} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{"\u2713"} Save Changes</button>
                <button onClick={() => { setEditing(false); setEditForm({ title: ticket.title, description: ticket.description }); }} style={{ padding: "7px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(ticket.description) }}></div>
          )}

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

          <FilePreview files={ticket.files} />

          {ticket.notes && ticket.notes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comments</div>
              <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
              {ticket.notes.map((note, i) => (
                <div key={i} style={{ background: note.auto ? "var(--brand-light)" : "var(--bg-input)", border: "1px solid " + (note.auto ? "rgba(35,29,104,0.1)" : "var(--border)"), borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {!note.auto && <span style={{ width: 22, height: 22, borderRadius: 11, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{note.author?.charAt(0)?.toUpperCase() || "?"}</span>}
                    {note.auto && <span style={{ fontSize: 12 }}>{"\u2699\uFE0F"}</span>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: note.auto ? "#6366f1" : "var(--brand)" }}>{note.author}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(note.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5, fontStyle: note.auto ? "italic" : "normal" }}>{note.text}</p>
                </div>
              ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {currentUser ? (
                <span style={{ width: 34, height: 34, borderRadius: 17, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{currentUser.name?.charAt(0)?.toUpperCase()}</span>
              ) : (
                <input value={noteName} onChange={(e) => setNoteName(e.target.value)} placeholder="Your name" style={{ width: 130, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", flexShrink: 0 }} />
              )}
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }} style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
              <button onClick={submitNote} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                Send
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
                {ticket.status === "in_progress" && (
                  <button onClick={() => onStatusChange(ticket.id, "review")} style={{ padding: "8px 16px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 8, color: "#8b5cf6", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(139,92,246,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(139,92,246,0.1)"}>
                    {"\u{1F50D}"} Send for Review
                  </button>
                )}
                {ticket.status === "review" && (
                  <button onClick={() => onStatusChange(ticket.id, "in_progress")} style={{ padding: "8px 16px", background: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.25)", borderRadius: 8, color: "#0284c7", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(2,132,199,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(2,132,199,0.1)"}>
                    {"\u21A9"} Back to Progress
                  </button>
                )}
                <select value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} style={{ padding: "8px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-secondary)", outline: "none", cursor: "pointer" }}><option value="">Time spent?</option><option value="15m">15 min</option><option value="30m">30 min</option><option value="1h">1 hour</option><option value="2h">2 hours</option><option value="half_day">Half day</option><option value="full_day">Full day</option><option value="multi_day">Multi-day</option></select>
                <button onClick={() => onComplete(ticket.id, timeSpent)} style={{ padding: "8px 16px", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 8, color: "#16a34a", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(22,163,74,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(22,163,74,0.1)"}>
                  {"\u2713"} Mark Complete
                </button>
              </>
            )}
            {!editing && (
              <button onClick={() => { setEditing(true); setEditForm({ title: ticket.title, description: ticket.description }); }} style={{ padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                {"\u270E"} Edit
              </button>
            )}
            <button onClick={() => onDuplicate(ticket)} style={{ padding: "8px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              {"\u{1F4CB}"} Clone
            </button>
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


export function GridCard({ ticket, onStatusChange, onComplete, onDelete, onReopen, onTogglePin }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = PRIORITIES[ticket.priority];
  const s = STATUS[ticket.status] || STATUS_FALLBACK;
  const dueBadge = getDueBadge(ticket.deadline, ticket.status);
  const TIME_LABELS = { "15m": "15 min", "30m": "30 min", "1h": "1 hour", "2h": "2 hours", "half_day": "Half day", "full_day": "Full day", "multi_day": "Multi-day" };
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
        {ticket.status === "in_progress" && <button onClick={() => onStatusChange(ticket.id, "review")} style={{ padding: "4px 8px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 5, color: "#8b5cf6", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{"\u{1F50D}"}</button>}
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


export function StatsBar({ tickets }) {
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    review: tickets.filter((t) => t.status === "review").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    critical: tickets.filter((t) => t.priority === "critical" && t.status !== "completed").length,
  };
  const statCards = [
    { label: "Total", value: stats.total, color: "var(--brand)", bg: "rgba(35,29,104,0.06)" },
    { label: "Open", value: stats.open, color: "#6366f1", bg: "rgba(99,102,241,0.06)" },
    { label: "In Progress", value: stats.inProgress, color: "#0284c7", bg: "rgba(2,132,199,0.06)" },
    { label: "Review", value: stats.review, color: "#8b5cf6", bg: "rgba(139,92,246,0.06)" },
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


export function Dashboard({ tickets, onStatusChange, onComplete, onAddNote, onDelete, onUpdatePriority, onUpdateDeadline, onReopen, onTogglePin, onDuplicate, onEditTicket, currentUser }) {
  const [filter, setFilter] = useState("active");
  const [sortBy, setSortBy] = useState("priority");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const queueTickets = tickets.filter((t) => t.status !== "completed").sort((a, b) => { const po = { critical: 0, high: 1, medium: 2, low: 3 }; return po[a.priority] - po[b.priority]; });
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = tickets.filter((t) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!t.id.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
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
    { key: "in_progress", label: "In Progress" }, { key: "review", label: "Review" }, { key: "completed", label: "Completed" },
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ref, name, title, description..." style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", transition: "border 0.2s, box-shadow 0.2s" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {(() => {
          const open = tickets.filter((t) => t.status === "open").length;
          const inP = tickets.filter((t) => t.status === "in_progress").length;
          const rev = tickets.filter((t) => t.status === "review").length;
          const total = open + inP + rev;
          const pct = tickets.length > 0 ? Math.round((tickets.filter((t) => t.status === "completed").length / tickets.length) * 100) : 0;
          return <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{total > 5 ? "\u{1F525}" : total > 2 ? "\u{1F7E1}" : "\u{1F7E2}"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{total} active ticket{total !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{open} open {"\u2022"} {inP} in progress{rev > 0 ? " \u2022 " + rev + " review" : ""}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ height: 6, background: "var(--bg-input)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: pct > 80 ? "#16a34a" : pct > 50 ? "#ca8a04" : "var(--brand)", borderRadius: 3, transition: "width 0.3s" }}></div>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: "right" }}>{pct}% completed</div>
            </div>
          </>;
        })()}
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
            <button onClick={() => setViewMode("queue")} title="Queue view" style={{ padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer", background: viewMode === "queue" ? "var(--brand)" : "transparent", color: viewMode === "queue" ? "#fff" : "var(--text-muted)", fontSize: 12, transition: "all 0.15s" }}>{"\u{1F4CB}"}</button>
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
          <p style={{ fontSize: 15, margin: "0 0 4px", fontWeight: 600 }}>{search.trim() ? 'No tickets matching "' + search.trim() + '"' : "No tickets found" + (filter !== "all" ? " for this filter" : "")}</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{search.trim() ? "Try different keywords or clear your search" : filter !== "all" ? "Try a different filter or check All tickets" : "Tickets will appear here once submitted"}</p>
        </div>
      ) : viewMode === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((t) => <TicketCard key={t.id} ticket={t} onStatusChange={onStatusChange} onComplete={(id, ts) => onComplete(id, ts)} onAddNote={onAddNote} onDelete={onDelete} onUpdatePriority={onUpdatePriority} onUpdateDeadline={onUpdateDeadline} onReopen={onReopen} onTogglePin={onTogglePin} onDuplicate={onDuplicate} onEditTicket={onEditTicket} currentUser={currentUser} />)}
        </div>
      ) : viewMode === "queue" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {queueTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>{"\u2705"}</div>
              <p style={{ fontSize: 14, margin: 0 }}>Queue clear — no active tickets</p>
            </div>
          ) : queueTickets.map((t) => {
            const p = PRIORITIES[t.priority];
            const s = STATUS[t.status] || STATUS_FALLBACK;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, transition: "all 0.15s" }} className="hub-card-hover">
                <span style={{ fontSize: 14 }}>{p?.icon}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>{t.ref || t.id}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.name} {t.deadline ? "\u2022 " + new Date(t.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {t.status === "open" && <button onClick={() => onStatusChange(t.id, "in_progress")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(2,132,199,0.3)", background: "rgba(2,132,199,0.06)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#0284c7" }}>Start</button>}
                  {t.status === "in_progress" && <button onClick={() => onStatusChange(t.id, "review")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.06)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#8b5cf6" }}>Review</button>}
                  {(t.status === "in_progress" || t.status === "review") && <button onClick={() => onComplete(t.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(22,163,74,0.06)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#16a34a" }}>Done</button>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {sorted.map((t) => <GridCard key={t.id} ticket={t} onStatusChange={onStatusChange} onComplete={onComplete} onDelete={onDelete} onReopen={onReopen} onTogglePin={onTogglePin} />)}
        </div>
      )}
    </div>
  );
}


export function SubmitterView({ tickets, submittedRef, onAddNote, onBackToForm, currentUser, onEditTicket, onApprove, onRequestChanges }) {
  const [trackRef, setTrackRef] = useState(submittedRef || "");
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState(currentUser?.name || "");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const ticket = tickets.find((t) => t.id.toLowerCase() === trackRef.trim().toLowerCase());

  const submitNote = () => {
    const author = currentUser?.name || noteName.trim();
    if (!noteText.trim() || !author || !ticket) return;
    onAddNote(ticket.id, author, noteText.trim());
    setNoteText("");
    if (!currentUser) setNoteName("");
  };

  const saveEdit = () => {
    if (!editForm.title?.trim()) return;
    onEditTicket(ticket.id, { title: editForm.title.trim(), description: (editForm.description || "").trim() });
    setEditing(false);
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
  const TIME_LABELS = { "15m": "15 min", "30m": "30 min", "1h": "1 hour", "2h": "2 hours", "half_day": "Half day", "full_day": "Full day", "multi_day": "Multi-day" };
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
                  { key: "review", label: "Review", icon: "\u{1F50D}" },
                  { key: "completed", label: "Completed", icon: "\u2713" },
                ].map((step, idx) => {
                  const statusOrder = { open: 0, in_progress: 1, review: 2, completed: 3 };
                  const current = statusOrder[ticket.status] ?? 0;
                  const active = idx <= current;
                  return (
                    <div key={step.key} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: active ? "var(--brand)" : "var(--bar-bg)", color: active ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 14, fontWeight: 700, transition: "all 0.3s" }}>{step.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--brand)" : "var(--text-muted)" }}>{step.label}</div>
                      {idx < 3 && <div style={{ position: "absolute", top: 15, left: "60%", right: "-40%", height: 2, background: idx < current ? "var(--brand)" : "var(--bar-bg)", zIndex: -1 }}></div>}
                    </div>
                  );
                })}
              </div>

              {/* Edit ticket */}
              {ticket.status !== "completed" && !editing && (
                <button onClick={() => { setEditing(true); setEditForm({ title: ticket.title, description: ticket.description }); }} style={{ padding: "7px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}>
                  {"\u270E"} Edit Ticket
                </button>
              )}
              {editing && (
                <div style={{ marginBottom: 14, padding: 14, background: "var(--bg-input)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Title</label>
                    <input value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Description</label>
                    <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={saveEdit} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{"\u2713"} Save</button>
                    <button onClick={() => setEditing(false)} style={{ padding: "7px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Approval workflow */}
              {ticket.status === "review" && onApprove && (
                <div style={{ marginBottom: 14, padding: 16, background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6", marginBottom: 8 }}>{"\u{1F50D}"} This ticket is ready for your review</div>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>The marketing team has completed the work. Please review and either approve or request changes.</p>
                  {!showFeedback ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onApprove(ticket.id)} style={{ padding: "9px 20px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u2705"} Approve</button>
                      <button onClick={() => setShowFeedback(true)} style={{ padding: "9px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F504}"} Request Changes</button>
                    </div>
                  ) : (
                    <div>
                      <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="What changes are needed?" rows={2} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "vertical", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { onRequestChanges(ticket.id, feedbackText.trim()); setShowFeedback(false); setFeedbackText(""); }} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Send Feedback</button>
                        <button onClick={() => { setShowFeedback(false); setFeedbackText(""); }} style={{ padding: "7px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              {ticket.notes && ticket.notes.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comments & Updates</div>
                  <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
                  {ticket.notes.map((note, i) => (
                    <div key={i} style={{ background: note.auto ? "var(--brand-light)" : "var(--bg-input)", border: "1px solid " + (note.auto ? "rgba(35,29,104,0.1)" : "var(--border)"), borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        {!note.auto && <span style={{ width: 22, height: 22, borderRadius: 11, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{note.author?.charAt(0)?.toUpperCase() || "?"}</span>}
                        {note.auto && <span style={{ fontSize: 12 }}>{"\u2699\uFE0F"}</span>}
                        <span style={{ fontSize: 12, fontWeight: 700, color: note.auto ? "#6366f1" : "var(--brand)" }}>{note.author}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(note.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5, fontStyle: note.auto ? "italic" : "normal" }}>{note.text}</p>
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {/* Add comment */}
              <div style={{ display: "flex", gap: 8 }}>
                {currentUser ? (
                  <span style={{ width: 34, height: 34, borderRadius: 17, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{currentUser.name?.charAt(0)?.toUpperCase()}</span>
                ) : (
                  <input value={noteName} onChange={(e) => setNoteName(e.target.value)} placeholder="Your name" style={{ width: 130, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", flexShrink: 0 }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
                )}
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }} style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-glow)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
                <button onClick={submitNote} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Send</button>
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


