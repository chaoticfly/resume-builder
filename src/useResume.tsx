import { useEffect, useRef, useState } from "react";
import type { IResumeStorage } from "./storage";
import type { Resume } from "./types";

export function useResume(initial: Resume, storage: IResumeStorage) {
  const [resume, setResume] = useState<Resume>(initial);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Load once from storage
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await storage.load();
      if (mounted && saved) {
        setResume(saved);
      }
      setLoaded(true);
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (debounced)
  useEffect(() => {
    if (!loaded) return;
    setDirty(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await storage.save(resume);
      setDirty(false);
    }, 400);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [resume, loaded, storage]);

  const reset = async () => {
    await storage.clear();
    setResume(initial);
  };

  return { resume, setResume, dirty, loaded, reset };
}
