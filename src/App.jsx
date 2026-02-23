import { useState, useCallback, useRef, useEffect } from "react";

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

let ticketCounter = 0;
function generateId() {
  const id = "M" + String(ticketCounter).padStart(3, "0");
  ticketCounter++;
  return id;
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

function FileChip({ name, onRemove }) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = { pdf: "\u{1F4C4}", doc: "\u{1F4DD}", docx: "\u{1F4DD}", xls: "\u{1F4CA}", xlsx: "\u{1F4CA}", png: "\u{1F5BC}", jpg: "\u{1F5BC}", jpeg: "\u{1F5BC}", gif: "\u{1F5BC}", mp4: "\u{1F3AC}", zip: "\u{1F4E6}" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: "#475569" }}>
      <span>{icons[ext] || "\u{1F4CE}"}</span>
      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>{"\u00D7"}</button>}
    </span>
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
      <div style={{ background: "#f6f6f6", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", animation: shake ? "shakeAnim 0.4s ease" : "none" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(35,29,104,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>{"\u{1F512}"}</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#231d68" }}>Dashboard Access</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b" }}>Enter the password to view the ticket dashboard.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={inputRef} type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="Password" style={{ flex: 1, padding: "11px 14px", background: "#fff", border: "1px solid " + (error ? "#ef4444" : "#e2e8f0"), borderRadius: 8, color: "#1e293b", fontSize: 14, outline: "none", transition: "border 0.2s, box-shadow 0.2s" }} onFocus={(e) => { e.target.style.borderColor = error ? "#ef4444" : "#231d68"; e.target.style.boxShadow = "0 0 0 3px " + (error ? "rgba(239,68,68,0.1)" : "rgba(35,29,104,0.1)"); }} onBlur={(e) => { e.target.style.borderColor = error ? "#ef4444" : "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
          <button onClick={handleSubmit} style={{ padding: "11px 20px", background: "#231d68", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }} onMouseOver={(e) => e.target.style.background = "#1a1550"} onMouseOut={(e) => e.target.style.background = "#231d68"}>
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
    await new Promise((r) => setTimeout(r, 600));
    onSubmit({ ...form, id: generateId(), status: "open", createdAt: new Date().toISOString(), fileNames: form.files.map((f) => f.name), notes: [] });
    setForm({ name: "", title: "", description: "", priority: "medium", deadline: "", files: [] });
    setSubmitting(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const inputStyle = (field) => ({ width: "100%", padding: "11px 14px", background: "#fff", border: "1px solid " + (errors[field] ? "#ef4444" : "#e2e8f0"), borderRadius: 8, color: "#1e293b", fontSize: 14, outline: "none", transition: "border 0.2s, box-shadow 0.2s", boxSizing: "border-box" });
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#231d68", marginBottom: 6, letterSpacing: "0.02em" };

  return (
    <div style={{ background: "#f6f6f6", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, maxWidth: 560, width: "100%" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#231d68" }}>Submit a Request</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>Please fill in the form to submit a ticket, and I'll get right on it. Once your ticket is complete, I will notify you.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Your Name *</label>
        <input style={inputStyle("name")} placeholder="e.g. Sarah Johnson" value={form.name} onChange={(e) => update("name", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "#231d68"; e.target.style.boxShadow = "0 0 0 3px rgba(35,29,104,0.1)"; }} onBlur={(e) => { e.target.style.borderColor = errors.name ? "#ef4444" : "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
        {errors.name && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>{errors.name}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Task Title *</label>
        <input style={inputStyle("title")} placeholder="e.g. Update Q1 social media calendar" value={form.title} onChange={(e) => update("title", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "#231d68"; e.target.style.boxShadow = "0 0 0 3px rgba(35,29,104,0.1)"; }} onBlur={(e) => { e.target.style.borderColor = errors.title ? "#ef4444" : "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
        {errors.title && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>{errors.title}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description *</label>
        <textarea rows={4} style={{ ...inputStyle("description"), resize: "vertical", fontFamily: "inherit" }} placeholder="Describe what you need - include any relevant details, links, or specs..." value={form.description} onChange={(e) => update("description", e.target.value)} onFocus={(e) => { e.target.style.borderColor = "#231d68"; e.target.style.boxShadow = "0 0 0 3px rgba(35,29,104,0.1)"; }} onBlur={(e) => { e.target.style.borderColor = errors.description ? "#ef4444" : "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
        {errors.description && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>{errors.description}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Priority</label>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(PRIORITIES).map(([key, p]) => (
              <button key={key} onClick={() => update("priority", key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", background: form.priority === key ? p.bg : "#fff", border: "1.5px solid " + (form.priority === key ? p.color : "#e2e8f0"), color: form.priority === key ? p.color : "#94a3b8" }}>
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
        <button onClick={() => fileRef.current?.click()} style={{ padding: "10px 18px", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 8, color: "#64748b", cursor: "pointer", fontSize: 13, transition: "all 0.2s", width: "100%" }} onMouseOver={(e) => { e.target.style.background = "#f8fafc"; e.target.style.borderColor = "#231d68"; }} onMouseOut={(e) => { e.target.style.background = "#fff"; e.target.style.borderColor = "#cbd5e1"; }}>
          {"\u{1F4CE}"} Click to attach files
        </button>
        {form.files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {form.files.map((f, i) => <FileChip key={i} name={f.name} onRemove={() => removeFile(i)} />)}
          </div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", padding: "13px", background: submitting ? "#3730a3" : "#231d68", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "wait" : "pointer", transition: "all 0.2s", letterSpacing: "0.02em", boxShadow: "0 4px 14px rgba(35,29,104,0.25)" }} onMouseOver={(e) => { if (!submitting) { e.target.style.background = "#1a1550"; e.target.style.boxShadow = "0 6px 20px rgba(35,29,104,0.35)"; } }} onMouseOut={(e) => { e.target.style.background = submitting ? "#3730a3" : "#231d68"; e.target.style.boxShadow = "0 4px 14px rgba(35,29,104,0.25)"; }}>
        {submitting ? "Submitting\u2026" : "Submit Ticket \u2192"}
      </button>
    </div>
  );
}

function TicketCard({ ticket, onStatusChange, onComplete, onAddNote }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState("");
  const p = PRIORITIES[ticket.priority];
  const s = STATUS[ticket.status];
  const dueBadge = getDueBadge(ticket.deadline, ticket.status);

  const submitNote = () => {
    if (!noteText.trim() || !noteName.trim()) return;
    onAddNote(ticket.id, noteName.trim(), noteText.trim());
    setNoteText("");
    setNoteName("");
  };

  return (
    <div onClick={() => setExpanded(!expanded)} style={{ background: ticket.status === "completed" ? "#fafafa" : "#f6f6f6", border: "1px solid " + (ticket.status === "completed" ? "#f1f5f9" : dueBadge && dueBadge.color === "#dc2626" ? "rgba(220,38,38,0.25)" : "#e2e8f0"), borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "all 0.2s", opacity: ticket.status === "completed" ? 0.65 : 1 }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(35,29,104,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontFamily: "monospace", color: "#231d68", fontWeight: 700, letterSpacing: "0.04em", background: "rgba(35,29,104,0.07)", padding: "2px 7px", borderRadius: 4 }}>{ticket.id}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: p.bg, color: p.color, border: "1px solid " + p.border, letterSpacing: "0.03em" }}>{p.icon} {p.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, letterSpacing: "0.03em" }}>{s.label}</span>
            {dueBadge && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: dueBadge.bg, color: dueBadge.color, border: "1px solid " + dueBadge.border }}>{dueBadge.text}</span>}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#231d68", textDecoration: ticket.status === "completed" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>{ticket.title}</h3>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>{"\u{1F464}"} {ticket.name}</span>
            <span>{"\u{1F4C5}"} {formatDate(ticket.deadline)}</span>
            <span style={{ opacity: 0.6 }}>Created {new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          </div>
        </div>
        <span style={{ fontSize: 18, color: "#94a3b8", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none", flexShrink: 0, marginTop: 4 }}>{"\u25BE"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.description}</p>
          {ticket.fileNames?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {ticket.fileNames.map((f, i) => <FileChip key={i} name={f} />)}
            </div>
          )}

          {ticket.notes && ticket.notes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#231d68", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
              {ticket.notes.map((note, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#231d68" }}>{note.author}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(note.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{note.text}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={noteName} onChange={(e) => setNoteName(e.target.value)} placeholder="Your name" style={{ width: 130, padding: "8px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#1e293b", fontSize: 13, outline: "none", flexShrink: 0 }} onFocus={(e) => { e.target.style.borderColor = "#231d68"; e.target.style.boxShadow = "0 0 0 3px rgba(35,29,104,0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }} style={{ flex: 1, padding: "8px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#1e293b", fontSize: 13, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "#231d68"; e.target.style.boxShadow = "0 0 0 3px rgba(35,29,104,0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
              <button onClick={submitNote} style={{ padding: "8px 14px", background: "#231d68", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }} onMouseOver={(e) => e.target.style.background = "#1a1550"} onMouseOut={(e) => e.target.style.background = "#231d68"}>
                + Add
              </button>
            </div>
          </div>

          {ticket.status !== "completed" && (
            <div style={{ display: "flex", gap: 8 }}>
              {ticket.status === "open" && (
                <button onClick={() => onStatusChange(ticket.id, "in_progress")} style={{ padding: "8px 16px", background: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.25)", borderRadius: 8, color: "#0284c7", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(2,132,199,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(2,132,199,0.1)"}>
                  {"\u25B6"} Start Progress
                </button>
              )}
              <button onClick={() => onComplete(ticket.id)} style={{ padding: "8px 16px", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 8, color: "#16a34a", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "rgba(22,163,74,0.18)"} onMouseOut={(e) => e.target.style.background = "rgba(22,163,74,0.1)"}>
                {"\u2713"} Mark Complete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard({ tickets, onStatusChange, onComplete, onAddNote }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [search, setSearch] = useState("");
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = tickets.filter((t) => {
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      if (!t.id.toUpperCase().includes(q)) return false;
    }
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "completed";
    return t.status === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (sortBy === "deadline") return (a.deadline || "9999") < (b.deadline || "9999") ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    critical: tickets.filter((t) => t.priority === "critical" && t.status !== "completed").length,
  };

  const statCards = [
    { label: "Total", value: stats.total, color: "#231d68", bg: "rgba(35,29,104,0.06)" },
    { label: "Open", value: stats.open, color: "#6366f1", bg: "rgba(99,102,241,0.06)" },
    { label: "In Progress", value: stats.inProgress, color: "#0284c7", bg: "rgba(2,132,199,0.06)" },
    { label: "Completed", value: stats.completed, color: "#16a34a", bg: "rgba(22,163,74,0.06)" },
    { label: "Critical", value: stats.critical, color: "#dc2626", bg: "rgba(220,38,38,0.06)" },
  ];

  const filterTabs = [
    { key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" }, { key: "completed", label: "Completed" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#231d68" }}>Ticket Dashboard</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>Manage and track all marketing requests</p>
        </div>
        <div style={{ position: "relative", minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14, pointerEvents: "none" }}>{"\u{1F50D}"}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ref e.g. M001" style={{ width: "100%", padding: "9px 12px 9px 34px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#1e293b", fontSize: 13, outline: "none", transition: "border 0.2s, box-shadow 0.2s" }} onFocus={(e) => { e.target.style.borderColor = "#231d68"; e.target.style.boxShadow = "0 0 0 3px rgba(35,29,104,0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "14px 16px", border: "1px solid " + s.color + "15", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "#f6f6f6", borderRadius: 8, padding: 3, border: "1px solid #e2e8f0" }}>
          {filterTabs.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.2s", background: filter === tab.key ? "#231d68" : "transparent", color: filter === tab.key ? "#fff" : "#64748b" }}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#231d68", fontSize: 13, cursor: "pointer", outline: "none" }}>
          <option value="priority">Sort: Priority</option>
          <option value="deadline">Sort: Deadline</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{search.trim() ? "\u{1F50D}" : "\u{1F4CB}"}</div>
            <p style={{ fontSize: 15, margin: 0 }}>{search.trim() ? 'No tickets matching "' + search.trim() + '"' : "No tickets found" + (filter !== "all" ? " for this filter" : "")}</p>
          </div>
        ) : (
          sorted.map((t) => <TicketCard key={t.id} ticket={t} onStatusChange={onStatusChange} onComplete={onComplete} onAddNote={onAddNote} />)
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("form");
  const [tickets, setTickets] = useState([]);
  const [dashUnlocked, setDashUnlocked] = useState(false);

  const handleSubmit = (ticket) => {
    setTickets((prev) => [ticket, ...prev]);
    if (dashUnlocked) {
      setView("dashboard");
    } else {
      setView("submitted");
    }
  };

  const handleStatusChange = (id, status) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleComplete = (id) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t)));
  };

  const handleAddNote = (id, author, text) => {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, notes: [...(t.notes || []), { author, text, timestamp: new Date().toISOString() }] } : t));
  };

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

  const activeCount = tickets.filter((t) => t.status !== "completed").length;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1e293b" }}>
      <style>{"\n        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');\n        * { box-sizing: border-box; }\n        ::selection { background: #231d68; color: white; }\n        ::-webkit-scrollbar { width: 6px; }\n        ::-webkit-scrollbar-track { background: transparent; }\n        ::-webkit-scrollbar-thumb { background: rgba(35,29,104,0.15); border-radius: 3px; }\n        @keyframes shakeAnim { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }\n      "}</style>

      <header style={{ padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", background: "#fff", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={ALPS_LOGO} alt="Alps" style={{ height: 38, objectFit: "contain" }} />
          <div style={{ width: 1, height: 28, background: "#e2e8f0" }}></div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#231d68", lineHeight: 1.2 }}>Marketing Hub</h1>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Ticket Management</span>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, background: "#f6f6f6", borderRadius: 10, padding: 3, border: "1px solid #e2e8f0" }}>
          <button onClick={() => setView("form")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: view === "form" ? "#231d68" : "transparent", color: view === "form" ? "#fff" : "#64748b" }}>
            + New Ticket
          </button>
          <button onClick={handleDashboardClick} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: (view === "dashboard" || view === "password") ? "#231d68" : "transparent", color: (view === "dashboard" || view === "password") ? "#fff" : "#64748b", position: "relative" }}>
            {dashUnlocked ? "" : "\u{1F512} "}Dashboard
            {dashUnlocked && activeCount > 0 && (
              <span style={{ position: "absolute", top: 0, right: 2, width: 18, height: 18, borderRadius: "50%", background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>
            )}
          </button>
        </nav>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "flex", justifyContent: "center" }}>
        {view === "form" && <TicketForm onSubmit={handleSubmit} />}
        {view === "submitted" && (
          <div style={{ background: "#f6f6f6", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32, maxWidth: 480, width: "100%", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>{"\u2713"}</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#231d68" }}>Ticket Submitted</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>Your request has been logged successfully. You'll be notified once it's been completed.</p>
            <button onClick={() => setView("form")} style={{ padding: "11px 24px", background: "#231d68", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "#1a1550"} onMouseOut={(e) => e.target.style.background = "#231d68"}>
              Submit Another Ticket
            </button>
          </div>
        )}
        {view === "password" && <PasswordGate onUnlock={handleUnlock} />}
        {view === "dashboard" && <Dashboard tickets={tickets} onStatusChange={handleStatusChange} onComplete={handleComplete} onAddNote={handleAddNote} />}
      </main>
    </div>
  );
}
