import { useState, useRef, useCallback, useEffect } from "react";
import { PRIORITIES, BRAND_COLORS, ALPS_LOGO_REVERSED } from "../constants.js";
import { supabase } from "../supabaseClient.js";
import jsPDF from "jspdf";
import { ArrowLeftRight, QrCode, Crop, Image, Type, Droplet, Download, Upload, Trash2, Plus, Copy, Wand2, ClipboardList, Repeat, FileText, Mail, MessageSquare, Twitter, Hash, CheckCircle2, ExternalLink } from "lucide-react";
import { PageHeader } from "./UI.jsx";

export function SelfServiceGuide() {
  const [open, setOpen] = useState(null);
  const toggle = (id) => setOpen(open === id ? null : id);

  const sections = [
    { id: "sizes", title: "Image & Asset Sizes", items: [
      { q: "Social media image sizes", a: "LinkedIn: 1200x627px (post), 1584x396px (cover)\nFacebook: 1200x630px (post), 820x312px (cover)\nInstagram: 1080x1080px (post), 1080x1920px (story)\nX/Twitter: 1600x900px (post), 1500x500px (header)" },
      { q: "Email banner size", a: "Standard email banner: 600px wide, 200-300px tall. Keep file size under 200KB for fast loading." },
      { q: "Print material specs", a: "A4 flyer: 210x297mm (3mm bleed)\nA5 flyer: 148x210mm (3mm bleed)\nDL leaflet: 99x210mm\nBusiness card: 85x55mm\nAlways supply at 300dpi with CMYK colour." },
      { q: "PowerPoint slide dimensions", a: "Standard: 16:9 (33.867cm x 19.05cm)\nWe use widescreen by default. Fonts should be minimum 18pt for body text on slides." },
    ]},
    { id: "brand", title: "Brand & Logo Usage", items: [
      { q: "Where do I find Alps logos?", a: "Go to Brand Assets in the Marketing Hub. You can download logos in PNG, SVG, JPG, and PDF formats." },
      { q: "Can I edit the Alps logo?", a: "No. The logo should not be stretched, recoloured, rotated, or modified in any way. Always use the approved versions from the Brand Assets page." },
      { q: "What fonts does Alps use?", a: "Headlines: Museo Sans 700\nBody copy: Montserrat Regular\nThese are listed in the Brand Assets section with the full colour palette." },
      { q: "How do I use the brand colours?", a: "Main: #231D68\nMotor: #E64592\nCommercial: #20A39E\nLet: #FAB315\nPersonal: #464B99\nAlt Man: #27D7F4\nClick any colour in Brand Assets to copy the hex code." },
    ]},
    { id: "requests", title: "Marketing Requests", items: [
      { q: "How do I request marketing work?", a: "Use the Submit a Ticket feature on the Marketing Hub homepage. Fill in the form with as much detail as possible, and select the appropriate template and priority." },
      { q: "What's the typical turnaround?", a: "Low priority: 5-7 working days\nMedium priority: 3-5 working days\nHigh priority: 1-2 working days\nCritical/urgent: Same day where possible\nThese are estimates and depend on current workload." },
      { q: "How do I track my request?", a: "Use Track a Ticket on the Hub homepage. Enter the reference number (e.g. M001) you received when you submitted. You can also add comments to your ticket and edit it if needed." },
      { q: "What if I need changes to completed work?", a: "Add a note to your existing ticket via the tracker. If it's a new piece of work, submit a new ticket referencing the original." },
    ]},
    { id: "content", title: "Content & Campaigns", items: [
      { q: "How do I get content published?", a: "Submit a ticket with the content, target audience, channel, and any deadlines. Include all copy, images, and links needed." },
      { q: "What's the approvals process?", a: "All external-facing content goes through marketing review before publishing. Allow at least 1 working day for review and revisions." },
      { q: "How do I log a marketing lead?", a: "Use Log a Lead on the Hub homepage. Fill in the broker name, what the enquiry is about, the source channel, and set next steps." },
    ]},
    { id: "tools", title: "Tools & Access", items: [
      { q: "What can I do without logging in?", a: "Anyone can: submit tickets, track tickets, log leads, browse the archive, view brand assets, and read this guide. The dashboard, analytics, and admin features require a user account." },
      { q: "How do I get an account?", a: "Click Sign Up to create an account. Your account will be pending until an admin approves it. Once approved, you can log in and access dashboards, analytics, and commenting features." },
    ]},
  ];

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <PageHeader icon={<FileText size={22} color="#0284c7" />} title="Self-Service Guide" subtitle="Image sizes, file formats, and frequently asked questions" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sections.map((section) => (
          <div key={section.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => toggle(section.id)} style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{section.title}</span>
              <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: open === section.id ? "rotate(180deg)" : "none" }}>{"\u25BC"}</span>
            </button>
            {open === section.id && (
              <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--brand)", marginBottom: 6 }}>{item.q}</div>
                    <pre style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{item.a}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



export function FileConverter() {
  const [files, setFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState("png");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [batchMode, setBatchMode] = useState(false);

  const formats = [
    { value: "png", label: "PNG", mime: "image/png" },
    { value: "jpeg", label: "JPG", mime: "image/jpeg" },
    { value: "webp", label: "WEBP", mime: "image/webp" },
  ];

  const SOCIAL_PRESETS = [
    { label: "LinkedIn Post", w: 1200, h: 627, icon: "in" },
    { label: "LinkedIn Cover", w: 1584, h: 396, icon: "in" },
    { label: "Facebook Post", w: 1200, h: 630, icon: "fb" },
    { label: "Facebook Cover", w: 820, h: 312, icon: "fb" },
    { label: "Instagram Post", w: 1080, h: 1080, icon: "ig" },
    { label: "Instagram Story", w: 1080, h: 1920, icon: "ig" },
    { label: "X / Twitter Post", w: 1600, h: 900, icon: "x" },
    { label: "X / Twitter Header", w: 1500, h: 500, icon: "x" },
    { label: "Email Banner", w: 600, h: 250, icon: "\u2709\uFE0F" },
  ];
  const [showPresets, setShowPresets] = useState(false);
  const applyPreset = (p) => { setWidth(String(p.w)); setHeight(String(p.h)); setLockAspect(false); setShowPresets(false); };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    if (selected.length === 0) return;
    setResults([]);
    const loaded = [];
    selected.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          loaded.push({ file: f, img, preview: ev.target.result, origW: img.width, origH: img.height });
          if (loaded.length === selected.length) {
            setFiles(loaded);
            if (!batchMode && loaded.length === 1) {
              setWidth(String(loaded[0].origW));
              setHeight(String(loaded[0].origH));
            }
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });
  };

  const handleWidthChange = (v) => {
    setWidth(v);
    if (lockAspect && files.length === 1 && v && files[0].origW) {
      setHeight(String(Math.round((parseInt(v) / files[0].origW) * files[0].origH)));
    }
  };
  const handleHeightChange = (v) => {
    setHeight(v);
    if (lockAspect && files.length === 1 && v && files[0].origH) {
      setWidth(String(Math.round((parseInt(v) / files[0].origH) * files[0].origW)));
    }
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const fmt = formats.find((f) => f.value === outputFormat);
    const output = [];

    for (const item of files) {
      const targetW = width ? parseInt(width) : item.origW;
      const targetH = height ? parseInt(height) : item.origH;
      canvas.width = targetW;
      canvas.height = targetH;
      if (outputFormat === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, targetW, targetH); }
      ctx.drawImage(item.img, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL(fmt.mime, 0.92);
      const baseName = item.file.name.replace(/\.[^.]+$/, "");
      output.push({
        name: baseName + "-" + targetW + "x" + targetH + "." + outputFormat,
        dataUrl,
        size: Math.round((dataUrl.length * 3) / 4 / 1024),
        w: targetW,
        h: targetH,
      });
    }
    setResults(output);
    setProcessing(false);
  };

  const downloadOne = (r) => {
    const a = document.createElement("a"); a.href = r.dataUrl; a.download = r.name; a.click();
  };
  const downloadAll = () => { results.forEach((r, i) => setTimeout(() => downloadOne(r), i * 200)); };

  const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" };

  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <PageHeader icon={<ArrowLeftRight size={22} color="#0284c7" />} title="File Converter" subtitle="Resize and convert images with social media presets" />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, borderTop: "3px solid #0284c7" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setBatchMode(false); setFiles([]); setResults([]); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + (!batchMode ? "var(--brand)" : "var(--border)"), background: !batchMode ? "var(--brand-light)" : "transparent", color: !batchMode ? "var(--brand)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Single Image</button>
          <button onClick={() => { setBatchMode(true); setFiles([]); setResults([]); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + (batchMode ? "var(--brand)" : "var(--border)"), background: batchMode ? "var(--brand-light)" : "transparent", color: batchMode ? "var(--brand)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batch Mode</button>
        </div>

        {files.length === 0 ? (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: 12, cursor: "pointer", marginBottom: 16, transition: "border-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--brand)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ fontSize: 32, opacity: 0.4 }}>batchMode ? <Image size={32} /> : <Image size={32} /></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{batchMode ? "Select multiple images" : "Select an image"}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>PNG, JPG, WEBP, GIF</div>
            <input ref={fileRef} type="file" accept="image/*" multiple={batchMode} onChange={handleFiles} style={{ display: "none" }} />
          </label>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{files.length} image{files.length !== 1 ? "s" : ""} selected</span>
              <button onClick={() => { setFiles([]); setResults([]); if (fileRef.current) fileRef.current.value = ""; }} style={{ fontSize: 12, background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: "var(--text-muted)" }}>Clear</button>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {files.map((f, i) => (
                <div key={i} style={{ flexShrink: 0, width: 80, textAlign: "center" }}>
                  <img src={f.preview} alt={f.file.name} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{f.origW}x{f.origH}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Width (px)</label>
                <input style={inputStyle} type="number" value={width} onChange={(e) => handleWidthChange(e.target.value)} placeholder={files[0] ? String(files[0].origW) : ""} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Height (px)</label>
                <input style={inputStyle} type="number" value={height} onChange={(e) => handleHeightChange(e.target.value)} placeholder={files[0] ? String(files[0].origH) : ""} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>Format</label>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>{formats.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              {!batchMode && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}><input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} style={{ accentColor: "var(--brand)" }} />Lock aspect ratio</label>}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowPresets(!showPresets)} style={{ padding: "6px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600 }}>Social Presets {showPresets ? "\u25B2" : "\u25BC"}</button>
                {showPresets && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 240, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow-hover)", zIndex: 10, maxHeight: 280, overflowY: "auto" }}>
                    {SOCIAL_PRESETS.map((p) => (
                      <button key={p.label} onClick={() => applyPreset(p)} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left", fontSize: 12, color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}>
                        <span>{p.icon} {p.label}</span><span style={{ color: "var(--text-muted)" }}>{p.w}x{p.h}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={convert} disabled={processing} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: processing ? 0.6 : 1 }}>{processing ? "Processing..." : "Convert" + (files.length > 1 ? " All (" + files.length + ")" : "")}</button>
          </>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{results.length} file{results.length !== 1 ? "s" : ""} ready</span>
              {results.length > 1 && <button onClick={downloadAll} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><><Download size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Download All</></button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {results.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8 }}>
                  <img src={r.dataUrl} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.w}x{r.h} {"\u00B7"} ~{r.size}KB</div>
                  </div>
                  <button onClick={() => downloadOne(r)} style={{ padding: "6px 14px", background: "var(--brand-light)", border: "none", borderRadius: 6, color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



export function QRCodeGenerator() {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [vcard, setVcard] = useState({ name: "", phone: "", email: "", company: "Alps Ltd", title: "" });
  const [size, setSize] = useState(300);
  const [color, setColor] = useState("231D68");
  const [bgColor, setBgColor] = useState("ffffff");
  const [generated, setGenerated] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);

  const presetColors = [
    { label: "Alps Main", hex: "231D68" },
    { label: "Motor", hex: "E64592" },
    { label: "Commercial", hex: "20A39E" },
    { label: "Black", hex: "000000" },
  ];

  const getVcardString = () => {
    const parts = vcard.name.trim().split(" ");
    const last = parts.length > 1 ? parts.pop() : "";
    const first = parts.join(" ");
    return ["BEGIN:VCARD", "VERSION:3.0", "N:" + last + ";" + first + ";;;", "FN:" + vcard.name.trim(), vcard.company ? "ORG:" + vcard.company : "", vcard.title ? "TITLE:" + vcard.title : "", vcard.phone ? "TEL:" + vcard.phone : "", vcard.email ? "EMAIL:" + vcard.email : "", "END:VCARD"].filter(Boolean).join("\n");
  };

  const generate = () => {
    const data = mode === "vcard" ? getVcardString() : url.trim();
    if (!data) return;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(data) + "&color=" + color + "&bgcolor=" + bgColor + "&format=png&margin=1";
    setGenerated({ url: qrUrl, inputUrl: data });
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

        <button onClick={generate} disabled={!url.trim()} style={{ width: "100%", padding: "14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: url.trim() ? 1 : 0.5, marginBottom: generated ? 16 : 0, transition: "opacity 0.2s" }}>Generate QR Code</button>

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
      </div>
    </div>
  );
}




export function ImageEditor() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileRef = useRef(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [overlayColor, setOverlayColor] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(30);
  const [textOverlay, setTextOverlay] = useState("");
  const [textSize, setTextSize] = useState(48);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPos, setTextPos] = useState("center");
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [cropRatio, setCropRatio] = useState("free");
  const [exportFormat, setExportFormat] = useState("png");
  const [exportQuality, setExportQuality] = useState(92);
  const [resizeW, setResizeW] = useState("");
  const [resizeH, setResizeH] = useState("");
  const [resizeLock, setResizeLock] = useState(true);
  const imgRef = useRef(null);
  const [watermark, setWatermark] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState("br");
  const [watermarkSize, setWatermarkSize] = useState(15);
  const [watermarkOpacity, setWatermarkOpacity] = useState(60);
  const watermarkImgRef = useRef(null);
  const [undoStack, setUndoStack] = useState([]);

  const EDITOR_BRAND_COLORS = [
    { label: "Alps Main", color: "#231D68" },
    { label: "Motor", color: "#E64592" },
    { label: "Commercial", color: "#20A39E" },
    { label: "White", color: "#ffffff" },
    { label: "Black", color: "#000000" },
  ];

  const CROP_RATIOS = [
    { label: "Free", value: "free" },
    { label: "1:1", value: "1:1" },
    { label: "16:9", value: "16:9" },
    { label: "4:3", value: "4:3" },
    { label: "9:16", value: "9:16" },
  ];

  const RESIZE_PRESETS = [
    { label: "LinkedIn Post", w: 1200, h: 627 },
    { label: "Instagram Square", w: 1080, h: 1080 },
    { label: "Instagram Story", w: 1080, h: 1920 },
    { label: "Facebook Cover", w: 820, h: 312 },
    { label: "Email Header", w: 600, h: 200 },
    { label: "Twitter Post", w: 1200, h: 675 },
    { label: "YouTube Thumb", w: 1280, h: 720 },
  ];

  const applyResize = (w, h) => {
    if (!imgRef.current) return;
    saveUndo();
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgRef.current, 0, 0, w, h);
    const newImg = new window.Image();
    newImg.onload = () => { imgRef.current = newImg; setOrigW(w); setOrigH(h); setResizeW(""); setResizeH(""); };
    newImg.src = canvas.toDataURL("image/png");
  };

  const handleResizeW = (val) => {
    setResizeW(val);
    if (resizeLock && imgRef.current && val) {
      setResizeH(Math.round((Number(val) / imgRef.current.width) * imgRef.current.height));
    }
  };
  const handleResizeH = (val) => {
    setResizeH(val);
    if (resizeLock && imgRef.current && val) {
      setResizeW(Math.round((Number(val) / imgRef.current.height) * imgRef.current.width));
    }
  };

  // Load watermark logo
  useEffect(() => {
    const wImg = new window.Image();
    wImg.src = ALPS_LOGO_REVERSED;
    wImg.onload = () => { watermarkImgRef.current = wImg; };
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => { setOrigW(img.width); setOrigH(img.height); imgRef.current = img; setPreview(ev.target.result); resetEdits(); setUndoStack([]); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  const saveUndo = () => {
    if (!imgRef.current) return;
    setUndoStack((prev) => [...prev.slice(-4), { brightness, contrast, saturation, overlayColor, overlayOpacity, textOverlay, textSize, textColor, textPos, watermark, watermarkPos, watermarkSize, watermarkOpacity, imgSrc: imgRef.current.src, w: origW, h: origH }]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setBrightness(last.brightness); setContrast(last.contrast); setSaturation(last.saturation);
    setOverlayColor(last.overlayColor); setOverlayOpacity(last.overlayOpacity);
    setTextOverlay(last.textOverlay); setTextSize(last.textSize); setTextColor(last.textColor); setTextPos(last.textPos);
    setWatermark(last.watermark); setWatermarkPos(last.watermarkPos); setWatermarkSize(last.watermarkSize); setWatermarkOpacity(last.watermarkOpacity);
    if (last.imgSrc !== imgRef.current?.src) {
      const img = new window.Image();
      img.onload = () => { imgRef.current = img; setOrigW(last.w); setOrigH(last.h); };
      img.src = last.imgSrc;
    }
  };

  const resetEdits = () => {
    setBrightness(100); setContrast(100); setSaturation(100);
    setOverlayColor(""); setOverlayOpacity(30); setTextOverlay("");
    setTextSize(48); setTextColor("#ffffff"); setTextPos("center");
    setCropMode(false); setCropStart(null); setCropEnd(null); setCropRatio("free");
    setWatermark(false); setWatermarkPos("br"); setWatermarkSize(15); setWatermarkOpacity(60);
  };

  const drawWatermark = (ctx, w, h, scale) => {
    if (!watermark || !watermarkImgRef.current) return;
    const wImg = watermarkImgRef.current;
    const wSize = Math.round(w * watermarkSize / 100);
    const aspect = wImg.width / wImg.height;
    const wW = wSize;
    const wH = wSize / aspect;
    const pad = Math.round(w * 0.03);
    let x = pad, y = pad;
    if (watermarkPos === "br" || watermarkPos === "tr") x = w - wW - pad;
    if (watermarkPos === "bl" || watermarkPos === "br") y = h - wH - pad;
    ctx.globalAlpha = watermarkOpacity / 100;
    ctx.drawImage(wImg, x, y, wW, wH);
    ctx.globalAlpha = 1;
  };

  const renderPreview = useCallback(() => {
    if (!imgRef.current || !previewCanvasRef.current) return;
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    const maxW = 600, maxH = 420;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%)";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    if (overlayColor) { ctx.globalAlpha = overlayOpacity / 100; ctx.fillStyle = overlayColor; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (textOverlay) {
      ctx.font = "bold " + Math.round(textSize * scale) + "px Inter, sans-serif";
      ctx.fillStyle = textColor; ctx.textAlign = "center";
      const x = canvas.width / 2;
      let y = canvas.height / 2;
      if (textPos === "top") y = Math.round(textSize * scale) + 20;
      else if (textPos === "bottom") y = canvas.height - 20;
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.fillText(textOverlay, x, y);
      ctx.shadowColor = "transparent";
    }
    drawWatermark(ctx, canvas.width, canvas.height, scale);
    if (cropMode && cropStart && cropEnd) {
      ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      const cx = Math.min(cropStart.x, cropEnd.x), cy = Math.min(cropStart.y, cropEnd.y);
      const cw = Math.abs(cropEnd.x - cropStart.x), ch = Math.abs(cropEnd.y - cropStart.y);
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, canvas.width, cy);
      ctx.fillRect(0, cy + ch, canvas.width, canvas.height - cy - ch);
      ctx.fillRect(0, cy, cx, ch);
      ctx.fillRect(cx + cw, cy, canvas.width - cx - cw, ch);
    }
  }, [brightness, contrast, saturation, overlayColor, overlayOpacity, textOverlay, textSize, textColor, textPos, cropMode, cropStart, cropEnd, watermark, watermarkPos, watermarkSize, watermarkOpacity]);

  useEffect(() => { renderPreview(); }, [renderPreview]);

  const handleCropMouseDown = (e) => {
    if (!cropMode) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropEnd(null); setCropping(true);
  };
  const handleCropMouseMove = (e) => {
    if (!cropping || !cropMode) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    let nx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    let ny = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    if (cropRatio !== "free" && cropStart) {
      const [rw, rh] = cropRatio.split(":").map(Number);
      const dx = nx - cropStart.x;
      const dy = Math.abs(dx) * (rh / rw) * (ny > cropStart.y ? 1 : -1);
      ny = cropStart.y + dy;
    }
    setCropEnd({ x: nx, y: ny });
  };
  const handleCropMouseUp = () => { setCropping(false); };

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !imgRef.current) return;
    saveUndo();
    const canvas = previewCanvasRef.current;
    const scaleX = imgRef.current.width / canvas.width, scaleY = imgRef.current.height / canvas.height;
    const sx = Math.min(cropStart.x, cropEnd.x) * scaleX, sy = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const sw = Math.abs(cropEnd.x - cropStart.x) * scaleX, sh = Math.abs(cropEnd.y - cropStart.y) * scaleY;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = sw; tmpCanvas.height = sh;
    tmpCanvas.getContext("2d").drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    const newImg = new window.Image();
    newImg.onload = () => { imgRef.current = newImg; setOrigW(sw); setOrigH(sh); setCropMode(false); setCropStart(null); setCropEnd(null); renderPreview(); };
    newImg.src = tmpCanvas.toDataURL("image/png");
  };

  const exportImage = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%)";
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
    if (overlayColor) { ctx.globalAlpha = overlayOpacity / 100; ctx.fillStyle = overlayColor; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (textOverlay) {
      ctx.font = "bold " + textSize + "px Inter, sans-serif";
      ctx.fillStyle = textColor; ctx.textAlign = "center";
      let y = canvas.height / 2;
      if (textPos === "top") y = textSize + 40; else if (textPos === "bottom") y = canvas.height - 40;
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8;
      ctx.fillText(textOverlay, canvas.width / 2, y);
    }
    drawWatermark(ctx, canvas.width, canvas.height, 1);
    const mimeType = exportFormat === "jpeg" ? "image/jpeg" : exportFormat === "webp" ? "image/webp" : "image/png";
    const ext = exportFormat === "jpeg" ? ".jpg" : exportFormat === "webp" ? ".webp" : ".png";
    const quality = exportFormat === "png" ? undefined : exportQuality / 100;
    const baseName = (file ? file.name.replace(/\.[^.]+$/, "") : "image");
    canvas.toBlob((blob) => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "edited-" + baseName + ext; a.click();
    }, mimeType, quality);
  };

  const sliderStyle = { width: "100%", accentColor: "var(--brand)", cursor: "pointer" };
  const labelStyle = { display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 };
  const inputStyle = { padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 12, outline: "none", width: "100%" };
  const panelStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 };
  const panelTitle = { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 };

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <PageHeader icon={<Crop size={22} color="#0284c7" />} title="Image Editor" subtitle="Crop, resize, watermark, and add text overlays" />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {!file ? (
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 20px", border: "2px dashed var(--border)", borderRadius: 14, cursor: "pointer", background: "var(--bg-card)", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
          <div style={{ opacity: 0.3 }}><Image size={40} /></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Click to upload an image</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>PNG, JPG, WEBP, GIF</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 16 }} className="hub-editor-grid">
          <div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{origW} x {origH}px</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {undoStack.length > 0 && <button onClick={undo} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--text-muted)" }}>{"\u21A9"} Undo</button>}
                  <button onClick={() => setCropMode(!cropMode)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid " + (cropMode ? "var(--brand)" : "var(--border)"), background: cropMode ? "var(--brand-light)" : "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: cropMode ? "var(--brand)" : "var(--text-muted)" }}>Crop</button>
                  {cropMode && cropStart && cropEnd && <button onClick={applyCrop} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "var(--brand)", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Apply Crop</button>}
                </div>
              </div>
              {cropMode && (
                <div style={{ padding: "4px 10px", borderBottom: "1px solid var(--border)", display: "flex", gap: 4, background: "var(--bg-input)" }}>
                  {CROP_RATIOS.map((r) => (
                    <button key={r.value} onClick={() => setCropRatio(r.value)} style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid " + (cropRatio === r.value ? "var(--brand)" : "var(--border)"), background: cropRatio === r.value ? "var(--brand-light)" : "transparent", fontSize: 10, fontWeight: 600, cursor: "pointer", color: cropRatio === r.value ? "var(--brand)" : "var(--text-muted)" }}>{r.label}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", background: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%) 50%/16px 16px", padding: 8, cursor: cropMode ? "crosshair" : "default" }} onMouseDown={handleCropMouseDown} onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp}>
                <canvas ref={previewCanvasRef} style={{ maxWidth: "100%", display: "block", borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={exportImage} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}><><Download size={13} style={{display:"inline",verticalAlign:"-1px"}} /> Download</></button>
              <button onClick={() => { saveUndo(); resetEdits(); }} style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)", transition: "all 0.2s" }}>Reset</button>
              <button onClick={() => { setFile(null); setPreview(null); imgRef.current = null; if (fileRef.current) fileRef.current.value = ""; setUndoStack([]); }} style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)", transition: "all 0.2s" }}>New Image</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={panelStyle}>
              <div style={panelTitle}>Adjust</div>
              <div style={{ marginBottom: 10 }}><div style={labelStyle}><span>Brightness</span><span>{brightness}%</span></div><input type="range" min="20" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={sliderStyle} /></div>
              <div style={{ marginBottom: 10 }}><div style={labelStyle}><span>Contrast</span><span>{contrast}%</span></div><input type="range" min="20" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={sliderStyle} /></div>
              <div><div style={labelStyle}><span>Saturation</span><span>{saturation}%</span></div><input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} style={sliderStyle} /></div>
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Brand Overlay</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <button onClick={() => setOverlayColor("")} style={{ width: 28, height: 28, borderRadius: 6, border: "2px solid " + (!overlayColor ? "var(--brand)" : "var(--border)"), background: "repeating-conic-gradient(#80808030 0% 25%, transparent 0% 50%) 50%/8px 8px", cursor: "pointer" }}></button>
                {EDITOR_BRAND_COLORS.map((c) => (
                  <button key={c.color} onClick={() => setOverlayColor(c.color)} style={{ width: 28, height: 28, borderRadius: 6, border: "2px solid " + (overlayColor === c.color ? "var(--brand)" : "var(--border)"), background: c.color, cursor: "pointer" }}></button>
                ))}
              </div>
              {overlayColor && <div><div style={labelStyle}><span>Opacity</span><span>{overlayOpacity}%</span></div><input type="range" min="5" max="80" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} style={sliderStyle} /></div>}
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Watermark</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", marginBottom: watermark ? 10 : 0 }}>
                <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} style={{ accentColor: "var(--brand)" }} />
                Alps logo watermark
              </label>
              {watermark && <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 8 }}>
                  {[{ key: "tl", label: "\u2196" }, { key: "tr", label: "\u2197" }, { key: "bl", label: "\u2199" }, { key: "br", label: "\u2198" }].map((p) => (
                    <button key={p.key} onClick={() => setWatermarkPos(p.key)} style={{ padding: "5px", borderRadius: 4, border: "1px solid " + (watermarkPos === p.key ? "var(--brand)" : "var(--border)"), background: watermarkPos === p.key ? "var(--brand-light)" : "transparent", fontSize: 14, cursor: "pointer", color: watermarkPos === p.key ? "var(--brand)" : "var(--text-muted)" }}>{p.label}</button>
                  ))}
                </div>
                <div style={{ marginBottom: 6 }}><div style={labelStyle}><span>Size</span><span>{watermarkSize}%</span></div><input type="range" min="5" max="40" value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value))} style={sliderStyle} /></div>
                <div><div style={labelStyle}><span>Opacity</span><span>{watermarkOpacity}%</span></div><input type="range" min="10" max="100" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(Number(e.target.value))} style={sliderStyle} /></div>
              </>}
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Resize</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {RESIZE_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyResize(p.w, p.h)} title={p.w + "x" + p.h} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s" }}>{p.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={resizeW} onChange={(e) => handleResizeW(e.target.value)} placeholder="W" style={{ width: "100%", padding: "6px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
                <button onClick={() => setResizeLock(!resizeLock)} style={{ padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 4, background: resizeLock ? "var(--brand-light)" : "transparent", cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>{resizeLock ? "🔗" : "⛓"}</button>
                <input type="number" value={resizeH} onChange={(e) => handleResizeH(e.target.value)} placeholder="H" style={{ width: "100%", padding: "6px 8px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
                <button onClick={() => { if (resizeW && resizeH) applyResize(Number(resizeW), Number(resizeH)); }} disabled={!resizeW || !resizeH} style={{ padding: "6px 10px", border: "none", borderRadius: 4, background: "var(--brand)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", opacity: (!resizeW || !resizeH) ? 0.4 : 1 }}>{"\u2713"}</button>
              </div>
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Export</div>
              <div style={{ display: "flex", gap: 4, marginBottom: exportFormat !== "png" ? 8 : 0 }}>
                {[{ k: "png", l: "PNG" }, { k: "jpeg", l: "JPEG" }, { k: "webp", l: "WEBP" }].map((f) => (
                  <button key={f.k} onClick={() => setExportFormat(f.k)} style={{ flex: 1, padding: "5px", borderRadius: 4, border: "1px solid " + (exportFormat === f.k ? "var(--brand)" : "var(--border)"), background: exportFormat === f.k ? "var(--brand-light)" : "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: exportFormat === f.k ? "var(--brand)" : "var(--text-muted)" }}>{f.l}</button>
                ))}
              </div>
              {exportFormat !== "png" && <div><div style={labelStyle}><span>Quality</span><span>{exportQuality}%</span></div><input type="range" min="10" max="100" value={exportQuality} onChange={(e) => setExportQuality(Number(e.target.value))} style={sliderStyle} /></div>}
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Text</div>
              <input value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} placeholder="Add text..." style={{ ...inputStyle, marginBottom: 8 }} />
              {textOverlay && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Size</div><input type="number" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} style={inputStyle} /></div>
                  <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Colour</div><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ ...inputStyle, padding: 4, height: 36, cursor: "pointer" }} /></div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["top", "center", "bottom"].map((p) => (
                    <button key={p} onClick={() => setTextPos(p)} style={{ flex: 1, padding: "5px", borderRadius: 4, border: "1px solid " + (textPos === p ? "var(--brand)" : "var(--border)"), background: textPos === p ? "var(--brand-light)" : "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: textPos === p ? "var(--brand)" : "var(--text-muted)" }}>{p}</button>
                  ))}
                </div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export function MeetingNotesToTicket({ onCreateTicket, onDirectCreate, currentUser }) {
  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState([]);
  const [created, setCreated] = useState({});
  const [creating, setCreating] = useState(false);

  const extractActions = () => {
    if (!notes.trim()) return;
    const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
    const actions = [];
    const actionPatterns = [
      /^[-*•]\s*(?:ACTION|TODO|TASK|FOLLOW[- ]?UP)?[:\s]*(.+)/i,
      /^(?:\d+[.)]\s*)(.+)/,
      /^(?:ACTION|TODO|TASK|FOLLOW[- ]?UP)[:\s]+(.+)/i,
    ];
    const contextKeywords = /\b(?:need(?:s|ed)? to|should|will|must|can you|please|let'?s|make sure|follow[- ]?up|action|todo|task|create|update|send|schedule|book|arrange|prepare|draft|review|check|confirm|set up|organise|organize|complete|finish|deliver|submit|upload|design|build|write|produce|contact|call|email|meet)\b/i;

    lines.forEach((line) => {
      let matched = false;
      for (const pattern of actionPatterns) {
        const m = line.match(pattern);
        if (m) {
          actions.push({ text: m[1].trim(), original: line, selected: true, priority: "medium" });
          matched = true;
          break;
        }
      }
      if (!matched && contextKeywords.test(line) && line.length > 15 && line.length < 300) {
        actions.push({ text: line, original: line, selected: true, priority: "medium" });
      }
    });

    if (actions.length === 0) {
      lines.forEach((line) => {
        if (line.length > 10 && line.length < 200 && !line.toLowerCase().startsWith("meeting") && !line.toLowerCase().startsWith("attendee") && !line.toLowerCase().startsWith("date") && !line.toLowerCase().startsWith("present")) {
          actions.push({ text: line, original: line, selected: false, priority: "medium" });
        }
      });
    }
    setExtracted(actions);
    setCreated({});
  };

  const toggleItem = (idx) => setExtracted((prev) => prev.map((a, i) => i === idx ? { ...a, selected: !a.selected } : a));
  const setPriority = (idx, p) => setExtracted((prev) => prev.map((a, i) => i === idx ? { ...a, priority: p } : a));
  const removeItem = (idx) => setExtracted((prev) => prev.filter((_, i) => i !== idx));
  const [manualText, setManualText] = useState("");
  const addManual = () => { if (!manualText.trim()) return; setExtracted((prev) => [...prev, { text: manualText.trim(), original: manualText.trim(), selected: true, priority: "medium" }]); setManualText(""); };

  const createTicket = async (action, idx) => {
    if (onDirectCreate) {
      setCreating(true);
      await onDirectCreate({ title: action.text, description: "From meeting notes:\n\n" + action.original, priority: action.priority });
      setCreated((prev) => ({ ...prev, [idx]: true }));
      setCreating(false);
    } else {
      onCreateTicket({ title: action.text, description: "From meeting notes:\n\n" + action.original, priority: action.priority });
      setCreated((prev) => ({ ...prev, [idx]: true }));
    }
  };

  const createAll = async () => {
    const items = extracted.filter((a, i) => a.selected && !created[i]);
    if (items.length === 0) return;
    setCreating(true);
    for (let i = 0; i < extracted.length; i++) {
      const a = extracted[i];
      if (!a.selected || created[i]) continue;
      if (onDirectCreate) {
        await onDirectCreate({ title: a.text, description: "From meeting notes:\n\n" + a.original, priority: a.priority });
      }
      setCreated((prev) => ({ ...prev, [i]: true }));
    }
    setCreating(false);
  };

  const selectedCount = extracted.filter((a, i) => a.selected && !created[i]).length;
  const inputStyle = { width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ width: "100%", maxWidth: 700 }}>
      <PageHeader icon={<ClipboardList size={22} color="#0284c7" />} title="Meeting Notes to Tickets" subtitle="Paste meeting notes and extract action items" />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20, borderTop: "3px solid #0284c7" }}>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"Paste meeting notes here...\n\nExamples of what we'll pick up:\n- Create social media campaign for Q2 launch\n- Tom to update the website hero banner\n- ACTION: Send broker toolkit to new partners\n1. Schedule photography session for May\n2. Review print materials before Friday"} rows={10} style={{ ...inputStyle, resize: "vertical", marginBottom: 14, lineHeight: 1.6 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={extractActions} disabled={!notes.trim()} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !notes.trim() ? 0.5 : 1 }}>Extract Action Items</button>
          {extracted.length > 0 && <button onClick={() => { setExtracted([]); setCreated({}); }} style={{ padding: "10px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Clear</button>}
          {notes.trim() && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{notes.split("\n").filter((l) => l.trim()).length} lines</span>}
        </div>
      </div>

      {extracted.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Extracted Items ({extracted.length})</h3>
            {selectedCount > 0 && (
              <button onClick={createAll} disabled={creating} style={{ padding: "8px 16px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: creating ? 0.6 : 1 }}>{creating ? "Creating..." : "Create " + selectedCount + " Ticket" + (selectedCount !== 1 ? "s" : "")}</button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {extracted.map((action, idx) => {
              const done = created[idx];
              const p = PRIORITIES[action.priority];
              return (
                <div key={idx} style={{ padding: "12px 16px", background: done ? "rgba(22,163,74,0.04)" : "var(--bg-input)", border: "1px solid " + (done ? "rgba(22,163,74,0.2)" : "var(--border)"), borderRadius: 10, opacity: done ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {!done && (
                      <input type="checkbox" checked={action.selected} onChange={() => toggleItem(idx)} style={{ marginTop: 3, accentColor: "var(--brand)", cursor: "pointer" }} />
                    )}
                    {done && <span style={{ fontSize: 16, flexShrink: 0 }}>{"\u2705"}</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: done ? "#16a34a" : "var(--text-primary)", lineHeight: 1.4 }}>{action.text}</div>
                      {!done && (
                        <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {Object.entries(PRIORITIES).map(([key, pr]) => (
                            <button key={key} onClick={() => setPriority(idx, key)} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid " + (action.priority === key ? pr.color : "var(--border)"), background: action.priority === key ? pr.bg : "transparent", color: action.priority === key ? pr.color : "var(--text-muted)" }}>
                              {pr.icon} {pr.label}
                            </button>
                          ))}
                          <button onClick={() => createTicket(action, idx)} disabled={creating} style={{ marginLeft: "auto", padding: "5px 12px", background: "var(--brand)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: creating ? 0.6 : 1 }}>Create Ticket</button>
                          <button onClick={() => removeItem(idx)} style={{ padding: "5px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>{"\u2715"}</button>
                        </div>
                      )}
                      {done && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>Ticket created</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <input value={manualText} onChange={(e) => setManualText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addManual(); }} placeholder="Manually add an action item..." style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", outline: "none" }} />
            <button onClick={addManual} disabled={!manualText.trim()} style={{ padding: "8px 14px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !manualText.trim() ? 0.5 : 1 }}>+ Add</button>
          </div>
        </div>
      )}
    </div>
  );
}


export function ContentRepurposer() {
  const [source, setSource] = useState("");
  const [outputs, setOutputs] = useState(null);
  const [copied, setCopied] = useState(null);

  const repurpose = () => {
    if (!source.trim()) return;
    const text = source.trim();

    // Extract key sentences - first sentence, last sentence, and any sentence with strong keywords
    const sentences = text.replace(/([.!?])\s+/g, "$1|SPLIT|").split("|SPLIT|").map((s) => s.trim()).filter((s) => s.length > 10);
    const firstSentence = sentences[0] || text.slice(0, 150);
    const keyPhrases = sentences.filter((s) => /\b(?:launch|announce|new|introducing|excited|proud|key|important|result|growth|partner|milestone|achieve)\b/i.test(s));
    const hook = keyPhrases[0] || firstSentence;

    // Strip markdown for clean output
    const clean = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/#{1,6}\s/g, "").replace(/\[(.+?)\]\(.+?\)/g, "$1").replace(/^[-*]\s/gm, "• ");

    // Summarise - take first 2-3 meaningful sentences
    const summary = sentences.slice(0, 3).join(" ");
    const shortSummary = sentences.slice(0, 2).join(" ");

    // Detect topic for hashtags
    const topicKeywords = {
      insurance: ["#insurance", "#insurtech", "#brokers"],
      marketing: ["#marketing", "#digitalmarketing", "#contentmarketing"],
      property: ["#property", "#realestate", "#lettings"],
      technology: ["#technology", "#innovation", "#digital"],
      team: ["#teamwork", "#culture", "#hiring"],
      event: ["#events", "#networking", "#conference"],
    };
    let hashtags = ["#alps", "#business"];
    const lowerText = text.toLowerCase();
    for (const [topic, tags] of Object.entries(topicKeywords)) {
      if (lowerText.includes(topic)) { hashtags = [...tags, "#alps"]; break; }
    }

    // LinkedIn post (max ~3000 chars, but aim for 1300 for engagement)
    const linkedinLines = [];
    linkedinLines.push(hook.replace(/[.!?]$/, "") + ".\n");
    if (sentences.length > 3) {
      linkedinLines.push(sentences.slice(1, 4).join(" ") + "\n");
    }
    if (sentences.length > 5) {
      const bullets = sentences.slice(4, 7).map((s) => "→ " + s.replace(/[.!?]$/, ""));
      linkedinLines.push(bullets.join("\n") + "\n");
    }
    linkedinLines.push(hashtags.join(" "));
    const linkedin = linkedinLines.join("\n");

    // Email snippet (subject + 2-3 sentence intro)
    const subjectLine = hook.length > 80 ? hook.slice(0, 77) + "..." : hook.replace(/[.!?]$/, "");
    const emailBody = "Hi,\n\n" + shortSummary + "\n\n" + (sentences.length > 3 ? sentences.slice(2, 4).join(" ") + "\n\n" : "") + "Let me know if you'd like to discuss further.\n\nBest regards";

    // Social caption (short, punchy, < 280 chars)
    let social = hook.replace(/[.!?]$/, "");
    if (social.length > 200) social = social.slice(0, 197) + "...";
    social += " " + hashtags.slice(0, 3).join(" ");

    // Twitter/X thread format
    const tweetThread = [];
    if (sentences.length > 0) tweetThread.push("🧵 " + sentences[0]);
    sentences.slice(1, 5).forEach((s, i) => { tweetThread.push((i + 2) + "/ " + s); });
    if (sentences.length > 5) tweetThread.push((tweetThread.length + 1) + "/ " + sentences[sentences.length - 1] + "\n\n" + hashtags.join(" "));
    else if (tweetThread.length > 0) tweetThread[tweetThread.length - 1] += "\n\n" + hashtags.join(" ");

    setOutputs({
      linkedin,
      emailSubject: subjectLine,
      emailBody,
      social,
      tweetThread: tweetThread.join("\n\n"),
    });
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  };

  const inputStyle = { width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const OutputCard = ({ title, icon, content, copyKey, charLimit, extra }) => (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{icon} {title}</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: content.length > (charLimit || 99999) ? "#dc2626" : "var(--text-muted)" }}>{content.length} chars{charLimit ? " / " + charLimit : ""}</span>
          <button onClick={() => copy(extra ? extra + "\n\n" + content : content, copyKey)} style={{ padding: "5px 12px", background: copied === copyKey ? "#16a34a" : "var(--brand-light)", border: "none", borderRadius: 6, color: copied === copyKey ? "#fff" : "var(--brand)", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            {copied === copyKey ? "\u2713 Copied" : "Copy"}
          </button>
        </div>
      </div>
      {extra && <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, marginBottom: 8, padding: "6px 10px", background: "var(--brand-light)", borderRadius: 6, display: "inline-block" }}>{extra}</div>}
      <pre style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "inherit" }}>{content}</pre>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: 700 }}>
      <PageHeader icon={<Repeat size={22} color="#0284c7" />} title="Content Repurposer" subtitle="Reformat long-form content for different platforms" />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20, borderTop: "3px solid #0284c7" }}>
        <textarea value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste your content here — blog post, article, press release, announcement..." rows={8} style={{ ...inputStyle, resize: "vertical", marginBottom: 14, lineHeight: 1.6 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={repurpose} disabled={!source.trim()} style={{ padding: "10px 20px", background: "var(--brand)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !source.trim() ? 0.5 : 1 }}>Repurpose Content</button>
          {outputs && <button onClick={() => { setOutputs(null); }} style={{ padding: "10px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Clear</button>}
          {source.trim() && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{source.trim().split(/\s+/).length} words</span>}
        </div>
      </div>

      {outputs && (
        <div>
          <OutputCard title="LinkedIn Post" icon="LinkedIn" content={outputs.linkedin} copyKey="linkedin" charLimit={3000} />
          <OutputCard title="Email" icon="Email" content={outputs.emailBody} copyKey="email" extra={"Subject: " + outputs.emailSubject} />
          <OutputCard title="Social Caption" icon="Social" content={outputs.social} copyKey="social" charLimit={280} />
          <OutputCard title="X / Twitter Thread" icon="X" content={outputs.tweetThread} copyKey="thread" charLimit={280} />
        </div>
      )}
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

export function ContrastChecker() {
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState("#231d68");
  const BRAND = [
    { name: "Alps Blue", hex: "#231d68" }, { name: "Motor Pink", hex: "#e64592" },
    { name: "Commercial Teal", hex: "#20A39E" }, { name: "Let Gold", hex: "#FAB315" },
    { name: "Personal Purple", hex: "#464B99" }, { name: "Alt Cyan", hex: "#27D7F4" },
    { name: "White", hex: "#ffffff" }, { name: "Black", hex: "#1a1d2e" },
  ];
  const hexToRgb = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return [r, g, b]; };
  const luminance = ([r, g, b]) => { const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  const contrastRatio = (c1, c2) => { const l1 = luminance(hexToRgb(c1)); const l2 = luminance(hexToRgb(c2)); const lighter = Math.max(l1, l2); const darker = Math.min(l1, l2); return (lighter + 0.05) / (darker + 0.05); };
  const ratio = contrastRatio(fg, bg);
  const aaLarge = ratio >= 3; const aaNormal = ratio >= 4.5; const aaaLarge = ratio >= 4.5; const aaaNormal = ratio >= 7;
  const Pass = ({ ok }) => <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", color: ok ? "#16a34a" : "#dc2626" }}>{ok ? "Pass" : "Fail"}</span>;

  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <PageHeader icon={<Droplet size={22} color="#0284c7" />} title="Colour Contrast Checker" subtitle="Check WCAG accessibility of colour combinations" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, borderTop: "3px solid #0284c7" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Foreground (Text)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
              <input value={fg} onChange={(e) => setFg(e.target.value)} style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)", outline: "none" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Background</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
              <input value={bg} onChange={(e) => setBg(e.target.value)} style={{ flex: 1, padding: "8px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)", outline: "none" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {BRAND.map((c) => (
            <button key={c.hex} onClick={() => setBg(c.hex)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "var(--bg-input)", border: "1px solid " + (bg === c.hex ? "var(--brand)" : "var(--border)"), borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: c.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }}></span>{c.name}
            </button>
          ))}
        </div>
        <div style={{ borderRadius: 12, padding: "32px 24px", marginBottom: 20, textAlign: "center", background: bg, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: fg, marginBottom: 4 }}>Sample Heading</div>
          <div style={{ fontSize: 16, color: fg, marginBottom: 8 }}>Regular body text at 16px</div>
          <div style={{ fontSize: 12, color: fg }}>Small text at 12px — the hardest to read</div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: ratio >= 4.5 ? "#16a34a" : ratio >= 3 ? "#ca8a04" : "#dc2626" }}>{ratio.toFixed(2)}:1</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Contrast Ratio</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>WCAG AA</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Normal text (14px)</span><Pass ok={aaNormal} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Large text (18px+)</span><Pass ok={aaLarge} /></div>
          </div>
          <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>WCAG AAA</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Normal text (14px)</span><Pass ok={aaaNormal} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Large text (18px+)</span><Pass ok={aaaLarge} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialPreview() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [img, setImg] = useState("");
  const [site, setSite] = useState("Alps Ltd");
  const [fetching, setFetching] = useState(false);

  const fetchMeta = async () => {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const fullUrl = url.startsWith("http") ? url : "https://" + url;
      const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(fullUrl));
      const html = await res.text();
      const getTag = (prop) => { const m = html.match(new RegExp('<meta[^>]*(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', 'i')) || html.match(new RegExp('<meta[^>]*content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', 'i')); return m ? m[1] : ""; };
      const ogTitle = getTag("og:title") || getTag("twitter:title") || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
      const ogDesc = getTag("og:description") || getTag("twitter:description") || getTag("description") || "";
      const ogImg = getTag("og:image") || getTag("twitter:image") || "";
      const ogSite = getTag("og:site_name") || "";
      if (ogTitle) setTitle(ogTitle.trim());
      if (ogDesc) setDesc(ogDesc.trim());
      if (ogImg) setImg(ogImg.trim());
      if (ogSite) setSite(ogSite.trim());
    } catch { /* silently fail - user can fill manually */ }
    setFetching(false);
  };

  return (
    <div style={{ width: "100%", maxWidth: 640 }}>
      <PageHeader icon={<Type size={22} color="#0284c7" />} title="Social Media Preview" subtitle="See how your link will look when shared on social platforms" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, borderTop: "3px solid #0284c7", marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Page URL</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchMeta()} placeholder="https://alpsltd.co.uk/page" style={{ flex: 1, padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            <button onClick={fetchMeta} disabled={fetching || !url.trim()} style={{ padding: "10px 16px", background: "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: fetching ? "wait" : "pointer", opacity: url.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}>{fetching ? "Fetching..." : "Auto-fill"}</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Paste a URL and click Auto-fill to read its meta tags, or fill in manually below.</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Title <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({title.length}/70 chars)</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alps Ltd — Professional Insurance Services" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({desc.length}/160 chars)</span></label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Short description of the page content..." style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--text-primary)", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Image URL (optional)</label>
            <input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Site Name</label>
            <input value={site} onChange={(e) => setSite(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>

      {(title || desc) && (<>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Preview</div>

        {/* LinkedIn */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#0a66c2", marginBottom: 6 }}>LinkedIn</div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e0e0e0", overflow: "hidden", maxWidth: 552 }}>
            {img && <div style={{ height: 288, background: "#f3f3f3", backgroundImage: "url(" + img + ")", backgroundSize: "cover", backgroundPosition: "center" }}></div>}
            <div style={{ padding: "12px 16px", background: "#f9fafb" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#000", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Page title"}</div>
              {desc && <div style={{ fontSize: 12, color: "#666", marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</div>}
              <div style={{ fontSize: 12, color: "#999" }}>{url ? new URL(url.startsWith("http") ? url : "https://" + url).hostname : "alpsltd.co.uk"}</div>
            </div>
          </div>
        </div>

        {/* Facebook */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1877f2", marginBottom: 6 }}>Facebook</div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #ddd", overflow: "hidden", maxWidth: 500 }}>
            {img && <div style={{ height: 261, background: "#f0f0f0", backgroundImage: "url(" + img + ")", backgroundSize: "cover", backgroundPosition: "center" }}></div>}
            <div style={{ padding: "10px 12px", background: "#f2f3f5" }}>
              <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", marginBottom: 2 }}>{url ? new URL(url.startsWith("http") ? url : "https://" + url).hostname : "alpsltd.co.uk"}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1d2129", marginBottom: 2 }}>{title || "Page title"}</div>
              {desc && <div style={{ fontSize: 14, color: "#606770", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</div>}
            </div>
          </div>
        </div>

        {/* X/Twitter */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#000", marginBottom: 6 }}>X / Twitter</div>
          <div style={{ borderRadius: 16, border: "1px solid #cfd9de", overflow: "hidden", maxWidth: 504 }}>
            {img && <div style={{ height: 252, background: "#f7f9f9", backgroundImage: "url(" + img + ")", backgroundSize: "cover", backgroundPosition: "center" }}></div>}
            <div style={{ padding: "12px", background: "#fff", borderTop: img ? "1px solid #cfd9de" : "none" }}>
              <div style={{ fontSize: 15, color: "#0f1419", fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Page title"}</div>
              {desc && <div style={{ fontSize: 15, color: "#536471", marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</div>}
              <div style={{ fontSize: 15, color: "#536471" }}>{url ? new URL(url.startsWith("http") ? url : "https://" + url).hostname : "alpsltd.co.uk"}</div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}

export function LargePrintGenerator() {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [addHeader, setAddHeader] = useState(true);
  const [pageCount, setPageCount] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const PRESETS = [
    { label: "Standard Large Print", size: 16, desc: "1.5x normal size" },
    { label: "Large", size: 18, desc: "Good for most requests" },
    { label: "Extra Large", size: 20, desc: "Significantly larger" },
    { label: "Very Large", size: 24, desc: "Maximum readability" },
  ];

  const loadPdfJs = () => {
    return new Promise((resolve) => {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      document.head.appendChild(script);
    });
  };

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f || f.type !== "application/pdf") { setError("Please upload a PDF file."); return; }
    setFile(f); setError(null); setExtracted(null); setPageCount(null); setExtracting(true);

    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);

      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const items = content.items;

        // Group text items into lines by Y position
        const lines = [];
        let currentLine = { y: null, items: [], fontSize: 0 };

        items.forEach((item) => {
          const y = Math.round(item.transform[5]);
          const fs = Math.round(item.height || item.transform[0] || 12);
          if (currentLine.y === null || Math.abs(y - currentLine.y) > 3) {
            if (currentLine.items.length > 0) lines.push({ ...currentLine });
            currentLine = { y, items: [item.str], fontSize: fs };
          } else {
            currentLine.items.push(item.str);
          }
        });
        if (currentLine.items.length > 0) lines.push({ ...currentLine });

        // Detect headings (larger font or all-caps short lines)
        const avgFontSize = lines.reduce((s, l) => s + l.fontSize, 0) / (lines.length || 1);
        const parsed = lines.map((l) => {
          const text = l.items.join("").trim();
          const isHeading = l.fontSize > avgFontSize * 1.15 || (text.length < 80 && text === text.toUpperCase() && text.length > 2 && !/^\d+$/.test(text));
          return { text, isHeading };
        }).filter((l) => l.text.length > 0);

        pages.push(parsed);
      }

      setExtracted(pages);
    } catch (err) {
      setError("Failed to extract text from this PDF. It may be scanned or image-based.");
      console.error(err);
    }
    setExtracting(false);
  };

  const generateLargePrint = () => {
    if (!extracted) return;
    setGenerating(true);

    const doc = new jsPDF("p", "mm", "a4");

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const usableW = pageW - margin * 2;
    const lineHeight = fontSize * 0.45;
    const headingSize = Math.round(fontSize * 1.25);
    const headingLineHeight = headingSize * 0.45;
    let y = margin;
    let pageNum = 1;

    const newPage = () => {
      // Footer on current page
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
      doc.text("Page " + pageNum, pageW / 2, pageH - 10, { align: "center" });
      if (addHeader) { doc.text("LARGE PRINT VERSION", pageW - margin, pageH - 10, { align: "right" }); }
      doc.addPage();
      pageNum++;
      y = margin;
      if (addHeader) {
        doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "italic");
        doc.text("Large Print Version — " + fontSize + "pt", margin, y);
        y += 8;
        doc.setTextColor(0, 0, 0);
      }
    };

    // Title page if header enabled
    if (addHeader) {
      doc.setFillColor(35, 29, 104);
      doc.rect(0, 0, pageW, 50, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24); doc.setFont("helvetica", "bold");
      doc.text("LARGE PRINT", margin, 25);
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text("Version", margin, 35);
      doc.setFontSize(10);
      doc.text(fontSize + "pt font · Generated " + new Date().toLocaleDateString("en-GB"), margin, 44);
      y = 65;
      doc.setTextColor(0, 0, 0);
      if (file) {
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text(file.name.replace(/\.pdf$/i, ""), margin, y);
        y += 12;
      }
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
      doc.text("Original: " + pageCount + " pages · This version may have more pages due to larger text.", margin, y);
      y += 16;
      doc.setTextColor(0, 0, 0);
    }

    extracted.forEach((page, pi) => {
      if (pi > 0 && !addHeader) { newPage(); }
      page.forEach((line) => {
        const isH = line.isHeading;
        const fs = isH ? headingSize : fontSize;
        const lh = isH ? headingLineHeight : lineHeight;

        doc.setFontSize(fs);
        doc.setFont("helvetica", isH ? "bold" : "normal");
        const wrapped = doc.splitTextToSize(line.text, usableW);

        // Check if we need a new page
        if (y + wrapped.length * lh > pageH - 20) { newPage(); }

        if (isH && y > margin + 10) { y += lh * 0.5; }

        wrapped.forEach((wl) => {
          if (y > pageH - 20) { newPage(); }
          doc.text(wl, margin, y);
          y += lh;
        });

        if (isH) { y += lh * 0.3; }
      });
    });

    // Final page footer
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
    doc.text("Page " + pageNum, pageW / 2, pageH - 10, { align: "center" });

    const baseName = file ? file.name.replace(/\.pdf$/i, "") : "document";
    doc.save(baseName + "-large-print-" + fontSize + "pt.pdf");
    setGenerating(false);
  };

  const totalLines = extracted ? extracted.reduce((s, p) => s + p.length, 0) : 0;
  const totalHeadings = extracted ? extracted.reduce((s, p) => s + p.filter((l) => l.isHeading).length, 0) : 0;

  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <PageHeader icon={<Type size={22} color="#0284c7" />} title="Large Print Generator" subtitle="Convert policy wordings to large print PDFs" />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, borderTop: "3px solid #0284c7" }}>
        {/* Upload */}
        {!extracted ? (
          <div>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: 12, cursor: "pointer", background: "var(--bg-input)", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--brand)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
              {extracting ? (<>
                <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--brand)", borderRadius: 16, animation: "spin 0.8s linear infinite" }}></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Extracting text from PDF...</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>This may take a moment for large documents</div>
              </>) : (<>
                <div style={{ opacity: 0.3 }}><FileText size={40} /></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{file ? file.name : "Click to upload a PDF"}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Policy wording PDFs work best</div>
              </>)}
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{ display: "none" }} disabled={extracting} />
            </label>
            {error && <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 8, fontSize: 12, color: "#dc2626" }}>{error}</div>}
          </div>
        ) : (
          <div>
            {/* Extraction summary */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", borderRadius: 10, marginBottom: 20 }}>
              <CheckCircle2 size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Text extracted successfully</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{file.name} · {pageCount} pages · {totalLines} lines · {totalHeadings} headings detected</div>
              </div>
              <button onClick={() => { setExtracted(null); setFile(null); setPageCount(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ padding: "5px 12px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>Change file</button>
            </div>

            {/* Font size selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Select Font Size</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {PRESETS.map((p) => (
                  <button key={p.size} onClick={() => setFontSize(p.size)} style={{ padding: "12px 14px", background: fontSize === p.size ? "var(--brand-light)" : "var(--bg-input)", border: "1.5px solid " + (fontSize === p.size ? "var(--brand)" : "var(--border)"), borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: fontSize === p.size ? "var(--brand)" : "var(--text-primary)" }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{p.size}pt · {p.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Custom:</span>
                <input type="range" min="14" max="32" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--brand)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", minWidth: 36, textAlign: "right" }}>{fontSize}pt</span>
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20, padding: "16px 20px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>Preview at {fontSize}pt</div>
              {extracted[0] && extracted[0].slice(0, 4).map((line, i) => (
                <div key={i} style={{ fontSize: line.isHeading ? fontSize * 1.25 : fontSize, fontWeight: line.isHeading ? 700 : 400, color: "#1a1d2e", lineHeight: 1.4, marginBottom: line.isHeading ? 8 : 4, fontFamily: "serif" }}>{line.text.slice(0, 100)}{line.text.length > 100 ? "..." : ""}</div>
              ))}
            </div>

            {/* Options */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={addHeader} onChange={(e) => setAddHeader(e.target.checked)} style={{ accentColor: "var(--brand)" }} />
              Add "Large Print Version" title page and page headers
            </label>

            {/* Generate button */}
            <button onClick={generateLargePrint} disabled={generating} style={{ width: "100%", padding: "12px", background: "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating ? "wait" : "pointer", transition: "all 0.2s" }}>
              {generating ? "Generating PDF..." : "Generate Large Print PDF"}
            </button>
          </div>
        )}
      </div>

      {/* Notice */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text-secondary)" }}>A note on accuracy:</strong> Text extraction from PDFs isn't always perfect — some PDFs encode text in unusual ways. For standard policy wording documents from known templates, it should work consistently. If a particular PDF doesn't extract well, you may see garbled or missing text in the output. In that case, the large print version would need to be done manually for that document.
      </div>
    </div>
  );
}

export function FirstPolicySold({ isAdmin }) {
  const [brokerName, setBrokerName] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
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
  const canvasRef = useRef(null);
  const addFileRef = useRef(null);
  const bgFileRef = useRef(null);

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

  const saveMembers = async (list) => {
    setTeamMembers(list);
    const val = JSON.stringify(list);
    const { data: existing } = await supabase.from("app_settings").select("key").eq("key", "policy_team_members").maybeSingle();
    if (existing) { await supabase.from("app_settings").update({ value: val }).eq("key", "policy_team_members"); }
    else { await supabase.from("app_settings").insert({ key: "policy_team_members", value: val }); }
  };
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
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
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

  const generateImage = () => {
    if (!selectedMember || !brokerName.trim()) return;
    setGenerating(true);
    const canvas = canvasRef.current;
    const W = 1200, H = 627;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    const drawContent = () => {
      const personImg = new window.Image();
      personImg.crossOrigin = "anonymous";
      personImg.onload = () => {
        // Person photo on RIGHT half only - fit/contain, not stretch
        const rightX = W * 0.48, rightW = W - rightX, rightH = H;
        const pAspect = personImg.width / personImg.height;
        const boxAspect = rightW / rightH;
        let dw, dh;
        if (pAspect > boxAspect) { dw = rightW; dh = rightW / pAspect; }
        else { dh = rightH; dw = rightH * pAspect; }
        const dx = rightX + (rightW - dw) / 2;
        const dy = (rightH - dh) / 2;
        ctx.drawImage(personImg, dx, dy, dw, dh);

        // White panel on LEFT - single gradient, no hard edge
        const grad = ctx.createLinearGradient(0, 0, W * 0.58, 0);
        grad.addColorStop(0, "rgba(255,255,255,0.93)");
        grad.addColorStop(0.75, "rgba(255,255,255,0.93)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W * 0.58, H);

        // "1st" - properly spaced
        ctx.fillStyle = "#231d68";
        ctx.textBaseline = "alphabetic";
        ctx.font = "800 96px 'Inter', 'Segoe UI', sans-serif";
        ctx.fillText("1", 60, 170);
        const oneW = ctx.measureText("1").width;
        ctx.font = "800 48px 'Inter', 'Segoe UI', sans-serif";
        ctx.fillText("st", 60 + oneW + 2, 140);

        // "Policy" + "Sold!" - consistent line spacing
        ctx.font = "800 96px 'Inter', 'Segoe UI', sans-serif";
        ctx.fillText("Policy", 60, 270);
        ctx.fillText("Sold!", 60, 370);

        // Pink accent line
        ctx.fillStyle = "#e64592";
        ctx.fillRect(60, 390, 100, 5);

        // Broker name
        ctx.fillStyle = "#1a1d2e";
        ctx.font = "600 36px 'Inter', 'Segoe UI', sans-serif";
        const words = brokerName.trim().split(" ");
        let line = "", lineY = 450;
        words.forEach((word) => {
          const test = line + (line ? " " : "") + word;
          if (ctx.measureText(test).width > 420 && line) { ctx.fillText(line, 60, lineY); lineY += 44; line = word; }
          else { line = test; }
        });
        ctx.fillText(line, 60, lineY);

        // Confetti - lighter, spread across
        const colors = ["#dc2626", "#2563eb", "#16a34a", "#eab308", "#8b5cf6", "#ec4899", "#f97316", "#231d68"];
        for (let i = 0; i < 55; i++) {
          const cx = Math.random() * W, cy = Math.random() * H * 0.5;
          const w = 5 + Math.random() * 12, h = 2 + Math.random() * 5;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.random() * Math.PI * 2);
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.globalAlpha = 0.35 + Math.random() * 0.35;
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        setGenerated(canvas.toDataURL("image/png"));
        setGenerating(false);
      };
      personImg.onerror = () => setGenerating(false);
      personImg.src = selectedMember.photo_url;
    };

    // Background image first, then content on top
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

  const downloadImage = () => { if (!generated) return; const a = document.createElement("a"); a.href = generated; a.download = "1st-Policy-Sold-" + brokerName.trim().replace(/\s+/g, "-") + ".png"; a.click(); };

  return (
    <div style={{ width: "100%", maxWidth: 640 }}>
      <PageHeader icon={<Wand2 size={22} color="#0284c7" />} title="1st Policy Sold Generator" subtitle="Create celebration images for broker milestones" action={isAdmin && <button onClick={() => setShowManage(!showManage)} style={{ padding: "7px 14px", background: showManage ? "var(--border)" : "var(--brand)", border: "none", borderRadius: 8, color: showManage ? "var(--text-secondary)" : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showManage ? "Done" : "Manage"}</button>} />
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
              {!bgUrl && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Upload the office photo to use as background</span>}
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Select Team Member <span style={{ color: "#dc2626" }}>*</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
              {teamMembers.map((m) => (
                <button key={m.id} onClick={() => { setSelectedMember(m); setGenerated(null); }} style={{ background: "var(--bg-input)", border: "2px solid " + (selectedMember?.id === m.id ? "var(--brand)" : "var(--border)"), borderRadius: 10, overflow: "hidden", cursor: "pointer", padding: 0, transition: "all 0.15s" }}>
                  <img src={m.photo_url} alt={m.name} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                  <div style={{ padding: "5px 6px", fontSize: 11, fontWeight: 600, color: selectedMember?.id === m.id ? "var(--brand)" : "var(--text-primary)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Broker Name <span style={{ color: "#dc2626" }}>*</span></label>
            <input value={brokerName} onChange={(e) => { setBrokerName(e.target.value); setGenerated(null); }} placeholder="e.g. Howden Reading" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 15, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <button onClick={generateImage} disabled={generating || !selectedMember || !brokerName.trim()} style={{ width: "100%", padding: "12px", background: "var(--brand)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating ? "wait" : "pointer", opacity: (selectedMember && brokerName.trim()) ? 1 : 0.4 }}>
            {generating ? "Generating..." : "Generate Image"}
          </button>
        </>)}
      </div>

      {generated && (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <img src={generated} alt="1st Policy Sold" style={{ width: "100%", display: "block" }} />
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
