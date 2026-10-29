import React from "react";
import type { ResumeContent } from "@/lib/resume/types";
import { Mail, Phone, MapPin, Globe, Github, Linkedin, ExternalLink } from "lucide-react";

interface ResumePreviewProps {
  content: ResumeContent;
  profile: any;
  targetRole: string;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  content,
  profile,
  targetRole,
}) => {
  const fullName = profile?.full_name || "Your Name";
  const email = profile?.email || "";
  const phone = profile?.phone || "";
  const location = profile?.location || "";
  const linkedinUrl = profile?.linkedin_url || "";
  const githubUrl = profile?.github_url || "";
  const portfolioUrl = profile?.portfolio_url || "";

  return (
    <div className="bg-white text-slate-900 shadow-2xl rounded-sm p-8 max-w-[850px] mx-auto min-h-[1050px] text-sm font-sans leading-normal selection:bg-teal-100 selection:text-slate-900 border border-slate-200">
      {/* HEADER */}
      <header className="border-b border-slate-300 pb-4 mb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900 mb-1">
          {fullName}
        </h1>
        {targetRole && (
          <p className="text-sm font-semibold text-teal-700 tracking-wider uppercase mb-2">
            {targetRole}
          </p>
        )}

        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          {email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3 text-slate-500" />
              {email}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-500" />
              {phone}
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-500" />
              {location}
            </span>
          )}
          {linkedinUrl && (
            <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
              <Linkedin className="h-3 w-3" />
              LinkedIn
            </span>
          )}
          {githubUrl && (
            <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
              <Github className="h-3 w-3" />
              GitHub
            </span>
          )}
          {portfolioUrl && (
            <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
              <Globe className="h-3 w-3" />
              Portfolio
            </span>
          )}
        </div>
      </header>

      {/* SUMMARY */}
      {content.summary && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed text-justify">
            {content.summary}
          </p>
        </section>
      )}

      {/* SKILLS */}
      {content.skills && content.skills.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            Skills & Competencies
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            {content.skills.join(" • ")}
          </p>
        </section>
      )}

      {/* PROJECTS */}
      {content.projects && content.projects.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            Key Projects
          </h2>
          <div className="space-y-3">
            {content.projects.map((proj, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-slate-900 text-xs">
                    {proj.title}
                    {proj.subtitle && (
                      <span className="font-normal text-slate-600"> | {proj.subtitle}</span>
                    )}
                  </span>
                  {proj.date && (
                    <span className="text-[11px] text-slate-500">{proj.date}</span>
                  )}
                </div>

                {proj.url && (
                  <p className="text-[10px] text-teal-700 truncate">{proj.url}</p>
                )}

                {proj.bullets && proj.bullets.length > 0 && (
                  <ul className="list-disc list-outside pl-4 space-y-0.5 text-[11.5px] text-slate-700">
                    {proj.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-snug">{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CERTIFICATIONS */}
      {content.certifications && content.certifications.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            Certifications & Training
          </h2>
          <div className="space-y-1.5">
            {content.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between items-baseline text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{cert.title}</span>
                  {cert.subtitle && (
                    <span className="text-slate-600 text-[11px]"> — {cert.subtitle}</span>
                  )}
                </div>
                {cert.date && (
                  <span className="text-[11px] text-slate-500">{cert.date}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EDUCATION */}
      {(profile?.education_level || profile?.college_or_company) && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            Education
          </h2>
          <div className="flex justify-between items-baseline text-xs">
            <div>
              <span className="font-semibold text-slate-900">
                {profile.education_detail || profile.education_level || "Degree"}
              </span>
              {profile.college_or_company && (
                <span className="text-slate-600"> — {profile.college_or_company}</span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

