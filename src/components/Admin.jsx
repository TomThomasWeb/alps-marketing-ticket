import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import { supabase } from "../supabaseClient.js";
import { PRIORITIES, STATUS, ARCHIVE_TYPES, LEAD_SOURCES, SLA_TARGETS, getDueBadge, daysUntil, formatDate, renderMarkdown } from "../constants.js";
import { BarChart3, PieChart, CalendarDays, FileText, ClipboardList, TrendingUp, Mail, Download, Database, Users, Shield, Clock, Megaphone, Pin, Activity, Lock, ChevronDown, Repeat, Pause, Play, Trash2, Edit, Plus, Target, CheckCircle2, AlertCircle, Library } from "lucide-react";
import { PageHeader } from "./UI.jsx";


export function AnalyticsPanel({ tickets, archiveEntries, leads, teamGoals, isAdmin, onGoalSave, onGoalDelete }) {
  const [openSections, setOpenSections] = useState({ tickets: false, archive: false, leads: false, reports: false });
  const toggle = (s) => setOpenSections((p) => ({ ...p, [s]: !p[s] }));
  const card = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };
  const mb = { background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", textAlign: "center" };
  const mv = { fontSize: 26, fontWeight: 800, color: "var(--brand)", lineHeight: 1 };
  const ml = { fontSize: 11, color: "var(--text-secondary)", fontWeight: 500, marginTop: 4 };
  const st = { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" };
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
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  const solm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const eolm = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const tmDone = ct.filter((t) => new Date(t.completedAt) >= som).length;
  const lmDone = ct.filter((t) => { const c = new Date(t.completedAt); return c >= solm && c <= eolm; }).length;
  const dayOfMonth = now.getDate(); const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
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

  // SLA
  const withSla = ct.map((t) => { const hours = (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000; const target = SLA_TARGETS[t.priority]; return { ...t, hours, met: target ? hours <= target.hours : true }; });
  const slaMet = withSla.filter((t) => t.met).length;
  const slaPct = withSla.length > 0 ? Math.round(slaMet / withSla.length * 100) : 100;

  const barChart = (data, maxV, color, vKey) => (<div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>{data.map((m, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: "60%", background: color, borderRadius: "3px 3px 0 0", height: (m[vKey] / maxV * 80) + "px", minHeight: m[vKey] > 0 ? 4 : 0, opacity: 0.7 }}></div><span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{m.label}</span></div>))}</div>);

  const cmp = (a, b) => a > b ? { t: "+" + (a - b), c: "#16a34a" } : a < b ? { t: "" + (a - b), c: "#dc2626" } : { t: "—", c: "var(--text-muted)" };

  const SectionCard = ({ id, title, icon, color, headline, headlineSub, children }) => (
    <div style={{ ...card, marginBottom: 12, padding: 0, overflow: "hidden" }}>
      <button onClick={() => toggle(id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "16px 20px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "12", display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{headlineSub}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{headline}</span>
          <ChevronDown size={16} style={{ color: "var(--text-muted)", transform: openSections[id] ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </div>
      </button>
      {openSections[id] && <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      <PageHeader icon={<PieChart size={22} color="#8b5cf6" />} title="Analytics" subtitle="Performance overview across all areas" />

      {/* Summary metrics with trends */}
      <div className="hub-analytics-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { v: at.length, l: "Active Tickets", c: "var(--brand)", tw: at.length, lw: tickets.filter((t) => t.status !== "completed").length },
          { v: cr + "%", l: "Completion Rate", c: cr >= 80 ? "#16a34a" : cr >= 50 ? "#ca8a04" : "#dc2626" },
          { v: fmtH(avgH), l: "Avg Turnaround", c: "var(--brand)" },
          { v: archiveEntries.length, l: "Content Published", c: "#8b5cf6", tw: atw, lw: alw },
          { v: leads.length, l: "Total Leads", c: "#0d9488", tw: ltw, lw: llw },
          { v: slaPct + "%", l: "SLA Met", c: slaPct >= 80 ? "#16a34a" : "#dc2626" },
        ].map((s) => (
          <div key={s.l} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, marginTop: 4 }}>{s.l}</div>
            {s.tw !== undefined && <div style={{ fontSize: 10, marginTop: 3, color: s.tw > s.lw ? "#16a34a" : s.tw < s.lw ? "#dc2626" : "var(--text-muted)", fontWeight: 600 }}>{s.tw > s.lw ? "↑" : s.tw < s.lw ? "↓" : "—"} {s.tw} this week</div>}
          </div>
        ))}
      </div>

      {/* Multi-line trend chart - tickets + content + leads */}
      <div style={{ ...card, marginBottom: 20, padding: "16px 20px" }}>
        <div style={st}>6-Month Trend</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
          {mt.map((m, i) => {
            const archV = (ma[i] || { v: 0 }).v;
            const leadV = (mld[i] || { v: 0 }).v;
            const localMax = Math.max(mmt, mma, mml, 1);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ display: "flex", gap: 1, alignItems: "flex-end", width: "100%", justifyContent: "center", height: 90 }}>
                  <div style={{ width: "22%", background: "var(--brand)", borderRadius: "2px 2px 0 0", height: (m.c / localMax * 85) + "px", minHeight: m.c > 0 ? 3 : 0, opacity: 0.6 }} title={m.c + " submitted"}></div>
                  <div style={{ width: "22%", background: "#16a34a", borderRadius: "2px 2px 0 0", height: (m.done / localMax * 85) + "px", minHeight: m.done > 0 ? 3 : 0, opacity: 0.6 }} title={m.done + " completed"}></div>
                  <div style={{ width: "22%", background: "#8b5cf6", borderRadius: "2px 2px 0 0", height: (archV / localMax * 85) + "px", minHeight: archV > 0 ? 3 : 0, opacity: 0.6 }} title={archV + " published"}></div>
                  <div style={{ width: "22%", background: "#0d9488", borderRadius: "2px 2px 0 0", height: (leadV / localMax * 85) + "px", minHeight: leadV > 0 ? 3 : 0, opacity: 0.6 }} title={leadV + " leads"}></div>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{m.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--brand)", marginRight: 4, opacity: 0.6 }}></span>Submitted</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#16a34a", marginRight: 4, opacity: 0.6 }}></span>Completed</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#8b5cf6", marginRight: 4, opacity: 0.6 }}></span>Published</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#0d9488", marginRight: 4, opacity: 0.6 }}></span>Leads</span>
        </div>
      </div>

      {/* Collapsible detail sections */}
      <SectionCard id="tickets" title="Tickets" icon={<ClipboardList size={18} />} color="#6366f1" headline={at.length} headlineSub={twC + " this week · " + od + " overdue"}>
        <div style={{ paddingTop: 16 }}>
          <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div><div style={st}>Week Comparison</div><div className="hub-week-compare" style={{ display: "flex", gap: 20, justifyContent: "center", fontSize: 13, color: "var(--text-secondary)" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Last Week</div><span><strong style={{ color: "var(--brand)", fontSize: 16 }}>{lwC}</strong> in</span><span style={{ margin: "0 4px", opacity: 0.3 }}>|</span><span><strong style={{ color: "#16a34a", fontSize: 16 }}>{lwD}</strong> out</span></div><div style={{ width: 1, height: 28, background: "var(--border)" }}></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>This Week</div><span><strong style={{ color: "var(--brand)", fontSize: 16 }}>{twC}</strong> in</span><span style={{ margin: "0 4px", opacity: 0.3 }}>|</span><span><strong style={{ color: "#16a34a", fontSize: 16 }}>{twD}</strong> out</span></div></div></div>
            <div><div style={st}>Turnaround by Priority</div>{Object.entries(PRIORITIES).map(([key, p]) => (<div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{p.icon} {p.label}</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{pa[key]}</span></div>))}</div>
          </div>
          <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><div style={st}>Active by Priority</div>{Object.entries(PRIORITIES).map(([key, p]) => (<div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 600, color: p.color, width: 60, flexShrink: 0 }}>{p.icon} {p.label}</span><div style={{ flex: 1, height: 8, background: "var(--bar-bg)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: (pb[key] / mp * 100) + "%", height: "100%", background: p.color, borderRadius: 4 }}></div></div><span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-body)", width: 20, textAlign: "right" }}>{pb[key]}</span></div>))}</div>
            <div><div style={st}>Top Submitters</div>{topS.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No tickets yet</p> : topS.slice(0, 5).map(([name, count]) => (<div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, color: "var(--text-body)" }}>{name}</span><span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "1px 8px", borderRadius: 10 }}>{count}</span></div>))}</div>
          </div>
          {/* Turnaround distribution */}
          {ct.length > 0 && (() => {
            const buckets = [{ label: "< 4h", max: 4 }, { label: "4-8h", max: 8 }, { label: "8-24h", max: 24 }, { label: "1-3d", max: 72 }, { label: "3-7d", max: 168 }, { label: "7d+", max: Infinity }];
            const counts = buckets.map(() => 0);
            cTimes.forEach((h) => { const idx = buckets.findIndex((b) => h < b.max); counts[idx >= 0 ? idx : counts.length - 1]++; });
            const maxC = Math.max(...counts, 1);
            return (
              <div style={{ marginTop: 16 }}>
                <div style={st}>Turnaround Distribution</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                  {buckets.map((b, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      {counts[i] > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{counts[i]}</span>}
                      <div style={{ width: "70%", background: i < 2 ? "#16a34a" : i < 4 ? "#ca8a04" : "#dc2626", borderRadius: "3px 3px 0 0", height: (counts[i] / maxC * 55) + "px", minHeight: counts[i] > 0 ? 4 : 0, opacity: 0.6 }}></div>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </SectionCard>

      <SectionCard id="archive" title="Content Output" icon={<Library size={18} />} color="#8b5cf6" headline={archiveEntries.length} headlineSub={atw + " this week" + (atw !== alw ? " (" + cmp(atw, alw).t + " vs last)" : "")}>
        <div style={{ paddingTop: 16 }}>
          <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><div style={st}>Monthly Output</div>{barChart(ma, mma, "#8b5cf6", "v")}</div>
            <div><div style={st}>By Type</div>{Object.entries(ARCHIVE_TYPES).map(([key, t]) => (<div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 600, color: t.color, width: 80, flexShrink: 0 }}>{t.icon} {t.label}</span><div style={{ flex: 1, height: 8, background: "var(--bar-bg)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: ((atb[key] || 0) / mat * 100) + "%", height: "100%", background: t.color, borderRadius: 4 }}></div></div><span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-body)", width: 20, textAlign: "right" }}>{atb[key] || 0}</span></div>))}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard id="leads" title="Leads" icon={<TrendingUp size={18} />} color="#0d9488" headline={leads.length} headlineSub={lna + " needs action · " + lpt + " passed through"}>
        <div style={{ paddingTop: 16 }}>
          <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><div style={st}>Monthly Leads</div>{barChart(mld, mml, "#0d9488", "v")}</div>
            <div><div style={st}>By Source</div>{Object.entries(LEAD_SOURCES).map(([key, s]) => { const cnt = lsb[key] || 0; if (cnt === 0 && key === "other") return null; return (<div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 600, color: s.color, width: 70, flexShrink: 0 }}>{s.icon} {s.label}</span><div style={{ flex: 1, height: 8, background: "var(--bar-bg)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: (cnt / mls * 100) + "%", height: "100%", background: s.color, borderRadius: 4 }}></div></div><span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-body)", width: 20, textAlign: "right" }}>{cnt}</span></div>); })}</div>
          </div>
        </div>
      </SectionCard>

      {/* Reports section - collapsible at bottom */}
      <SectionCard id="reports" title="Reports" icon={<FileText size={18} />} color="#64748b" headline="" headlineSub="Weekly digest, monthly report, PDF export">
        <div style={{ paddingTop: 16 }}>
      {(() => {
        // Weekly report data (previous Mon-Sun)
        const today = new Date(now);
        const dayOfWeek = today.getDay();
        const lastSunday = new Date(today); lastSunday.setDate(today.getDate() - (dayOfWeek === 0 ? 7 : dayOfWeek)); lastSunday.setHours(23, 59, 59, 999);
        const lastMonday = new Date(lastSunday); lastMonday.setDate(lastSunday.getDate() - 6); lastMonday.setHours(0, 0, 0, 0);
        const wkLabel = lastMonday.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " \u2013 " + lastSunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        const wkTC = tickets.filter((t) => { const d = new Date(t.createdAt); return d >= lastMonday && d <= lastSunday; }).length;
        const wkTD = ct.filter((t) => { const d = new Date(t.completedAt); return d >= lastMonday && d <= lastSunday; }).length;
        const wkA = archiveEntries.filter((e) => { const d = new Date(e.date || e.created_at); return d >= lastMonday && d <= lastSunday; }).length;
        const wkL = leads.filter((l) => { const d = new Date(l.created_at); return d >= lastMonday && d <= lastSunday; }).length;
        const wkAvg = (() => { const m = ct.filter((t) => { const d = new Date(t.completedAt); return d >= lastMonday && d <= lastSunday; }); return m.length > 0 ? m.reduce((s, t) => s + (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000, 0) / m.length : 0; })();
        const wkReportLines = [
          "ALPS MARKETING REPORT - WEEK OF " + wkLabel.toUpperCase(),
          "=".repeat(50), "",
          "TICKETS", "  Submitted: " + wkTC, "  Completed: " + wkTD, "  Avg Turnaround: " + fmtH(wkAvg), "",
          "OUTBOUND CONTENT", "  Pieces Published: " + wkA, "",
          "INBOUND LEADS", "  Total: " + wkL, "",
          "Generated: " + now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        ].join("\n");
        const copyWeeklyReport = () => { navigator.clipboard.writeText(wkReportLines); };

        // Monthly report data
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
          "  Total Time Logged: " + (() => { const TIME_MINS = { "15m": 15, "30m": 30, "1h": 60, "2h": 120, "half_day": 240, "full_day": 480, "multi_day": 960 }; const total = tickets.filter((t) => t.timeSpent && new Date(t.createdAt) >= som).reduce((s, t) => s + (TIME_MINS[t.timeSpent] || 0), 0); const h = Math.floor(total / 60); const m = total % 60; return h > 0 ? h + "h " + m + "m" : m + "m"; })(),
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
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--brand)" }}><CalendarDays size={18} style={{ display: "inline" }} /> Weekly Report</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Previous week: {wkLabel}</p>
              </div>
              <button onClick={copyWeeklyReport} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><><ClipboardList size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Copy Weekly Report</></button>
            </div>
            <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{wkTC}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Submitted</div>
              </div>
              <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>{wkTD}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Completed</div>
              </div>
              <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#E64592" }}>{wkA}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Published</div>
              </div>
              <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#ca8a04" }}>{wkL}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Leads</div>
              </div>
            </div>
            {wkAvg > 0 && <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>Avg turnaround: <strong>{fmtH(wkAvg)}</strong></div>}
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--brand)" }}><Mail size={18} style={{ display: "inline" }} /> Weekly Email Digest</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Copy a formatted summary to send to stakeholders</p>
              </div>
              <button onClick={() => {
                const slaMetCount = ct.filter((t) => { const h = (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000; const tgt = SLA_TARGETS[t.priority]; return tgt && h <= tgt.hours; }).length;
                const slaPct = ct.length > 0 ? Math.round(slaMetCount / ct.length * 100) : 0;
                const topCompleted = ct.filter((t) => { const d = new Date(t.completedAt); return d >= sow; }).slice(0, 5);
                const digest = [
                  "Hi team,",
                  "",
                  "Here's the marketing team's weekly update for " + wkLabel + ".",
                  "",
                  "KEY METRICS",
                  "\u2022 " + wkTC + " new ticket" + (wkTC !== 1 ? "s" : "") + " submitted",
                  "\u2022 " + wkTD + " ticket" + (wkTD !== 1 ? "s" : "") + " completed",
                  wkAvg > 0 ? "\u2022 Average turnaround: " + fmtH(wkAvg) : "",
                  "\u2022 " + wkA + " piece" + (wkA !== 1 ? "s" : "") + " of content published",
                  "\u2022 " + wkL + " inbound lead" + (wkL !== 1 ? "s" : "") + " logged",
                  "\u2022 SLA compliance: " + slaPct + "%",
                  "",
                  at.length > 0 ? "ACTIVE BACKLOG: " + at.length + " ticket" + (at.length !== 1 ? "s" : "") + " (" + od + " overdue)" : "",
                  "",
                  topCompleted.length > 0 ? "\u2705 COMPLETED THIS WEEK" : "",
                  ...topCompleted.map((t) => "\u2022 " + (t.ref || t.id) + ": " + t.title),
                  "",
                  "Best regards,",
                  "Alps Marketing Team",
                ].filter(Boolean).join("\n");
                navigator.clipboard.writeText(digest);
              }} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><><Mail size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Copy Email Digest</></button>
            </div>
            <div style={{ padding: "14px 16px", background: "var(--bg-input)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8, fontFamily: "inherit" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Preview:</div>
              <div>Hi team, here's the weekly update for {wkLabel}.</div>
              <div style={{ marginTop: 6 }}><BarChart3 size={13} style={{display:"inline",verticalAlign:"-1px"}} /> <strong>{wkTC}</strong> submitted {"\u2022"} <strong>{wkTD}</strong> completed {"\u2022"} <strong>{wkA}</strong> published {"\u2022"} <strong>{wkL}</strong> leads {wkAvg > 0 && <>{"\u2022"} Avg turnaround: <strong>{fmtH(wkAvg)}</strong></>}</div>
              {at.length > 0 && <div style={{ marginTop: 4 }}><ClipboardList size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Active backlog: <strong>{at.length}</strong> tickets ({od} overdue)</div>}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 20, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--brand)" }}><ClipboardList size={20} style={{ display: "inline" }} /> Monthly Marketing Report</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>{monthName} summary across all marketing activity</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={copyReport} style={{ padding: "10px 24px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><><ClipboardList size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Copy to Clipboard</></button>
              <button onClick={exportPDF} style={{ padding: "10px 24px", background: "#dc2626", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><><FileText size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Export PDF</></button>
            </div>
          </div>
          <div className="hub-analytics-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={card}>
              <div style={st}><ClipboardList size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Tickets</div>
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
              <div style={st}><Library size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Content Output</div>
              <div style={mb}><div style={mv}>{mtA}</div><div style={ml}>Pieces Published</div></div>
              {Object.entries(mtAT).length > 0 && <div style={{ marginTop: 12 }}>{Object.entries(mtAT).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}><span style={{ color: "var(--text-secondary)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{v}</span></div>)}</div>}
            </div>
            <div style={card}>
              <div style={st}><TrendingUp size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Inbound Leads</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={mb}><div style={mv}>{mtL}</div><div style={ml}>Total</div></div>
                <div style={mb}><div style={mv}>{mtLP}</div><div style={ml}>Passed</div></div>
              </div>
              {mtLA > 0 && <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(202,138,4,0.08)", border: "1px solid rgba(202,138,4,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#ca8a04" }}><AlertCircle size={13} style={{display:"inline",verticalAlign:"-1px",color:"#ca8a04"}} /> {mtLA} still need{mtLA !== 1 ? "" : "s"} action</div>}
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
      </SectionCard>
    </div>
  );
}



export function AdminPanel({ oooActive, oooReturnDate, oooStartDate, onToggleOoo, tickets, leads, archiveEntries, oooSummaryDismissed, onDismissSummary, calendarEvents, dashboardPassword, onChangePassword, announcement, onUpdateAnnouncement, recurringSchedules, onCreateRecurring, onUpdateRecurring, onDeleteRecurring, onPauseRecurring, teamGoals, onGoalSave, onGoalDelete, galleryImages, kbArticles, hubUsers, onAddUser, onUpdateUser, onDeleteUser, auditLog, onSaveSla }) {
  const [adminTab, setAdminTab] = useState("overview");
  const [returnDate, setReturnDate] = useState(oooReturnDate || "");
  const [showSummary, setShowSummary] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [annText, setAnnText] = useState(announcement?.text || "");
  const [annActive, setAnnActive] = useState(announcement?.active || false);
  const [annLink, setAnnLink] = useState(announcement?.link || "");
  const [exporting, setExporting] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", username: "", password: "", role: "user" });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoSaved, setMemoSaved] = useState(false);
  const [memoLoaded, setMemoLoaded] = useState(false);
  const [slaForm, setSlaForm] = useState({ critical: SLA_TARGETS.critical?.days || 1, high: SLA_TARGETS.high?.days || 2, medium: SLA_TARGETS.medium?.days || 5, low: SLA_TARGETS.low?.days || 7 });
  const [slaSaved, setSlaSaved] = useState(false);
  const handleSlaSave = () => { const targets = {}; Object.entries(slaForm).forEach(([key, days]) => { targets[key] = { days: Number(days), hours: Number(days) * 8, label: days + " day" + (days !== 1 ? "s" : "") }; }); if (onSaveSla) onSaveSla(targets); setSlaSaved(true); setTimeout(() => setSlaSaved(false), 2000); };

  useEffect(() => { setAnnText(announcement?.text || ""); setAnnActive(announcement?.active || false); setAnnLink(announcement?.link || ""); }, [announcement]);

  useEffect(() => {
    if (!memoLoaded) {
      supabase.from("app_settings").select("*").eq("key", "admin_memo").single().then(({ data }) => {
        if (data && data.value) { try { setMemo(typeof data.value === "string" ? JSON.parse(data.value).text || "" : data.value.text || ""); } catch {} }
        setMemoLoaded(true);
      });
    }
  }, [memoLoaded]);

  const saveMemo = async () => {
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "admin_memo").single();
    if (existing) { await supabase.from("app_settings").update({ value: { text: memo } }).eq("key", "admin_memo"); }
    else { await supabase.from("app_settings").insert({ key: "admin_memo", value: { text: memo } }); }
    setMemoSaved(true); setTimeout(() => setMemoSaved(false), 2000);
  };

  const getOooSummary = () => {
    if (!oooStartDate) return null;
    const start = new Date(oooStartDate + "T00:00:00"); const now = new Date();
    return { ticketsAdded: tickets.filter((t) => new Date(t.createdAt) >= start && new Date(t.createdAt) <= now), leadsAdded: leads.filter((l) => new Date(l.created_at) >= start && new Date(l.created_at) <= now), ticketsCompleted: tickets.filter((t) => t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) <= now), startDate: start };
  };
  const summary = getOooSummary();
  const shouldShowSummary = !oooActive && oooStartDate && !oooSummaryDismissed && summary && (summary.ticketsAdded.length > 0 || summary.leadsAdded.length > 0);

  const handlePasswordChange = () => { if (!newPw.trim() || newPw !== pwConfirm) return; onChangePassword(newPw.trim()); setNewPw(""); setPwConfirm(""); setPwSaved(true); setTimeout(() => setPwSaved(false), 3000); };
  const handleAnnouncementSave = () => { onUpdateAnnouncement({ text: annText, active: annActive, link: annLink }); };

  const exportData = async () => {
    setExporting(true);
    const data = { exportDate: new Date().toISOString(), tickets: tickets.map((t) => ({ ref: t.ref, title: t.title, name: t.name, status: t.status, priority: t.priority, createdAt: t.createdAt, completedAt: t.completedAt, deadline: t.deadline, timeSpent: t.timeSpent })), leads: leads.map((l) => ({ broker: l.broker, product: l.product, source: l.source, next_steps: l.next_steps, created_at: l.created_at })), archiveEntries: (archiveEntries || []).map((e) => ({ title: e.title, type: e.type, date: e.date })), calendarEvents: (calendarEvents || []).map((e) => ({ title: e.title, type: e.type, date: e.date, status: e.status })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "alps-hub-export-" + new Date().toISOString().substring(0, 10) + ".json"; a.click(); setExporting(false);
  };
  const exportCSV = (type) => {
    let rows = [], filename = "";
    if (type === "tickets") { rows = [["Ref", "Title", "Submitter", "Status", "Priority", "Time Spent", "Created", "Completed", "Deadline"]]; tickets.forEach((t) => rows.push([t.ref, t.title, t.name, t.status, t.priority, t.timeSpent || "", t.createdAt, t.completedAt || "", t.deadline || ""])); filename = "alps-tickets.csv"; }
    else if (type === "leads") { rows = [["Broker", "Product", "Source", "Status", "Created"]]; leads.forEach((l) => rows.push([l.broker, l.product, l.source, l.next_steps, l.created_at])); filename = "alps-leads.csv"; }
    else if (type === "archive") { rows = [["Title", "Type", "Date"]]; (archiveEntries || []).forEach((e) => rows.push([e.title, e.type, e.date])); filename = "alps-archive.csv"; }
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  // Hub health calculations
  const overdue = tickets.filter((t) => t.deadline && t.status !== "completed" && new Date(t.deadline) < new Date()).length;
  const unactioned = leads.filter((l) => l.next_steps === "needs_action").length;
  const activeTickets = tickets.filter((t) => t.status !== "completed").length;
  const goalsBehind = (teamGoals || []).filter((g) => {
    const now = new Date(); let start;
    if (g.period === "weekly") { start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0,0,0,0); }
    else if (g.period === "monthly") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else { const q = Math.floor(now.getMonth() / 3); start = new Date(now.getFullYear(), q * 3, 1); }
    const end = new Date();
    const elapsed = (end - start) / 86400000;
    const totalDays = g.period === "weekly" ? 7 : g.period === "monthly" ? 30 : 90;
    const pctThrough = Math.min(elapsed / totalDays, 1);
    const expectedProgress = Math.round(g.target * pctThrough);
    let current = 0;
    if (g.metric === "tickets_completed") current = tickets.filter((t) => t.completedAt && new Date(t.completedAt) >= start).length;
    else if (g.metric === "content_published") current = (archiveEntries || []).filter((e) => new Date(e.date || e.created_at) >= start).length;
    else if (g.metric === "leads_generated") current = leads.filter((l) => new Date(l.created_at) >= start).length;
    return current < expectedProgress && pctThrough > 0.25;
  }).length;

  const nextSchedule = (() => {
    const active = (recurringSchedules || []).filter((s) => !s.paused);
    if (active.length === 0) return null;
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const next = active.map((s) => {
      const freq = { weekly: 7, fortnightly: 14, monthly: 30, quarterly: 90 };
      let nd;
      if (!s.last_created) { nd = new Date(); nd.setDate(nd.getDate() + 1); }
      else { nd = new Date(s.last_created); nd.setDate(nd.getDate() + (freq[s.frequency] || 30)); }
      nd.setHours(8, 0, 0, 0);
      return { ...s, nextDue: nd };
    }).sort((a, b) => a.nextDue - b.nextDue);
    return next[0];
  })();

  const card = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 14 };
  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const tabBtn = (key, label) => <button onClick={() => setAdminTab(key)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: adminTab === key ? "var(--brand)" : "transparent", color: adminTab === key ? "#fff" : "var(--text-muted)", transition: "all 0.15s", whiteSpace: "nowrap" }}>{label}</button>;
  const healthDot = (count, warn) => <span style={{ width: 8, height: 8, borderRadius: 4, background: count > 0 ? (warn ? "#dc2626" : "#ca8a04") : "#16a34a", display: "inline-block" }}></span>;

  return (
    <div style={{ width: "100%", maxWidth: 800 }}>
      <PageHeader icon={<Shield size={22} color="#8b5cf6" />} title="Admin Panel" subtitle="Manage settings, schedules, goals, and data" />

      {(shouldShowSummary || showSummary) && summary && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--brand)" }}><Activity size={18} style={{ display: "inline" }} /> Welcome Back!</h3>
            <button onClick={() => { onDismissSummary(); setShowSummary(false); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 10, cursor: "pointer", color: "var(--text-muted)" }}>Dismiss</button>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>Since {summary.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}:</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{summary.ticketsAdded.length}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Tickets</div></div>
            <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 700, color: "#ca8a04" }}>{summary.leadsAdded.length}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Leads</div></div>
            <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>{summary.ticketsCompleted.length}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Done</div></div>
          </div>
          {summary.ticketsAdded.length > 0 && <div style={{ marginTop: 10 }}>{summary.ticketsAdded.slice(0, 5).map((t) => <div key={t.id} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "2px 0" }}><strong style={{ color: "var(--brand)" }}>{t.ref}</strong> {t.title}</div>)}</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 3, background: "var(--bg-card)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", marginBottom: 18, overflowX: "auto" }}>
        {tabBtn("overview", "Overview")}
        {tabBtn("settings", "\u2699\uFE0F Settings")}
        {tabBtn("schedules", "Schedules")}
        {tabBtn("data", "Data")}
        {tabBtn("users", "Users")}
        {tabBtn("audit", "Log")}
      </div>

      {adminTab === "overview" && (<>
        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Activity size={16} style={{ display: "inline" }} /> Hub Health</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8 }}>
              {healthDot(overdue, true)}
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{overdue} overdue ticket{overdue !== 1 ? "s" : ""}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Past deadline and not completed</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8 }}>
              {healthDot(unactioned, false)}
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{unactioned} unactioned lead{unactioned !== 1 ? "s" : ""}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Marked as needs action</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8 }}>
              {healthDot(goalsBehind, false)}
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{goalsBehind} goal{goalsBehind !== 1 ? "s" : ""} behind pace</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Below expected progress</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--brand)", display: "inline-block" }}></span>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{activeTickets} active ticket{activeTickets !== 1 ? "s" : ""}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Open, in progress, or review</div></div>
            </div>
          </div>
          {nextSchedule && <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)" }}><Repeat size={18} /> Next scheduled ticket: <strong>{nextSchedule.title}</strong> {"\u2014"} {nextSchedule.nextDue.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at 8:00 AM</div>}
        </div>

        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Pin size={16} style={{ display: "inline" }} /> Pinned Notes</h3>
            {memoSaved && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>Saved</span>}
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Reminders, to-dos, notes to self..." rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", marginBottom: 8 }} />
          <button onClick={saveMemo} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save Notes</button>
        </div>

        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><BarChart3 size={16} style={{ display: "inline" }} /> Hub Usage</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
            {[
              { label: "Tickets", val: tickets.length },
              { label: "Leads", val: leads.length },
              { label: "Archive", val: (archiveEntries || []).length },
              { label: "Calendar", val: (calendarEvents || []).length },
              { label: "Gallery", val: (galleryImages || []).length },
              { label: "KB Articles", val: (kbArticles || []).length },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <TeamGoals goals={teamGoals || []} isAdmin={true} onSave={onGoalSave} onDelete={onGoalDelete} tickets={tickets} archiveEntries={archiveEntries} leads={leads} />
      </>)}

      {adminTab === "settings" && (<>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 16 }}>oooActive ? <CalendarDays size={16} style={{color:"#ca8a04"}} /> : <CalendarDays size={16} style={{color:"#16a34a"}} /></span><h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Out of Office</h3><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: oooActive ? "rgba(202,138,4,0.1)" : "rgba(22,163,106,0.1)", color: oooActive ? "#ca8a04" : "#16a34a" }}>{oooActive ? "Active" : "Off"}</span></div>
          {oooActive ? (
            <div><p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>Return: <strong>{oooReturnDate ? new Date(oooReturnDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Not set"}</strong></p><button onClick={() => { onToggleOoo(false, ""); setShowSummary(true); }} style={{ padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>I'm back</button></div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "end" }}><div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Return Date</label><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} style={inputStyle} /></div><button onClick={() => { if (returnDate) onToggleOoo(true, returnDate); }} disabled={!returnDate} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: returnDate ? 1 : 0.5, whiteSpace: "nowrap" }}>Enable</button></div>
          )}
        </div>

        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Megaphone size={16} style={{ display: "inline" }} /> Announcement Banner</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", marginBottom: 10 }}><input type="checkbox" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} style={{ accentColor: "var(--brand)" }} /> Show on homepage</label>
          <input value={annText} onChange={(e) => setAnnText(e.target.value)} placeholder="Your announcement..." style={{ ...inputStyle, marginBottom: 8 }} />
          <input value={annLink} onChange={(e) => setAnnLink(e.target.value)} placeholder="Optional link (https://...)" style={{ ...inputStyle, marginBottom: 10 }} />
          <button onClick={handleAnnouncementSave} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
        </div>

        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Lock size={16} style={{ display: "inline" }} /> Dashboard Password</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" style={inputStyle} />
            <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Confirm" style={inputStyle} />
          </div>
          {newPw && pwConfirm && newPw !== pwConfirm && <div style={{ fontSize: 10, color: "#dc2626", marginBottom: 6 }}>Passwords do not match</div>}
          {pwSaved && <div style={{ fontSize: 10, color: "#16a34a", marginBottom: 6 }}>Updated successfully</div>}
          <button onClick={handlePasswordChange} disabled={!newPw.trim() || newPw !== pwConfirm} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!newPw.trim() || newPw !== pwConfirm) ? 0.5 : 1 }}>Update Password</button>
        </div>

        {/* SLA Settings */}
        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Clock size={16} style={{ display: "inline" }} /> SLA Targets</h3>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>Set turnaround time targets per priority level. Weekends are excluded from the count automatically.</p>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
              {Object.entries(PRIORITIES).map(([key, p]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: p.color, marginBottom: 4 }}>{p.icon} {p.label}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min="1" max="30" value={slaForm[key]} onChange={(e) => setSlaForm({ ...slaForm, [key]: parseInt(e.target.value) || 1 })} style={{ width: 50, padding: "7px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", outline: "none", textAlign: "center" }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>business days</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSlaSave} style={{ padding: "7px 14px", background: slaSaved ? "#16a34a" : "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{slaSaved ? "✓ Saved" : "Save SLA Targets"}</button>
          </div>
        </div>
      </>)}

      {adminTab === "schedules" && (<>
        <RecurringSchedules schedules={recurringSchedules || []} onCreate={onCreateRecurring} onUpdate={onUpdateRecurring} onDelete={onDeleteRecurring} onPause={onPauseRecurring} />
      </>)}

      {adminTab === "data" && (<>
        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Download size={16} style={{ display: "inline" }} /> Export Data</h3>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>Download hub data for backup or reporting.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={exportData} disabled={exporting} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>All Data (JSON)</button>
            <button onClick={() => exportCSV("tickets")} style={{ padding: "8px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}>Tickets CSV</button>
            <button onClick={() => exportCSV("leads")} style={{ padding: "8px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}>Leads CSV</button>
            <button onClick={() => exportCSV("archive")} style={{ padding: "8px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}>Archive CSV</button>
          </div>
        </div>

        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Database size={16} style={{ display: "inline" }} /> Storage Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
            {[
              { label: "Tickets", val: tickets.length },
              { label: "Leads", val: leads.length },
              { label: "Archive", val: (archiveEntries || []).length },
              { label: "Events", val: (calendarEvents || []).length },
              { label: "Gallery", val: (galleryImages || []).length },
              { label: "KB Articles", val: (kbArticles || []).length },
              { label: "Schedules", val: (recurringSchedules || []).length },
              { label: "Goals", val: (teamGoals || []).length },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg-input)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand)" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {adminTab === "users" && (<>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Users size={16} style={{ display: "inline" }} /> User Management</h3>
            <button onClick={() => { setShowUserForm(!showUserForm); setEditingUser(null); setUserForm({ name: "", username: "", password: "", role: "user" }); }} style={{ padding: "6px 12px", background: showUserForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 6, color: showUserForm ? "var(--text-primary)" : "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{showUserForm ? "Cancel" : "\u2795 Add User"}</button>
          </div>

          {showUserForm && (
            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Full Name</label><input style={inputStyle} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="e.g. Tom Thomas" /></div>
                <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Username</label><input style={inputStyle} value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder="e.g. tom" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>{editingUser ? "New Password (leave blank to keep)" : "Password"}</label><input type="password" style={inputStyle} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? "Leave blank to keep" : "Password"} /></div>
                <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Role</label><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="admin">Admin</option><option value="user">User</option></select></div>
              </div>
              <button onClick={() => { if (!userForm.name.trim() || !userForm.username.trim() || (!editingUser && !userForm.password.trim())) return; if (editingUser) { onUpdateUser(editingUser, userForm); } else { onAddUser(userForm); } setUserForm({ name: "", username: "", password: "", role: "user" }); setShowUserForm(false); setEditingUser(null); }} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editingUser ? "Update User" : "Add User"}</button>
            </div>
          )}

          {(hubUsers || []).length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No users yet. Add a user to enable login.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(hubUsers || []).map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{u.name ? u.name.charAt(0).toUpperCase() : "?"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{u.username} {"\u2022"} {u.role}{u.approved === false && " (Pending)"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {u.approved === false && <button onClick={() => onUpdateUser(u.id, { name: u.name, username: u.username, role: u.role, approved: true })} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "#16a34a", fontSize: 10, cursor: "pointer", color: "#fff", fontWeight: 600 }}>Approve</button>}
                    <button onClick={() => { setUserForm({ name: u.name, username: u.username, password: "", role: u.role }); setEditingUser(u.id); setShowUserForm(true); }} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", fontSize: 10, cursor: "pointer", color: "var(--text-muted)" }}>Edit</button>
                    <button onClick={() => { if (window.confirm("Delete user " + u.name + "?")) onDeleteUser(u.id); }} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "transparent", fontSize: 10, cursor: "pointer", color: "#dc2626" }}>{"\u2715"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>)}

      {adminTab === "audit" && (<>
        <div style={card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}><Clock size={16} style={{ display: "inline" }} /> Activity Audit Log</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-muted)" }}>Recent admin actions and system events.</p>
          {(auditLog || []).length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No activity recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {(auditLog || []).map((entry, i) => (
                <div key={entry.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < auditLog.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}><FileText size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{entry.action}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{entry.user_name} {"\u2022"} {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}





export function RecurringSchedules({ schedules, onCreate, onUpdate, onDelete, onPause }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", frequency: "monthly", day_of_week: 1, end_date: "" });

  const FREQUENCIES = [
    { key: "weekly", label: "Weekly" },
    { key: "fortnightly", label: "Fortnightly" },
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
  ];

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const startEdit = (s) => {
    setForm({ title: s.title, description: s.description || "", priority: s.priority, frequency: s.frequency, day_of_week: s.day_of_week ?? 1, end_date: s.end_date || "" });
    setEditing(s.id); setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      onUpdate(editing, form);
    } else {
      onCreate(form);
    }
    setForm({ title: "", description: "", priority: "medium", frequency: "monthly", day_of_week: 1, end_date: "" });
    setShowForm(false); setEditing(null);
  };

  const nextDue = (s) => {
    if (!s.last_created) {
      if (s.frequency === "weekly" || s.frequency === "fortnightly") {
        const d = new Date(); d.setHours(8, 0, 0, 0);
        const target = s.day_of_week ?? 1;
        const diff = (target - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        return d;
      }
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d;
    }
    const last = new Date(s.last_created);
    const d = new Date(last);
    if (s.frequency === "weekly") { d.setDate(d.getDate() + 7); }
    else if (s.frequency === "fortnightly") { d.setDate(d.getDate() + 14); }
    else if (s.frequency === "monthly") { d.setMonth(d.getMonth() + 1); }
    else if (s.frequency === "quarterly") { d.setMonth(d.getMonth() + 3); }
    d.setHours(8, 0, 0, 0);
    return d;
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}><Repeat size={18} /></span>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Recurring Tickets</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{schedules.filter((s) => !s.paused).length} active schedule{schedules.filter((s) => !s.paused).length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title: "", description: "", priority: "medium", frequency: "monthly", day_of_week: 1, end_date: "" }); }} style={{ padding: "7px 14px", background: showForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showForm ? "var(--text-primary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "\u2795 New Schedule"}</button>
      </div>

      {showForm && (
        <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Ticket Title</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Monthly Newsletter" /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs doing each time..." rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Frequency</label><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></div>
            {(form.frequency === "weekly" || form.frequency === "fortnightly") && <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Day</label><select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })} style={{ ...inputStyle, cursor: "pointer" }}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>}
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>End Date (optional)</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} /></div>
          </div>
          <button onClick={handleSave} disabled={!form.title.trim()} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: form.title.trim() ? 1 : 0.5 }}>{editing ? "Update Schedule" : "Create Schedule"}</button>
        </div>
      )}

      {schedules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 20px", color: "var(--text-muted)" }}>
          <p style={{ fontSize: 13, margin: 0 }}>No recurring tickets set up yet. Create one to automate repeating tasks.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {schedules.map((s) => {
            const nd = nextDue(s);
            const isExpired = s.end_date && new Date(s.end_date) < new Date();
            const freq = FREQUENCIES.find((f) => f.key === s.frequency);
            const dayLabel = (s.frequency === "weekly" || s.frequency === "fortnightly") ? " on " + DAYS[s.day_of_week ?? 1] + "s" : "";
            return (
              <div key={s.id} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, opacity: (s.paused || isExpired) ? 0.5 : 1, transition: "all 0.2s" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>s.paused ? <Pause size={18} /> : isExpired ? <Clock size={18} /> : <Repeat size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span>{freq ? freq.label : s.frequency}{dayLabel} at 8:00 AM</span>
                    <span>{"\u2022"}</span>
                    <span>{s.paused ? "Paused" : isExpired ? "Expired" : "Next: " + fmtDate(nd)}</span>
                    {s.end_date && <><span>{"\u2022"}</span><span>Ends: {fmtDate(s.end_date)}</span></>}
                    {s.last_created && <><span>{"\u2022"}</span><span>Last: {fmtDate(s.last_created)}</span></>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => onPause(s.id, !s.paused)} title={s.paused ? "Resume" : "Pause"} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>{s.paused ? "\u25B6\uFE0F" : "\u23F8\uFE0F"}</button>
                  <button onClick={() => startEdit(s)} title="Edit" style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>{"\u270F\uFE0F"}</button>
                  <button onClick={() => { if (window.confirm("Delete this recurring schedule?")) onDelete(s.id); }} title="Delete" style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", fontSize: 12, cursor: "pointer", color: "#dc2626" }}>{"\u2715"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export function TeamGoals({ goals, isAdmin, onSave, onDelete, tickets, archiveEntries, leads }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", target: 10, metric: "tickets_completed", period: "monthly" });
  const [editing, setEditing] = useState(null);

  const METRICS = {
    tickets_completed: { label: "Tickets Completed", calc: (t, a, l, start, end) => t.filter((tk) => tk.completedAt && new Date(tk.completedAt) >= start && new Date(tk.completedAt) <= end).length },
    tickets_submitted: { label: "Tickets Submitted", calc: (t, a, l, start, end) => t.filter((tk) => new Date(tk.createdAt) >= start && new Date(tk.createdAt) <= end).length },
    content_published: { label: "Content Published", calc: (t, a, l, start, end) => (a || []).filter((e) => { const d = new Date(e.date || e.created_at); return d >= start && d <= end; }).length },
    leads_generated: { label: "Leads Generated", calc: (t, a, l, start, end) => l.filter((ld) => new Date(ld.created_at) >= start && new Date(ld.created_at) <= end).length },
  };

  const getPeriodDates = (period) => {
    const now = new Date();
    let start, end;
    if (period === "weekly") {
      start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0,0,0,0);
      end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    } else if (period === "monthly") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    }
    return { start, end };
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: editing || undefined });
    setForm({ title: "", target: 10, metric: "tickets_completed", period: "monthly" });
    setShowForm(false); setEditing(null);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}><Target size={18} /></span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Team Goals</h3>
        </div>
        {isAdmin && <button onClick={() => { setShowForm(!showForm); setEditing(null); }} style={{ padding: "6px 12px", background: showForm ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 6, color: showForm ? "var(--text-primary)" : "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "\u2795 Add Goal"}</button>}
      </div>

      {showForm && isAdmin && (
        <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, alignItems: "end" }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Goal</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Complete 20 tickets" /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Target</label><input type="number" style={inputStyle} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} /></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Metric</label><select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 3 }}>Period</label><select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></div>
          </div>
          <button onClick={handleSave} style={{ marginTop: 10, padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{editing ? "Update" : "Add Goal"}</button>
        </div>
      )}

      {goals.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No goals set. {isAdmin ? "Add goals to track progress." : ""}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {goals.map((g) => {
            const m = METRICS[g.metric] || METRICS.tickets_completed;
            const { start, end } = getPeriodDates(g.period);
            const current = m.calc(tickets, archiveEntries, leads, start, end);
            const pct = Math.min(Math.round((current / (g.target || 1)) * 100), 100);
            const hit = current >= g.target;
            return (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{g.title}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: hit ? "#16a34a" : "var(--brand)" }}>{current}/{g.target}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-input)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: hit ? "#16a34a" : "var(--brand)", borderRadius: 3, transition: "width 0.3s" }}></div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{m.label} {"\u2022"} {g.period}</div>
                </div>
                {hit && <span style={{ fontSize: 16 }}>{"\u2705"}</span>}
                {isAdmin && <button onClick={() => { if (window.confirm("Delete this goal?")) onDelete(g.id); }} style={{ padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", fontSize: 10, color: "var(--text-muted)", cursor: "pointer" }}>{"\u2715"}</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

