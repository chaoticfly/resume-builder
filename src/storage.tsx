import type { Resume } from "./types";

export interface IResumeStorage {
  load(): Promise<Resume | null>;
  save(resume: Resume): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "resume.studio.v1";

export class LocalStorageStorage implements IResumeStorage {
  async load(): Promise<Resume | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Resume) : null;
    } catch { return null; }
  }
  async save(resume: Resume): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }
  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Optional REST storage (stub). Expects:
 *  GET  {baseUrl}/resume -> Resume
 *  PUT  {baseUrl}/resume -> Resume
 */
export class RestStorage implements IResumeStorage {
  constructor(private baseUrl: string, private token?: string) {}
  private headers() {
    const h: Record<string,string> = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }
  async load(): Promise<Resume | null> {
    const r = await fetch(`${this.baseUrl}/resume`, { headers: this.headers() });
    if (!r.ok) return null;
    return (await r.json()) as Resume;
  }
  async save(resume: Resume): Promise<void> {
    await fetch(`${this.baseUrl}/resume`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(resume)
    });
  }
  async clear(): Promise<void> {
    // optional: DELETE endpoint; otherwise no-op
  }
}
