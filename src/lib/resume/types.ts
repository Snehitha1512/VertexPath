export type ResumeItem = {
  kind: 'project' | 'certification';
  sourceId: string;            // projects.id or certifications.id
  title: string;               // editable copy
  subtitle?: string;           // issuer or technologies joined
  bullets: string[];           // editable copy (projects)
  date?: string;
  url?: string;
};

export type ResumeContent = {
  summary: string;
  skills: string[];
  projects: ResumeItem[];      // display order
  certifications: ResumeItem[];
  hiddenSections?: string[];
};

export type SavedResume = {
  id: string;
  user_id: string;
  name: string;
  target_role: string | null;
  job_description: string | null;
  content: ResumeContent;
  created_at: string;
  updated_at: string;
};

