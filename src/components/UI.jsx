import { useState, useRef, useEffect } from "react";
import { renderMarkdown, SLA_TARGETS } from "../constants.js";
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
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}>{icon && <span style={{ display: "flex" }}>{icon}</span>}{title}</h2>
        {subtitle && <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function HubHome({ onNavigate, tickets, dashUnlocked, isAdmin, leads, notifications, calendarEvents, archiveEntries, oooActive, oooReturnDate, announcement, onQuickSubmit, currentUser }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const myTickets = currentUser ? tickets.filter((t) => t.createdBy === currentUser.id || t.name === currentUser.name) : [];
  const myActive = myTickets.filter((t) => t.status !== "completed");
  const myReview = myTickets.filter((t) => t.status === "review");
  const myOpen = myTickets.filter((t) => t.status === "open");
  const myInProg = myTickets.filter((t) => t.status === "in_progress");
  const myCompleted = myTickets.filter((t) => t.status === "completed");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const socials = [
    { href: "https://alpsltd.co.uk/", icon: <Globe size={14} />, label: "Website" },
    { href: "https://linkedin.com/company/alps-ltd/", icon: <Linkedin size={14} />, label: "LinkedIn" },
    { href: "https://www.facebook.com/alpsltdinsurance/", icon: <Facebook size={14} />, label: "Facebook" },
    { href: "https://www.youtube.com/channel/UCJ72w2WOUqDyzGw3q3UmuqA", icon: <Youtube size={14} />, label: "YouTube" },
    { href: "https://www.instagram.com/alpsltd/", icon: <Instagram size={14} />, label: "Instagram" },
  ];

  const OooBanner = () => oooActive && oooReturnDate ? (<div style={{ background: "rgba(202,138,4,0.06)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}><span style={{ color: "#ca8a04" }}><CalendarDays size={14} style={{color:"#ca8a04"}} /></span><span style={{ color: "var(--text-secondary)" }}><strong style={{ color: "#ca8a04" }}>Out of Office</strong> — back {new Date(oooReturnDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span></div>) : null;
  const AnnBanner = () => announcement && announcement.active && announcement.text ? (<div style={{ borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, background: "var(--brand-light)" }}><Sparkles size={14} style={{ color: "var(--brand)", flexShrink: 0 }} /><span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>{announcement.text}{announcement.link && <a href={announcement.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "none", marginLeft: 6, fontSize: 12 }}>Learn more →</a>}</span></div>) : null;

  // ── LOGGED OUT ──
  if (!currentUser) {
    return (
      <div style={{ width: "100%", maxWidth: 680 }}>
        <div style={{ background: "linear-gradient(135deg, var(--brand) 0%, #3730a3 100%)", borderRadius: 16, padding: "40px 36px", marginBottom: 24, color: "#fff" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}>Alps Marketing Hub</h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.7, opacity: 0.85, maxWidth: 480 }}>The central platform for all marketing requests at Alps. Need a social post, a brochure update, event materials, or anything else? Submit a ticket and the marketing team will handle it.</p>
          <p style={{ margin: "0 0 24px", fontSize: 13, opacity: 0.65, lineHeight: 1.6 }}>Browse brand assets, use design tools, and track progress — all in one place.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => onNavigate("form")} style={{ padding: "12px 28px", background: "#fff", border: "none", borderRadius: 8, color: "var(--brand)", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>Submit a Request</button>
            <button onClick={() => onNavigate("tracker")} style={{ padding: "12px 24px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)" }}>Track a Ticket</button>
          </div>
        </div>
        <OooBanner /><AnnBanner />

        {/* Sign up benefits */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "var(--brand-light)", opacity: 0.5 }}></div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <User size={18} style={{ color: "var(--brand)" }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Create a free account</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>Sign up to get more out of the Marketing Hub. It takes 30 seconds and gives you access to:</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {[
                { text: "Your name auto-filled on tickets", icon: <Sparkles size={14} /> },
                { text: "Track all your tickets in one place", icon: <ClipboardList size={14} /> },
                { text: "Get notified when tickets update", icon: <Inbox size={14} /> },
                { text: "Approve or request changes on work", icon: <ExtLink size={14} /> },
                { text: "Access content calendar & campaigns", icon: <Globe size={14} /> },
                { text: "Use templates & meeting notes tools", icon: <Palette size={14} /> },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0" }}>
                  <span style={{ color: "var(--brand)", flexShrink: 0, marginTop: 1 }}>{b.icon}</span>
                  <span style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.4 }}>{b.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => onNavigate("signup")} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px var(--brand-glow)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>Sign Up</button>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Already have an account? <button onClick={() => onNavigate("password")} style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontWeight: 600, fontSize: 12, padding: 0 }}>Log in</button></span>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Follow Alps</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "var(--bg-input)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, textDecoration: "none", transition: "all 0.15s", border: "1px solid transparent" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>{s.icon}<span>{s.label}</span></a>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <button onClick={() => setShowChangelog(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>What's New</button>
        </div>
        {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      </div>
    );
  }

  // ── LOGGED IN ──
  const doQuickSubmit = () => { if (!quickTitle.trim() || !onQuickSubmit) return; setQuickSubmitting(true); onQuickSubmit({ name: currentUser.name, title: quickTitle.trim(), description: "Quick submit from homepage", priority: "medium", deadline: "", files: [], actualFiles: [] }).then(() => { setQuickTitle(""); setQuickSubmitting(false); }); };
  const totalMy = myTickets.length;
  const donePct = totalMy > 0 ? Math.round(myCompleted.length / totalMy * 100) : 0;
  const pR = 26; const pC = 2 * Math.PI * pR; const pO = pC - (donePct / 100) * pC;
  const continueTicket = myActive.find((t) => t.status === "review") || myActive.find((t) => t.status === "in_progress");
  const fmtAgo = (ts) => { const d = (Date.now() - new Date(ts)) / 60000; if (d < 1) return "Just now"; if (d < 60) return Math.floor(d) + "m ago"; if (d < 1440) return Math.floor(d / 60) + "h ago"; return Math.floor(d / 1440) + "d ago"; };
  const statusTotal = myOpen.length + myInProg.length + myReview.length + myCompleted.length;
  const barPct = (n) => statusTotal > 0 ? (n / statusTotal * 100) + "%" : "0%";

  return (
    <div style={{ width: "100%", maxWidth: 900 }}>
      {/* Hero banner */}
      <div style={{ background: "linear-gradient(135deg, var(--brand) 0%, #3730a3 100%)", borderRadius: 16, padding: "28px 32px", marginBottom: 20, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{greeting}, {currentUser.name.split(" ")[0]}</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.7 }}>{myActive.length === 0 ? "You're all clear — no active tickets right now." : "You have " + myActive.length + " active ticket" + (myActive.length !== 1 ? "s" : "") + (myReview.length > 0 ? " (" + myReview.length + " ready for review)" : myInProg.length > 0 ? " (" + myInProg.length + " in progress)" : "") + "."}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doQuickSubmit(); }} placeholder="Quick submit a ticket..." style={{ flex: 1, padding: "9px 14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, color: "#fff", outline: "none", boxSizing: "border-box", backdropFilter: "blur(4px)" }} />
            <button onClick={doQuickSubmit} disabled={!quickTitle.trim() || quickSubmitting} style={{ padding: "9px 16px", background: "#fff", border: "none", borderRadius: 8, color: "var(--brand)", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: (!quickTitle.trim() || quickSubmitting) ? 0.5 : 1, whiteSpace: "nowrap" }}>{quickSubmitting ? "..." : "Submit →"}</button>
          </div>
        </div>
        {totalMy > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <div style={{ position: "relative", width: 64, height: 64 }}>
              <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={32} cy={32} r={pR} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
                <circle cx={32} cy={32} r={pR} fill="none" stroke="#fff" strokeWidth={5} strokeDasharray={pC} strokeDashoffset={pO} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{donePct}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>Completion</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{myCompleted.length}/{totalMy} done</div>
            </div>
          </div>
        )}
      </div>

      <OooBanner /><AnnBanner />

      {/* Status bar */}
      {statusTotal > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex", background: "var(--bar-bg)" }}>
            {myOpen.length > 0 && <div style={{ width: barPct(myOpen.length), background: "#6366f1", transition: "width 0.4s" }} title={myOpen.length + " Open"}></div>}
            {myInProg.length > 0 && <div style={{ width: barPct(myInProg.length), background: "#0284c7", transition: "width 0.4s" }} title={myInProg.length + " In Progress"}></div>}
            {myReview.length > 0 && <div style={{ width: barPct(myReview.length), background: "#8b5cf6", transition: "width 0.4s" }} title={myReview.length + " Review"}></div>}
            {myCompleted.length > 0 && <div style={{ width: barPct(myCompleted.length), background: "#16a34a", transition: "width 0.4s" }} title={myCompleted.length + " Completed"}></div>}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
            {myOpen.length > 0 && <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#6366f1", marginRight: 4 }}></span>{myOpen.length} Open</span>}
            {myInProg.length > 0 && <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#0284c7", marginRight: 4 }}></span>{myInProg.length} In Progress</span>}
            {myReview.length > 0 && <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#8b5cf6", marginRight: 4 }}></span>{myReview.length} Review</span>}
            {myCompleted.length > 0 && <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#16a34a", marginRight: 4 }}></span>{myCompleted.length} Done</span>}
          </div>
        </div>
      )}

      {/* Continue where you left off */}
      {continueTicket && (
        <div onClick={() => onNavigate("tracker")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: continueTicket.status === "review" ? "rgba(139,92,246,0.06)" : "rgba(2,132,199,0.06)", border: "1px solid " + (continueTicket.status === "review" ? "rgba(139,92,246,0.15)" : "rgba(2,132,199,0.15)"), borderRadius: 10, marginBottom: 20, cursor: "pointer", transition: "all 0.15s" }} onMouseOver={(e) => e.currentTarget.style.boxShadow = "var(--shadow-hover)"} onMouseOut={(e) => e.currentTarget.style.boxShadow = "none"}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: continueTicket.status === "review" ? "#8b5cf6" : "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{continueTicket.status === "review" ? <ExtLink size={18} /> : <Sparkles size={18} />}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: continueTicket.status === "review" ? "#8b5cf6" : "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{continueTicket.status === "review" ? "Ready for your review" : "In progress"}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{continueTicket.ref} — {continueTicket.title}</div>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 18 }}>→</span>
        </div>
      )}

      {/* Quick action cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }} className="hub-stats-grid">
        <button onClick={() => onNavigate("form")} style={{ padding: "16px", background: "var(--brand)", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left", color: "#fff", transition: "all 0.15s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px var(--brand-glow)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
          <Sparkles size={20} style={{ marginBottom: 8, opacity: 0.7 }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Submit a Ticket</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Request marketing support</div>
        </button>
        <button onClick={() => onNavigate("tracker")} style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s" }} className="hub-card-hover">
          <ExtLink size={20} style={{ marginBottom: 8, color: "#0284c7" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Track a Ticket</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Check ticket status</div>
        </button>
        <button onClick={() => onNavigate("brand_assets")} style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s" }} className="hub-card-hover">
          <Palette size={20} style={{ marginBottom: 8, color: "#20A39E" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Brand Assets</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Logos, colours & guidelines</div>
        </button>
      </div>

      {/* Onboarding checklist - show for new users */}
      {(() => {
        const steps = [
          { key: "account", label: "Create your account", done: true },
          { key: "submit", label: "Submit your first ticket", done: myTickets.length > 0 },
          { key: "track", label: "Track a ticket", done: myTickets.length > 0 },
          { key: "brand", label: "Browse brand assets", done: false },
        ];
        const allDone = steps.every((s) => s.done);
        const dismissed = (() => { try { return localStorage.getItem("alps_checklist_dismissed") === "1"; } catch { return false; } })();
        if (allDone || dismissed) return null;
        const doneCnt = steps.filter((s) => s.done).length;
        return (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Getting Started</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{doneCnt}/{steps.length}</span>
                <button onClick={() => { try { localStorage.setItem("alps_checklist_dismissed", "1"); } catch {} window.location.reload(); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: 0 }}>Dismiss</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {steps.map((s) => (
                <div key={s.key} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: s.done ? "rgba(22,163,74,0.04)" : "var(--bg-input)", borderRadius: 8, border: "1px solid " + (s.done ? "rgba(22,163,74,0.15)" : "transparent") }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, border: s.done ? "none" : "2px solid var(--border)", background: s.done ? "#16a34a" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.done && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}</div>
                  <span style={{ fontSize: 12, color: s.done ? "#16a34a" : "var(--text-secondary)", fontWeight: s.done ? 600 : 500, textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Your active tickets - compact */}
      {myActive.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Tickets</span>
            <button onClick={() => onNavigate("tracker")} style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>View all →</button>
          </div>
          {myActive.slice(0, 5).map((t, i) => {
            const s = { open: { color: "#6366f1", bg: "rgba(99,102,241,0.08)", label: "Open" }, in_progress: { color: "#0284c7", bg: "rgba(2,132,199,0.08)", label: "In Progress" }, review: { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", label: "Review" } }[t.status] || { color: "#64748b", bg: "var(--bg-input)", label: t.status };
            return (
              <div key={t.id} onClick={() => onNavigate("tracker")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.1s" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-input)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--brand)", flexShrink: 0 }}>{t.ref || t.id}</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently published + This week */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }} className="hub-hero-split">
        {/* Recently published */}
        {archiveEntries && archiveEntries.length > 0 && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recently Published</span>
              <button onClick={() => onNavigate("archive")} style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>View all →</button>
            </div>
            {[...archiveEntries].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)).slice(0, 4).map((e, i) => (
              <div key={e.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "#8b5cf6", flexShrink: 0 }}></div>
                <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{new Date(e.date || e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        )}

        {/* This week */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>This Week</span>
          {(() => {
            const now = new Date(); const dow = now.getDay();
            const mon = new Date(now); mon.setDate(now.getDate() - ((dow + 6) % 7)); mon.setHours(0,0,0,0);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
            const weekEvents = (calendarEvents || []).filter((e) => { const d = new Date(e.date); return d >= mon && d <= sun; }).sort((a, b) => a.date.localeCompare(b.date));
            const weekDeadlines = tickets.filter((t) => t.status !== "completed" && t.deadline).filter((t) => { const d = new Date(t.deadline + "T00:00:00"); return d >= mon && d <= sun; }).sort((a, b) => a.deadline.localeCompare(b.deadline));
            const items = [
              ...weekEvents.map((e) => ({ type: "event", label: e.title, date: e.date })),
              ...weekDeadlines.map((t) => ({ type: "deadline", label: (t.ref || t.id) + ": " + t.title, date: t.deadline })),
            ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
            if (items.length === 0) return <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0", textAlign: "center" }}>Nothing scheduled this week</div>;
            return items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: item.type === "event" ? "#0284c7" : "#ca8a04", flexShrink: 0 }}></div>
                <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{new Date(item.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Footer: socials + changelog */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "var(--bg-card)", borderRadius: 6, color: "var(--text-muted)", fontSize: 10, fontWeight: 500, textDecoration: "none", border: "1px solid var(--border)", transition: "all 0.12s" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>{s.icon}</a>
          ))}
        </div>
        <button onClick={() => setShowChangelog(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: 0 }}>What's New</button>
      </div>
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  );
}

function ChangelogModal({ onClose }) {
  const entries = [
    { date: "Mar 2026", title: "Sidebar Navigation", desc: "New sidebar layout with URL routing and browser history." },
    { date: "Mar 2026", title: "Lucide Icons", desc: "Consistent icon set replacing emojis throughout." },
    { date: "Mar 2026", title: "Approval Workflow", desc: "Approve or request changes on reviewed tickets." },
    { date: "Mar 2026", title: "SLA Tracking", desc: "Turnaround tracking against priority-based targets." },
    { date: "Mar 2026", title: "Meeting Notes Tool", desc: "Extract action items and create tickets." },
    { date: "Mar 2026", title: "Content Repurposer", desc: "Reformat content for LinkedIn, email, social & threads." },
    { date: "Mar 2026", title: "User Accounts", desc: "Sign in, profiles, and role-based access." },
    { date: "Jan 2026", title: "Marketing Hub Launch", desc: "Tickets, calendar, brand assets, dashboards." },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20, backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px", maxWidth: 480, width: "100%", maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>What's New</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: "4px 8px" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {entries.map((e, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{e.title}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.date}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </div>
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