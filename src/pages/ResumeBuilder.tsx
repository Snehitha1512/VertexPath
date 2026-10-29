import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useCertifications } from "@/hooks/useCareerAssets";
import { useResumes } from "@/hooks/useResumes";
import { PRESET_ROLES } from "@/lib/resume/roles";
import { calculateProjectScore, calculateCertificationScore } from "@/lib/resume/ranking";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ResumePdfDocument } from "@/components/resume/ResumePdf";
import { ResumeItemEditDialog } from "@/components/resume/ResumeItemEditDialog";
import { suggestSummary } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { pdf } from "@react-pdf/renderer";
import {
  Download,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Edit,
  Check,
  Briefcase,
  Award,
  Layers,
  Loader2,
  FileText,
} from "lucide-react";
import type { ResumeContent, ResumeItem, SavedResume } from "@/lib/resume/types";

export const ResumeBuilder: React.FC = () => {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { certifications } = useCertifications();
  const { resumes, saveResume, deleteResume } = useResumes();

  const [profile, setProfile] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("Full-Stack Developer");
  const [customRole, setCustomRole] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [resumeName, setResumeName] = useState<string>("My Resume");
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);

  const [summary, setSummary] = useState<string>("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string>("");

  const [addedProjects, setAddedProjects] = useState<ResumeItem[]>([]);
  const [addedCertifications, setAddedCertifications] = useState<ResumeItem[]>([]);

  const [editingItem, setEditingItem] = useState<ResumeItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Load user profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      let loadedProfile: any = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) loadedProfile = data;
      } catch {
        // ignore
      }

      if (!loadedProfile) {
        const cached = localStorage.getItem(`vertexpath_profile_${user.id}`);
        if (cached) {
          try {
            loadedProfile = JSON.parse(cached);
          } catch {
            // ignore
          }
        }
      }

      if (!loadedProfile && user.email) {
        loadedProfile = {
          id: user.id,
          full_name: user.email.split("@")[0],
          target_job: "Full-Stack Developer",
          skills: "JavaScript, React, Node.js",
          bio: "",
        };
      }

      if (loadedProfile) {
        setProfile({ ...loadedProfile, email: user.email });
        if (loadedProfile.target_job) {
          if (PRESET_ROLES[loadedProfile.target_job]) {
            setSelectedRole(loadedProfile.target_job);
          } else {
            setSelectedRole("custom");
            setCustomRole(loadedProfile.target_job);
          }
        }
        if (loadedProfile.skills) {
          const loadedSkills = (typeof loadedProfile.skills === "string" ? loadedProfile.skills : "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
          setSkills((prev) => Array.from(new Set([...prev, ...loadedSkills])));
        }
        if (loadedProfile.bio && !summary) {
          setSummary(loadedProfile.bio);
        }
      }
    };
    fetchProfile();
  }, [user]);

  // Auto-sync first/active saved resume (e.g. when projects were added from Career Assets)
  useEffect(() => {
    if (!activeResumeId && resumes && resumes.length > 0) {
      const primary = resumes[0];
      setActiveResumeId(primary.id);
      setResumeName(primary.name);
      if (primary.target_role) {
        if (PRESET_ROLES[primary.target_role]) {
          setSelectedRole(primary.target_role);
        } else {
          setSelectedRole("custom");
          setCustomRole(primary.target_role);
        }
      }
      if (primary.job_description) setJobDescription(primary.job_description);
      const content = primary.content || { summary: "", skills: [], projects: [], certifications: [] };
      if (content.summary) setSummary(content.summary);
      if (content.skills && content.skills.length > 0) setSkills(content.skills);
      if (content.projects && content.projects.length > 0) setAddedProjects(content.projects);
      if (content.certifications && content.certifications.length > 0) setAddedCertifications(content.certifications);
    }
  }, [resumes, activeResumeId]);

  const effectiveRole = selectedRole === "custom" ? customRole : selectedRole;

  // Rank projects
  const rankedProjects = useMemo(() => {
    return projects
      .map((proj) => {
        const scoreResult = calculateProjectScore(proj, effectiveRole, jobDescription);
        return {
          proj,
          scoreResult,
        };
      })
      .sort((a, b) => b.scoreResult.score - a.scoreResult.score);
  }, [projects, effectiveRole, jobDescription]);

  // Rank certifications
  const rankedCertifications = useMemo(() => {
    return certifications
      .map((cert) => {
        const scoreResult = calculateCertificationScore(cert, effectiveRole, jobDescription);
        return {
          cert,
          scoreResult,
        };
      })
      .sort((a, b) => b.scoreResult.score - a.scoreResult.score);
  }, [certifications, effectiveRole, jobDescription]);

  // Add project to resume snapshot
  const handleAddProject = (project: typeof projects[0]) => {
    if (addedProjects.some((p) => p.sourceId === project.id)) return;
    const bullets = project.description
      ? project.description.split("\n").filter((b) => b.trim().length > 0)
      : [];

    const newItem: ResumeItem = {
      kind: "project",
      sourceId: project.id,
      title: project.title,
      subtitle: project.technologies?.join(", "),
      bullets: bullets.length > 0 ? bullets : [project.description || ""],
      date: project.start_date || undefined,
      url: project.project_url || undefined,
    };

    setAddedProjects([...addedProjects, newItem]);

    // Also enrich skills
    if (project.technologies && project.technologies.length > 0) {
      setSkills((prev) => Array.from(new Set([...prev, ...project.technologies])));
    }
  };

  const handleRemoveProject = (sourceId: string) => {
    setAddedProjects(addedProjects.filter((p) => p.sourceId !== sourceId));
  };

  const handleMoveProject = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= addedProjects.length) return;
    const copy = [...addedProjects];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    setAddedProjects(copy);
  };

  // Add certification to resume snapshot
  const handleAddCert = (cert: typeof certifications[0]) => {
    if (addedCertifications.some((c) => c.sourceId === cert.id)) return;
    const newItem: ResumeItem = {
      kind: "certification",
      sourceId: cert.id,
      title: cert.name,
      subtitle: cert.issuer || undefined,
      bullets: [],
      date: cert.issue_date || undefined,
      url: cert.credential_url || undefined,
    };

    setAddedCertifications([...addedCertifications, newItem]);

    if (cert.skills && cert.skills.length > 0) {
      setSkills((prev) => Array.from(new Set([...prev, ...cert.skills])));
    }
  };

  const handleRemoveCert = (sourceId: string) => {
    setAddedCertifications(addedCertifications.filter((c) => c.sourceId !== sourceId));
  };

  // Update edited item snapshot
  const handleSaveEditedItem = (updated: ResumeItem) => {
    if (updated.kind === "project") {
      setAddedProjects(
        addedProjects.map((p) => (p.sourceId === updated.sourceId ? updated : p))
      );
    } else {
      setAddedCertifications(
        addedCertifications.map((c) => (c.sourceId === updated.sourceId ? updated : c))
      );
    }
  };

  // Skills input handlers
  const handleSkillAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const s = skillInput.trim();
      if (!skills.includes(s)) {
        setSkills([...skills, s]);
      }
      setSkillInput("");
    }
  };

  const handleSkillRemove = (s: string) => {
    setSkills(skills.filter((x) => x !== s));
  };

  // AI Summary suggest
  const handleSuggestSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const generated = await suggestSummary({
        profile: {
          ...profile,
          skills,
          projects: addedProjects.map((p) => ({ title: p.title, tech: p.subtitle })),
        },
        target_role: effectiveRole,
      });
      if (generated) {
        setSummary(generated);
        toast({ title: "Summary generated with Gemini" });
      }
    } catch (err: any) {
      toast({ title: "Failed to generate summary", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Build current resume content object
  const resumeContent: ResumeContent = useMemo(() => {
    return {
      summary,
      skills,
      projects: addedProjects,
      certifications: addedCertifications,
    };
  }, [summary, skills, addedProjects, addedCertifications]);

  // Save resume version
  const handleSaveVersion = async () => {
    try {
      const saved = await saveResume({
        id: activeResumeId || undefined,
        name: resumeName,
        targetRole: effectiveRole,
        jobDescription,
        content: resumeContent,
      });
      if (saved) {
        setActiveResumeId(saved.id);
      }
    } catch (err: any) {
      // handled in hook
    }
  };

  // Switch resume version
  const handleLoadVersion = (saved: SavedResume) => {
    setActiveResumeId(saved.id);
    setResumeName(saved.name);
    if (saved.target_role) {
      if (PRESET_ROLES[saved.target_role]) {
        setSelectedRole(saved.target_role);
      } else {
        setSelectedRole("custom");
        setCustomRole(saved.target_role);
      }
    }
    setJobDescription(saved.job_description || "");
    const content = saved.content || { summary: "", skills: [], projects: [], certifications: [] };
    setSummary(content.summary || "");
    setSkills(content.skills || []);
    setAddedProjects(content.projects || []);
    setAddedCertifications(content.certifications || []);
    toast({ title: `Loaded "${saved.name}"` });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const doc = (
        <ResumePdfDocument
          content={resumeContent}
          profile={profile}
          targetRole={effectiveRole}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = (profile?.full_name || "Resume").replace(/\s+/g, "_");
      const safeRole = (effectiveRole || "Role").replace(/\s+/g, "_");
      link.href = url;
      link.download = `${safeName}_${safeRole}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded successfully" });
    } catch (err: any) {
      toast({ title: "Failed to download PDF", description: err.message, variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getBandBadgeClass = (band: "High" | "Medium" | "Low") => {
    switch (band) {
      case "High":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Low":
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <section className="min-h-screen bg-gradient-dark pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Resume Builder
            </h1>
            <p className="text-gray-300 text-sm">
              Role-targeted resume generation with deterministic scoring and Gemini AI refinement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {resumes.length > 0 && (
              <Select
                value={activeResumeId || ""}
                onValueChange={(val) => {
                  const target = resumes.find((r) => r.id === val);
                  if (target) handleLoadVersion(target);
                }}
              >
                <SelectTrigger className="w-[180px] bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="My Resumes" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              onClick={handleSaveVersion}
              className="border-white/20 text-white hover:bg-white/10 gap-1"
            >
              <Save className="h-4 w-4" />
              Save Version
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="bg-gradient-primary hover:opacity-90 text-white gap-2"
            >
              {isExportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download ATS PDF
            </Button>
          </div>
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: CONTROLS & ASSET SELECTOR */}
          <div className="lg:col-span-6 space-y-6">
            {/* ROLE & JD CONTROLS */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Target Role & Job Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-300">Resume Version Name</label>
                    <Input
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="bg-white/5 border-white/20 text-white text-sm"
                      placeholder="e.g. Senior Backend - Google"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-300">Select Role</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(PRESET_ROLES).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Role...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedRole === "custom" && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-300">Custom Role Title</label>
                    <Input
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="e.g. Site Reliability Engineer"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-gray-300">
                    Paste Target Job Description (Optional — boosts matching items)
                  </label>
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description or requirements here to dynamically boost relevance scores..."
                    rows={3}
                    className="bg-white/5 border-white/20 text-white text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SUMMARY & SKILLS */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Summary & Core Skills</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSuggestSummary}
                  disabled={isGeneratingSummary}
                  className="text-xs h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                >
                  {isGeneratingSummary ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Suggest with Gemini
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Write a concise professional summary or click 'Suggest with Gemini'..."
                    rows={3}
                    className="bg-white/5 border-white/20 text-white text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Skills on Resume</label>
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillAdd}
                    placeholder="Add a skill and press Enter"
                    className="bg-white/5 border-white/20 text-white text-xs"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {skills.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="bg-primary/20 text-white border-primary/30 text-xs"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleSkillRemove(s)}
                          className="ml-1 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RANKED PROJECTS BLOCK */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Projects Ranked by Relevance ({rankedProjects.length})
                </h3>
                <span className="text-xs text-gray-400">Score & matches update automatically</span>
              </div>

              {rankedProjects.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-gray-400 text-xs">
                  No projects in Career Assets. Add projects in Career Assets first.
                </div>
              ) : (
                <div className="space-y-3">
                  {rankedProjects.map(({ proj, scoreResult }) => {
                    const isAdded = addedProjects.some((p) => p.sourceId === proj.id);
                    const addedIndex = addedProjects.findIndex((p) => p.sourceId === proj.id);
                    const currentAddedItem = addedProjects.find((p) => p.sourceId === proj.id);

                    return (
                      <Card
                        key={proj.id}
                        className={`bg-white/5 border transition-colors ${
                          isAdded ? "border-primary/60 bg-primary/5" : "border-white/10"
                        }`}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-semibold text-white text-sm">{proj.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getBandBadgeClass(scoreResult.band)}`}
                                >
                                  {scoreResult.score}% {scoreResult.band} Match
                                </Badge>
                                {scoreResult.matched.length > 0 && (
                                  <span className="text-[11px] text-gray-300">
                                    Matches: {scoreResult.matched.join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isAdded ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-gray-300 hover:text-white"
                                    disabled={addedIndex === 0}
                                    onClick={() => handleMoveProject(addedIndex, "up")}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-gray-300 hover:text-white"
                                    disabled={addedIndex === addedProjects.length - 1}
                                    onClick={() => handleMoveProject(addedIndex, "down")}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-primary/40 text-primary gap-1"
                                    onClick={() => {
                                      if (currentAddedItem) {
                                        setEditingItem(currentAddedItem);
                                        setIsEditOpen(true);
                                      }
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                    Edit Copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-red-400 hover:text-red-300"
                                    onClick={() => handleRemoveProject(proj.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-white gap-1"
                                  onClick={() => handleAddProject(proj)}
                                >
                                  <Plus className="h-3 w-3" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>

                          {proj.description && (
                            <p className="text-xs text-gray-300 line-clamp-2">
                              {proj.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RANKED CERTIFICATIONS BLOCK */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" />
                  Certifications Ranked ({rankedCertifications.length})
                </h3>
              </div>

              {rankedCertifications.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-gray-400 text-xs">
                  No certifications recorded. Add certifications in Career Assets.
                </div>
              ) : (
                <div className="space-y-3">
                  {rankedCertifications.map(({ cert, scoreResult }) => {
                    const isAdded = addedCertifications.some((c) => c.sourceId === cert.id);
                    return (
                      <Card
                        key={cert.id}
                        className={`bg-white/5 border transition-colors ${
                          isAdded ? "border-primary/60 bg-primary/5" : "border-white/10"
                        }`}
                      >
                        <CardContent className="p-4 flex justify-between items-center gap-2">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-white text-sm">{cert.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getBandBadgeClass(scoreResult.band)}`}
                              >
                                {scoreResult.score}% {scoreResult.band}
                              </Badge>
                              {cert.issuer && (
                                <span className="text-xs text-primary">{cert.issuer}</span>
                              )}
                            </div>
                          </div>

                          <div>
                            {isAdded ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-400 hover:text-red-300"
                                onClick={() => handleRemoveCert(cert.id)}
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-primary hover:bg-primary/90 text-white gap-1"
                                onClick={() => handleAddCert(cert)}
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE PREVIEW */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center text-white">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Live Resume Preview (ATS-Formatted)
              </span>
              <span className="text-xs text-gray-400">Updates live as you add and edit</span>
            </div>

            <div className="sticky top-20 max-h-[85vh] overflow-y-auto rounded-lg border border-white/20 p-2 bg-slate-950/60 shadow-2xl">
              <ResumePreview
                content={resumeContent}
                profile={profile}
                targetRole={effectiveRole}
              />
            </div>
          </div>
        </div>

        {/* EDIT ITEM DIALOG WITH GEMINI AI */}
        <ResumeItemEditDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          item={editingItem}
          targetRole={effectiveRole}
          onSave={handleSaveEditedItem}
        />
      </div>
    </section>
  );
};

