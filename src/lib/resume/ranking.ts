import { PRESET_ROLES, RoleKeywords } from './roles';

export interface ScoreWeights {
  textMatch: number;      // 0.45
  techMatch: number;      // 0.35
  roleCoreMatch: number;  // 0.10
  recencyMatch: number;   // 0.10
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  textMatch: 0.45,
  techMatch: 0.35,
  roleCoreMatch: 0.10,
  recencyMatch: 0.10,
};

export interface ScoredResult {
  score: number;
  band: 'High' | 'Medium' | 'Low';
  matched: string[];
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export function extractJdKeywords(jdText: string): string[] {
  if (!jdText || !jdText.trim()) return [];
  const words = jdText
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const frequency: Record<string, number> = {};
  for (const w of words) {
    frequency[w] = (frequency[w] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([w]) => w);
}

export function calculateProjectScore(
  project: {
    title: string;
    description?: string | null;
    technologies?: string[];
    start_date?: string | null;
    end_date?: string | null;
  },
  targetRole: string,
  jdText: string = '',
  weights: ScoreWeights = DEFAULT_WEIGHTS
): ScoredResult {
  const roleConfig: RoleKeywords = PRESET_ROLES[targetRole] || {
    core: targetRole.toLowerCase().split(/\s+/).filter(w => w.length > 2),
    tech: [],
    adjacent: []
  };

  const jdKeywords = extractJdKeywords(jdText);
  const targetTechs = new Set([...roleConfig.tech.map(t => t.toLowerCase()), ...jdKeywords]);
  const coreKeywords = new Set(roleConfig.core.map(c => c.toLowerCase()));

  const matchedKeywords = new Set<string>();

  // 1. Text match (45%): title (x2) + description
  const titleWords = (project.title || '').toLowerCase();
  const descWords = (project.description || '').toLowerCase();
  
  let titleHits = 0;
  let descHits = 0;

  for (const kw of [...coreKeywords, ...targetTechs]) {
    if (titleWords.includes(kw)) {
      titleHits++;
      matchedKeywords.add(kw);
    } else if (descWords.includes(kw)) {
      descHits++;
      matchedKeywords.add(kw);
    }
  }

  const rawTextScore = Math.min(100, (titleHits * 20) + (descHits * 10));

  // 2. Tech match (35%): overlap of technologies with tech+JD
  const projectTechs = (project.technologies || []).map(t => t.toLowerCase());
  let techHits = 0;
  for (const tech of projectTechs) {
    if (targetTechs.has(tech) || [...targetTechs].some(t => tech.includes(t) || t.includes(tech))) {
      techHits++;
      matchedKeywords.add(tech);
    }
  }
  const techScore = projectTechs.length > 0 
    ? Math.min(100, (techHits / Math.max(1, Math.min(5, projectTechs.length))) * 100)
    : 0;

  // 3. Role core match (10%)
  let coreHits = 0;
  for (const core of coreKeywords) {
    if (titleWords.includes(core) || descWords.includes(core)) {
      coreHits++;
    }
  }
  const coreScore = Math.min(100, coreHits * 30);

  // 4. Recency (10%)
  let recencyScore = 50;
  const projectDate = project.end_date || project.start_date;
  if (projectDate) {
    const year = new Date(projectDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const diff = currentYear - year;
    if (diff <= 1) recencyScore = 100;
    else if (diff <= 2) recencyScore = 80;
    else if (diff <= 4) recencyScore = 50;
    else recencyScore = 20;
  }

  const finalScore = Math.round(
    (rawTextScore * weights.textMatch) +
    (techScore * weights.techMatch) +
    (coreScore * weights.roleCoreMatch) +
    (recencyScore * weights.recencyMatch)
  );

  const boundedScore = Math.max(0, Math.min(100, finalScore));
  const band: 'High' | 'Medium' | 'Low' = boundedScore >= 60 ? 'High' : boundedScore >= 30 ? 'Medium' : 'Low';

  return {
    score: boundedScore,
    band,
    matched: Array.from(matchedKeywords).slice(0, 10)
  };
}

export function calculateCertificationScore(
  cert: {
    name: string;
    issuer?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    skills?: string[];
  },
  targetRole: string,
  jdText: string = '',
  weights: ScoreWeights = DEFAULT_WEIGHTS
): ScoredResult {
  const roleConfig: RoleKeywords = PRESET_ROLES[targetRole] || {
    core: targetRole.toLowerCase().split(/\s+/).filter(w => w.length > 2),
    tech: [],
    adjacent: []
  };

  const jdKeywords = extractJdKeywords(jdText);
  const targetTechs = new Set([...roleConfig.tech.map(t => t.toLowerCase()), ...jdKeywords]);
  const coreKeywords = new Set(roleConfig.core.map(c => c.toLowerCase()));

  const matchedKeywords = new Set<string>();

  const nameWords = (cert.name || '').toLowerCase();
  const certSkills = (cert.skills || []).map(s => s.toLowerCase());

  // 1. Text match (45%): name
  let nameHits = 0;
  for (const kw of [...coreKeywords, ...targetTechs]) {
    if (nameWords.includes(kw)) {
      nameHits++;
      matchedKeywords.add(kw);
    }
  }
  const rawTextScore = Math.min(100, nameHits * 35);

  // 2. Tech match (35%): skills overlap
  let skillHits = 0;
  for (const skill of certSkills) {
    if (targetTechs.has(skill) || [...targetTechs].some(t => skill.includes(t) || t.includes(skill))) {
      skillHits++;
      matchedKeywords.add(skill);
    }
  }
  const techScore = certSkills.length > 0 
    ? Math.min(100, (skillHits / Math.max(1, Math.min(4, certSkills.length))) * 100)
    : (nameHits > 0 ? 50 : 0);

  // 3. Role core match (10%)
  let coreHits = 0;
  for (const core of coreKeywords) {
    if (nameWords.includes(core) || certSkills.some(s => s.includes(core))) {
      coreHits++;
    }
  }
  const coreScore = Math.min(100, coreHits * 40);

  // 4. Recency & Expiry (10%)
  let recencyScore = 60;
  if (cert.expiry_date) {
    const expiry = new Date(cert.expiry_date);
    if (expiry < new Date()) {
      recencyScore = 0; // expired
    } else {
      recencyScore = 100;
    }
  } else if (cert.issue_date) {
    const year = new Date(cert.issue_date).getFullYear();
    const diff = new Date().getFullYear() - year;
    if (diff <= 2) recencyScore = 100;
    else if (diff <= 4) recencyScore = 60;
    else recencyScore = 30;
  }

  const finalScore = Math.round(
    (rawTextScore * weights.textMatch) +
    (techScore * weights.techMatch) +
    (coreScore * weights.roleCoreMatch) +
    (recencyScore * weights.recencyMatch)
  );

  const boundedScore = Math.max(0, Math.min(100, finalScore));
  const band: 'High' | 'Medium' | 'Low' = boundedScore >= 60 ? 'High' : boundedScore >= 30 ? 'Medium' : 'Low';

  return {
    score: boundedScore,
    band,
    matched: Array.from(matchedKeywords).slice(0, 10)
  };
}
