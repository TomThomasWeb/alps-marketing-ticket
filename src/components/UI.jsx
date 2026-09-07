import { useState, useRef, useEffect } from "react";
import React from "react";

export class HubErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error: error.toString() }; }
  render() {
    if (this.state.error) {
      return React.createElement("div", { style: { padding: "40px", textAlign: "center" } },
        React.createElement("h2", { style: { color: "#dc2626", fontSize: 18 } }, "Homepage Error"),
        React.createElement("pre", { style: { fontSize: 12, color: "#666", whiteSpace: "pre-wrap", maxWidth: 600, margin: "12px auto", textAlign: "left", background: "#f5f5f5", padding: 16, borderRadius: 8 } }, this.state.error),
        React.createElement("button", { onClick: () => this.setState({ error: null }), style: { marginTop: 12, padding: "8px 20px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" } }, "Retry")
      );
    }
    return this.props.children;
  }
}

import { renderMarkdown, SLA_TARGETS, PRIORITIES, ARCHIVE_TYPES } from "../constants.js";
import { Linkedin, Facebook, Youtube, Instagram, Globe, ExternalLink as ExtLink, Sparkles, Lock, User, ClipboardList, Inbox, Palette, Bell, TrendingUp, CalendarDays } from "lucide-react";


export function FileChip({ name, url, onRemove }) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", mp4: "🎬", zip: "📦" };
  const content = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: url ? "var(--brand)" : "#475569", cursor: url ? "pointer" : "default", transition: "all 0.2s", textDecoration: "none" }}>
      <span>{icons[ext] || "📎"}</span>
      <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      {url && <span style={{ fontSize: 11, opacity: 0.5 }}>{"\u2197"}</span>}
      {onRemove && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>{"\u00D7"}</button>}
    </span>
  );
  if (url) return <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{content}</a>;
  return content;
}



export function FilePreview({ files }) {
  if (!files || files.length === 0) return null;
  const imageExts = ["png", "jpg", "jpeg", "gif", "webp"];
  const images = files.filter((f) => imageExts.includes(f.name.split(".").pop().toLowerCase()) && f.url);
  const others = files.filter((f) => !imageExts.includes(f.name.split(".").pop().toLowerCase()) || !f.url);
  return (
    <div style={{ marginBottom: 14 }}>
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: others.length > 0 ? 8 : 0 }}>
          {images.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
              <img src={f.url} alt={f.name} style={{ width: 120, height: 80, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "4px 8px", fontSize: 10, color: "var(--text-muted)", background: "var(--bg-input)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{f.name}</div>
            </a>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {others.map((f, i) => <FileChip key={i} name={f.name} url={f.url} />)}
        </div>
      )}
    </div>
  );
}




export function PageHeader({ title, subtitle, action, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 12 }}>{icon && <span style={{ display: "flex" }}>{icon}</span>}{title}</h2>
        {subtitle && <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}



export function HubHome({ onNavigate, tickets, dashUnlocked, isAdmin, leads, notifications, calendarEvents, archiveEntries, oooActive, oooReturnDate, announcement, onQuickSubmit, currentUser, stockroomItems }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (currentUser && currentUser.name) ? currentUser.name.split(" ")[0] : "";
  const t = Array.isArray(tickets) ? tickets : [];
  const a = Array.isArray(archiveEntries) ? archiveEntries : [];
  const s = Array.isArray(stockroomItems) ? stockroomItems : [];
  const myActive = t.filter(function(x) { return x.status !== "completed" && (x.createdBy === (currentUser && currentUser.id) || x.name === (currentUser && currentUser.name)); });
  const openCount = t.filter(function(x) { return x.status === "open"; }).length;
  const progressCount = t.filter(function(x) { return x.status === "in_progress"; }).length;
  const pendingStock = s.filter(function(x) { return x.status === "stockroom"; }).length;
  const recentEntries = a.slice(0, 4);

  return (
    <div style={{ width: "100%", maxWidth: 1000 }}>
      <div style={{ background: "linear-gradient(135deg, #231d68 0%, #464B99 50%, #6366f1 100%)", borderRadius: 20, padding: "36px 32px 32px", marginBottom: 28, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, background: "rgba(255,255,255,0.05)" }}></div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>{greeting}{firstName ? ", " + firstName : ""}</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.7, position: "relative", zIndex: 1 }}>{myActive.length > 0 ? myActive.length + " active ticket" + (myActive.length !== 1 ? "s" : "") : "Welcome to the Alps Marketing Hub"}</p>
        {announcement && announcement.active && announcement.text && <div style={{ marginTop: 14, padding: "8px 14px", background: "rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, position: "relative", zIndex: 1 }}>{announcement.text}</div>}
      </div>

      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: openCount > 0 ? "#ca8a04" : "#16a34a" }}>{openCount}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Open Tickets</div>
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0284c7" }}>{progressCount}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>In Progress</div>
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: pendingStock > 0 ? "#ca8a04" : "#16a34a" }}>{pendingStock}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Stockroom Pending</div>
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#8b5cf6" }}>{a.length}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Archive Entries</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Quick Access</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { id: "form", icon: "\u270F\uFE0F", label: "Submit Request", desc: "Create a marketing ticket", color: "#6366f1" },
          { id: "archive", icon: "\uD83D\uDCC2", label: "Marketing Archive", desc: a.length + " entries", color: "#8b5cf6", needLogin: true },
          { id: "stockroom", icon: "\uD83D\uDCE6", label: "Content Stockroom", desc: pendingStock > 0 ? pendingStock + " pending" : "Submit ideas", color: "#0d9488", needLogin: true },
          { id: "testimonials", icon: "\u2B50", label: "Testimonials", desc: "Broker feedback", color: "#ca8a04", needLogin: true },
          { id: "brand_assets", icon: "\uD83C\uDFA8", label: "Brand Assets", desc: "Colours, logos, fonts", color: "#20A39E", needLogin: true },
          { id: "qr_generator", icon: "\uD83D\uDCF1", label: "QR Generator", desc: "Create QR codes", color: "#0284c7" },
        ].filter(function(c) { return !c.needLogin || currentUser; }).map(function(card) {
          return (
            <div key={card.id} onClick={function() { onNavigate(card.id); }} style={{ background: "var(--bg-card)", borderRadius: 16, padding: "22px 20px", cursor: "pointer", transition: "all 0.25s", border: "1px solid var(--border)", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }} onMouseOver={function(e) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.1)"; }} onMouseOut={function(e) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)"; }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: card.color }}></div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingTop: 4 }}>
                <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{card.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Admin</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { id: "dashboard", icon: "\uD83D\uDCCB", label: "Dashboard", desc: openCount + " open", color: "#231d68" },
              { id: "weekly", icon: "\uD83D\uDCCA", label: "Weekly Report", desc: "Performance", color: "#7c3aed" },
              { id: "brand_management", icon: "\uD83C\uDFAF", label: "Brand Mgmt", desc: "Consistency", color: "#8b5cf6" },
              { id: "admin", icon: "\u2699\uFE0F", label: "Admin Panel", desc: "Settings", color: "#64748b" },
            ].map(function(card) {
              return (
                <div key={card.id} onClick={function() { onNavigate(card.id); }} style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", cursor: "pointer", transition: "all 0.2s", border: "1px solid var(--border)", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }} onMouseOver={function(e) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }} onMouseOut={function(e) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: card.color }}></div>
                  <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{card.icon}</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{card.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myActive.length > 0 && (
        <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)", marginBottom: 20, background: "var(--bg-card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Your Active Tickets</span>
            <button onClick={function() { onNavigate("tracker"); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View All</button>
          </div>
          {myActive.slice(0, 4).map(function(ticket, i) {
            var p = (typeof PRIORITIES !== "undefined" && PRIORITIES[ticket.priority]) || {};
            return (
              <div key={ticket.id} onClick={function() { onNavigate("tracker"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < Math.min(myActive.length, 4) - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s" }} onMouseOver={function(e) { e.currentTarget.style.background = "var(--bg-hover)"; }} onMouseOut={function(e) { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "3px 8px", borderRadius: 6 }}>{ticket.ref}</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.title}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: p.bg || "#eee", color: p.color || "#666" }}>{p.label || ticket.priority}</span>
              </div>
            );
          })}
        </div>
      )}

      {!currentUser && (
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))", borderRadius: 16, padding: "28px 24px", textAlign: "center", marginTop: 20, border: "1px solid rgba(99,102,241,0.1)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Get more from the Hub</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Create a free account to access the full Marketing Hub.</div>
          <button onClick={function() { onNavigate("signup"); }} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #231d68, #464B99)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Sign Up Free</button>
        </div>
      )}
    </div>
  );
}

export function LoginPage({ onLogin, hubUsers, onGoToSignUp }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) return;
    const user = hubUsers.find((u) => u.username === username.trim() && u.password === password);
    if (user && user.approved === false) { setError("Account pending approval"); setShake(true); setTimeout(() => setShake(false), 500); return; }
    if (user) {
      onLogin({ id: user.id, name: user.name, username: user.username, role: user.role });
    } else {
      setError("Invalid username or password");
      setShake(true); setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  const inputStyle = { width: "100%", padding: "12px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border 0.2s" };

  return (
    <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, animation: shake ? "shakeAnim 0.4s ease" : "none" }}>
        <div style={{ marginBottom: 12, color: "var(--brand)" }}><Lock size={36} /></div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Log In</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Sign in to access dashboards and admin features.</p>
        <div style={{ marginBottom: 12 }}>
          <input ref={inputRef} type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="Username" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16, position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="Password" style={{ ...inputStyle, paddingRight: 44 }} />
          <button onClick={() => setShowPw(!showPw)} type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)", padding: 0, lineHeight: 1 }}>showPw ? "👁" : "👁‍🗨"</button>
        </div>
        {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}
        <button onClick={handleSubmit} style={{ width: "100%", padding: "13px", background: "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>Log In</button>
        {hubUsers.length === 0 && <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--text-muted)" }}>No users set up yet. Add users via the Admin Panel.</p>}
      </div>
      <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Forgot your login? Message Tom Thomas to reset.</p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Don't have an account? <button onClick={onGoToSignUp} style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontWeight: 600, fontSize: 12, padding: 0 }}>Sign Up</button></p>
    </div>
  );
}

export function SignUpPage({ onSignUp, hubUsers, onGoToLogin }) {
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", confirmPw: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) { setError("All fields are required"); return; }
    if (form.password !== form.confirmPw) { setError("Passwords do not match"); return; }
    if (form.password.length < 4) { setError("Password must be at least 4 characters"); return; }
    if (hubUsers.some((u) => u.username === form.username.trim())) { setError("Username already taken"); return; }
    onSignUp({ name: form.name.trim(), email: form.email.trim(), username: form.username.trim(), password: form.password, role: "viewer" });
    setSuccess(true);
  };

  const inputStyle = { width: "100%", padding: "12px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };

  if (success) return (
    <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2705"}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Account Created!</h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>Your account is pending admin approval. You'll be able to log in once approved.</p>
        <button onClick={onGoToLogin} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u2190"} Back to Login</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40 }}>
        <div style={{ marginBottom: 12, color: "var(--brand)" }}><User size={36} /></div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Create Account</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Sign up to submit tickets, log leads, and access resources.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }} placeholder="Full Name" style={inputStyle} />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" type="email" style={inputStyle} />
          <input value={form.username} onChange={(e) => { setForm({ ...form, username: e.target.value }); setError(""); }} placeholder="Username" style={inputStyle} />
          <input value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }} placeholder="Password" type="password" style={inputStyle} />
          <input value={form.confirmPw} onChange={(e) => { setForm({ ...form, confirmPw: e.target.value }); setError(""); }} placeholder="Confirm Password" type="password" style={inputStyle} />
        </div>
        {error && <div style={{ fontSize: 13, color: "#ef4444", margin: "12px 0 0", textAlign: "center" }}>{error}</div>}
        <button onClick={handleSignUp} style={{ width: "100%", padding: "13px", background: "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 16 }}>Create Account</button>
      </div>
      <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Already have an account? <button onClick={onGoToLogin} style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontWeight: 600, fontSize: 12, padding: 0 }}>Log In</button></p>
    </div>
  );
}


export function ProfilePage({ currentUser, tickets, leads, archiveEntries, onNavigate, onAddComment, notifications, onUpdateUser, hubUsers }) {
  const [commentTexts, setCommentTexts] = useState({});
  const [activeTicket, setActiveTicket] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name || "", job_title: currentUser?.job_title || "", avatar_color: currentUser?.avatar_color || "var(--brand)" });
  const [prefs, setPrefs] = useState(() => { try { return JSON.parse(localStorage.getItem("alps_user_prefs") || "{}"); } catch { return {}; } });
  const savePrefs = (next) => { setPrefs(next); try { localStorage.setItem("alps_user_prefs", JSON.stringify(next)); } catch {} };
  const AVATAR_COLORS = ["#231d68", "#e64592", "#20A39E", "#FAB315", "#464B99", "#27D7F4", "#dc2626", "#16a34a", "#64748b"];

  const saveProfile = () => {
    if (!profileForm.name.trim()) return;
    if (onUpdateUser) onUpdateUser(currentUser.id, { name: profileForm.name.trim(), job_title: profileForm.job_title.trim(), avatar_color: profileForm.avatar_color });
    setEditingProfile(false);
  };

  const avatarColor = currentUser?.avatar_color || "var(--brand)";

  const myTickets = tickets.filter((t) => t.createdBy === currentUser?.id || t.name === currentUser?.name);
  const myLeads = leads.filter((l) => l.created_by === currentUser?.id || l.logged_by === currentUser?.name);
  const myReviewTickets = myTickets.filter((t) => t.status === "review");
  const myInProgressTickets = myTickets.filter((t) => t.status === "in_progress");
  const myOpenTickets = myTickets.filter((t) => t.status === "open");
  const myActiveTickets = myTickets.filter((t) => t.status !== "completed");
  const myCompletedTickets = myTickets.filter((t) => t.status === "completed");

  const getCommentText = (ticketId) => commentTexts[ticketId] || "";
  const setCommentText = (ticketId, text) => setCommentTexts((prev) => ({ ...prev, [ticketId]: text }));

  const submitComment = (ticketId) => {
    const text = getCommentText(ticketId);
    if (!text.trim()) return;
    onAddComment(ticketId, currentUser.name, text.trim());
    setCommentText(ticketId, "");
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const fmtAgo = (ts) => {
    const diff = (Date.now() - new Date(ts)) / 60000;
    if (diff < 1) return "Just now"; if (diff < 60) return Math.floor(diff) + "m ago";
    if (diff < 1440) return Math.floor(diff / 60) + "h ago"; return Math.floor(diff / 1440) + "d ago";
  };

  const statusStyle = (s) => {
    const colors = { open: "#6366f1", in_progress: "#0284c7", review: "#8b5cf6", completed: "#16a34a" };
    const labels = { open: "Open", in_progress: "In Progress", review: "Review", completed: "Completed" };
    return { color: colors[s] || "#64748b", label: labels[s] || s, bg: (colors[s] || "#64748b") + "14" };
  };

  const renderTicketSection = (title, icon, ticketList, emptyMsg) => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{icon} {title} {ticketList.length > 0 && <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>({ticketList.length})</span>}</h3>
      {ticketList.length === 0 ? (
        <div style={{ padding: "20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>{emptyMsg}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ticketList.map((t) => {
            const st = statusStyle(t.status);
            const isActive = activeTicket === t.id;
            return (
              <div key={t.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => setActiveTicket(isActive ? null : t.id)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "2px 8px", borderRadius: 4 }}>{t.ref || t.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  {t.deadline && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDate(t.deadline)}</span>}
                </div>
                {isActive && (
                  <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                    {t.description && <div style={{ margin: "10px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(t.description) }}></div>}
                    <FilePreview files={t.files} />
                    {(t.notes || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Comments</div>
                        <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {t.notes.map((n, i) => (
                          <div key={i} style={{ padding: "8px 10px", background: n.auto ? "var(--brand-light)" : "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              {!n.auto && <span style={{ width: 18, height: 18, borderRadius: 9, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{n.author?.charAt(0)?.toUpperCase() || "?"}</span>}
                              {n.auto && <span style={{ fontSize: 10 }}>{"\u2699\uFE0F"}</span>}
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{n.author}</span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>{fmtAgo(n.timestamp)}</span>
                            </div>
                            <div style={{ color: "var(--text-secondary)", lineHeight: 1.4 }}>{n.text}</div>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 15, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{currentUser.name?.charAt(0)?.toUpperCase()}</span>
                      <input value={getCommentText(t.id)} onChange={(e) => setCommentText(t.id, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitComment(t.id); }} placeholder="Add a comment..." style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text-primary)", outline: "none" }} />
                      <button onClick={() => submitComment(t.id)} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Send</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: 860 }}>
      {/* Profile header */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px", marginBottom: 20, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>{currentUser?.name?.charAt(0)?.toUpperCase() || "?"}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {editingProfile ? (<>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Display Name</label><input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
              <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Job Title</label><input value={profileForm.job_title} onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })} placeholder="e.g. Account Manager" style={{ width: "100%", padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Avatar Colour</label>
              <div style={{ display: "flex", gap: 6 }}>{AVATAR_COLORS.map((c) => <button key={c} onClick={() => setProfileForm({ ...profileForm, avatar_color: c })} style={{ width: 28, height: 28, borderRadius: 14, background: c, border: "2px solid " + (profileForm.avatar_color === c ? "#fff" : "transparent"), outline: profileForm.avatar_color === c ? "2px solid var(--brand)" : "none", cursor: "pointer" }}></button>)}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} style={{ padding: "7px 18px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingProfile(false)} style={{ padding: "7px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          </>) : (<>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{currentUser?.name}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>@{currentUser?.username} · {currentUser?.role}{currentUser?.job_title && <span> · {currentUser.job_title}</span>}</p>
            {currentUser?.last_seen_at && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)", opacity: 0.7 }}>Last active {fmtAgo(currentUser.last_seen_at)}</p>}
          </>)}
        </div>
        {!editingProfile && <button onClick={() => { setProfileForm({ name: currentUser?.name || "", job_title: currentUser?.job_title || "", avatar_color: currentUser?.avatar_color || "var(--brand)" }); setEditingProfile(true); }} style={{ padding: "7px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit Profile</button>}
      </div>

      {/* Stats + personal trend */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 20 }} className="hub-profile-stats">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {[
            { v: myTickets.length, l: "Total", c: "var(--brand)" },
            { v: myActiveTickets.length, l: "Active", c: "#ca8a04" },
            { v: myReviewTickets.length, l: "Review", c: "#8b5cf6" },
            { v: myCompletedTickets.length, l: "Completed", c: "#16a34a" },
            { v: myLeads.length, l: "Leads", c: "#0284c7" },
          ].map((s) => (
            <div key={s.l} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
          {(() => {
            const now = new Date();
            const weeks = []; for (let i = 5; i >= 0; i--) { const ws = new Date(now); ws.setDate(now.getDate() - (i * 7 + now.getDay())); ws.setHours(0,0,0,0); const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23,59,59,999); weeks.push({ label: ws.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), count: myTickets.filter((t) => { const d = new Date(t.createdAt); return d >= ws && d <= we; }).length }); }
            const maxW = Math.max(...weeks.map((w) => w.count), 1);
            const ct = myCompletedTickets.filter((t) => t.completedAt && t.createdAt);
            const avgH = ct.length > 0 ? ct.reduce((s, t) => s + (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000, 0) / ct.length : 0;
            const fmtH = (h) => h === 0 ? "—" : h < 24 ? Math.round(h) + "h" : (h / 24).toFixed(1) + "d";
            return (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Your submissions (6 weeks)</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)" }}>Avg turnaround: {fmtH(avgH)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: "70%", background: "var(--brand)", borderRadius: "2px 2px 0 0", height: (w.count / maxW * 36) + "px", minHeight: w.count > 0 ? 3 : 0, opacity: 0.6 }} title={w.count + " tickets"}></div>
                    <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{w.label}</span>
                  </div>
                ))}
              </div>
            </>);
          })()}
        </div>
      </div>

      {/* Preferences */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Preferences</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Default Priority</label>
            <select value={prefs.defaultPriority || "medium"} onChange={(e) => savePrefs({ ...prefs, defaultPriority: e.target.value })} style={{ width: "100%", padding: "6px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text-primary)", outline: "none" }}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Notifications</label>
            <select value={prefs.notifLevel || "all"} onChange={(e) => savePrefs({ ...prefs, notifLevel: e.target.value })} style={{ width: "100%", padding: "6px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text-primary)", outline: "none" }}>
              <option value="all">All notifications</option><option value="mentions">Mentions only</option><option value="completions">Completions only</option><option value="none">None</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Email Digest</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={prefs.emailDigest || false} onChange={(e) => savePrefs({ ...prefs, emailDigest: e.target.checked })} style={{ accentColor: "var(--brand)" }} /> Weekly summary
            </label>
          </div>
        </div>
      </div>

      {(() => {
        const myNotifs = (notifications || []).filter((n) => n.for_user === currentUser?.id).slice(0, 5);
        return myNotifs.length > 0 ? (
          <div style={{ marginBottom: 24, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Your Notifications</span>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "#22c55e", display: "inline-block" }}></span>
            </div>
            {myNotifs.map((n, i) => (
              <div key={i} style={{ padding: "10px 16px", borderBottom: i < myNotifs.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{n.body}</div>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{fmtAgo(n.time)}</span>
              </div>
            ))}
          </div>
        ) : null;
      })()}

      {/* Activity timeline */}
      {(() => {
        const events = [];
        myTickets.forEach((t) => {
          events.push({ type: "submit", label: "Submitted " + (t.ref || t.id) + ": " + t.title, time: t.createdAt, color: "#6366f1" });
          if (t.completedAt) events.push({ type: "complete", label: "Completed " + (t.ref || t.id) + ": " + t.title, time: t.completedAt, color: "#16a34a" });
          (t.notes || []).filter((n) => !n.auto && n.author === currentUser?.name).forEach((n) => {
            events.push({ type: "comment", label: "Commented on " + (t.ref || t.id) + ": " + n.text.slice(0, 60), time: n.timestamp, color: "#0284c7" });
          });
        });
        myLeads.forEach((l) => { events.push({ type: "lead", label: "Logged lead: " + l.broker + " — " + l.enquiry, time: l.created_at, color: "#0d9488" }); });
        events.sort((a, b) => new Date(b.time) - new Date(a.time));
        const recent = events.slice(0, 12);
        if (recent.length === 0) return null;
        return (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Your Activity</h3>
            <div style={{ position: "relative", paddingLeft: 20 }}>
              <div style={{ position: "absolute", left: 6, top: 4, bottom: 4, width: 2, background: "var(--border)" }}></div>
              {recent.map((ev, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, position: "relative" }}>
                  <div style={{ position: "absolute", left: -17, top: 4, width: 8, height: 8, borderRadius: 4, background: ev.color, border: "2px solid var(--bg-card)", zIndex: 1 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.label}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{fmtAgo(ev.time)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {myReviewTickets.length > 0 && renderTicketSection("Ready for Review", "◎", myReviewTickets, "")}
      {renderTicketSection("In Progress", "⟳", myInProgressTickets, "Nothing in progress right now.")}
      {myOpenTickets.length > 0 && renderTicketSection("Open", "→", myOpenTickets, "")}

      {myCompletedTickets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Recently Completed</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {myCompletedTickets.slice(0, 5).map((t) => (
              <div key={t.id} style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14 }}>{"\u2705"}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "var(--brand)" }}>{t.ref || t.id}</span>
                <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtDate(t.completedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {myLeads.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>My Recent Leads</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {myLeads.slice(0, 5).map((l) => (
              <div key={l.id} style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14 }}><TrendingUp size={14} /></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{l.broker}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>{l.product || "General"}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtAgo(l.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export function Toast({ toasts, onDismiss }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: t.type === "error" ? "#fef2f2" : t.type === "success" ? "#f0fdf4" : "var(--bg-card)", border: "1px solid " + (t.type === "error" ? "#fecaca" : t.type === "success" ? "#bbf7d0" : "var(--border)"), borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: 420, animation: "fadeIn 0.2s ease", minWidth: 260 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{t.type === "error" ? "\u274C" : t.type === "success" ? "\u2705" : "\u2139\uFE0F"}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.type === "error" ? "#991b1b" : t.type === "success" ? "#166534" : "var(--text-primary)", lineHeight: 1.4 }}>{t.message}</div>
          {t.onUndo && <button onClick={() => { t.onUndo(); onDismiss(t.id); }} style={{ padding: "4px 12px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Undo</button>}
          <button onClick={() => onDismiss(t.id)} style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "var(--text-muted)", padding: "2px 6px", flexShrink: 0, lineHeight: 1 }}>{"\u2715"}</button>
        </div>
      ))}
    </div>
  );
}


export function OnboardingOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "👋", title: "Welcome to the Marketing Hub", desc: "Your central place for marketing requests, brand assets, and tools. Here's a quick overview of what you can do." },
    { icon: "📝", title: "Submit a Ticket", desc: "Need marketing support? Submit a ticket with your request, set the priority, and track its progress all the way through to completion." },
    { icon: "📚", title: "Browse Resources", desc: "Access the Marketing Archive for past campaigns, Brand Assets for logos and colours, and the Self-Service Guide for image sizes and FAQs." },
    { icon: "🛠", title: "Use the Tools", desc: "Convert and resize images, generate QR codes, edit images with brand overlays, plan content on the calendar, and access reusable copy templates." },
    { icon: "📈", title: "Log Leads", desc: "Record inbound marketing leads with source tracking. Leads are visible in the Leads Dashboard for reporting." },
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



export function NotificationsCenter({ notifications, onClear, onNavigate, isAdmin }) {
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
        <Bell size={18} />
        {unread > 0 && <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>}
      </button>
      {open && isAdmin && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 420, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-hover)", zIndex: 100, display: "flex", flexDirection: "column", animation: "fadeIn 0.15s ease" }}>
          <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Bell size={18} /> Notifications</span>
            {notifications.length > 0 && <button onClick={onClear} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}>Clear all</button>}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}><Bell size={18} /></div>
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


export function ActivityLog({ tickets }) {
  // Build activity entries from ticket data
  const activities = [];

  tickets.forEach((t) => {
    // Ticket created
    activities.push({
      time: t.createdAt,
      type: "created",
      icon: "→",
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
        icon: note.auto ? "⚙" : "💬",
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
        <div className="hub-empty">
          <div className="hub-empty-icon"><Inbox size={40} /></div>
          <p className="hub-empty-title">No activity yet</p>
          <p className="hub-empty-desc">Ticket updates will appear here as they happen</p>
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