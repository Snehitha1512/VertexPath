// Supabase Edge Function: ai-assist
// Actions:
//   rewrite_description -> propose a reworded project/cert description (user approves it)
//   extract_from_text   -> pull projects + certifications out of pasted/PDF-extracted profile text
//   suggest_summary     -> generate professional summary for resume based strictly on user facts
//   generate_roadmap    -> generate personalized milestone learning paths based on user profile
//   analyze_skills      -> compute skill gap analysis between user skills and target role
//
// Secrets (set with `supabase secrets set ...`, NEVER in frontend code):
//   AI_PROVIDER      = "gemini" (default) | "anthropic"
//   GEMINI_API_KEY   (+ optional GEMINI_MODEL, default gemini-3.8-flash)
//   ANTHROPIC_API_KEY (+ ANTHROPIC_MODEL, default claude-sonnet-5-5)
//
// JWT verification is ON by default for Edge Functions, so only signed-in users can call this.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const NO_INVENTION =
  "Use ONLY facts present in the input. Never invent metrics, numbers, technologies, employers, dates, " +
  "results or certifications. If the input lacks detail, keep the output modest and list what is missing " +
  "in \"missing_info\" instead of guessing.";

async function callModel(system: string, user: string, wantJson: boolean): Promise<string> {
  const provider = Deno.env.get("AI_PROVIDER") ?? "gemini";

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    return data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  }

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: wantJson ? { responseMimeType: "application/json" } : {},
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
}

function parseJson(raw: string) {
  const clean = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(clean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json();

    if (body.action === "rewrite_description") {
      const { text, mode, target_role, tech } = body;
      if (typeof text !== "string" || !text.trim() || text.length > 2000) {
        return json({ error: "text is required (max 2000 chars)" }, 400);
      }
      const modes: Record<string, string> = {
        shorter: "Make it shorter: at most 2 concise bullet points.",
        longer: "Expand it slightly (3-4 bullets) using only details already given.",
        technical: "Emphasise the technical stack and implementation, using only given details.",
        achievement: "Rewrite as achievement-focused bullets starting with strong action verbs.",
        role_focus: `Emphasise aspects relevant to the role "${String(target_role ?? "").slice(0, 80)}" that are already present in the text.`,
      };
      const instruction = modes[mode as string] ?? modes.achievement;
      const system =
        "You edit resume project descriptions. " + NO_INVENTION +
        ' Respond with JSON only: {"bullets": string[], "missing_info": string[]}. ' +
        "missing_info = short questions the user could answer to make the entry stronger.";
      const out = await callModel(system, `${instruction}\nTechnologies: ${JSON.stringify(tech ?? [])}\nOriginal:\n${text}`, true);
      return json(parseJson(out));
    }

    if (body.action === "extract_from_text") {
      const { text } = body;
      if (typeof text !== "string" || !text.trim() || text.length > 30000) {
        return json({ error: "text is required (max 30000 chars)" }, 400);
      }
      const system =
        "You extract structured career data from a LinkedIn profile PDF text or resume text. " + NO_INVENTION +
        ' Respond with JSON only: {"projects":[{"title","description","technologies":string[],"project_url"}],' +
        '"certifications":[{"name","issuer","issue_date":"YYYY-MM-DD or null","credential_url"}],' +
        '"skills":string[]}. ' +
        "Use null for unknown fields. Do not invent details.";
      const out = await callModel(system, text, true);
      return json(parseJson(out));
    }

    if (body.action === "suggest_summary") {
      const { profile, target_role } = body;
      const system =
        "You write concise 2-3 sentence resume professional summaries. " + NO_INVENTION +
        ' Respond with JSON only: {"summary": string}.';
      const out = await callModel(system, `Target role: ${target_role}\nProfile facts:\n${JSON.stringify(profile)}`, true);
      return json(parseJson(out));
    }

    if (body.action === "generate_roadmap") {
      const { profile } = body;
      const system =
        "You are an expert AI Career Architect. Given a learner's profile, target job, and current skills, generate a 4-level personalized learning roadmap. " +
        "Each level represents a milestone stage from foundations to advanced specialization. " +
        'Respond with JSON only: {"paths":[{"level":number,"title":string,"description":string,"duration":string,"skills":string[],"courses":[{"title":string,"provider":string,"duration":string,"difficulty":string,"completed":false,"progress":0}]}]}.';
      const out = await callModel(system, `Learner Profile:\n${JSON.stringify(profile)}`, true);
      return json(parseJson(out));
    }

    if (body.action === "analyze_skills") {
      const { profile } = body;
      const system =
        "You are an expert AI Career and Skill Analyst. Given a user's current skills and target role, evaluate skill proficiencies (0-100), identify gap points, priority (high/medium/low), and actionable recommendations. " +
        'Respond with JSON only: {"skillGaps":[{"skill":string,"currentLevel":number,"targetLevel":number,"gap":number,"priority":"high"|"medium"|"low"}],"overallScore":number,"recommendations":[{"title":string,"description":string,"type":"priority"|"strength"|"timeline"}]}';
      const out = await callModel(system, `Profile and Target Role:\n${JSON.stringify(profile)}`, true);
      return json(parseJson(out));
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "AI request failed" }, 500);
  }
});

