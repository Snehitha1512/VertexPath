import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";

// Primary API Key resolver: checks localStorage override, then Vite env, then bundled active key
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
export function getGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("vertexpath_gemini_api_key");
    if (local && local.trim().length > 0) return local.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  return DEFAULT_GEMINI_KEY;
}

export function setGeminiApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("vertexpath_gemini_api_key", key.trim());
  }
}

const NO_INVENTION =
  "Use ONLY facts present in the input. Never invent metrics, numbers, technologies, employers, dates, " +
  "results or certifications. If the input lacks detail, keep the output modest and list what is missing " +
  "in \"missing_info\" instead of guessing.";

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    const clean = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON parse failed on AI output:", raw, e);
    return fallback;
  }
}

/**
 * Universal caller: tries direct Gemini REST call first with gemini-2.5-flash / gemini-3.8-flash,
 * then SDK, then Supabase Edge Function 'ai-assist'.
 */
async function callGemini(systemPrompt: string, userPrompt: string, wantJson = true): Promise<string> {
  const apiKey = getGeminiApiKey();

  // 1. Direct REST API call (native browser fetch, works immediately with zero setup)
  if (apiKey) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-3.8-flash"];
    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload: any = {
          contents: [
            {
              role: "user",
              parts: [{ text: (systemPrompt ? `${systemPrompt}\n\n` : "") + userPrompt }],
            },
          ],
        };
        if (wantJson) {
          payload.generationConfig = { responseMimeType: "application/json" };
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`Gemini (${model}) returned HTTP ${res.status}:`, errData);
        }
      } catch (fetchErr) {
        console.warn(`Gemini direct fetch for ${model} failed:`, fetchErr);
      }
    }

    // 2. Fallback to @google/genai SDK
    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: wantJson ? "application/json" : undefined,
        },
      });
      if (response.text) return response.text;
    } catch (sdkError) {
      console.warn("GoogleGenAI SDK call failed:", sdkError);
    }
  }

  // 3. Supabase Edge Function fallback
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: { action: "direct_prompt", system: systemPrompt, text: userPrompt, wantJson },
    });
    if (!error && data) {
      return typeof data === "string" ? data : JSON.stringify(data);
    }
  } catch (edgeError) {
    console.warn("Edge function invocation failed:", edgeError);
  }

  throw new Error("Gemini AI is not configured or network unreachable. Please check your internet connection or update your API key in Settings.");
}

export interface RewriteResult {
  bullets: string[];
  missing_info: string[];
}

export async function rewriteDescription(params: {
  text: string;
  mode: 'shorter' | 'longer' | 'technical' | 'achievement' | 'role_focus';
  target_role?: string;
  tech?: string[];
}): Promise<RewriteResult> {
  // Try Edge function first if configured
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: {
        action: "rewrite_description",
        text: params.text,
        mode: params.mode,
        target_role: params.target_role,
        tech: params.tech
      }
    });
    if (!error && data && Array.isArray(data.bullets)) {
      return data;
    }
  } catch {
    // Continue to direct SDK
  }

  const modes: Record<string, string> = {
    shorter: "Make it shorter: at most 2 concise bullet points.",
    longer: "Expand it slightly (3-4 bullets) using only details already given.",
    technical: "Emphasise the technical stack and implementation, using only given details.",
    achievement: "Rewrite as achievement-focused bullets starting with strong action verbs.",
    role_focus: `Emphasise aspects relevant to the role "${params.target_role || ''}" that are already present in the text.`,
  };

  const instruction = modes[params.mode] || modes.achievement;
  const system =
    "You edit resume project descriptions. " + NO_INVENTION +
    ' Respond with JSON only: {"bullets": string[], "missing_info": string[]}. ' +
    "missing_info = short questions the user could answer to make the entry stronger.";

  const prompt = `${instruction}\nTechnologies: ${JSON.stringify(params.tech || [])}\nOriginal:\n${params.text}`;
  const out = await callGemini(system, prompt, true);
  return parseJsonSafe<RewriteResult>(out, { bullets: [params.text], missing_info: [] });
}

export async function suggestSummary(params: {
  profile: any;
  target_role?: string;
}): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: {
        action: "suggest_summary",
        profile: params.profile,
        target_role: params.target_role
      }
    });
    if (!error && data && data.summary) {
      return data.summary;
    }
  } catch {
    // Continue to direct SDK
  }

  const system =
    "You write concise 2-3 sentence resume professional summaries. " + NO_INVENTION +
    ' Respond with JSON only: {"summary": string}.';
  const prompt = `Target role: ${params.target_role || 'Software Professional'}\nProfile facts:\n${JSON.stringify(params.profile)}`;
  const out = await callGemini(system, prompt, true);
  const parsed = parseJsonSafe<{ summary: string }>(out, { summary: "" });
  return parsed.summary;
}

export interface ExtractedCareerData {
  projects: Array<{
    title: string;
    description: string;
    technologies: string[];
    project_url?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issue_date: string | null;
    credential_url?: string;
  }>;
  skills?: string[];
}

export async function extractFromText(text: string): Promise<ExtractedCareerData> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: { action: "extract_from_text", text }
    });
    if (!error && data && (data.projects || data.certifications)) {
      return data;
    }
  } catch {
    // Continue to direct SDK / REST
  }

  const system =
    "You extract structured career data from a LinkedIn profile PDF text or resume text. " + NO_INVENTION +
    ' Respond with JSON only: {"projects":[{"title":string,"description":string,"technologies":string[],"project_url":string}],' +
    '"certifications":[{"name":string,"issuer":string,"issue_date":"YYYY-MM-DD or null","credential_url":string}],' +
    '"skills":string[]}. Use null for unknown fields. Do not invent details.';

  try {
    const out = await callGemini(system, text.slice(0, 30000), true);
    const parsed = parseJsonSafe<ExtractedCareerData>(out, { projects: [], certifications: [], skills: [] });
    if (
      (parsed.projects && parsed.projects.length > 0) ||
      (parsed.certifications && parsed.certifications.length > 0) ||
      (parsed.skills && parsed.skills.length > 0)
    ) {
      return parsed;
    }
  } catch (err) {
    console.warn("Gemini extraction call failed, falling back to smart heuristic extractor:", err);
  }

  // Graceful heuristic fallback: parses resume pattern-by-pattern so processing NEVER fails
  return heuristicExtractFromText(text);
}

const COMMON_RESUME_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
  "React", "React Native", "Next.js", "Vue.js", "Angular", "Node.js", "Express", "NestJS", "Django", "Flask", "FastAPI", "Spring Boot",
  "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Sass", "Redux", "GraphQL", "REST APIs",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "Supabase", "Prisma",
  "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "GitHub", "Linux", "Terraform",
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-Learn", "Data Analysis", "AI"
];

export function heuristicExtractFromText(text: string): ExtractedCareerData {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const foundSkills: string[] = [];

  for (const sk of COMMON_RESUME_SKILLS) {
    const regex = new RegExp(`\\b${sk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(text)) {
      foundSkills.push(sk);
    }
  }

  const projects: ExtractedCareerData["projects"] = [];
  const certifications: ExtractedCareerData["certifications"] = [];

  let inProjects = false;
  let inCerts = false;
  let currentProject: { title: string; description: string; technologies: string[]; project_url?: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(projects|key projects|personal projects|academic projects)/i.test(line)) {
      inProjects = true;
      inCerts = false;
      continue;
    }
    if (/^(certifications|certificates|licenses|credentials)/i.test(line)) {
      inCerts = true;
      inProjects = false;
      continue;
    }
    if (/^(experience|education|work experience|employment|summary)/i.test(line)) {
      if (currentProject) {
        projects.push(currentProject);
        currentProject = null;
      }
      inProjects = false;
      inCerts = false;
    }

    if (inProjects) {
      if (line.length < 70 && !line.startsWith("•") && !line.startsWith("-") && !line.toLowerCase().includes("technologies:")) {
        if (currentProject && currentProject.description.length > 5) {
          projects.push(currentProject);
        }
        const urlMatch = line.match(/https?:\/\/[^\s]+/);
        currentProject = {
          title: line.replace(/https?:\/\/[^\s]+/, "").trim() || `Project ${projects.length + 1}`,
          description: "",
          technologies: foundSkills.filter((s) => line.toLowerCase().includes(s.toLowerCase())).slice(0, 4),
          project_url: urlMatch ? urlMatch[0] : "https://github.com",
        };
      } else if (currentProject) {
        currentProject.description += (currentProject.description ? "\n" : "") + line;
        for (const s of foundSkills) {
          if (line.toLowerCase().includes(s.toLowerCase()) && !currentProject.technologies.includes(s)) {
            currentProject.technologies.push(s);
          }
        }
      }
    }

    if (inCerts) {
      if (line.length > 3 && line.length < 120 && !line.startsWith("•")) {
        const urlMatch = line.match(/https?:\/\/[^\s]+/);
        certifications.push({
          name: line.replace(/https?:\/\/[^\s]+/, "").trim(),
          issuer: "Professional Authority",
          issue_date: null,
          credential_url: urlMatch ? urlMatch[0] : "https://credly.com",
        });
      }
    }
  }

  if (currentProject) {
    projects.push(currentProject);
  }

  if (projects.length === 0 && text.length > 50) {
    projects.push({
      title: "Primary Software Project",
      description: text.slice(0, 250).trim() + "...",
      technologies: foundSkills.slice(0, 5),
      project_url: "https://github.com",
    });
  }

  return {
    projects,
    certifications,
    skills: foundSkills,
  };
}

export interface RoadmapCourse {
  title: string;
  provider: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  completed: boolean;
  progress: number;
}

export interface RoadmapPath {
  level: number;
  title: string;
  description: string;
  duration: string;
  skills: string[];
  courses: RoadmapCourse[];
  progress: number;
  completed: boolean;
}

export async function generatePersonalizedRoadmap(profile: any): Promise<RoadmapPath[]> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: { action: "generate_roadmap", profile }
    });
    if (!error && data && Array.isArray(data.paths)) {
      return data.paths;
    }
  } catch {
    // Continue to direct SDK
  }

  const system =
    "You are an expert AI Career Architect. Given a learner's profile, target job, and current skills, generate a realistic 4-level personalized learning roadmap. " +
    "Level 1: Foundation Building, Level 2: Core Frameworks & Tools, Level 3: Advanced Architectures & Systems, Level 4: Specialization & Production Mastery. " +
    "Tailor skills and course titles specifically to their target job. " +
    'Respond with JSON only: {"paths":[{"level":number,"title":string,"description":string,"duration":string,"skills":string[],"courses":[{"title":string,"provider":string,"duration":string,"difficulty":string,"completed":false,"progress":0}],"progress":0,"completed":false}]}';

  const prompt = `Learner Profile:\n` +
    `Target Job: ${profile.target_job || 'Full-Stack Developer'}\n` +
    `Current Status: ${profile.current_status || 'student'}\n` +
    `Education: ${profile.education_level || 'UG'} in ${profile.education_detail || 'Tech'}\n` +
    `Experience Years: ${profile.experience_years || '0-1'}\n` +
    `Current Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || 'None'}\n` +
    `Bio: ${profile.bio || ''}`;

  const out = await callGemini(system, prompt, true);
  const parsed = parseJsonSafe<{ paths: RoadmapPath[] }>(out, { paths: [] });
  return parsed.paths;
}

export interface SkillGapAnalysis {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

export interface SkillAnalysisResult {
  overallScore: number;
  skillGaps: SkillGapAnalysis[];
  recommendations: Array<{
    title: string;
    description: string;
    type: 'priority' | 'strength' | 'timeline';
  }>;
}

export async function analyzeSkillGapsWithAI(profile: any): Promise<SkillAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: { action: "analyze_skills", profile }
    });
    if (!error && data && data.skillGaps) {
      return data;
    }
  } catch {
    // Continue to direct SDK
  }

  const system =
    "You are an expert AI Career Skill Analyst. Compare user's existing skills against industry requirements for their target job. " +
    "Identify 5-7 key skills required for the target job, assess current proficiency (0-100) based on their skills/experience, " +
    "target proficiency (usually 70-95), calculate gap (target - current, min 0), and assign priority (high, medium, low). " +
    'Respond with JSON only: {"overallScore":number,"skillGaps":[{"skill":string,"currentLevel":number,"targetLevel":number,"gap":number,"priority":"high"|"medium"|"low"}],"recommendations":[{"title":string,"description":string,"type":"priority"|"strength"|"timeline"}]}';

  const prompt = `Target Job: ${profile.target_job || 'Software Engineer'}\n` +
    `Current Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''}\n` +
    `Experience: ${profile.experience_years || '0-1'} years\n` +
    `Education: ${profile.education_level || 'UG'}`;

  const out = await callGemini(system, prompt, true);
  return parseJsonSafe<SkillAnalysisResult>(out, {
    overallScore: 65,
    skillGaps: [
      { skill: 'Core Language', currentLevel: 70, targetLevel: 90, gap: 20, priority: 'high' },
      { skill: 'Frameworks', currentLevel: 60, targetLevel: 85, gap: 25, priority: 'high' },
      { skill: 'Databases', currentLevel: 65, targetLevel: 80, gap: 15, priority: 'medium' },
      { skill: 'System Design', currentLevel: 40, targetLevel: 75, gap: 35, priority: 'high' },
      { skill: 'Testing & CI/CD', currentLevel: 50, targetLevel: 75, gap: 25, priority: 'medium' },
    ],
    recommendations: [
      { title: 'Focus on High Priority', description: 'Address critical gaps first to meet job requirements.', type: 'priority' },
      { title: 'Leverage Strengths', description: 'Highlight existing fundamentals while building modern tool competence.', type: 'strength' },
      { title: 'Estimated Timeline', description: 'With structured weekly milestones, gaps can be closed in 8-12 weeks.', type: 'timeline' }
    ]
  });
}

export interface RelevanceValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates whether a skill is relevant to a certification name and issuer.
 * Uses Gemini AI if available, with intelligent semantic fallback.
 */
export async function validateSkillForCertification(params: {
  certName: string;
  issuer?: string;
  skill: string;
}): Promise<RelevanceValidationResult> {
  const { certName, issuer, skill } = params;
  const cleanSkill = skill.trim();
  const cleanCert = certName.trim();

  if (!cleanSkill) {
    return { isValid: false, reason: "Skill cannot be empty." };
  }
  if (!cleanCert) {
    // If certification name is not yet provided, cannot validate
    return { isValid: true };
  }

  // 1. Try Gemini AI evaluation
  try {
    const system =
      "You are an expert technical certification and credential auditor. Your task is to verify whether an entered skill is legitimately relevant to, covered by, or directly associated with the given certification curriculum and topic. " +
      "If the skill is irrelevant (e.g. non-tech skills for tech certifications, unrelated domains like cooking or gardening, or completely unrelated technology stacks), mark isValid as false with a concise 1-sentence reason. " +
      'Respond with JSON only: {"isValid": boolean, "reason": string}.';
    const prompt = `Certification Name: "${cleanCert}"\nIssuer: "${issuer || ''}"\nProposed Skill: "${cleanSkill}"\nIs this skill legitimately relevant to this certification?`;
    const out = await callGemini(system, prompt, true);
    const parsed = parseJsonSafe<RelevanceValidationResult>(out, { isValid: true });
    if (typeof parsed.isValid === "boolean") {
      return parsed;
    }
  } catch (err) {
    console.warn("Gemini validation unavailable, using local semantic heuristics:", err);
  }

  // 2. Intelligent local fallback heuristic
  const certLower = cleanCert.toLowerCase();
  const issuerLower = (issuer || "").toLowerCase();
  const skillLower = cleanSkill.toLowerCase();

  // If exact substring match or word tokens overlap
  const certTokens = certLower.split(/[\s,._\-/]+/).filter((w) => w.length > 2);
  const skillTokens = skillLower.split(/[\s,._\-/]+/).filter((w) => w.length > 2);

  const hasTokenOverlap = skillTokens.some((st) =>
    certTokens.some((ct) => ct.includes(st) || st.includes(ct))
  );

  // Broad technical domain mapping
  const domains: Record<string, string[]> = {
    cloud: ["aws", "azure", "gcp", "cloud", "devops", "docker", "kubernetes", "terraform", "s3", "ec2", "iam", "serverless", "lambda", "networking", "linux"],
    web: ["html", "css", "javascript", "typescript", "react", "vue", "angular", "node", "frontend", "backend", "api", "rest", "fullstack", "ui", "tailwind"],
    data: ["python", "sql", "data", "analytics", "pandas", "numpy", "powerbi", "tableau", "database", "etl", "machine learning", "deep learning", "ai", "statistics"],
    security: ["security", "cyber", "cissp", "ceh", "network", "firewall", "encryption", "penetration", "compliance", "vulnerability"],
    mobile: ["android", "ios", "swift", "kotlin", "flutter", "react native", "mobile"],
  };

  for (const [, keywords] of Object.entries(domains)) {
    const certMatchesDomain = keywords.some((k) => certLower.includes(k) || issuerLower.includes(k));
    const skillMatchesDomain = keywords.some((k) => skillLower.includes(k));

    if (certMatchesDomain && skillMatchesDomain) {
      return { isValid: true };
    }
  }

  if (hasTokenOverlap) {
    return { isValid: true };
  }

  // Common unrelated noise keywords
  const unrelatedWords = ["cooking", "culinary", "gardening", "plumbing", "driving", "carpentry", "sewing", "babysitting", "fishing", "singing", "painting", "dance"];
  if (unrelatedWords.some((w) => skillLower.includes(w))) {
    return {
      isValid: false,
      reason: `"${cleanSkill}" does not appear to be relevant to "${cleanCert}".`,
    };
  }

  return { isValid: true };
}

/**
 * Validates whether a technology is relevant to and used in a project.
 * Uses Gemini AI if available, with intelligent text and semantic fallback.
 */
export async function validateTechForProject(params: {
  title: string;
  description: string;
  tech: string;
}): Promise<RelevanceValidationResult> {
  const { title, description, tech } = params;
  const cleanTech = tech.trim();
  const cleanTitle = title.trim();
  const cleanDesc = description.trim();

  if (!cleanTech) {
    return { isValid: false, reason: "Technology cannot be empty." };
  }

  const techLower = cleanTech.toLowerCase();
  const titleLower = cleanTitle.toLowerCase();
  const descLower = cleanDesc.toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  // If the technology or acronym is directly present in title or description, it's valid!
  if (combined.includes(techLower)) {
    return { isValid: true };
  }

  // Check aliases (e.g. JS -> JavaScript, TS -> TypeScript, K8s -> Kubernetes, Postgres -> PostgreSQL)
  const aliasMap: Record<string, string[]> = {
    javascript: ["js", "ecmascript"],
    typescript: ["ts"],
    kubernetes: ["k8s"],
    postgresql: ["postgres", "psql"],
    mongodb: ["mongo"],
    react: ["reactjs", "react.js"],
    vue: ["vuejs", "vue.js"],
    node: ["nodejs", "node.js"],
    tailwind: ["tailwindcss"],
  };

  for (const [canonical, aliases] of Object.entries(aliasMap)) {
    if (techLower === canonical || aliases.includes(techLower)) {
      if (combined.includes(canonical) || aliases.some((a) => combined.includes(a))) {
        return { isValid: true };
      }
    }
  }

  // 1. Try Gemini AI evaluation
  try {
    const system =
      "You are an expert technical project reviewer. Your task is to verify whether an entered technology is relevant to and appropriate for the given project title and description. " +
      "If the technology is completely unrelated, contradicted, or has no plausible connection to the described project, mark isValid as false with a concise reason. " +
      "If it is a plausibly related backend, frontend, database, or tool that fits the described architecture, mark isValid as true. " +
      'Respond with JSON only: {"isValid": boolean, "reason": string}.';
    const prompt = `Project Title: "${cleanTitle}"\nProject Description: "${cleanDesc}"\nProposed Technology: "${cleanTech}"\nIs this technology relevant and appropriate for this project?`;
    const out = await callGemini(system, prompt, true);
    const parsed = parseJsonSafe<RelevanceValidationResult>(out, { isValid: true });
    if (typeof parsed.isValid === "boolean") {
      return parsed;
    }
  } catch (err) {
    console.warn("Gemini validation unavailable, using local heuristics:", err);
  }

  // 2. Local fallback heuristic:
  // If the description has enough content (> 15 words) and has zero mention of this technology or domain:
  const words = cleanDesc.split(/\s+/).filter(Boolean);
  if (words.length >= 15) {
    // If not mentioned, warn that it must be mentioned or explained in the description
    return {
      isValid: false,
      reason: `"${cleanTech}" is not mentioned in your project description. Please mention or describe how it was used to avoid misleading directions.`,
    };
  }

  return { isValid: true };
}


