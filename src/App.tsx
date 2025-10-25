import React, { useMemo, useRef, useState } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageOrientation } from "docx";
// ADD THESE
import ResumeEditor from "./ResumeEditor";
import { useResume } from "./useResume";
import { LocalStorageStorage } from "./storage";
import type { Resume } from "./types";

import resumeJson from './data/resume.json';
// --- Single Source of Truth --------------------------------------------------
// You can edit this JSON, or click "Import JSON" to load your own.
// Keep the structure; exports (PDF/DOCX) are generated from this one object.
const initialData = resumeJson;
// --- Helpers ----------------------------------------------------------------
function cls(...arr) { return arr.filter(Boolean).join(" "); }

// Download helper (avoids file-saver CDN ESM quirks)
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

// Escape HTML for safe string export
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));

// Escape HTML and convert line breaks to <br> tags
const escWithBreaks = (s) => esc(s).replace(/\n/g, '<br>');

// Render a standalone branded <article> using the current data (no React needed in the export)
const renderBrandedArticle = (d) => {
  const header = `<header class="mb-2">
  <div class="flex flex-col gap-2">
    <h1 class="font-bold text-4xl">${esc(d.basics.name)}</h1>
    <p class="text-sm text-slate-700">${esc(d.basics.headline || '')}</p>
    <div class="text-sm text-slate-700">
      <div class="flex gap-x-3 flex-wrap">
        ${d.basics.email ? `<span>${esc(d.basics.email)}</span>` : ''}
        ${d.basics.phone ? `<span>${esc(d.basics.phone)}</span>` : ''}
        ${d.basics.location ? `<span>${esc(d.basics.location)}</span>` : ''}
        ${d.basics.website ? `<a class="underline" href="${esc(d.basics.website)}" target="_blank">Website</a>` : ''}
        ${d.basics.profiles?.[0]?.url ? `<a class="underline" href="${esc(d.basics.profiles[0].url)}" target="_blank">LinkedIn</a>` : ''}
      </div>
    </div>
  </div>
</header>`;

  const list = (items) => {
    if (items.length === 1) {
      return `<p class="text-[0.95rem] leading-relaxed text-slate-800">${escWithBreaks(items[0])}</p>`;
    }
    return items.map((x) => `<li class="ml-0 list-none text-[0.95rem] leading-relaxed before:content-['*'] before:mr-2 before:text-slate-400">${escWithBreaks(x)}</li>`).join('');
  };

  const summary = d.summary?.length ? `
    <section class="mb-6 break-inside-avoid">
      <h2 class="text-xl font-semibold tracking-tight mb-2">Summary</h2>
      <div class="text-[0.95rem] leading-relaxed text-slate-800 space-y-2">
        ${d.summary.map(s => `<p>${escWithBreaks(s)}</p>`).join('')}
      </div>
    </section>` : '';

  const skills = d.skills?.length ? `
    <section class="mb-6 break-inside-avoid">
      <h2 class="text-xl font-semibold tracking-tight mb-2">Skills</h2>
      <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2" role="list" aria-label="Skills">
        ${d.skills.map((s)=>`<li role=\"listitem\" class=\"flex gap-2\"><span class=\"min-w-28 shrink-0 font-medium text-slate-900\">${esc(s.name)}</span><span class=\"text-slate-700\">${esc((s.keywords||[]).join(', '))}</span></li>`).join('')}
      </ul>
    </section>` : '';

  const experience = d.experience?.length ? `
    <section class="mb-6 break-inside-avoid">
      <h2 class="text-xl font-semibold tracking-tight mb-2">Experience</h2>
      <div class="grid gap-6">
        ${d.experience.map((r,i)=>`
          ${d.layout?.breaks?.beforeExperience?.includes(i) ? '<div class="page-break" aria-hidden></div>' : ''}
          <div class="break-inside-avoid">
            <div class="flex flex-wrap justify-between items-baseline gap-x-3">
              <h3 class="text-lg font-semibold">${esc(r.title)} — ${esc(r.company)}</h3>
              <div class="text-sm text-slate-700">${esc([r.location, `${r.start} – ${r.end}`].filter(Boolean).join('  •  '))}</div>
            </div>
            ${(r.bullets||[]).length === 1
              ? `<div class="mt-1">${list(r.bullets||[])}</div>`
              : `<ul class="mt-1 grid gap-1">${list(r.bullets||[])}</ul>`}
          </div>
        `).join('')}
      </div>
    </section>` : '';

  const projects = d.projects?.length ? `
    <section class="mb-6 break-inside-avoid">
      <h2 class="text-xl font-semibold tracking-tight mb-2">Projects</h2>
      <div class="grid gap-3">
        ${d.projects.map((p)=>`
          <div>
            <h3 class="font-semibold">${esc(p.name)}${p.org ? ` — ${esc(p.org)}` : ''}</h3>
            ${(p.bullets||[]).length === 1
              ? `<div class="mt-1">${list(p.bullets||[])}</div>`
              : `<ul class="mt-1 grid gap-1">${list(p.bullets||[])}</ul>`}
          </div>
        `).join('')}
      </div>
    </section>` : '';

  const education = d.education?.length ? `
    <section class="mb-6 break-inside-avoid">
      <h2 class="text-xl font-semibold tracking-tight mb-2">Education</h2>
      ${d.education.map((e)=>`<div class="flex flex-wrap justify-between gap-x-4 text-sm text-neutral-700"><span>${esc(`${e.degree} — ${e.school}`)}</span><span class="tabular-nums">${esc(e.dates||'')}</span></div>`).join('')}
    </section>` : '';

  const languages = d.languages?.length ? `
    <section class="mb-6 break-inside-avoid">
      <h2 class="text-xl font-semibold tracking-tight mb-2">Languages</h2>
      <div class="flex flex-wrap gap-2 text-sm">
        ${d.languages.map((l)=>`<span class="px-2 py-1 rounded-full border bg-slate-50">${esc(l.name)} (${esc(l.level)})</span>`).join('')}
      </div>
    </section>` : '';

  return `
    <article class="p-8 rounded-2xl bg-white text-slate-900">
      ${header}
      ${summary}
      ${skills}
      ${experience}
      ${projects}
      ${education}
      ${languages}
      <footer class="text-xs text-slate-500 mt-6">
        <p>Exported from Resume Studio — Page breaks honored in print.</p>
      </footer>
    </article>`;
};

// Export a single-file HTML suitable for embedding on a website (uses Tailwind Play CDN)
const exportBrandedHTML = (d) => {
  const baseName = (d.basics?.name || 'Resume').trim();
  const slug = baseName ? baseName.split(' ').join('_') : 'Resume';
  const article = renderBrandedArticle(d);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(d.basics?.name || 'Resume')} — Resume</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { margin: 1in; }
    body { background: #fff; color: #0f172a; }
    .page-break { height: 0; border: 0; margin: 0; }
    li.before\\:content-\\[\\'\*\\'\\]::before {
      content: '*';
      margin-right: 0.5rem;
      color: #94a3b8;
    }
    @media print {
          /* Hide UI */
          .sidebar, .sidebar * { display: none !important; }
          .pb-controls, .pb-controls * { display: none !important; }

          /* Reset layout paddings introduced by the app UI */
          .pl-72, .pl-16 { padding-left: 0 !important; }
          .px-4, .py-6, .p-8 { padding: 0 !important; }
          .max-w-5xl { max-width: 100% !important; }

          /* Cosmetic */
          body { background: white; }
          .page-break { break-before: page; page-break-before: always; }
          /* Don't rely on background fills for print */
          .bg-slate-50 { background: transparent !important; }
        } }
  </style>
</head>
<body class="min-h-screen bg-white">
  <div class="max-w-5xl mx-auto px-4 py-6">
    <div class="mx-auto max-w-[920px]">
      ${article}
    </div>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `${slug}_branded.html`);
};

function Section({ title, children, beforeBreak = false }) {
  return (
    <section className="mb-6 break-inside-avoid">
      {beforeBreak ? <div className="page-break" aria-hidden /> : null}
      <h2 className="text-xl font-semibold tracking-tight mb-2 print:mt-0">{title}</h2>
      {children}
    </section>
  );
}

function Line({ left, right }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 text-sm text-neutral-700">
      <span>{left}</span>
      {right ? <span className="tabular-nums">{right}</span> : null}
    </div>
  );
}

function Bullet({ children }) {
  return <li className="ml-0 list-none text-[0.95rem] leading-relaxed before:content-['*'] before:mr-2 before:text-slate-400 whitespace-pre-line">{children}</li>;
}

// --- DOCX generation ---------------------------------------------------------
const makeDocx = async (data) => {
  const { basics, layout } = data;
  const docChildren: Paragraph[] = [];

  const addHeading = (text: string, level: HeadingLevel, opts?: { breakBefore?: boolean }) => {
    docChildren.push(new Paragraph({
      text,
      heading: level,
      alignment: AlignmentType.LEFT,
      pageBreakBefore: !!opts?.breakBefore,
    }));
  };

  // Header
  addHeading(basics.name || "", HeadingLevel.TITLE);
  const contact = [basics.email, basics.phone, basics.location, basics.website].filter(Boolean).join("  •  ");
  if (contact) docChildren.push(new Paragraph({ text: contact }));
  if (basics?.profiles?.length) {
    const p = basics.profiles.map(p => `${p.network}: ${p.url || p.username}`).join("  •  ");
    docChildren.push(new Paragraph({ text: p }));
  }

  // Summary
  if (data.summary?.length) {
    addHeading("Summary", HeadingLevel.HEADING_2, { breakBefore: layout?.breaks?.before?.summary });
    data.summary.forEach(s => docChildren.push(new Paragraph({ text: s })));
  }

  // Skills
  if (data.skills?.length) {
    addHeading("Skills", HeadingLevel.HEADING_2, { breakBefore: layout?.breaks?.before?.skills });
    data.skills.forEach(s => {
      const line = `${s.name}: ${s.keywords?.join(", ")}`;
      docChildren.push(new Paragraph({ text: line }));
    });
  }

  // Experience
  if (data.experience?.length) {
    addHeading("Experience", HeadingLevel.HEADING_2, { breakBefore: layout?.breaks?.before?.experience });
    data.experience.forEach((role, idx) => {
      const breakBeforeRole = layout?.breaks?.beforeExperience?.includes(idx);
      docChildren.push(new Paragraph({
        text: `${role.title} — ${role.company}`,
        heading: HeadingLevel.HEADING_3,
        pageBreakBefore: !!breakBeforeRole,
      }));
      const line = [role.location, `${role.start} – ${role.end}`].filter(Boolean).join("  •  ");
      if (line) docChildren.push(new Paragraph({ text: line }));
      // Single bullet: render as plain paragraph. Multiple bullets: use bullet list
      if (role.bullets?.length === 1) {
        docChildren.push(new Paragraph({ text: role.bullets[0] }));
      } else {
        role.bullets?.forEach(b => docChildren.push(new Paragraph({ text: b, bullet: { level: 0 } })) );
      }
    });
  }

  // Projects
  if (data.projects?.length) {
    addHeading("Projects", HeadingLevel.HEADING_2, { breakBefore: layout?.breaks?.before?.projects });
    data.projects.forEach(p => {
      docChildren.push(new Paragraph({ text: `${p.name}${p.org ? ` — ${p.org}` : ""}`, heading: HeadingLevel.HEADING_3 }));
      // Single bullet: render as plain paragraph. Multiple bullets: use bullet list
      if (p.bullets?.length === 1) {
        docChildren.push(new Paragraph({ text: p.bullets[0] }));
      } else {
        p.bullets?.forEach(b => docChildren.push(new Paragraph({ text: b, bullet: { level: 0 } })) );
      }
    });
  }

  // Education
  if (data.education?.length) {
    addHeading("Education", HeadingLevel.HEADING_2, { breakBefore: layout?.breaks?.before?.education });
    data.education.forEach(ed => {
      const line = [ed.school, ed.degree, ed.dates].filter(Boolean).join(" — ");
      docChildren.push(new Paragraph({ text: line }));
    });
  }

  // Languages
  if (data.languages?.length) {
    addHeading("Languages", HeadingLevel.HEADING_2, { breakBefore: layout?.breaks?.before?.languages });
    const line = data.languages.map(l => `${l.name} (${l.level})`).join(", ");
    docChildren.push(new Paragraph({ text: line }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { before: 0, after: 120, line: 276 } } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },  margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: docChildren }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${(basics.name || "Resume").replace(/\s+/g, "_")}.docx`);
};

// --- Import helpers ----------------------------------------------------------
const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });

// Very light mapper from ReactiveResume export → this schema (best‑effort; edit after import)
function mapReactiveResume(json) {
  const b = json?.basics || {};
  const s = json?.sections || {};
  const out = JSON.parse(JSON.stringify(initialData));
  out.basics.name = b.name || out.basics.name;
  out.basics.headline = b.headline || out.basics.headline;
  out.basics.email = b.email || out.basics.email;
  out.basics.phone = b.phone || out.basics.phone;
  out.basics.location = b.location || out.basics.location;
  if (b?.url?.href) out.basics.website = b.url.href;
  if (s?.profiles?.items?.length) {
    out.basics.profiles = s.profiles.items.map(p => ({ network: p.network, username: p.username, url: p.url?.href }));
  }
  // Summary (strip HTML tags)
  if (s?.summary?.content) {
    const text = s.summary.content.replace(/<[^>]+>/g, " ").replace(/[\s\u00A0]+/g, " ").trim();
    out.summary = text.split(/\.?\s(?=[A-Z])/).filter(Boolean).slice(0, 6);
  }
  // Experience
  if (s?.experience?.items?.length) {
    out.experience = s.experience.items.map(it => ({
      company: it.company,
      title: it.position,
      location: it.location || "",
      start: (it.date || "").split("-")[0]?.trim() || "",
      end: (it.date || "").split("-")[1]?.trim() || "",
      bullets: (it.summary || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .split(/\n|\. /)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 6),
    }));
  }
  // Projects
  if (s?.projects?.items?.length) {
    out.projects = s.projects.items.map(p => ({
      name: p.name,
      org: p.description || "",
      bullets: (p.summary || "").replace(/<[^>]+>/g, " ").split(/\.\s/).map(x => x.trim()).filter(Boolean).slice(0, 4),
    }));
  }
  // Skills
  if (s?.skills?.items?.length) {
    out.skills = s.skills.items.map(sk => ({ name: sk.name, keywords: sk.keywords || [] }));
  }
  // Education
  if (s?.education?.items?.length) {
    out.education = s.education.items.map(e => ({ school: e.institution, degree: [e.studyType, e.area].filter(Boolean).join(" "), dates: e.date }));
  }
  // Languages
  if (s?.languages?.items?.length) {
    out.languages = s.languages.items.map(l => ({ name: l.name, level: l.description }));
  }
  return out;
}

// --- UI ---------------------------------------------------------------------
export default function ResumeStudio() {
  const storage = useMemo(() => new LocalStorageStorage(), []);
  const { resume: data, setResume: setData } = useResume(initialData, storage);
  const [editorOpen, setEditorOpen] = useState(false);
  const [atsMode, setAtsMode] = useState(true); // single‑column, ATS‑friendly
  const [showBreakControls, setShowBreakControls] = useState(true); // single‑column, black‑white, ATS‑friendly
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [skillsLayout, setSkillsLayout] = useState<'pills' | 'twocol' | 'compact'>('twocol');
  const fileRef = useRef(null);
  const reactiveRef = useRef(null);

  const toggleBreakSection = (key) => {
    setData(d => ({
      ...d,
      layout: {
        ...d.layout,
        breaks: {
          ...d.layout.breaks,
          before: { ...d.layout.breaks.before, [key]: !d.layout.breaks.before[key] }
        }
      }
    }));
  };

  const toggleBreakBeforeExperience = (idx) => {
    setData(d => {
      const list = new Set(d.layout.breaks.beforeExperience);
      if (list.has(idx)) list.delete(idx); else list.add(idx);
      return { ...d, layout: { ...d.layout, breaks: { ...d.layout.breaks, beforeExperience: Array.from(list).sort((a,b)=>a-b) } } };
    });
  };

  const handleImportJSON = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setData(JSON.parse(await readFile(f))); } catch {
      alert("Invalid JSON file");
    }
  };

  const handleImportReactive = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { const json = JSON.parse(await readFile(f)); setData(mapReactiveResume(json)); } catch {
      alert("Invalid ReactiveResume JSON");
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${(data.basics.name || "resume").replace(/\s+/g, "_")}.json`);
  };

  const printPDF = () => window.print(); // Use browser print to get high‑fidelity PDF

  return (
    <div className={cls("min-h-screen w-full print:pl-0", atsMode ? "bg-white" : "bg-slate-50", sidebarOpen ? "pl-72" : "pl-16")}>
      {/* Collapsible Sidebar */}
      <aside className={cls("sidebar fixed left-0 top-0 h-screen bg-white/95 backdrop-blur border-r border-slate-200 z-20 transition-[width] duration-200", sidebarOpen ? "w-72" : "w-14")} aria-label="Resume controls">
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 px-2 py-2 border-b">
            <button
              aria-label={sidebarOpen ? "Collapse controls" : "Expand controls"}
              aria-expanded={sidebarOpen}
              aria-controls="control-panel"
              onClick={() => setSidebarOpen(v => !v)}
              className="rounded-lg border px-2 py-1 hover:bg-slate-50"
            >
              ☰
            </button>
            <span className={cls("text-sm font-semibold", sidebarOpen ? "" : "sr-only")}>Resume Studio</span>
          </div>

          <div id="control-panel" className="p-3 overflow-y-auto flex-1">
            <div className="grid gap-2">
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={() => setAtsMode(v => !v)}>{atsMode ? "Switch to Branded Preview" : "Switch to ATS Preview"}</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={() => setShowBreakControls(v => !v)}>{showBreakControls ? "Hide break controls" : "Show break controls"}</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={printPDF}>Print / Save PDF</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={() => makeDocx(data)}>Export DOCX</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={() => exportBrandedHTML(data)}>Export Branded HTML</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={downloadJSON}>Download JSON</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={() => fileRef.current?.click()}>Import JSON</button>
              <button className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left" onClick={() => reactiveRef.current?.click()}>Import ReactiveResume JSON</button>
              <button
  className="w-full px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50 text-left"
  onClick={() => setEditorOpen(true)}
>
  Edit Resume
</button>

            </div>

            {showBreakControls && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-600 mb-2">Page breaks</h3>
                <div className="flex flex-col gap-2">
                  {["summary","skills","experience","projects","education","languages"].map(key => (
                    <label key={key} className="inline-flex items-center gap-2 p-2 rounded-lg border bg-white shadow-sm">
                      <input type="checkbox" checked={!!data.layout.breaks.before[key]} onChange={() => toggleBreakSection(key)} />
                      <span className="capitalize">{`Before ${key}`}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-600 mb-2">Skills layout</h3>
              <div role="group" aria-label="Skills layout" className="grid grid-cols-3 gap-2">
                <button onClick={() => setSkillsLayout('pills')} className={`px-2 py-1 text-xs rounded border ${skillsLayout==='pills' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}>Pills</button>
                <button onClick={() => setSkillsLayout('twocol')} className={`px-2 py-1 text-xs rounded border ${skillsLayout==='twocol' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}>Two‑column</button>
                <button onClick={() => setSkillsLayout('compact')} className={`px-2 py-1 text-xs rounded border ${skillsLayout==='compact' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}>Compact</button>
              </div>
            </div>
          </div>
        </div>
      </aside> 
      {/* Controls */}
      <div className="hidden" aria-hidden="true">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Single‑Source Resume Studio</h1>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={() => setAtsMode(v => !v)}>{atsMode ? "Switch to Branded Preview" : "Switch to ATS Preview"}</button>
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={() => setShowBreakControls(v => !v)}>{showBreakControls ? "Hide break controls" : "Show break controls"}</button>
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={printPDF}>Print / Save PDF</button>
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={() => makeDocx(data)}>Export DOCX</button>
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={() => exportBrandedHTML(data)}>Export Branded HTML</button>
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={downloadJSON}>Download JSON</button>
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={() => fileRef.current?.click()}>Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportJSON} />
            <button className="px-3 py-1.5 rounded-xl border shadow-sm hover:bg-slate-50" onClick={() => reactiveRef.current?.click()}>Import ReactiveResume JSON</button>
            <input ref={reactiveRef} type="file" accept="application/json" className="hidden" onChange={handleImportReactive} />
          </div>
        </div>

        {/* Page break toggles */}
        {showBreakControls && (
        <div className="max-w-5xl mx-auto px-4 pb-3 -mt-2 pb-controls">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-700">Page breaks:</span>
            {["summary","skills","experience","projects","education","languages"].map(key => (
              <label key={key} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white">
                <input type="checkbox" checked={!!data.layout.breaks.before[key]} onChange={() => toggleBreakSection(key)} />
                <span className="capitalize">Before {key}</span>
              </label>
            ))}
            <span className="text-slate-400">(Use the buttons inside Experience to break before a role.)</span>
          </div>
        </div>
        )}
      </div>

      {/* Preview */}
      <div className="max-w-5xl mx-auto px-4 py-6 print:p-0">
        <div className={cls("mx-auto", atsMode ? "max-w-[820px]" : "max-w-[920px]")}> 
          <article className={cls(
            "p-8 rounded-2xl shadow-sm print:shadow-none print:p-0 print:rounded-none",
            atsMode ? "bg-white text-black" : "bg-white text-slate-900"
          )}>
            {/* Header */}
            <header className="mb-2">
              <div className="flex flex-col gap-2">
                <div>
                  <h1 className={cls("font-bold", atsMode ? "text-3xl" : "text-4xl")}>{data.basics.name}</h1>
                  <p className="text-sm text-slate-700">{data.basics.headline}</p>
                </div>
                <div className="text-sm text-slate-700">
                  <div className="flex gap-x-3 flex-wrap">
                    {data.basics.email && <span>{data.basics.email}</span>}
                    {data.basics.phone && <span>{data.basics.phone}</span>}
                    {data.basics.location && <span>{data.basics.location}</span>}
                    {data.basics.website && <a className="underline" href={data.basics.website} target="_blank">Website</a>}
                    {data.basics.profiles?.[0]?.url && <a className="underline" href={data.basics.profiles[0].url} target="_blank">LinkedIn</a>}
                  </div>
                </div>
              </div>
            </header>

            <Section title="Summary" beforeBreak={data.layout.breaks.before.summary}>
              <div className="text-[0.95rem] leading-relaxed text-slate-800 space-y-2">
                {data.summary.map((s, i) => <p key={i} className="whitespace-pre-line">{s}</p>)}
              </div>
            </Section>

            <Section title="Skills" beforeBreak={data.layout.breaks.before.skills}>
              {skillsLayout === 'pills' && (
                <ul role="list" className="flex flex-wrap gap-2">
                  {data.skills.map((s, idx) => (
                    <li role="listitem" key={idx} className="inline-flex items-center gap-1 rounded-full border border-slate-300/80 bg-white px-3 py-1 text-sm leading-5 shadow-sm print:shadow-none">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-slate-400">:</span>
                      <span>{s.keywords.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              )}
              {skillsLayout === 'twocol' && (
                <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {data.skills.map((s, idx) => (
                    <li role="listitem" key={idx} className="flex gap-2">
                      <span className="min-w-28 shrink-0 font-medium text-slate-900">{s.name}</span>
                      <span className="text-slate-700">{s.keywords.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              )}
              {skillsLayout === 'compact' && (
                <p className="text-sm text-slate-800">
                  {data.skills.map((s, i) => `${s.name}: ${s.keywords.join(", ")}`).join(' · ')}
                </p>
              )}
            </Section>

            <Section title="Experience" beforeBreak={data.layout.breaks.before.experience}>
              <div className="grid gap-6">
                {data.experience.map((r, i) => (
                  <div key={i} className="break-inside-avoid">
                    {data.layout.breaks.beforeExperience.includes(i) ? (
                      <div className="page-break" aria-hidden />
                    ) : null}
                    <div className="flex flex-wrap justify-between items-baseline gap-x-3">
                      <h3 className="text-lg font-semibold">{r.title} — {r.company}</h3>
                      <div className="text-sm text-slate-700">{[r.location, `${r.start} – ${r.end}`].filter(Boolean).join("  •  ")}</div>
                    </div>
                    {r.bullets.length === 1 ? (
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-slate-800 whitespace-pre-line">{r.bullets[0]}</p>
                    ) : (
                      <ul className="mt-1 grid gap-1">
                        {r.bullets.map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                      </ul>
                    )}
                    {showBreakControls && (<div className="mt-2 pb-controls">
                      <button className="text-xs px-2 py-1 rounded border hover:bg-slate-50" onClick={() => toggleBreakBeforeExperience(i)}>
                        {data.layout.breaks.beforeExperience.includes(i) ? "Remove page break before this role" : "Add page break before this role"}
                      </button>
                    </div>)}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Projects" beforeBreak={data.layout.breaks.before.projects}>
              <div className="grid gap-3">
                {data.projects.map((p, i) => (
                  <div key={i}>
                    <h3 className="font-semibold">{p.name}{p.org ? ` — ${p.org}` : ""}</h3>
                    {p.bullets.length === 1 ? (
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-slate-800 whitespace-pre-line">{p.bullets[0]}</p>
                    ) : (
                      <ul className="mt-1 grid gap-1">
                        {p.bullets.map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Education" beforeBreak={data.layout.breaks.before.education}>
              {data.education.map((e, i) => (
                <Line key={i} left={`${e.degree} — ${e.school}`} right={e.dates} />
              ))}
            </Section>

            <Section title="Languages" beforeBreak={data.layout.breaks.before.languages}>
              <div className="flex flex-wrap gap-2 text-sm">
                {data.languages.map((l, i) => (
                  <span key={i} className="px-2 py-1 rounded-full border bg-slate-50">{l.name} ({l.level})</span>
                ))}
              </div>
            </Section>
          </article>
        </div>
      </div>
    {editorOpen && (
      <ResumeEditor
        value={data}
        onChange={setData}
        onClose={() => setEditorOpen(false)}
      />
    )}

      <style>{`
        @page { margin: 1in; }
        html, body { margin: 0; }
        .page-break { height: 0; border: 0; margin: 0; }

        @media print {
          /* Hide UI */
          .sidebar, .sidebar * { display: none !important; }
          .pb-controls, .pb-controls * { display: none !important; }

          /* Reset layout paddings introduced by the app UI */
          .pl-72, .pl-16 { padding-left: 0 !important; }
          .px-4, .py-6, .p-8 { padding: 0 !important; }
          .max-w-5xl { max-width: 100% !important; }

          /* Cosmetic */
          body { background: white; }
          .page-break { break-before: page; page-break-before: always; }
        }

        @media screen {
          .page-break::before {
            content: 'Page Break';
            display: inline-block;
            margin: 10px 0;
            padding: 4px 8px;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            color: #475569;
            background: #f8fafc;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
    
  );
}
