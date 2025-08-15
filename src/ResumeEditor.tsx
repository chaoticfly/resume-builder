import type { Resume, Skill, Experience, Project, Education, LanguageItem } from "./types";

type Props = {
  value: Resume;
  onChange: (next: Resume) => void;
  onClose?: () => void;
};

export default function ResumeEditor({ value, onChange, onClose }: Props) {
  const set = (patch: Partial<Resume>) => onChange({ ...value, ...patch });

  // ----- Basics -----
  const setBasics = (k: keyof Resume["basics"], v: any) =>
    set({ basics: { ...value.basics, [k]: v } });

  const setLinkedIn = (url: string) => {
    const profiles = [...(value.basics.profiles ?? [])];
    if (!profiles.length) profiles.push({ network: "LinkedIn", url });
    else profiles[0] = { ...profiles[0], network: "LinkedIn", url };
    set({ basics: { ...value.basics, profiles } });
  };

  // ----- Helpers for list editing -----
  const updateArray = <T,>(arr: T[], idx: number, next: T) => {
    const copy = arr.slice(); copy[idx] = next; return copy;
  };
  const removeAt = <T,>(arr: T[], idx: number) => arr.filter((_, i) => i !== idx);

  // ----- Summary -----
  const addSummary = () => set({ summary: [...value.summary, ""] });
  const setSummaryAt = (i: number, v: string) => set({ summary: updateArray(value.summary, i, v) });
  const delSummaryAt = (i: number) => set({ summary: removeAt(value.summary, i) });

  // ----- Skills -----
  const addSkill = () => set({ skills: [...value.skills, { name: "", keywords: [] }] });
  const setSkillAt = (i: number, s: Skill) => set({ skills: updateArray(value.skills, i, s) });
  const delSkillAt = (i: number) => set({ skills: removeAt(value.skills, i) });

  // ----- Experience -----
  const addExperience = () => set({
    experience: [...value.experience, { title: "", company: "", location: "", start: "", end: "", bullets: [] }]
  });
  const setExperienceAt = (i: number, r: Experience) => set({ experience: updateArray(value.experience, i, r) });
  const delExperienceAt = (i: number) => {
    const next = removeAt(value.experience, i);
    // Also clean up any page-break flags for this index
    const breaks = new Set(value.layout.breaks.beforeExperience);
    const cleaned = Array.from(breaks).filter(ix => ix !== i).map(ix => ix > i ? ix - 1 : ix).sort((a,b)=>a-b);
    set({ experience: next, layout: { ...value.layout, breaks: { ...value.layout.breaks, beforeExperience: cleaned } } });
  };
  const toggleBreakBeforeRole = (i: number) => {
    const list = new Set(value.layout.breaks.beforeExperience);
    list.has(i) ? list.delete(i) : list.add(i);
    set({ layout: { ...value.layout, breaks: { ...value.layout.breaks, beforeExperience: Array.from(list).sort((a,b)=>a-b) } } });
  };

  // ----- Projects / Education / Languages (compact editors) -----
  const addProject = () => set({ projects: [...value.projects, { name: "", org: "", bullets: [] }] });
  const setProjectAt = (i: number, p: Project) => set({ projects: updateArray(value.projects, i, p) });
  const delProjectAt = (i: number) => set({ projects: removeAt(value.projects, i) });

  const addEducation = () => set({ education: [...value.education, { school: "", degree: "", dates: "" }] });
  const setEducationAt = (i: number, e: Education) => set({ education: updateArray(value.education, i, e) });
  const delEducationAt = (i: number) => set({ education: removeAt(value.education, i) });

  const addLanguage = () => set({ languages: [...value.languages, { name: "", level: "" }] });
  const setLanguageAt = (i: number, l: LanguageItem) => set({ languages: updateArray(value.languages, i, l) });
  const delLanguageAt = (i: number) => set({ languages: removeAt(value.languages, i) });

  return (
    <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex">
      <div className="m-auto w-[min(1000px,96vw)] max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Edit Resume</h2>
          <div className="ml-auto flex gap-2">
            {onClose && <button className="px-3 py-1.5 rounded-lg border" onClick={onClose}>Close</button>}
          </div>
        </div>

        {/* BASICS */}
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Basics</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2" placeholder="Name" value={value.basics.name} onChange={e=>setBasics("name", e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Headline" value={value.basics.headline||""} onChange={e=>setBasics("headline", e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Email" value={value.basics.email||""} onChange={e=>setBasics("email", e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={value.basics.phone||""} onChange={e=>setBasics("phone", e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Location" value={value.basics.location||""} onChange={e=>setBasics("location", e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Website" value={value.basics.website||""} onChange={e=>setBasics("website", e.target.value)} />
            <input className="border rounded-lg px-3 py-2 sm:col-span-2" placeholder="LinkedIn URL" value={value.basics.profiles?.[0]?.url||""} onChange={e=>setLinkedIn(e.target.value)} />
          </div>
        </section>

        {/* SUMMARY */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Summary</h3>
            <button className="text-xs px-2 py-1 rounded border" onClick={addSummary}>+ Add</button>
          </div>
          <div className="grid gap-2">
            {value.summary.map((s, i) => (
              <div key={i} className="flex gap-2">
                <textarea className="border rounded-lg px-3 py-2 w-full" rows={2} value={s} onChange={e=>setSummaryAt(i, e.target.value)} />
                <button className="px-2 rounded-lg border" onClick={()=>delSummaryAt(i)}>✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* SKILLS */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Skills</h3>
            <button className="text-xs px-2 py-1 rounded border" onClick={addSkill}>+ Add</button>
          </div>
          <div className="grid gap-3">
            {value.skills.map((s, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr,2fr,auto] gap-2 items-center">
                <input className="border rounded-lg px-3 py-2" placeholder="Name" value={s.name} onChange={e=>setSkillAt(i, { ...s, name: e.target.value })} />
                <input className="border rounded-lg px-3 py-2" placeholder="Keywords (comma separated)" value={s.keywords.join(", ")} onChange={e=>setSkillAt(i, { ...s, keywords: e.target.value.split(",").map(x=>x.trim()).filter(Boolean) })} />
                <button className="px-2 rounded-lg border" onClick={()=>delSkillAt(i)}>✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* EXPERIENCE */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Experience</h3>
            <button className="text-xs px-2 py-1 rounded border" onClick={addExperience}>+ Add</button>
          </div>

          <div className="grid gap-4">
            {value.experience.map((r, i) => {
              const hasBreak = value.layout.breaks.beforeExperience.includes(i);
              return (
                <div key={i} className="rounded-xl border p-3">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input className="border rounded-lg px-3 py-2" placeholder="Title" value={r.title} onChange={e=>setExperienceAt(i, { ...r, title: e.target.value })} />
                    <input className="border rounded-lg px-3 py-2" placeholder="Company" value={r.company} onChange={e=>setExperienceAt(i, { ...r, company: e.target.value })} />
                    <input className="border rounded-lg px-3 py-2" placeholder="Location" value={r.location||""} onChange={e=>setExperienceAt(i, { ...r, location: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="border rounded-lg px-3 py-2" placeholder="Start" value={r.start||""} onChange={e=>setExperienceAt(i, { ...r, start: e.target.value })} />
                      <input className="border rounded-lg px-3 py-2" placeholder="End" value={r.end||""} onChange={e=>setExperienceAt(i, { ...r, end: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Bullets</span>
                      <button className="text-xs px-2 py-1 rounded border" onClick={()=>setExperienceAt(i, { ...r, bullets: [...r.bullets, ""] })}>+ Add bullet</button>
                    </div>
                    <div className="grid gap-2">
                      {r.bullets.map((b, j) => (
                        <div key={j} className="flex gap-2">
                          <textarea className="border rounded-lg px-3 py-2 w-full" rows={2} value={b} onChange={e=>{
                            const next = r.bullets.slice(); next[j] = e.target.value;
                            setExperienceAt(i, { ...r, bullets: next });
                          }} />
                          <button className="px-2 rounded-lg border" onClick={()=>{
                            const next = r.bullets.filter((_, jj)=>jj!==j);
                            setExperienceAt(i, { ...r, bullets: next });
                          }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button className="text-xs px-2 py-1 rounded border" onClick={()=>toggleBreakBeforeRole(i)}>
                      {hasBreak ? "Remove page break before this role" : "Add page break before this role"}
                    </button>
                    <button className="text-xs px-2 py-1 rounded border" onClick={()=>delExperienceAt(i)}>Delete role</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROJECTS */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Projects</h3>
            <button className="text-xs px-2 py-1 rounded border" onClick={addProject}>+ Add</button>
          </div>
          <div className="grid gap-3">
            {value.projects.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-xl border p-3">
                <div className="grid sm:grid-cols-[1fr,1fr,auto] gap-2 items-center">
                  <input className="border rounded-lg px-3 py-2" placeholder="Name" value={p.name} onChange={e=>setProjectAt(i, { ...p, name: e.target.value })} />
                  <input className="border rounded-lg px-3 py-2" placeholder="Org / blurb" value={p.org||""} onChange={e=>setProjectAt(i, { ...p, org: e.target.value })} />
                  <button className="px-2 rounded-lg border" onClick={()=>delProjectAt(i)}>✕</button>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Bullets</span>
                    <button className="text-xs px-2 py-1 rounded border" onClick={()=>setProjectAt(i, { ...p, bullets: [...p.bullets, ""] })}>+ Add bullet</button>
                  </div>
                  <div className="grid gap-2">
                    {p.bullets.map((b, j) => (
                      <div key={j} className="flex gap-2">
                        <textarea className="border rounded-lg px-3 py-2 w-full" rows={2} value={b} onChange={e=>{
                          const next = p.bullets.slice(); next[j] = e.target.value;
                          setProjectAt(i, { ...p, bullets: next });
                        }} />
                        <button className="px-2 rounded-lg border" onClick={()=>{
                          const next = p.bullets.filter((_, jj)=>jj!==j);
                          setProjectAt(i, { ...p, bullets: next });
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EDUCATION & LANGUAGES */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Education</h3>
            <button className="text-xs px-2 py-1 rounded border" onClick={addEducation}>+ Add</button>
          </div>
          <div className="grid gap-3">
            {value.education.map((e, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center">
                <input className="border rounded-lg px-3 py-2" placeholder="School" value={e.school} onChange={ev=>setEducationAt(i, { ...e, school: ev.target.value })} />
                <input className="border rounded-lg px-3 py-2" placeholder="Degree" value={e.degree} onChange={ev=>setEducationAt(i, { ...e, degree: ev.target.value })} />
                <input className="border rounded-lg px-3 py-2" placeholder="Dates" value={e.dates||""} onChange={ev=>setEducationAt(i, { ...e, dates: ev.target.value })} />
                <button className="px-2 rounded-lg border" onClick={()=>delEducationAt(i)}>✕</button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Languages</h3>
            <button className="text-xs px-2 py-1 rounded border" onClick={addLanguage}>+ Add</button>
          </div>
          <div className="grid gap-3">
            {value.languages.map((l, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr,1fr,auto] gap-2 items-center">
                <input className="border rounded-lg px-3 py-2" placeholder="Language" value={l.name} onChange={ev=>setLanguageAt(i, { ...l, name: ev.target.value })} />
                <input className="border rounded-lg px-3 py-2" placeholder="Level" value={l.level} onChange={ev=>setLanguageAt(i, { ...l, level: ev.target.value })} />
                <button className="px-2 rounded-lg border" onClick={()=>delLanguageAt(i)}>✕</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
