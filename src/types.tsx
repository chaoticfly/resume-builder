// src/types.ts (prefer .ts for a types-only file)

export interface Profile {
  network: string;
  username?: string;
  url?: string;
}

export interface Basics {
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  profiles?: Profile[];
}

export interface Skill {
  name: string;
  keywords: string[];
}

export interface Experience {
  company: string;
  title: string;
  location?: string;
  start?: string;
  end?: string;
  bullets: string[];
}

export interface Project {
  name: string;
  org?: string;
  bullets: string[];
}

export interface Education {
  school: string;
  degree: string;
  dates?: string;
}

export interface LanguageItem {
  name: string;
  level: string;
}

export interface Layout {
  breaks: {
    before: Record<"summary"|"skills"|"experience"|"projects"|"education"|"languages", boolean>;
    beforeExperience: number[];
  };
}

export interface Resume {
  basics: Basics;
  summary: string[];
  skills: Skill[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  languages: LanguageItem[];
  layout: Layout;
}
