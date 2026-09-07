import { useState, useRef, useCallback, useEffect } from "react";
import { PRIORITIES, BRAND_COLORS, ALPS_LOGO_REVERSED } from "../constants.js";
import { supabase } from "../supabaseClient.js";
import { ArrowLeftRight, QrCode, Crop, Image, Type, Droplet, Download, Upload, Trash2, Plus, Copy, Wand2, ClipboardList, Repeat, FileText, Mail, MessageSquare, Twitter, Hash, CheckCircle2, ExternalLink } from "lucide-react";
import { PageHeader } from "./UI.jsx";

export function QRCodeGenerator() {
  const [mode, setMode] = useState("url");
  const [qrTitle, setQrTitle] = useState("");
  const [url, setUrl] = useState("");
  const [vcard, setVcard] = useState({ name: "", phone: "", email: "", company: "Alps Ltd", title: "" });
  const [size, setSize] = useState(300);
  const [color, setColor] = useState("231D68");
  const [bgColor, setBgColor] = useState("ffffff");
  const [generated, setGenerated] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [tab, setTab] = useState("create");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);

  const presetColors = [
    { label: "Alps Main", hex: "231D68" },
    { label: "Motor", hex: "E64592" },
    { label: "Commercial", hex: "20A39E" },
    { label: "Black", hex: "000000" },
  ];

  // Load history
  useEffect(() => {
    async function loadHistory() {
      setHistoryLoading(true);
      const { data } = await supabase.from("app_settings").select("value").eq("key", "qr_history").maybeSingle();
      if (data?.value) { try { setHistory(JSON.parse(data.value)); } catch {} }
      setHistoryLoading(false);
    }
    loadHistory();
  }, []);

  const saveHistory = async (list) => {
    setHistory(list);
    const val = JSON.stringify(list);
    const { data: existing } = await supabase.from("app_settings").select("key").eq("key", "qr_history").maybeSingle();
    if (existing) { await supabase.from("app_settings").update({ value: val }).eq("key", "qr_history"); }
    else { await supabase.from("app_settings").insert({ key: "qr_history", value: val }); }
  };

  const getVcardString = () => {
    const parts = vcard.name.trim().split(" ");
    const last = parts.length > 1 ? parts.pop() : "";
    const first = parts.join(" ");
    return ["BEGIN:VCARD", "VERSION:3.0", "N:" + last + ";" + first + ";;;", "FN:" + vcard.name.trim(), vcard.company ? "ORG:" + vcard.company : "", vcard.title ? "TITLE:" + vcard.title : "", vcard.phone ? "TEL:" + vcard.phone : "", vcard.email ? "EMAIL:" + vcard.email : "", "END:VCARD"].filter(Boolean).join("\n");
  };

  const canGenerate = mode === "vcard" ? vcard.name.trim() : url.trim();

  const generate = () => {
    const data = mode === "vcard" ? getVcardString() : url.trim();
    if (!data) return;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(data) + "&color=" + color + "&bgcolor=" + bgColor + "&format=png&margin=1";
    setGenerated({ url: qrUrl, inputUrl: data });
    // Save to history
    const entry = { id: Date.now().toString(), title: qrTitle.trim() || (mode === "vcard" ? vcard.name.trim() : url.trim().substring(0, 50)), mode, data: mode === "vcard" ? vcard.name.trim() : url.trim(), qrUrl, color, size, created: new Date().toISOString() };
    saveHistory([entry, ...history].slice(0, 50));
  };

  const handleLogo = (e) => {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const renderWithLogo = useCallback(() => {
    if (!generated || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const qrImg = new window.Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      canvas.width = qrImg.width;
      canvas.height = qrImg.height;
      ctx.drawImage(qrImg, 0, 0);
      if (logoPreview) {
        const logoImg = new window.Image();
        logoImg.onload = () => {
          const logoSize = Math.round(qrImg.width * 0.22);
          const x = (qrImg.width - logoSize) / 2;
          const y = (qrImg.height - logoSize) / 2;
          const pad = 6;
          ctx.fillStyle = "#" + bgColor;
          ctx.beginPath();
          ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
          ctx.fill();
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        };
        logoImg.src = logoPreview;
      }
    };
    qrImg.src = generated.url;
  }, [generated, logoPreview, bgColor]);

  useEffect(() => { renderWithLogo(); }, [renderWithLogo]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob((blob) => {
        if (!blob) { window.open(generated.url, "_blank"); return; }
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qr-code-" + size + "px.png";
        link.click();
      });
    } catch (e) { window.open(generated.url, "_blank"); }
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" };

  return (
    <div style={{ width: "100%", maxWidth: 560 }}>
      <PageHeader icon={<QrCode size={22} color="#0284c7" />} title="QR Code Generator" subtitle="Create branded QR codes with custom colours" />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, borderTop: "3px solid #0284c7" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-input)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          <button onClick={() => setTab("create")} style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: tab === "create" ? "var(--brand)" : "transparent", color: tab === "create" ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create</button>
          <button onClick={() => setTab("history")} style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: tab === "history" ? "var(--brand)" : "transparent", color: tab === "history" ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Saved ({history.length})</button>
        </div>

        {tab === "history" ? (
          <div>
            {historyLoading ? <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Loading...</div> : history.length === 0 ? <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-muted)", fontSize: 13 }}>No QR codes generated yet. Create one to see it here.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h) => (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <img src={h.qrUrl} alt="" style={{ width: 48, height: 48, borderRadius: 6, border: "1px solid var(--border)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.mode === "vcard" ? "vCard" : "URL"} · {new Date(h.created).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                    <a href={h.qrUrl} download={"qr-" + h.title.replace(/\s+/g, "-") + ".png"} style={{ padding: "5px 10px", background: "var(--brand-light)", border: "none", borderRadius: 6, color: "var(--brand)", fontSize: 11, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>Download</a>
                    <button onClick={() => saveHistory(history.filter((x) => x.id !== h.id))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (<>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Title</label>
          <input style={inputStyle} value={qrTitle} onChange={(e) => setQrTitle(e.target.value)} placeholder="Give this QR code a name (optional)" />
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-input)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
          <button onClick={() => setMode("url")} style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: mode === "url" ? "var(--brand)" : "transparent", color: mode === "url" ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>URL / Text</button>
          <button onClick={() => setMode("vcard")} style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: mode === "vcard" ? "var(--brand)" : "transparent", color: mode === "vcard" ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>vCard Contact</button>
        </div>

        {mode === "url" ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>URL or Text *</label>
            <input style={inputStyle} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" onKeyDown={(e) => e.key === "Enter" && generate()} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Full Name *</label><input style={inputStyle} value={vcard.name} onChange={(e) => setVcard({ ...vcard, name: e.target.value })} placeholder="John Smith" /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Job Title</label><input style={inputStyle} value={vcard.title} onChange={(e) => setVcard({ ...vcard, title: e.target.value })} placeholder="Account Manager" /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Phone</label><input style={inputStyle} value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} placeholder="+44 1onal 234567" /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Email</label><input style={inputStyle} value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} placeholder="john@alpsltd.co.uk" /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Company</label><input style={inputStyle} value={vcard.company} onChange={(e) => setVcard({ ...vcard, company: e.target.value })} /></div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Size</label>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value={200}>200 x 200px</option>
              <option value={300}>300 x 300px</option>
              <option value={500}>500 x 500px</option>
              <option value={800}>800 x 800px (print)</option>
              <option value={1000}>1000 x 1000px (large print)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>QR Colour</label>
            <div style={{ display: "flex", gap: 4 }}>
              {presetColors.map((c) => (
                <button key={c.hex} onClick={() => setColor(c.hex)} title={c.label} style={{ width: 32, height: 32, borderRadius: 6, background: "#" + c.hex, border: "2px solid " + (color === c.hex ? "var(--brand)" : "var(--border)"), cursor: "pointer" }}></button>
              ))}
              <div style={{ position: "relative", flex: 1 }}>
                <input type="text" value={"#" + color} onChange={(e) => { const v = e.target.value.replace("#", ""); if (/^[0-9a-fA-F]{0,6}$/.test(v)) setColor(v); }} style={{ ...inputStyle, paddingLeft: 8, fontFamily: "monospace", fontSize: 12 }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>Centre Logo <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ flex: 1, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
              {logoFile ? logoFile.name : "Choose logo image..."}
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            </label>
            {logoFile && (
              <button onClick={() => { setLogoFile(null); setLogoPreview(null); if (logoRef.current) logoRef.current.value = ""; }} style={{ padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#ef4444" }}>Remove</button>
            )}
          </div>
          {logoPreview && <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}><img src={logoPreview} alt="Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", background: "#fff", border: "1px solid var(--border)" }} /><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Logo will appear at ~22% of QR size</span></div>}
        </div>

        <button onClick={generate} disabled={!canGenerate} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: canGenerate ? 1 : 0.5, marginBottom: generated ? 16 : 0, transition: "opacity 0.2s" }}>Generate QR Code</button>

        {generated && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: 16, background: "#fff", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 12 }}>
              <canvas ref={canvasRef} style={{ display: "block", width: Math.min(size, 280), height: Math.min(size, 280) }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, wordBreak: "break-all" }}>{generated.inputUrl}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={downloadQR} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><><Download size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Download PNG</></button>
              <button onClick={() => { navigator.clipboard.writeText(generated.url); }} style={{ padding: "10px 20px", background: "var(--brand-light)", border: "none", borderRadius: 8, color: "var(--brand)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><><Copy size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Copy URL</></button>
            </div>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}




export function EmailSignatureGenerator() {
  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <PageHeader icon={<Mail size={22} color="#0284c7" />} title="Email Signature Generator" subtitle="Select your company to open the signature builder" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <a href="https://alpsltd.signature.email" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--bg-card)", border: "2px solid var(--border)", borderRadius: 14, padding: "32px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }} className="hub-card-hover">
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "#231d6812", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Mail size={24} style={{ color: "#231d68" }} /></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#231d68", marginBottom: 4 }}>Alps Ltd</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Insurance services signatures</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#231d68", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Open Builder <ExternalLink size={13} /></div>
          </div>
        </a>
        <a href="https://alpslegal.signature.email" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--bg-card)", border: "2px solid var(--border)", borderRadius: 14, padding: "32px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }} className="hub-card-hover">
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "#e6459212", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Mail size={24} style={{ color: "#e64592" }} /></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e64592", marginBottom: 4 }}>Alps Legal</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Legal services signatures</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#e64592", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Open Builder <ExternalLink size={13} /></div>
          </div>
        </a>
      </div>
    </div>
  );
}


export function FirstPolicySold({ isAdmin }) {
  const [brokerName, setBrokerName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [celebration, setCelebration] = useState("1st_policy");
  const [outputSize, setOutputSize] = useState("linkedin");
  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [bgUrl, setBgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(100);
  const [photoY, setPhotoY] = useState(50);
  const canvasRef = useRef(null);
  const addFileRef = useRef(null);
  const bgFileRef = useRef(null);

  const CELEBRATIONS = [
    { id: "1st_policy", title: "1st", subtitle: "Policy\nSold!", color: "#231d68", accent: "#e64592" },
    { id: "10th_policy", title: "10th", subtitle: "Policy\nSold!", color: "#231d68", accent: "#FAB315" },
    { id: "50th_policy", title: "50", subtitle: "Policies\nSold!", color: "#231d68", accent: "#20A39E" },
    { id: "100th_policy", title: "100", subtitle: "Policies\nSold!", color: "#231d68", accent: "#e64592" },
    { id: "new_broker", title: "New", subtitle: "Broker\nSigned!", color: "#20A39E", accent: "#231d68" },
    { id: "top_performer", title: "Top", subtitle: "Performer!", color: "#e64592", accent: "#231d68" },
  ];

  const SIZES = [
    { id: "linkedin", label: "LinkedIn (1200×627)", w: 1200, h: 627 },
    { id: "square", label: "Square (1080×1080)", w: 1080, h: 1080 },
  ];

  const celeb = CELEBRATIONS.find((c) => c.id === celebration) || CELEBRATIONS[0];
  const sizeObj = SIZES.find((s) => s.id === outputSize) || SIZES[0];

  useEffect(() => {
    async function load() {
      const { data: members } = await supabase.from("app_settings").select("value").eq("key", "policy_team_members").maybeSingle();
      if (members?.value) { try { setTeamMembers(JSON.parse(members.value)); } catch {} }
      const { data: bg } = await supabase.from("app_settings").select("value").eq("key", "policy_bg_url").maybeSingle();
      if (bg?.value) setBgUrl(bg.value);
      setLoading(false);
    }
    load();
  }, []);

  const saveMembers = async (list) => { setTeamMembers(list); const val = JSON.stringify(list); const { data: existing } = await supabase.from("app_settings").select("key").eq("key", "policy_team_members").maybeSingle(); if (existing) { await supabase.from("app_settings").update({ value: val }).eq("key", "policy_team_members"); } else { await supabase.from("app_settings").insert({ key: "policy_team_members", value: val }); } };
  const handleAddPhoto = (e) => { const f = e.target.files[0]; if (!f || !f.type.startsWith("image/")) return; setNewPhoto(f); const reader = new FileReader(); reader.onload = (ev) => setNewPhotoPreview(ev.target.result); reader.readAsDataURL(f); };

  const addMember = async () => {
    if (!newName.trim() || !newPhoto) return;
    setUploading(true);
    const path = "policy-team/" + Date.now() + "-" + newName.trim().toLowerCase().replace(/\s+/g, "-") + "." + newPhoto.name.split(".").pop();
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, newPhoto);
    if (error) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
    await saveMembers([...teamMembers, { id: Date.now().toString(), name: newName.trim(), photo_url: urlData.publicUrl, storage_path: path }]);
    setNewName(""); setNewPhoto(null); setNewPhotoPreview(null); setUploading(false);
    if (addFileRef.current) addFileRef.current.value = "";
  };

  const removeMember = async (id) => {
    const member = teamMembers.find((m) => m.id === id);
    if (member?.storage_path) await supabase.storage.from("ticket-attachments").remove([member.storage_path]);
    await saveMembers(teamMembers.filter((m) => m.id !== id));
    if (selectedMember?.id === id) setSelectedMember(null);
  };

  const uploadBg = async (e) => {
    const f = e.target.files[0]; if (!f || !f.type.startsWith("image/")) return;
    setUploading(true);
    const path = "policy-team/background-" + Date.now() + "." + f.name.split(".").pop();
    await supabase.storage.from("ticket-attachments").upload(path, f);
    const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
    setBgUrl(data.publicUrl);
    const { data: existingBg } = await supabase.from("app_settings").select("key").eq("key", "policy_bg_url").maybeSingle();
    if (existingBg) { await supabase.from("app_settings").update({ value: data.publicUrl }).eq("key", "policy_bg_url"); }
    else { await supabase.from("app_settings").insert({ key: "policy_bg_url", value: data.publicUrl }); }
    setUploading(false);
  };

  const drawConfetti = (ctx, W, H) => {
    const colors = ["#dc2626", "#2563eb", "#16a34a", "#eab308", "#8b5cf6", "#ec4899", "#f97316", "#231d68", "#20A39E"];
    for (let i = 0; i < 70; i++) {
      const cx = Math.random() * W, cy = Math.random() * H * 0.55;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.random() * Math.PI * 2);
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = 0.35 + Math.random() * 0.4;
      const shape = Math.random();
      if (shape < 0.3) {
        // Circle
        ctx.beginPath(); ctx.arc(0, 0, 2 + Math.random() * 5, 0, Math.PI * 2); ctx.fill();
      } else if (shape < 0.6) {
        // Ribbon / streamer
        const w = 10 + Math.random() * 18, h = 2 + Math.random() * 4;
        ctx.beginPath(); ctx.moveTo(-w/2, 0);
        ctx.quadraticCurveTo(-w/4, -h*2, 0, 0);
        ctx.quadraticCurveTo(w/4, h*2, w/2, 0);
        ctx.lineWidth = 1.5 + Math.random() * 2; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
      } else if (shape < 0.8) {
        // Square
        const s = 4 + Math.random() * 8;
        ctx.fillRect(-s/2, -s/2, s, s);
      } else {
        // Rectangle / strip
        const w = 5 + Math.random() * 14, h = 2 + Math.random() * 4;
        ctx.fillRect(-w/2, -h/2, w, h);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  const generateImage = () => {
    if (!selectedMember || !brokerName.trim()) return;
    setGenerating(true);
    const canvas = canvasRef.current;
    const W = sizeObj.w, H = sizeObj.h;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const isSquare = outputSize === "square";
    const panelW = isSquare ? W * 0.55 : W * 0.5;
    const titleLines = celeb.subtitle.split("\n");

    const drawContent = () => {
      const personImg = new window.Image();
      personImg.crossOrigin = "anonymous";
      personImg.onload = () => {
        // Person photo on right - with zoom and position
        const rightX = isSquare ? W * 0.4 : W * 0.45;
        const rightW = W - rightX; const rightH = H;
        const scale = photoZoom / 100;
        const pAspect = personImg.width / personImg.height;
        const boxAspect = rightW / rightH;
        let dw, dh;
        if (pAspect > boxAspect) { dh = rightH * scale; dw = dh * pAspect; }
        else { dw = rightW * scale; dh = dw / pAspect; }
        const dx = rightX + (rightW - dw) / 2;
        const yOffset = (photoY - 50) / 50 * (dh - rightH) * 0.5;
        const dy = (rightH - dh) / 2 - yOffset;
        ctx.save();
        ctx.beginPath(); ctx.rect(rightX, 0, rightW, rightH); ctx.clip();
        ctx.drawImage(personImg, dx, dy, dw, dh);
        ctx.restore();

        // White panel gradient
        const grad = ctx.createLinearGradient(0, 0, panelW + W * 0.08, 0);
        grad.addColorStop(0, "rgba(255,255,255,0.94)");
        grad.addColorStop(0.8, "rgba(255,255,255,0.94)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, panelW + W * 0.08, H);

        // Title text
        ctx.textBaseline = "alphabetic";
        const titleSize = isSquare ? 80 : 96;
        const subSize = isSquare ? 80 : 96;
        const margin = isSquare ? 50 : 60;
        let ty = isSquare ? 160 : 170;

        // Main number/word (e.g. "1st", "10th", "50", "New", "Top")
        ctx.fillStyle = celeb.color;
        ctx.font = "800 " + titleSize + "px 'Inter', 'Segoe UI', sans-serif";
        const mainText = celeb.title;
        ctx.fillText(mainText, margin, ty);

        // Superscript for ordinals
        if (["1st", "10th"].includes(mainText)) {
          const numPart = mainText.replace(/\D/g, "");
          const suffPart = mainText.replace(/\d/g, "");
          ctx.font = "800 " + titleSize + "px 'Inter', 'Segoe UI', sans-serif";
          ctx.fillText(numPart, margin, ty);
          const numW = ctx.measureText(numPart).width;
          ctx.font = "800 " + Math.round(titleSize * 0.45) + "px 'Inter', 'Segoe UI', sans-serif";
          ctx.fillText(suffPart, margin + numW + 2, ty - titleSize * 0.35);
        }

        // Subtitle lines (e.g. "Policy", "Sold!")
        ctx.font = "800 " + subSize + "px 'Inter', 'Segoe UI', sans-serif";
        titleLines.forEach((line) => {
          ty += subSize;
          ctx.shadowColor = "rgba(0,0,0,0.06)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
          ctx.fillText(line, margin, ty);
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        });

        // Accent line
        ty += 20;
        ctx.fillStyle = celeb.accent;
        ctx.fillRect(margin, ty, 100, 5);
        ty += 35;

        // Broker name
        ctx.fillStyle = "#1a1d2e";
        const nameSize = isSquare ? 32 : 36;
        ctx.font = "600 " + nameSize + "px 'Inter', 'Segoe UI', sans-serif";
        const maxNameW = panelW - margin - 20;
        const words = brokerName.trim().split(" ");
        let line = "", lineY = ty;
        words.forEach((word) => {
          const test = line + (line ? " " : "") + word;
          if (ctx.measureText(test).width > maxNameW && line) { ctx.fillText(line, margin, lineY); lineY += nameSize + 8; line = word; }
          else { line = test; }
        });
        ctx.fillText(line, margin, lineY);
        lineY += nameSize + 4;

        // Subtitle
        if (subtitle.trim()) {
          lineY += 6;
          ctx.fillStyle = "#64748b";
          ctx.font = "500 " + Math.round(nameSize * 0.65) + "px 'Inter', 'Segoe UI', sans-serif";
          ctx.fillText(subtitle.trim(), margin, lineY);
        }

        drawConfetti(ctx, W, H);
        setGenerated(canvas.toDataURL("image/png"));
        setGenerating(false);
      };
      personImg.onerror = () => setGenerating(false);
      personImg.src = selectedMember.photo_url;
    };

    if (bgUrl) {
      const bgImg = new window.Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.onload = () => {
        const bA = bgImg.width / bgImg.height, cA = W / H;
        let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
        if (bA > cA) { sw = bgImg.height * cA; sx = (bgImg.width - sw) / 2; } else { sh = bgImg.width / cA; sy = (bgImg.height - sh) / 2; }
        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);
        drawContent();
      };
      bgImg.onerror = () => { ctx.fillStyle = "#f0f1f5"; ctx.fillRect(0, 0, W, H); drawContent(); };
      bgImg.src = bgUrl;
    } else { ctx.fillStyle = "#f0f1f5"; ctx.fillRect(0, 0, W, H); drawContent(); }
  };

  const downloadImage = () => { if (!generated) return; const a = document.createElement("a"); a.href = generated; a.download = celeb.title + "-" + brokerName.trim().replace(/\s+/g, "-") + "-" + outputSize + ".png"; a.click(); };

  return (
    <div style={{ width: "100%", maxWidth: 680 }}>
      <PageHeader icon={<Wand2 size={22} color="#0284c7" />} title="Celebration Generator" subtitle="Create celebration images for broker milestones and team achievements" action={isAdmin && <button onClick={() => setShowManage(!showManage)} style={{ padding: "7px 14px", background: showManage ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showManage ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showManage ? "Done" : "Manage"}</button>} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {showManage && isAdmin && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Background Image</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {bgUrl && <img src={bgUrl} alt="Background" style={{ width: 120, height: 63, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />}
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                <Upload size={12} /> {bgUrl ? "Change" : "Upload office photo"}
                <input ref={bgFileRef} type="file" accept="image/*" onChange={uploadBg} style={{ display: "none" }} />
              </label>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Team Members ({teamMembers.length})</div>
          {teamMembers.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 14 }}>
              {teamMembers.map((m) => (
                <div key={m.id} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                  <img src={m.photo_url} alt={m.name} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                  <div style={{ padding: "6px 8px", fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{m.name}</div>
                  <button onClick={() => { if (window.confirm("Remove " + m.name + "?")) removeMember(m.id); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 5, background: "rgba(220,38,38,0.85)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sarah Jones" style={{ width: "100%", padding: "7px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
              <Upload size={11} /> {newPhotoPreview ? "Change" : "Photo"}
              <input ref={addFileRef} type="file" accept="image/*" onChange={handleAddPhoto} style={{ display: "none" }} />
            </label>
            {newPhotoPreview && <img src={newPhotoPreview} alt="" style={{ width: 32, height: 32, borderRadius: 5, objectFit: "cover", border: "1px solid var(--border)" }} />}
            <button onClick={addMember} disabled={uploading || !newName.trim() || !newPhoto} style={{ padding: "7px 14px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: (newName.trim() && newPhoto) ? 1 : 0.4 }}>{uploading ? "..." : "Add"}</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, borderTop: "3px solid #0284c7" }}>
        {loading ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading...</div> : teamMembers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <Wand2 size={36} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>No team members added yet</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{isAdmin ? "Click \"Manage\" to add team photos and a background image." : "Ask an admin to set up team members."}</div>
          </div>
        ) : (<>
          {/* Celebration type */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Celebration Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {CELEBRATIONS.map((c) => (
                <button key={c.id} onClick={() => { setCelebration(c.id); setGenerated(null); }} style={{ padding: "10px 6px", background: celebration === c.id ? c.color + "10" : "var(--bg-input)", border: "2px solid " + (celebration === c.id ? c.color : "var(--border)"), borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.title}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginTop: 2 }}>{c.subtitle.replace("\n", " ")}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Team member */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Team Member <span style={{ color: "#dc2626" }}>*</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
              {teamMembers.map((m) => (
                <button key={m.id} onClick={() => { setSelectedMember(m); setGenerated(null); }} style={{ background: "var(--bg-input)", border: "2px solid " + (selectedMember?.id === m.id ? "var(--brand)" : "var(--border)"), borderRadius: 10, overflow: "hidden", cursor: "pointer", padding: 0, transition: "all 0.15s" }}>
                  <img src={m.photo_url} alt={m.name} style={{ width: "100%", height: 70, objectFit: "cover" }} />
                  <div style={{ padding: "4px 6px", fontSize: 10, fontWeight: 600, color: selectedMember?.id === m.id ? "var(--brand)" : "var(--text-primary)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Photo framing */}
          {selectedMember && (
            <div style={{ marginBottom: 18, padding: "12px 14px", background: "var(--bg-input)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Photo Framing</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}><span>Zoom</span><span>{photoZoom}%</span></label>
                  <input type="range" min="80" max="200" value={photoZoom} onChange={(e) => { setPhotoZoom(Number(e.target.value)); setGenerated(null); }} style={{ width: "100%", accentColor: "var(--brand)" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}><span>Vertical Position</span><span>{photoY}%</span></label>
                  <input type="range" min="0" max="100" value={photoY} onChange={(e) => { setPhotoY(Number(e.target.value)); setGenerated(null); }} style={{ width: "100%", accentColor: "var(--brand)" }} />
                </div>
              </div>
            </div>
          )}

          {/* Broker name + subtitle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Name <span style={{ color: "#dc2626" }}>*</span></label>
              <input value={brokerName} onChange={(e) => { setBrokerName(e.target.value); setGenerated(null); }} placeholder="e.g. Howden Reading" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Subtitle <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input value={subtitle} onChange={(e) => { setSubtitle(e.target.value); setGenerated(null); }} placeholder="e.g. Motor Division" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Output size */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {SIZES.map((s) => (
              <button key={s.id} onClick={() => { setOutputSize(s.id); setGenerated(null); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid " + (outputSize === s.id ? "var(--brand)" : "var(--border)"), background: outputSize === s.id ? "var(--brand-light)" : "var(--bg-input)", color: outputSize === s.id ? "var(--brand)" : "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{s.label}</button>
            ))}
          </div>

          {/* Live preview */}
          <div style={{ marginBottom: 18, padding: 16, background: "#f0f1f5", borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>Preview</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, aspectRatio: outputSize === "square" ? "1" : "1200/627", maxHeight: 180 }}>
              <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: celeb.color, lineHeight: 1 }}>{celeb.title}<sup style={{ fontSize: 12 }}>{celeb.title.endsWith("st") || celeb.title.endsWith("th") ? "" : ""}</sup></div>
                {celeb.subtitle.split("\n").map((l, i) => <div key={i} style={{ fontSize: 22, fontWeight: 800, color: celeb.color, lineHeight: 1.1 }}>{l}</div>)}
                <div style={{ width: 40, height: 3, background: celeb.accent, margin: "8px 0 6px", borderRadius: 2 }}></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1d2e" }}>{brokerName || "Broker name..."}</div>
                {subtitle && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{subtitle}</div>}
              </div>
              {selectedMember && <img src={selectedMember.photo_url} alt="" style={{ width: outputSize === "square" ? "45%" : "40%", height: "100%", objectFit: "cover", borderRadius: 8, objectPosition: "center " + photoY + "%" }} />}
            </div>
          </div>

          <button onClick={generateImage} disabled={generating || !selectedMember || !brokerName.trim()} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, " + celeb.color + ", " + celeb.color + "cc)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating ? "wait" : "pointer", opacity: (selectedMember && brokerName.trim()) ? 1 : 0.4, transition: "all 0.2s" }}>
            {generating ? "Generating..." : "Generate Image"}
          </button>
        </>)}
      </div>

      {generated && (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <img src={generated} alt="Celebration" style={{ width: "100%", display: "block" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={downloadImage} style={{ flex: 1, padding: "10px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Download size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> Download PNG</button>
            <button onClick={() => setGenerated(null)} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>Regenerate</button>
          </div>
        </div>
      )}
    </div>
  );
}
