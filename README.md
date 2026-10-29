# VertexPath — AI Career Path & Resume Building Platform

VertexPath transforms career goals and skill gaps into structured, personalized learning pathways and role-tailored ATS resumes powered by Google Gemini LLM.

## Key Features

- **Personalized Learning Roadmap (Gemini LLM):** Dynamic 4-stage milestone roadmaps (Foundations, Frameworks, Systems/DevOps, Production Specialization) generated specifically for your target job with tracking and course recommendations.
- **Skill Gap Analysis (Gemini LLM):** AI evaluation comparing your competencies against target industry requirements, radar visualization, and actionable priority milestones.
- **Career Assets (Portfolio Management):** Verified repository of projects and certifications with LinkedIn CSV and PDF import via review queue.
- **Role-Targeted Resume Builder:** Deterministic ATS scoring matching projects and credentials against selected roles and job descriptions.
- **Gemini Resume Assistant:** AI bullet rewriting (Shorter, Longer, Technical, Achievement-focused, Role-tailored) with strict fact-preservation and diff comparison.
- **ATS-Friendly PDF Export:** Direct, selectable-text PDF downloads powered by `@react-pdf/renderer`.

## Setup & Environment Configuration

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create `.env.local` in the project root (see `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Supabase Database Migration:**
   Execute `supabase/migrations/0001_vertexpath_core.sql` in the Supabase Dashboard SQL Editor.

4. **Edge Function (Optional for Backend AI):**
   ```bash
   supabase secrets set GEMINI_API_KEY=your-key AI_PROVIDER=gemini
   supabase functions deploy ai-assist
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

6. **Run Tests & Build:**
   ```bash
   npm run test
   npm run build
   ```
