import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { ALPS_LOGO, ALPS_LOGO_REVERSED, PRIORITIES, STATUS, SLA_TARGETS, getNextRef, formatDate, renderMarkdown } from "./constants.js";
import { TicketForm, TicketCard, GridCard, StatsBar, Dashboard, SubmitterView } from "./components/Tickets.jsx";
import { AnalyticsPanel, AdminPanel, RecurringSchedules, TeamGoals } from "./components/Admin.jsx";
import { MarketingArchive, ArchiveForm, LeadForm, LeadsDashboard, BrandAssets, ContentTemplates, ContentCalendar, BrokerToolkit, CampaignTracker, KnowledgeBase, AlpsGallery } from "./components/Resources.jsx";
import { SelfServiceGuide, FileConverter, QRCodeGenerator, ImageEditor, MeetingNotesToTicket, ContentRepurposer } from "./components/Tools.jsx";
import { FileChip, FilePreview, HubHome, LoginPage, SignUpPage, ProfilePage, Toast, OnboardingOverlay, NotificationsCenter, ActivityLog } from "./components/UI.jsx";

export default function App() {
  const [view, setView] = useState("hub");
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const u = localStorage.getItem('alps_hub_user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const dashUnlocked = !!currentUser;
  const isAdmin = currentUser?.role === "admin";
  const isEditor = currentUser?.role === "admin" || currentUser?.role === "editor";
  const userRole = currentUser?.role || "viewer";
  const [hubUsers, setHubUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSubmittedRef, setLastSubmittedRef] = useState(null);
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [editArchiveEntry, setEditArchiveEntry] = useState(null);
  const [leads, setLeads] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [contentTemplates, setContentTemplates] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [brokerToolkitItems, setBrokerToolkitItems] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [oooActive, setOooActive] = useState(false);
  const [oooReturnDate, setOooReturnDate] = useState("");
  const [oooStartDate, setOooStartDate] = useState("");
  const [oooSummaryDismissed, setOooSummaryDismissed] = useState(false);
  const [dashPassword, setDashPassword] = useState("Sunnyside!");
  const [announcement, setAnnouncement] = useState({ text: "", active: false, link: "" });
  const [campaigns, setCampaigns] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [teamGoals, setTeamGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [dashboardTab, setDashboardTab] = useState("tickets");
  const [duplicateData, setDuplicateData] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem("alps_hub_onboarded"); } catch { return false; } });
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches || false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Load persisted notifications
    supabase.from("notifications").select("*").order("time", { ascending: false }).limit(50).then(({ data, error }) => {
      if (data && !error) setNotifications(data);
    }).catch(() => {});
  }, []);

  // Close tools dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addNotification = async (icon, title, body, action, forUser) => {
    const n = { icon, title, body, action, time: new Date().toISOString(), read: false };
    setNotifications((prev) => [n, ...prev].slice(0, 50));
    await supabase.from("notifications").insert({ icon, title, body, action, time: n.time, read: false, for_user: forUser || null });
  };
  const clearNotifications = async () => { setNotifications([]); await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000"); };
  const toast = (message, type = "info", onUndo) => { const id = Date.now(); setToasts((prev) => [...prev, { id, message, type, onUndo }]); setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), onUndo ? 6000 : 4000); };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const markAllRead = async () => { setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); await supabase.from("notifications").update({ read: true }).eq("read", false); };

  const persistNotif = (n) => { supabase.from("notifications").insert(n).then(() => {}).catch(() => {}); };

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
          { const _n = { icon: "\u{1F4DD}", title: "New Ticket: " + t.ref, body: (p ? p.icon + " " + p.label + " \u2022 " : "") + t.title + " from " + t.name, action: "dashboard", time: new Date().toISOString(), read: false }; persistNotif(_n); }
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
          const statusLabels = { new: "New", open: "Open", in_progress: "In Progress", review: "Ready for Review", completed: "Completed" };
          setNotifications((prev) => [{ icon: t.status === "completed" ? "\u2705" : t.status === "review" ? "\u{1F50D}" : "\u{1F504}", title: (t.ref || "Ticket") + " \u2192 " + (statusLabels[t.status] || t.status), body: t.title, action: "dashboard", time: new Date().toISOString(), read: false }, ...prev].slice(0, 50));
          { const _n = { icon: t.status === "completed" ? "\u2705" : t.status === "review" ? "\u{1F50D}" : "\u{1F504}", title: (t.ref || "Ticket") + " \u2192 " + (statusLabels[t.status] || t.status), body: t.title, action: "dashboard", time: new Date().toISOString(), read: false }; persistNotif(_n); }
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
    const ch = supabase.channel("leads-rt").on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => { fl(); if (payload.new) { const l = payload.new; setNotifications((prev) => [{ icon: "\u{1F4C8}", title: "New Lead Logged", body: l.broker + " \u2022 " + l.enquiry, action: "leads_dashboard", time: new Date().toISOString(), read: false }, ...prev].slice(0, 50)); persistNotif({ icon: "\u{1F4C8}", title: "New Lead Logged", body: l.broker + " \u2022 " + l.enquiry, action: "leads_dashboard", time: new Date().toISOString(), read: false }); } }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, () => { fl(); }).on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, () => { fl(); }).subscribe();
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

  // Load gallery images
  useEffect(() => {
    async function fg() { const { data } = await supabase.from("gallery_images").select("*").order("uploaded_at", { ascending: false }); if (data) setGalleryImages(data); }
    fg();
    const ch = supabase.channel("gallery-rt").on("postgres_changes", { event: "*", schema: "public", table: "gallery_images" }, () => { fg(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load broker toolkit
  useEffect(() => {
    async function fbt() { const { data } = await supabase.from("broker_toolkit").select("*").order("created_at", { ascending: false }); if (data) setBrokerToolkitItems(data); }
    fbt();
    const ch = supabase.channel("broker-toolkit-rt").on("postgres_changes", { event: "*", schema: "public", table: "broker_toolkit" }, () => { fbt(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load campaigns
  useEffect(() => {
    async function fca() { const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false }); if (data) setCampaigns(data); }
    fca();
    const ch = supabase.channel("campaigns-rt").on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => { fca(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load knowledge base articles
  useEffect(() => {
    async function fkb() { const { data } = await supabase.from("kb_articles").select("*").order("order", { ascending: true }); if (data) setKbArticles(data); }
    fkb();
    const ch = supabase.channel("kb-rt").on("postgres_changes", { event: "*", schema: "public", table: "kb_articles" }, () => { fkb(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load team goals
  useEffect(() => {
    async function ftg() { const { data } = await supabase.from("team_goals").select("*").order("created_at", { ascending: true }); if (data) setTeamGoals(data); }
    ftg();
    const ch = supabase.channel("goals-rt").on("postgres_changes", { event: "*", schema: "public", table: "team_goals" }, () => { ftg(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load recurring schedules
  useEffect(() => {
    async function frs() { const { data } = await supabase.from("recurring_tickets").select("*").order("created_at", { ascending: true }); if (data) setRecurringSchedules(data); }
    frs();
    const ch = supabase.channel("recurring-rt").on("postgres_changes", { event: "*", schema: "public", table: "recurring_tickets" }, () => { frs(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Deadline reminder notifications
  useEffect(() => {
    if (!currentUser || tickets.length === 0) return;
    const checkDeadlines = () => {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      tickets.forEach((t) => {
        if (t.status === "completed" || !t.deadline) return;
        const target = new Date(t.deadline + "T00:00:00");
        const days = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        const key = "deadline_notif_" + t.id + "_" + t.deadline;
        try { if (localStorage.getItem(key)) return; } catch {}
        if (days === 1) {
          addNotification("\u23F0", "Due Tomorrow", (t.ref || t.id) + ": " + t.title + " is due tomorrow", "dashboard");
          try { localStorage.setItem(key, "1"); } catch {}
        } else if (days === 0) {
          addNotification("\u{1F6A8}", "Due Today", (t.ref || t.id) + ": " + t.title + " is due today!", "dashboard");
          try { localStorage.setItem(key, "1"); } catch {}
        } else if (days < 0) {
          const oKey = key + "_overdue";
          try { if (localStorage.getItem(oKey)) return; } catch {}
          addNotification("\u{1F534}", "Overdue", (t.ref || t.id) + ": " + t.title + " is " + Math.abs(days) + " day" + (Math.abs(days) !== 1 ? "s" : "") + " overdue", "dashboard");
          try { localStorage.setItem(oKey, "1"); } catch {}
        }
      });
    };
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [tickets, currentUser]);

  // Load hub users
  useEffect(() => {
    async function fu() { const { data } = await supabase.from("hub_users").select("*").order("created_at", { ascending: true }); if (data) setHubUsers(data); }
    fu();
    const ch = supabase.channel("users-rt").on("postgres_changes", { event: "*", schema: "public", table: "hub_users" }, () => { fu(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load audit log
  useEffect(() => {
    async function fal() { const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50); if (data) setAuditLog(data); }
    fal();
    const ch = supabase.channel("audit-rt").on("postgres_changes", { event: "*", schema: "public", table: "audit_log" }, () => { fal(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const logAudit = async (action) => {
    await supabase.from("audit_log").insert({ user_name: currentUser?.name || "System", action }).catch(() => {});
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    try { localStorage.setItem("alps_hub_user", JSON.stringify(user)); } catch {}
    if (view === "password") setView("hub");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try { localStorage.removeItem("alps_hub_user"); } catch {}
    setView("hub");
  };

  // User management
  const handleAddUser = async (u) => {
    const { error } = await supabase.from("hub_users").insert({ name: u.name, username: u.username, password: u.password, role: u.role || "user" });
    if (error) toast("Failed to add user", "error"); else { toast("User added", "success"); logAudit("Added user: " + u.name); }
  };
  const handleUpdateUser = async (id, u) => {
    const updates = { name: u.name, username: u.username, role: u.role, approved: u.approved !== undefined ? u.approved : true };
    if (u.password) updates.password = u.password;
    const { error } = await supabase.from("hub_users").update(updates).eq("id", id);
    if (error) toast("Failed to update", "error"); else { toast("User updated", "success"); logAudit("Updated user: " + u.name); }
  };
  const handleSignUp = async (u) => {
    const { error } = await supabase.from("hub_users").insert({ name: u.name, email: u.email || "", username: u.username, password: u.password, role: u.role || "viewer", approved: false });
    if (error) toast("Sign up failed: " + error.message, "error"); else toast("Account created - pending approval", "success");
  };

  const handleDeleteUser = async (id) => {
    const user = hubUsers.find((u) => u.id === id);
    const { error } = await supabase.from("hub_users").delete().eq("id", id);
    if (error) toast("Failed to delete", "error"); else { toast("User deleted", "success"); logAudit("Deleted user: " + (user?.name || "Unknown")); }
  };

  // Load OOO settings
  useEffect(() => {
    async function loadSettings() {
      const { data: oooData } = await supabase.from("app_settings").select("*").eq("key", "ooo").single();
      if (oooData && oooData.value) {
        try {
          const v = typeof oooData.value === "string" ? JSON.parse(oooData.value) : oooData.value;
          setOooActive(v.active || false);
          setOooReturnDate(v.return_date || "");
          setOooStartDate(v.start_date || "");
        } catch {}
      }
      const { data: pwData } = await supabase.from("app_settings").select("*").eq("key", "dashboard_password").single();
      if (pwData && pwData.value) {
        try { const v = typeof pwData.value === "string" ? JSON.parse(pwData.value) : pwData.value; if (v.password) setDashPassword(v.password); } catch {}
      }
      const { data: annData } = await supabase.from("app_settings").select("*").eq("key", "announcement").single();
      if (annData && annData.value) {
        try { const v = typeof annData.value === "string" ? JSON.parse(annData.value) : annData.value; setAnnouncement(v); } catch {}
      }
    }
    loadSettings();
    const ch = supabase.channel("ooo-rt").on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => { loadSettings(); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleChangePassword = async (newPw) => {
    const value = { password: newPw };
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "dashboard_password").single();
    if (existing) { await supabase.from("app_settings").update({ value }).eq("key", "dashboard_password"); }
    else { await supabase.from("app_settings").insert({ key: "dashboard_password", value }); }
    setDashPassword(newPw);
    toast("Password updated", "success"); logAudit("Changed dashboard password");
  };

  const handleUpdateAnnouncement = async (ann) => {
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "announcement").single();
    if (existing) { await supabase.from("app_settings").update({ value: ann }).eq("key", "announcement"); }
    else { await supabase.from("app_settings").insert({ key: "announcement", value: ann }); }
    setAnnouncement(ann);
    toast(ann.active ? "Announcement published" : "Announcement saved", "success"); logAudit(ann.active ? "Published announcement" : "Updated announcement");
  };

  const toggleOoo = async (active, returnDate) => {
    const value = { active, return_date: returnDate || "", start_date: active ? new Date().toISOString().substring(0, 10) : oooStartDate };
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "ooo").single();
    if (existing) {
      await supabase.from("app_settings").update({ value }).eq("key", "ooo");
    } else {
      await supabase.from("app_settings").insert({ key: "ooo", value });
    }
    setOooActive(active);
    setOooReturnDate(returnDate || "");
    if (active) { setOooStartDate(value.start_date); setOooSummaryDismissed(false); }
    toast(active ? "Out of office enabled" : "Welcome back!", active ? "info" : "success");
    logAudit(active ? "Enabled OOO" : "Disabled OOO");
  };

  // Auto-create tickets from due recurring schedules
  useEffect(() => {
    if (recurringSchedules.length === 0) return;
    const createDueTickets = async () => {
      const now = new Date();
      for (const s of recurringSchedules) {
        if (s.paused) continue;
        if (s.end_date && new Date(s.end_date) < now) continue;
        let isDue = false;
        if (!s.last_created) {
          isDue = true;
        } else {
          const last = new Date(s.last_created);
          const diff = (now - last) / 86400000;
          if (s.frequency === "weekly" && diff >= 7) isDue = true;
          else if (s.frequency === "fortnightly" && diff >= 14) isDue = true;
          else if (s.frequency === "monthly") { const next = new Date(last); next.setMonth(next.getMonth() + 1); isDue = now >= next; }
          else if (s.frequency === "quarterly") { const next = new Date(last); next.setMonth(next.getMonth() + 3); isDue = now >= next; }
        }
        if (isDue) {
          const ref = await getNextRef();
          const { error } = await supabase.from("tickets").insert({
            ref,
            name: "Recurring Schedule",
            title: s.title,
            description: (s.description || "") + "\n\n\u{1F501} Auto-created from recurring schedule.",
            priority: s.priority,
            status: "open",
            file_names: [],
            notes: [],
          });
          if (!error) {
            await supabase.from("recurring_tickets").update({ last_created: now.toISOString() }).eq("id", s.id);
            toast("\u{1F501} Recurring ticket created: " + s.title, "success");
          }
        }
      }
    };
    createDueTickets();
  }, [recurringSchedules]);

  // Recurring schedule CRUD handlers
  const handleCreateRecurring = async (form) => {
    const { error } = await supabase.from("recurring_tickets").insert({
      title: form.title,
      description: form.description,
      priority: form.priority,
      frequency: form.frequency,
      day_of_week: (form.frequency === "weekly" || form.frequency === "fortnightly") ? form.day_of_week : null,
      end_date: form.end_date || null,
      paused: false,
      last_created: null,
    });
    if (error) toast("Failed to create schedule", "error"); else toast("Recurring schedule created", "success");
  };

  const handleUpdateRecurring = async (id, form) => {
    const { error } = await supabase.from("recurring_tickets").update({
      title: form.title,
      description: form.description,
      priority: form.priority,
      frequency: form.frequency,
      day_of_week: (form.frequency === "weekly" || form.frequency === "fortnightly") ? form.day_of_week : null,
      end_date: form.end_date || null,
    }).eq("id", id);
    if (error) toast("Failed to update schedule", "error"); else toast("Schedule updated", "success");
  };

  const handleDeleteRecurring = async (id) => {
    const { error } = await supabase.from("recurring_tickets").delete().eq("id", id);
    if (error) toast("Failed to delete", "error"); else toast("Schedule deleted", "success");
  };

  const handlePauseRecurring = async (id, paused) => {
    const { error } = await supabase.from("recurring_tickets").update({ paused }).eq("id", id);
    if (error) toast("Failed to update", "error"); else toast(paused ? "Schedule paused" : "Schedule resumed", "success");
  };

  // Campaign handlers
  const handleCampaignSave = async (c) => {
    if (c.id) { await supabase.from("campaigns").update({ name: c.name, description: c.description, status: c.status, start_date: c.start_date || null, end_date: c.end_date || null }).eq("id", c.id); toast("Campaign updated", "success"); }
    else { await supabase.from("campaigns").insert({ name: c.name, description: c.description, status: c.status, start_date: c.start_date || null, end_date: c.end_date || null }); toast("Campaign created", "success"); }
  };
  const handleCampaignDelete = async (id) => { await supabase.from("campaigns").delete().eq("id", id); toast("Campaign deleted", "success"); };

  // Knowledge Base handlers
  const handleKbSave = async (a) => {
    if (a.id) { await supabase.from("kb_articles").update({ title: a.title, category: a.category, content: a.content, order: a.order || 0 }).eq("id", a.id); toast("Article updated", "success"); }
    else { await supabase.from("kb_articles").insert({ title: a.title, category: a.category, content: a.content, order: a.order || 0 }); toast("Article published", "success"); }
  };
  const handleKbDelete = async (id) => { await supabase.from("kb_articles").delete().eq("id", id); toast("Article deleted", "success"); };

  // Team Goals handlers
  const handleGoalSave = async (g) => {
    if (g.id) { await supabase.from("team_goals").update({ title: g.title, target: g.target, metric: g.metric, period: g.period }).eq("id", g.id); toast("Goal updated", "success"); }
    else { await supabase.from("team_goals").insert({ title: g.title, target: g.target, metric: g.metric, period: g.period }); toast("Goal added", "success"); }
  };
  const handleGoalDelete = async (id) => { await supabase.from("team_goals").delete().eq("id", id); toast("Goal deleted", "success"); };

  const handleBrokerToolkitSave = async (item) => {
    if (item.id) {
      const { error } = await supabase.from("broker_toolkit").update({ title: item.title, product: item.product, type: item.type, description: item.description, file_url: item.file_url }).eq("id", item.id);
      if (error) toast("Failed to update", "error"); else toast("Asset updated", "success");
    } else {
      const { error } = await supabase.from("broker_toolkit").insert({ title: item.title, product: item.product, type: item.type, description: item.description, file_url: item.file_url });
      if (error) toast("Failed to add asset", "error"); else toast("Asset added", "success");
    }
  };

  const handleBrokerToolkitDelete = async (id) => {
    const { error } = await supabase.from("broker_toolkit").delete().eq("id", id);
    if (error) toast("Failed to delete", "error"); else toast("Asset deleted", "success");
  };

  const handleGalleryUpload = async (file, category) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = "gallery/" + Date.now() + "_" + safeName;
    const { error: uploadError } = await supabase.storage.from("ticket-attachments").upload(path, file);
    if (uploadError) { toast("Upload failed: " + uploadError.message, "error"); return; }
    const { data: urlData } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
    const { error } = await supabase.from("gallery_images").insert({ url: urlData.publicUrl, filename: file.name, category, storage_path: path });
    if (error) toast("Failed to save image", "error"); else toast("Image uploaded", "success");
  };

  const handleGalleryDelete = async (id, storagePath) => {
    if (storagePath) await supabase.storage.from("ticket-attachments").remove([storagePath]);
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) toast("Failed to delete image", "error"); else toast("Image deleted", "success");
  };

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
      timeSpent: row.time_spent || null,
      updatedAt: row.updated_at || row.created_at,
      pinned: row.pinned || false,
      files,
      notes: row.notes || [],
      createdBy: row.created_by || null,
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
      name: currentUser ? currentUser.name : formData.name,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      deadline: formData.deadline || null,
      status: "open",
      created_by: currentUser ? currentUser.id : null,
      file_names: uploadedFiles,
      notes: [],
    });
    if (!error) {
      setLastSubmittedRef(ref);
      setView("submitted");
      toast("Ticket " + ref + " submitted", "success");
      if (currentUser) { addNotification("\u{1F4DD}", "Ticket Submitted", "Your ticket " + ref + " has been submitted. You'll be notified when it's updated.", "tracker", currentUser.id); }
      try { localStorage.removeItem("alps_hub_draft"); } catch {}
    } else { toast("Failed to submit ticket", "error"); }
  };

  const handleStatusChange = async (id, status) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const { error } = await supabase.from("tickets").update({ status }).eq("id", ticket.dbId);
      if (error) toast("Failed to update status", "error");
else if (ticket.createdBy) { const sl = { open: "reopened", in_progress: "now in progress", review: "ready for your review", completed: "completed" }; addNotification(status === "review" ? "\u{1F50D}" : "\u{1F4CB}", "Ticket Update", "Your ticket " + (ticket.ref || ticket.id) + " is " + (sl[status] || status), "profile", ticket.createdBy); }
    }
  };

  const handleComplete = async (id, timeSpent) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const prevStatus = ticket.status;
      const { error } = await supabase.from("tickets").update({ status: "completed", completed_at: new Date().toISOString(), time_spent: timeSpent || null }).eq("id", ticket.dbId);
      if (error) { toast("Failed to complete ticket", "error"); return; }
      toast("Ticket completed", "success", () => {
        supabase.from("tickets").update({ status: prevStatus, completed_at: null, time_spent: null }).eq("id", ticket.dbId);
      });
      if (ticket.createdBy) addNotification("\u2705", "Ticket Completed", "Your ticket " + (ticket.ref || ticket.id) + ": " + ticket.title + " has been completed!", "profile", ticket.createdBy);
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
      const { data: rawRow } = await supabase.from("tickets").select("*").eq("id", ticket.dbId).single();
      const { error } = await supabase.from("tickets").delete().eq("id", ticket.dbId);
      if (error) { toast("Failed to delete", "error"); return; }
      toast("Ticket deleted", "info", rawRow ? () => {
        const { id: _id, ...rest } = rawRow;
        supabase.from("tickets").insert(rest);
      } : undefined);
    }
  };

const handleAddComment = async (id, author, text) => { await handleAddNote(id, author, text); const ticket = tickets.find((t) => t.id === id); if (ticket && ticket.createdBy && currentUser && ticket.createdBy !== currentUser.id) { addNotification("\u{1F4AC}", "New Comment", author + " commented on " + (ticket.ref || ticket.id), "profile", ticket.createdBy); } };

  const handleEditTicket = async (id, updates) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const changes = {};
      if (updates.title && updates.title !== ticket.title) changes.title = updates.title;
      if (updates.description !== undefined && updates.description !== ticket.description) changes.description = updates.description;
      if (Object.keys(changes).length === 0) return;
      const parts = [];
      if (changes.title) parts.push("title");
      if (changes.description !== undefined) parts.push("description");
      const autoNote = { author: currentUser?.name || "User", text: "Edited " + parts.join(" and "), timestamp: new Date().toISOString(), auto: true };
      const newNotes = [...(ticket.notes || []), autoNote];
      await supabase.from("tickets").update({ ...changes, notes: newNotes }).eq("id", ticket.dbId);
      toast("Ticket updated", "success");
    }
  };

  const handleApproveTicket = async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const autoNote = { author: currentUser?.name || "Submitter", text: "Approved \u2014 work accepted", timestamp: new Date().toISOString(), auto: true };
      const newNotes = [...(ticket.notes || []), autoNote];
      await supabase.from("tickets").update({ status: "completed", completed_at: new Date().toISOString(), notes: newNotes }).eq("id", ticket.dbId);
      toast("\u2705 Ticket approved and completed", "success");
      addNotification("\u2705", "Approved", (ticket.ref || ticket.id) + " was approved by " + (currentUser?.name || "submitter"), "dashboard");
    }
  };

  const handleRequestChanges = async (id, feedback) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const autoNote = { author: currentUser?.name || "Submitter", text: "Changes requested: " + (feedback || "Please revise"), timestamp: new Date().toISOString(), auto: false };
      const newNotes = [...(ticket.notes || []), autoNote];
      await supabase.from("tickets").update({ status: "in_progress", notes: newNotes }).eq("id", ticket.dbId);
      toast("Changes requested \u2014 ticket moved back to In Progress", "info");
      addNotification("\u{1F504}", "Changes Requested", (currentUser?.name || "Submitter") + " requested changes on " + (ticket.ref || ticket.id) + ": " + (feedback || "Please revise"), "dashboard");
    }
  };

  const handleDuplicate = (ticket) => {
    setDuplicateData({ title: ticket.title + " (copy)", description: ticket.description, priority: ticket.priority, deadline: ticket.deadline });
    setView("form");
    toast("\u{1F4CB} Pre-filled from " + (ticket.ref || ticket.id), "info");
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
  const handleLeadSave = async (data) => { const { error } = await supabase.from("leads").insert({ ...data, created_by: currentUser ? currentUser.id : null }); if (error) toast("Failed to save lead: " + error.message, "error"); else toast("Lead logged successfully", "success"); };
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
      await supabase.from("calendar_events").update({ title: event.title, type: event.type, description: event.description, date: event.date, status: event.status || "planned" }).eq("id", event.id);
    } else {
      const { data: inserted } = await supabase.from("calendar_events").insert([{ title: event.title, type: event.type, description: event.description || "", date: event.date, status: event.status || "planned" }]).select();
      if (event.createTicket && inserted && inserted[0]) {
        const nextRef = await getNextRef();
        await supabase.from("tickets").insert({ ref: nextRef, name: "Calendar", title: event.title, description: event.description || "Auto-created from content calendar", priority: "medium", status: "open", deadline: event.date, file_names: [], notes: [] });
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
    if (currentUser) {
      setView("dashboard");
    } else {
      setView("password");
    }
  };



  const ticketViews = ["form", "submitted", "tracker", "dashboard", "password", "activity"];
  const profileViews = ["profile"];
  const archiveViews = ["archive", "archive_add", "archive_edit"];
  const leadViews = ["lead_form", "leads_dashboard"];
  const templateViews = ["templates"];
  const guideViews = ["guide"];
  const activeCount = tickets.filter((t) => t.status !== "completed").length;
  const currentSection = view === "hub" ? "hub" : ticketViews.includes(view) ? "tickets" : archiveViews.includes(view) ? "archive" : view === "analytics" ? "analytics" : leadViews.includes(view) ? "leads" : view === "brand_assets" ? "brand" : view === "calendar" ? "calendar" : view === "gallery" ? "gallery" : view === "broker_toolkit" ? "broker_toolkit" : view === "profile" ? "profile" : view === "signup" ? "signup" : view === "campaigns" ? "campaigns" : view === "knowledge_base" ? "knowledge_base" : view === "admin" ? "admin" : view === "profile" ? "profile" : (view === "templates" || view === "converter" || view === "qr_generator" || view === "image_editor" || view === "guide" || view === "meeting_notes" || view === "repurposer") ? "tools" : "hub";

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
        .hub-card-hover { transition: all 0.18s ease; }
        .hub-card-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: var(--brand) !important; }

        /* View transition */
        .hub-view-enter { animation: fadeIn 0.2s ease forwards; }

        /* Secondary nav bar */
        .hub-secondary-nav { display: flex; gap: 2px; padding: 2px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border); }
        .hub-secondary-nav button { padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; background: transparent; color: var(--nav-inactive); white-space: nowrap; }
        .hub-secondary-nav button.active { background: var(--brand); color: #fff; }
        .hub-secondary-nav button:hover:not(.active) { background: var(--brand-light); color: var(--brand); }

        /* Skeleton loader */
        .hub-skeleton { background: linear-gradient(90deg, var(--bar-bg) 25%, var(--bg-card) 50%, var(--bar-bg) 75%); background-size: 200% 100%; animation: shimmer 1.5s ease infinite; border-radius: 6px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

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
          .hub-resource-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-tickets-grid { grid-template-columns: 1fr !important; }
          .hub-layout-main { grid-template-columns: 1fr !important; }
          .hub-dash-grid { grid-template-columns: 1fr !important; }
          .hub-type-filter { display: none !important; }
          .hub-color-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .hub-main { padding: 20px 14px 80px 14px !important; }
          .hub-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .hub-filter-bar { flex-direction: column; align-items: stretch !important; }
          .hub-template-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-gallery-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-priority-grid { grid-template-columns: 1fr 1fr !important; }
          .hub-analytics-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hub-analytics-cols { grid-template-columns: 1fr !important; }
          .hub-profile-stats { grid-template-columns: repeat(3, 1fr) !important; }
          .hub-kanban { grid-template-columns: 1fr 1fr !important; }
          .hub-week-compare { flex-direction: column; gap: 4px !important; }
          .hub-secondary-nav { overflow-x: auto; flex-wrap: nowrap; }
          .hub-mobile-nav { display: flex !important; }
          .hub-desktop-nav { display: none !important; }
          h2 { font-size: 20px !important; }
        }
        .hub-mobile-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-header); border-top: 1px solid var(--border); padding: 6px 8px calc(env(safe-area-inset-bottom, 0px) + 6px); z-index: 100; justify-content: space-around; box-shadow: 0 -2px 12px rgba(0,0,0,0.06); }
        .hub-mobile-nav button { background: none; border: none; padding: 6px 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--text-muted); font-size: 9px; font-weight: 600; transition: color 0.15s; }
        .hub-mobile-nav button.active { color: var(--brand); }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg-header)", borderBottom: "1px solid var(--border)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="hub-header" style={{ padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={ALPS_LOGO} alt="Alps" style={{ height: 36, objectFit: "contain", cursor: "pointer", transition: "opacity 0.15s" }} onClick={() => setView("hub")} onMouseOver={(e) => e.target.style.opacity = "0.8"} onMouseOut={(e) => e.target.style.opacity = "1"} />
            <div style={{ width: 1, height: 24, background: "var(--border)" }}></div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--brand)", lineHeight: 1.2 }}>Marketing Hub</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setDark(!dark)} title={dark ? "Light mode" : "Dark mode"} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
              {dark ? "\u2600" : "\u{1F319}"}
            </button>
            <NotificationsCenter notifications={notifications} onClear={clearNotifications} onNavigate={(v) => { markAllRead(); setView(v); }} isAdmin={isAdmin} />
            {currentUser ? (
              <>
                <button onClick={() => setView("profile")} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{currentUser.name?.charAt(0)?.toUpperCase()}</span> {currentUser.name}</button>
                {isAdmin && <button onClick={() => setView("admin")} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>{"\u2699\uFE0F"} Admin</button>}
                <button onClick={handleLogout} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>Log Out</button>
              </>
            ) : (
              <button onClick={() => setView("password")} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "var(--brand)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>Log In</button>
            )}
          </div>
        </div>
        {view !== "hub" && view !== "password" && view !== "signup" && (
          <div style={{ padding: "0 32px 8px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
            <button onClick={() => setView("hub")} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-muted)", flexShrink: 0 }}>{"\u2190"} Home</button>
            {currentUser && (<>
            <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }}></div>
            <nav className="hub-secondary-nav" style={{ flex: 1 }}>
              {currentSection === "tickets" && <>
                <button className={view === "form" ? "active" : ""} onClick={() => setView("form")}>Submit</button>
                {isAdmin && <button className={view === "dashboard" ? "active" : ""} onClick={handleDashboardClick} style={{ position: "relative" }}>
                  Dashboard
                  {activeCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
                </button>}
                {isAdmin && <button className={view === "activity" ? "active" : ""} onClick={() => setView("activity")}>Activity</button>}
                <button className={view === "tracker" ? "active" : ""} onClick={() => { setLastSubmittedRef(null); setView("tracker"); }}>Track</button>
              </>}
              {currentSection === "archive" && <>
                <button className={view === "archive" ? "active" : ""} onClick={() => setView("archive")}>Browse</button>
                {isAdmin && <button className={(view === "archive_add" || view === "archive_edit") ? "active" : ""} onClick={() => { setEditArchiveEntry("new"); setView("archive_add"); }}>Add Entry</button>}
              </>}
              {currentSection === "leads" && <>
                <button className={view === "lead_form" ? "active" : ""} onClick={() => setView("lead_form")}>Log Lead</button>
                {currentUser && <button className={view === "leads_dashboard" ? "active" : ""} onClick={() => setView("leads_dashboard")}>Dashboard</button>}
              </>}
              {currentSection === "tools" && <>
                {[
                  { id: "converter", label: "Converter" },
                  { id: "qr_generator", label: "QR Code" },
                  { id: "image_editor", label: "Image Editor" },
                  { id: "repurposer", label: "Repurposer" },
                  ...(currentUser ? [
                    { id: "templates", label: "Templates" },
                    { id: "meeting_notes", label: "Notes to Tickets" },
                    { id: "guide", label: "Self-Service Guide" },
                  ] : []),
                ].map((t) => <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>{t.label}</button>)}
              </>}
              {currentSection === "analytics" && <button className="active">Analytics</button>}
              {currentSection === "brand" && <button className="active">Brand Assets</button>}
              {currentSection === "calendar" && <button className="active">Content Calendar</button>}
              {currentSection === "gallery" && <button className="active">Alps Gallery</button>}
              {currentSection === "broker_toolkit" && <button className="active">Broker Toolkit</button>}
              {currentSection === "campaigns" && <button className="active">Campaigns</button>}
              {currentSection === "knowledge_base" && <button className="active">Knowledge Base</button>}
              {currentSection === "admin" && <button className="active">Admin Panel</button>}
              {currentSection === "profile" && <button className="active">My Profile</button>}
            </nav>
            </>)}
          </div>
        )}
      </header>

      <main key={view} className="hub-main hub-view-enter" style={{ maxWidth: (view === "archive" || view === "brand_assets" || view === "analytics" || view === "leads_dashboard" || view === "templates" || view === "calendar" || view === "dashboard" || view === "gallery" || view === "broker_toolkit" || view === "admin" || view === "campaigns" || view === "knowledge_base" || view === "profile") ? 1000 : 900, margin: "0 auto", padding: "32px 24px", display: "flex", justifyContent: "center" }}>
        {loading ? (
          <div style={{ width: "100%", maxWidth: 860 }}>
            <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
              <div className="hub-skeleton" style={{ width: 120, height: 14, marginBottom: 8 }}></div>
              <div className="hub-skeleton" style={{ width: 260, height: 28, marginBottom: 20 }}></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div className="hub-skeleton" style={{ height: 64, borderRadius: 12 }}></div>
                <div className="hub-skeleton" style={{ height: 64, borderRadius: 12 }}></div>
              </div>
              <div className="hub-skeleton" style={{ width: 140, height: 14 }}></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="hub-skeleton" style={{ height: 100, borderRadius: 12 }}></div>
              ))}
            </div>
          </div>
        ) : view === "hub" ? (
          <HubHome onNavigate={(id) => { if (id === "password" || id === "signup") { setView(id); return; } const adminOnly = ["dashboard", "leads_dashboard", "analytics", "admin"]; if (adminOnly.includes(id) && !isAdmin) { setView("password"); return; } const loginRequired = ["templates", "meeting_notes", "knowledge_base", "calendar", "campaigns", "lead_form"]; if (loginRequired.includes(id) && !currentUser) { setView("password"); return; } setView(id); }} tickets={tickets} dashUnlocked={dashUnlocked} isAdmin={isAdmin} leads={leads} notifications={notifications} calendarEvents={calendarEvents} archiveEntries={archiveEntries} oooActive={oooActive} oooReturnDate={oooReturnDate} announcement={announcement} onQuickSubmit={handleSubmit} currentUser={currentUser} />
        ) : view === "form" ? (
          <div style={{ maxWidth: 560, width: "100%" }}>
            <TicketForm onSubmit={handleSubmit} currentUser={currentUser} duplicateData={duplicateData} onClearDuplicate={() => setDuplicateData(null)} />
            {tickets.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--brand)", letterSpacing: "0.02em" }}>Ticket Overview</h3>
                <StatsBar tickets={tickets} />
              </div>
            )}
          </div>
        ) : view === "submitted" ? (
          <SubmitterView tickets={tickets} submittedRef={lastSubmittedRef} onAddNote={handleAddNote} onBackToForm={() => setView("form")} currentUser={currentUser} onEditTicket={handleEditTicket} onApprove={handleApproveTicket} onRequestChanges={handleRequestChanges} />
        ) : view === "tracker" ? (
          <SubmitterView tickets={tickets} submittedRef={null} onAddNote={handleAddNote} onBackToForm={() => setView("form")} currentUser={currentUser} onEditTicket={handleEditTicket} onApprove={handleApproveTicket} onRequestChanges={handleRequestChanges} />
        ) : view === "password" ? (
          <LoginPage hubUsers={hubUsers} onLogin={handleLogin} onGoToSignUp={() => setView("signup")} />
        ) : view === "signup" ? (
          <SignUpPage hubUsers={hubUsers} onSignUp={handleSignUp} onGoToLogin={() => setView("password")} />
        ) : view === "activity" ? (
          <ActivityLog tickets={tickets} />
        ) : view === "analytics" ? (
          <AnalyticsPanel tickets={tickets} archiveEntries={archiveEntries} leads={leads} teamGoals={teamGoals} isAdmin={isAdmin} onGoalSave={handleGoalSave} onGoalDelete={handleGoalDelete} galleryImages={galleryImages} kbArticles={kbArticles} hubUsers={hubUsers} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} auditLog={auditLog} />
        ) : view === "archive" ? (
          <MarketingArchive entries={archiveEntries} isAdmin={isAdmin} onManage={(id) => { if (id) { setEditArchiveEntry(id); setView("archive_edit"); } else { setEditArchiveEntry("new"); setView("archive_add"); } }} />
        ) : (view === "archive_add" || view === "archive_edit") ? (
          <ArchiveForm entry={editArchiveEntry !== "new" ? archiveEntries.find((e) => e.id === editArchiveEntry) : null} onSave={handleArchiveSave} onCancel={() => setView("archive")} onDelete={handleArchiveDelete} />
        ) : view === "lead_form" ? (
          <LeadForm currentUser={currentUser} onSave={handleLeadSave} onBackToHub={() => setView("hub")} />
        ) : view === "leads_dashboard" ? (
          <LeadsDashboard leads={leads} onUpdate={handleLeadUpdate} onDelete={handleLeadDelete} />
        ) : view === "brand_assets" ? (
          <BrandAssets assets={brandAssets} isAdmin={isAdmin} onUpload={handleAssetUpload} onDeleteAsset={handleAssetDelete} />
        ) : view === "templates" ? (
          <ContentTemplates templates={contentTemplates} isAdmin={isAdmin} onSave={handleTemplateSave} onDelete={handleTemplateDelete} />
        ) : view === "guide" ? (
          <KnowledgeBase articles={kbArticles} isAdmin={isAdmin} onSave={handleKbSave} onDelete={handleKbDelete} />
        ) : view === "converter" ? (
          <FileConverter />
        ) : view === "qr_generator" ? (
          <QRCodeGenerator />
        ) : view === "image_editor" ? (
          <ImageEditor />
        ) : view === "meeting_notes" ? (
          <MeetingNotesToTicket currentUser={currentUser} onCreateTicket={(data) => { setDuplicateData({ title: data.title, description: data.description, priority: data.priority, deadline: "" }); setView("form"); toast("\u{1F4DD} Ticket pre-filled from meeting notes", "info"); }} onDirectCreate={async (data) => { const ref = await getNextRef(); const { error } = await supabase.from("tickets").insert({ ref, name: currentUser?.name || "Meeting Notes", title: data.title, description: data.description, priority: data.priority, status: "open", created_by: currentUser?.id || null, file_names: [], notes: [] }); if (!error) toast("Ticket " + ref + " created", "success"); else toast("Failed to create ticket", "error"); }} />
        ) : view === "repurposer" ? (
          <ContentRepurposer />
        ) : view === "calendar" ? (
          <ContentCalendar events={calendarEvents} isAdmin={isAdmin} onSave={handleCalendarSave} onDelete={handleCalendarDelete} onReschedule={handleCalendarReschedule} tickets={tickets} />
        ) : view === "gallery" ? (
          <AlpsGallery images={galleryImages} isAdmin={isAdmin} onUpload={handleGalleryUpload} onDelete={handleGalleryDelete} />
        ) : view === "broker_toolkit" ? (
          <BrokerToolkit items={brokerToolkitItems} isAdmin={isAdmin} onSave={handleBrokerToolkitSave} onDelete={handleBrokerToolkitDelete} />
        ) : view === "campaigns" ? (
          <CampaignTracker campaigns={campaigns} tickets={tickets} archiveEntries={archiveEntries} leads={leads} calendarEvents={calendarEvents} isAdmin={isAdmin} onSave={handleCampaignSave} onDelete={handleCampaignDelete} />
        ) : view === "knowledge_base" ? (
          <KnowledgeBase articles={kbArticles} isAdmin={isAdmin} onSave={handleKbSave} onDelete={handleKbDelete} />
        ) : view === "profile" ? (
          <ProfilePage currentUser={currentUser} tickets={tickets} leads={leads} archiveEntries={archiveEntries} onNavigate={(v) => setView(v)} onAddComment={handleAddComment} notifications={notifications} />
        ) : view === "admin" ? (
          <AdminPanel oooActive={oooActive} oooReturnDate={oooReturnDate} oooStartDate={oooStartDate} onToggleOoo={toggleOoo} tickets={tickets} leads={leads} archiveEntries={archiveEntries} oooSummaryDismissed={oooSummaryDismissed} onDismissSummary={() => setOooSummaryDismissed(true)} calendarEvents={calendarEvents} dashboardPassword={dashPassword} onChangePassword={handleChangePassword} announcement={announcement} onUpdateAnnouncement={handleUpdateAnnouncement} recurringSchedules={recurringSchedules} onCreateRecurring={handleCreateRecurring} onUpdateRecurring={handleUpdateRecurring} onDeleteRecurring={handleDeleteRecurring} onPauseRecurring={handlePauseRecurring} teamGoals={teamGoals} onGoalSave={handleGoalSave} onGoalDelete={handleGoalDelete} galleryImages={galleryImages} kbArticles={kbArticles} hubUsers={hubUsers} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} auditLog={auditLog} />
        ) : (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", marginBottom: 20, width: "fit-content" }}>
              {[{ key: "tickets", label: "\u{1F4CB} Tickets" }, { key: "leads", label: "\u{1F4C8} Leads" }, { key: "analytics", label: "\u{1F4CA} Analytics" }].map((tab) => (
                <button key={tab.key} onClick={() => setDashboardTab(tab.key)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: dashboardTab === tab.key ? "var(--brand)" : "transparent", color: dashboardTab === tab.key ? "#fff" : "var(--nav-inactive)" }}>{tab.label}</button>
              ))}
            </div>
            {dashboardTab === "tickets" ? (
              <Dashboard tickets={tickets} onStatusChange={handleStatusChange} onComplete={handleComplete} onAddNote={handleAddNote} onDelete={handleDelete} onUpdatePriority={handleUpdatePriority} onUpdateDeadline={handleUpdateDeadline} onReopen={handleReopen} onTogglePin={handleTogglePin} onDuplicate={handleDuplicate} onEditTicket={handleEditTicket} currentUser={currentUser} />
            ) : dashboardTab === "leads" ? (
              <LeadsDashboard leads={leads} onUpdate={handleLeadUpdate} onDelete={handleLeadDelete} />
            ) : (
              <AnalyticsPanel tickets={tickets} archiveEntries={archiveEntries} leads={leads} teamGoals={teamGoals} isAdmin={isAdmin} onGoalSave={handleGoalSave} onGoalDelete={handleGoalDelete} galleryImages={galleryImages} kbArticles={kbArticles} hubUsers={hubUsers} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} auditLog={auditLog} />
            )}
          </div>
        )}
      </main>
      {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} />}
      <div className="hub-mobile-nav">
        <button onClick={() => setView("hub")} className={view === "hub" ? "active" : ""}><span style={{ fontSize: 18 }}>{"\u{1F3E0}"}</span>Home</button>
        <button onClick={() => setView("form")} className={view === "form" ? "active" : ""}><span style={{ fontSize: 18 }}>{"\u{1F4DD}"}</span>Ticket</button>
        {currentUser ? (
          <>
            <button onClick={() => setView("profile")} className={view === "profile" ? "active" : ""} style={{ position: "relative" }}><span style={{ fontSize: 18 }}>{"\u{1F464}"}</span>Profile{notifications.filter((n) => !n.read && n.for_user === currentUser?.id).length > 0 && <span style={{ position: "absolute", top: 2, right: 8, width: 8, height: 8, borderRadius: 4, background: "#dc2626" }}></span>}</button>
            {isAdmin && <button onClick={() => setView("dashboard")} className={view === "dashboard" ? "active" : ""}><span style={{ fontSize: 18 }}>{"\u{1F4CB}"}</span>Dash</button>}
            <button onClick={() => setView("calendar")} className={view === "calendar" ? "active" : ""}><span style={{ fontSize: 18 }}>{"\u{1F4C5}"}</span>Calendar</button>
          </>
        ) : (
          <>
            <button onClick={() => { setLastSubmittedRef(null); setView("tracker"); }} className={view === "tracker" ? "active" : ""}><span style={{ fontSize: 18 }}>{"\u{1F50D}"}</span>Track</button>
            <button onClick={() => setView("archive")} className={view === "archive" ? "active" : ""}><span style={{ fontSize: 18 }}>{"\u{1F4DA}"}</span>Resources</button>
          </>
        )}
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
