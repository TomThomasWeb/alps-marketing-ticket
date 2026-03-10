import { useState, useRef, useEffect } from "react";
import { renderMarkdown } from "../constants.js";


export function FileChip({ name, url, onRemove }) {
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


export function HubHome({ onNavigate, tickets, dashUnlocked, leads, notifications, calendarEvents, archiveEntries, oooActive, oooReturnDate, announcement, onQuickSubmit, currentUser }) {
  const activeCount = tickets.filter((t) => t.status !== "completed").length;
  const leadsAction = leads.filter((l) => l.next_steps === "needs_action").length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetingName = currentUser ? greeting + ", " + currentUser.name.split(" ")[0] : greeting;
  const myTickets = currentUser ? tickets.filter((t) => t.createdBy === currentUser.id || t.name === currentUser.name) : [];
  const myActiveTickets = myTickets.filter((t) => t.status !== "completed").length;
  const myReviewTickets = myTickets.filter((t) => t.status === "review").length;

  const [homeTab, setHomeTab] = useState("resources");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const feedItems = (() => {
    const items = [];
    tickets.slice(0, 15).forEach((t) => {
      items.push({ icon: "\u{1F4DD}", text: (t.ref || "Ticket") + " submitted by " + t.name, time: t.createdAt, action: "tracker" });
      if (t.status === "in_progress") items.push({ icon: "\u{1F504}", text: (t.ref || "Ticket") + " in progress", time: t.updatedAt || t.createdAt, action: "dashboard" });
      if (t.status === "review") items.push({ icon: "\u{1F50D}", text: (t.ref || "Ticket") + " ready for review", time: t.updatedAt || t.createdAt, action: "dashboard" });
      if (t.completedAt) items.push({ icon: "\u2705", text: (t.ref || "Ticket") + " completed", time: t.completedAt, action: "dashboard" });
    });
    leads.slice(0, 5).forEach((l) => { items.push({ icon: "\u{1F4C8}", text: "Lead from " + l.broker, time: l.created_at, action: "leads_dashboard" }); });
    (archiveEntries || []).slice(0, 5).forEach((e) => { items.push({ icon: "\u{1F4DA}", text: (e.title || e.name || "Entry") + " published", time: e.date || e.created_at, action: "archive" }); });
    return items.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 7);
  })();

  const fmtAgo = (ts) => {
    const diff = (Date.now() - new Date(ts)) / 60000;
    if (diff < 1) return "Just now";
    if (diff < 60) return Math.floor(diff) + "m ago";
    if (diff < 1440) return Math.floor(diff / 60) + "h ago";
    return Math.floor(diff / 1440) + "d ago";
  };

  const cardBase = { padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.2s ease" };

  return (
    <div style={{ width: "100%", maxWidth: 860 }}>

      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 2px", fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>{greetingName}</p>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>Alps Marketing Hub</h2>
        </div>

        {oooActive && oooReturnDate && (
          <div style={{ background: "rgba(202,138,4,0.06)", border: "1px solid rgba(202,138,4,0.15)", borderRadius: 10, padding: "11px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F334}"}</span>
            <span style={{ color: "var(--text-secondary)" }}><strong style={{ color: "#ca8a04" }}>Out of Office</strong> {"\u2014"} back on {new Date(oooReturnDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
        )}

        {announcement && announcement.active && announcement.text && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{"\u{1F4E2}"}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{announcement.text}</span>
              {announcement.link && <a href={announcement.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, textDecoration: "none", marginLeft: 8 }}>Learn more {"\u2192"}</a>}
            </div>
          </div>
        )}

        {currentUser && myActiveTickets > 0 && (
          <div style={{ background: "var(--brand-light)", border: "1px solid var(--brand-glow)", borderRadius: 10, padding: "11px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ fontSize: 16 }}>{"\u{1F4CB}"}</span>
            <span style={{ color: "var(--text-primary)" }}>You have <strong style={{ color: "var(--brand)" }}>{myActiveTickets} active ticket{myActiveTickets !== 1 ? "s" : ""}</strong>{myReviewTickets > 0 && <> ({myReviewTickets} ready for review)</>}</span>
            <button onClick={() => onNavigate("profile")} style={{ marginLeft: "auto", padding: "4px 12px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View</button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <button onClick={() => onNavigate("form")} style={{ ...cardBase, background: "var(--brand)", border: "1px solid var(--brand)", boxShadow: "0 2px 8px rgba(35,29,104,0.15)" }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(35,29,104,0.25)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(35,29,104,0.15)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{"\u{1F4DD}"} Submit a Ticket</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Request marketing support</div>
          </button>
          <button onClick={() => onNavigate("lead_form")} style={cardBase} className="hub-card-hover">
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{"\u{1F4C8}"} Log a Lead</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Record an inbound lead</div>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => onNavigate("tracker")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--brand)", padding: 0 }}>{"\u{1F50D}"} Track a Ticket</button>
          {currentUser && myActiveTickets > 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{myActiveTickets} of yours active</span>
          ) : activeCount > 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{activeCount} active</span>
          ) : null}
          {leadsAction > 0 && <span style={{ fontSize: 12, color: "#ca8a04" }}>{leadsAction} need action</span>}
        </div>


        {currentUser && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && quickTitle.trim() && onQuickSubmit) { setQuickSubmitting(true); onQuickSubmit({ name: currentUser.name, title: quickTitle.trim(), description: "Quick submit from homepage", priority: "medium", deadline: "", files: [], actualFiles: [] }).then(() => { setQuickTitle(""); setQuickSubmitting(false); }); } }} placeholder="Quick submit a ticket..." style={{ flex: 1, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
              <button onClick={() => { if (!quickTitle.trim() || !onQuickSubmit) return; setQuickSubmitting(true); onQuickSubmit({ name: currentUser.name, title: quickTitle.trim(), description: "Quick submit from homepage", priority: "medium", deadline: "", files: [], actualFiles: [] }).then(() => { setQuickTitle(""); setQuickSubmitting(false); }); }} disabled={!quickTitle.trim() || quickSubmitting} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!quickTitle.trim() || quickSubmitting) ? 0.5 : 1, whiteSpace: "nowrap" }}>{quickSubmitting ? "Sending..." : "Submit"}</button>
            </div>
          </div>
        )}

        <div className="hub-hero-split" style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14 }}>
          <div>
            {(() => {
              const now = new Date(); const dow = now.getDay();
              const thisMon = new Date(now); thisMon.setDate(now.getDate() - ((dow + 6) % 7)); thisMon.setHours(0,0,0,0);
              const thisSun = new Date(thisMon); thisSun.setDate(thisMon.getDate() + 6); thisSun.setHours(23,59,59,999);
              const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
              const lastSun = new Date(thisMon); lastSun.setDate(thisMon.getDate() - 1); lastSun.setHours(23,59,59,999);
              const calc = (arr, dateKey) => ({ tw: arr.filter((e) => { const d = new Date(dateKey(e)); return d >= thisMon && d <= thisSun; }).length, lw: arr.filter((e) => { const d = new Date(dateKey(e)); return d >= lastMon && d <= lastSun; }).length });
              const arch = calc(archiveEntries || [], (e) => e.date || e.created_at);
              const ld = calc(leads, (l) => l.created_at);
              const comp = calc(tickets.filter((t) => t.completedAt), (t) => t.completedAt);
              const cmp = (curr, prev) => {
                if (curr === 0 && prev === 0) return { text: "Same as last week", color: "var(--text-muted)" };
                if (prev === 0 && curr > 0) return { text: "\u2191" + curr + " vs last week", color: "#16a34a" };
                const diff = curr - prev;
                if (diff > 0) return { text: "\u2191" + diff + " more", color: "#16a34a" };
                if (diff < 0) return { text: "\u2193" + Math.abs(diff) + " fewer", color: "#dc2626" };
                return { text: "Same as last week", color: "var(--text-muted)" };
              };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Outbound Marketing", val: arch.tw, prev: arch.lw, color: "#8b5cf6" },
                    { label: "Leads Added", val: ld.tw, prev: ld.lw, color: "#ca8a04" },
                    { label: "Tickets Completed", val: comp.tw, prev: comp.lw, color: "#16a34a" },
                  ].map((s) => {
                    const c = cmp(s.val, s.prev);
                    return (
                      <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px" }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.val}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "4px 0 2px" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: c.color }}>{c.text}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity</span>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: feedItems.length > 0 ? "#22c55e" : "var(--border)", display: "inline-block" }}></span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 140 }}>
              {feedItems.length === 0 ? (
                <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>No recent activity</div>
              ) : feedItems.map((f, i) => (
                <div key={i} onClick={() => onNavigate(f.action)} style={{ padding: "5px 12px", borderBottom: i < feedItems.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.1s", display: "flex", alignItems: "center", gap: 6 }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-input)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}</div>
                  </div>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>{fmtAgo(f.time)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", gap: 2, background: "var(--bg-card)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", marginBottom: 18 }}>
          {[
            { key: "resources", label: "Resources", count: 6 },
            { key: "tools", label: "Tools", count: 11 },
            { key: "dashboards", label: "Dashboards", count: 4 },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setHomeTab(tab.key)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: homeTab === tab.key ? "var(--brand)" : "transparent", color: homeTab === tab.key ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {homeTab === "resources" && (
          <div className="hub-resource-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { id: "archive", icon: "\u{1F4DA}", title: "Marketing Archive", desc: "Campaigns, posts & materials" },
              { id: "brand_assets", icon: "\u{1F3A8}", title: "Brand Assets", desc: "Colours, fonts, logos & icons" },
              { id: "calendar", icon: "\u{1F4C5}", title: "Content Calendar", desc: "Plan & track content" },
              { id: "gallery", icon: "\u{1F5BC}\uFE0F", title: "Alps Gallery", desc: "Browse & download photos" },
              { id: "broker_toolkit", icon: "\u{1F4BC}", title: "Broker Toolkit", desc: "Broker-facing materials" },
              { id: "campaigns", icon: "\u{1F3AF}", title: "Campaigns", desc: "Track campaign performance" },
            ].map((r) => (
              <button key={r.id} onClick={() => onNavigate(r.id)} style={cardBase} className="hub-card-hover">
                <div style={{ fontSize: 22, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        )}

        {homeTab === "tools" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { id: "templates", icon: "\u{1F4C4}", label: "Content Templates" },
              { id: "converter", icon: "\u{1F504}", label: "File Converter" },
              { id: "qr_generator", icon: "\u{1F517}", label: "QR Generator" },
              { id: "image_editor", icon: "\u{1F58C}\uFE0F", label: "Image Editor" },
              { id: "meeting_notes", icon: "\u{1F4DD}", label: "Notes to Tickets" },
              { id: "repurposer", icon: "\u267B\uFE0F", label: "Content Repurposer" },
              { id: "knowledge_base", icon: "\u{1F4D6}", label: "Knowledge Base" },
              { id: "whitelabel", icon: "\u{1F3F7}\uFE0F", label: "White-Labelled Assets", href: "https://whitelabel.alpsltd.co.uk/" },
              { id: "footer", icon: "\u2709\uFE0F", label: "Email Footer", soon: true },
              { id: "writing_assistant", icon: "\u270D\uFE0F", label: "Writing Assistant", soon: true },
              { id: "linkedin_gen", icon: "\u{1F4DD}", label: "LinkedIn Generator", soon: true },
            ].map((t) => (
              <button key={t.id} onClick={() => { if (t.href) { window.open(t.href, "_blank"); } else if (!t.soon) { onNavigate(t.id); } }} disabled={t.soon} style={{ ...cardBase, opacity: t.soon ? 0.4 : 1, cursor: t.soon ? "default" : "pointer" }} className={t.soon ? "" : "hub-card-hover"}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: t.soon ? 3 : 0 }}>{t.label}</div>
                {t.soon && <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Soon</div>}
              </button>
            ))}
          </div>
        )}

        {homeTab === "dashboards" && (
          <div className="hub-dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { id: "dashboard", icon: "\u{1F4CB}", title: "Tickets", stat: activeCount > 0 ? activeCount + " active" : "View all" },
              { id: "leads_dashboard", icon: "\u{1F4C8}", title: "Leads", stat: leads.length > 0 ? leads.length + " logged" : "View all" },
              { id: "analytics", icon: "\u{1F4CA}", title: "Analytics", stat: "Reports & KPIs" },
            ].map((d) => (
              <button key={d.id} onClick={() => onNavigate(d.id)} style={cardBase} className="hub-card-hover">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{d.icon}</span>
                  {!dashUnlocked && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{"\u{1F512}"}</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{d.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{d.stat}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Changelog />
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
        <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u{1F512}"}</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>Log In</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>Sign in to access dashboards and admin features.</p>
        <div style={{ marginBottom: 12 }}>
          <input ref={inputRef} type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="Username" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16, position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="Password" style={{ ...inputStyle, paddingRight: 44 }} />
          <button onClick={() => setShowPw(!showPw)} type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)", padding: 0, lineHeight: 1 }}>{showPw ? "\u{1F441}\uFE0F" : "\u{1F441}\u200D\u{1F5E8}\uFE0F"}</button>
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


export function Changelog() {
  const entries = [
    { date: "Mar 2026", title: "Approval Workflow", desc: "Submitters can approve or request changes on reviewed tickets." },
    { date: "Mar 2026", title: "SLA Tracking", desc: "Track turnaround times against priority-based SLA targets." },
    { date: "Mar 2026", title: "Email Digest", desc: "Generate weekly summaries to share with stakeholders." },
    { date: "Mar 2026", title: "Meeting Notes Tool", desc: "Extract action items from meeting notes and create tickets." },
    { date: "Mar 2026", title: "Content Repurposer", desc: "Turn long-form content into LinkedIn, email, social & threads." },
    { date: "Mar 2026", title: "Comments & Editing", desc: "Threaded comments, inline ticket editing, and clone." },
    { date: "Mar 2026", title: "Review Status", desc: "New 'Review' stage between In Progress and Complete." },
    { date: "Mar 2026", title: "Smart Notifications", desc: "Deadline reminders and status change alerts." },
    { date: "Mar 2026", title: "File Previews", desc: "Inline image thumbnails on tickets." },
    { date: "Mar 2026", title: "User Accounts", desc: "Sign in, profiles, and role-based access." },
    { date: "Mar 2026", title: "Campaign Tracker", desc: "Group tickets, content, and leads under campaigns." },
    { date: "Mar 2026", title: "Admin Panel", desc: "OOO, passwords, announcements, and data export." },
    { date: "Feb 2026", title: "Brand Assets Overhaul", desc: "Preview thumbnails and branded templates." },
    { date: "Feb 2026", title: "Alps Gallery", desc: "Photo library with search and download." },
    { date: "Jan 2026", title: "Marketing Hub Launch", desc: "Tickets, calendar, brand assets, dashboards." },
  ];
  return (
    <div style={{ paddingTop: 20, borderTop: "1px solid var(--border)" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>What's New</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {entries.slice(0, 6).map((e, i) => (
          <div key={i} style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, transition: "border-color 0.15s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--brand)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{e.title}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{e.date}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{e.desc}</div>
          </div>
        ))}
      </div>
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
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u{1F464}"}</div>
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
      <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Already have an account? <button onClick={onGoToSignUp} style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontWeight: 600, fontSize: 12, padding: 0 }}>Log In</button></p>
    </div>
  );
}


export function ProfilePage({ currentUser, tickets, leads, archiveEntries, onNavigate, onAddComment, notifications }) {
  const [commentTexts, setCommentTexts] = useState({});
  const [activeTicket, setActiveTicket] = useState(null);

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
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{currentUser?.name?.charAt(0)?.toUpperCase() || "?"}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{currentUser?.name}</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>@{currentUser?.username} {"\u2022"} {currentUser?.role}</p>
        </div>
      </div>

      <div className="hub-profile-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand)" }}>{myTickets.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ca8a04" }}>{myActiveTickets.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Active</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#8b5cf6" }}>{myReviewTickets.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Review</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{myCompletedTickets.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Completed</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0284c7" }}>{myLeads.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Leads</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button onClick={() => onNavigate("form")} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4DD}"} New Ticket</button>
        <button onClick={() => onNavigate("lead_form")} style={{ padding: "10px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4C8}"} Log Lead</button>
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

      {myReviewTickets.length > 0 && renderTicketSection("Ready for Review", "\u{1F50D}", myReviewTickets, "")}
      {renderTicketSection("In Progress", "\u{1F528}", myInProgressTickets, "Nothing in progress right now.")}
      {myOpenTickets.length > 0 && renderTicketSection("Open", "\u{1F4E5}", myOpenTickets, "")}

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
                <span style={{ fontSize: 14 }}>{"\u{1F4C8}"}</span>
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
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 8, pointerEvents: "none" }}>
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


export function ActivityLog({ tickets }) {
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