import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useProjects,
  useCertifications,
  useImportCandidates,
  Project,
  Certification,
} from "@/hooks/useCareerAssets";
import { useResumes } from "@/hooks/useResumes";
import { ProjectForm } from "@/components/career/ProjectForm";
import { CertificationForm } from "@/components/career/CertificationForm";
import { ImportDialog } from "@/components/career/ImportDialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Award,
  Inbox,
  Plus,
  Upload,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  X,
  ShieldAlert,
  Calendar,
  Layers,
  FileText,
  Sparkles,
} from "lucide-react";

export const CareerAssets: React.FC = () => {
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const { certifications, createCertification, updateCertification, deleteCertification } = useCertifications();
  const { candidates, approveCandidate, dismissCandidate } = useImportCandidates();
  const { addProjectToResume, isProjectInResume } = useResumes();

  const [activeTab, setActiveTab] = useState<"projects" | "certifications" | "review">("projects");
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isCertFormOpen, setIsCertFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleAddToResume = async (proj: Project) => {
    try {
      const res = await addProjectToResume(proj);
      if (res.added) {
        toast({
          title: `Added "${proj.title}" to Resume`,
          description: `Snapshot added to "${res.resumeName}". You can view and edit it in the Resume Builder.`,
          action: (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-primary text-primary hover:bg-primary/10"
              onClick={() => {
                window.location.hash = "resume";
              }}
            >
              Open Resume
            </Button>
          ),
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to add to resume",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <section className="min-h-screen bg-gradient-dark pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Career Assets
            </h1>
            <p className="text-gray-300">
              Manage your verified portfolio of real projects and certifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Assets
            </Button>
            <Button
              className="bg-gradient-primary hover:opacity-90 text-white"
              onClick={() => {
                if (activeTab === "certifications") {
                  setEditingCert(null);
                  setIsCertFormOpen(true);
                } else {
                  setEditingProject(null);
                  setIsProjectFormOpen(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {activeTab === "certifications" ? "Add Certification" : "Add Project"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="projects" className="data-[state=active]:bg-primary text-white">
              <Briefcase className="h-4 w-4 mr-2" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="certifications" className="data-[state=active]:bg-primary text-white">
              <Award className="h-4 w-4 mr-2" />
              Certifications ({certifications.length})
            </TabsTrigger>
            <TabsTrigger value="review" className="data-[state=active]:bg-primary text-white relative">
              <Inbox className="h-4 w-4 mr-2" />
              Review Queue
              {candidates.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-black font-bold rounded-full">
                  {candidates.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PROJECTS */}
          <TabsContent value="projects" className="pt-6">
            {projects.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-center py-12">
                <CardContent className="space-y-4">
                  <Layers className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="text-xl font-medium text-white">No projects added yet</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Add projects you have built to rank and showcase them on tailored resumes.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectFormOpen(true);
                    }}
                    className="bg-gradient-primary hover:opacity-90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((proj) => {
                  const inResume = isProjectInResume(proj.id);

                  return (
                    <Card
                      key={proj.id}
                      className="group relative bg-white/5 border-white/10 text-white hover:bg-white/[0.08] hover:border-primary/50 transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                          <div className="space-y-1 pr-2">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                              {proj.title}
                              {proj.source_type !== "manual" && (
                                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                                  {proj.source_type}
                                </Badge>
                              )}
                              {inResume && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                                  <Check className="h-2.5 w-2.5" />
                                  In Resume
                                </Badge>
                              )}
                            </CardTitle>
                            {(proj.start_date || proj.end_date) && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {proj.start_date || ""} {proj.end_date ? `— ${proj.end_date}` : "— Present"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-300 hover:text-white"
                              title="Edit project details"
                              onClick={() => {
                                setEditingProject(proj);
                                setIsProjectFormOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-300 hover:text-destructive"
                              title="Delete project"
                              onClick={() => deleteProject(proj.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {proj.description && (
                            <p className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                              {proj.description}
                            </p>
                          )}

                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {proj.technologies.map((t) => (
                                <Badge
                                  key={t}
                                  variant="secondary"
                                  className="bg-primary/20 text-white border-primary/30 text-xs"
                                >
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {proj.project_url && (
                            <div className="pt-1">
                              <a
                                href={proj.project_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-primary hover:underline gap-1 break-all"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {proj.project_url}
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </div>

                      {/* HOVER ACTION BAR (User Request 8: Hover over project to Add to Resume or Edit Description) */}
                      <div className="p-4 pt-2 border-t border-white/10 flex items-center justify-between gap-2 bg-black/20 rounded-b-xl opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={inResume ? "secondary" : "default"}
                            onClick={() => handleAddToResume(proj)}
                            disabled={inResume}
                            className={cn(
                              "text-xs gap-1.5 h-8",
                              inResume
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                                : "bg-gradient-primary text-white hover:opacity-90 shadow-sm"
                            )}
                          >
                            {inResume ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                Added to Resume
                              </>
                            ) : (
                              <>
                                <FileText className="h-3.5 w-3.5" />
                                Add to Resume
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingProject(proj);
                              setIsProjectFormOpen(true);
                            }}
                            className="text-xs gap-1.5 h-8 border-white/20 text-white hover:bg-white/10"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit Description
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProject(proj.id)}
                          className="text-gray-400 hover:text-destructive h-8 px-2"
                          title="Remove project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: CERTIFICATIONS */}
          <TabsContent value="certifications" className="pt-6">
            {certifications.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-center py-12">
                <CardContent className="space-y-4">
                  <Award className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="text-xl font-medium text-white">No certifications recorded</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Record credentials, certificates, and licenses to match against role requirements.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingCert(null);
                      setIsCertFormOpen(true);
                    }}
                    className="bg-gradient-primary hover:opacity-90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certification
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certifications.map((cert) => (
                  <Card key={cert.id} className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          {cert.name}
                        </CardTitle>
                        {cert.issuer && (
                          <p className="text-sm text-primary font-medium">{cert.issuer}</p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Unverified
                          </Badge>
                          {(cert.issue_date || cert.expiry_date) && (
                            <span className="text-xs text-gray-400">
                              Issued: {cert.issue_date || "N/A"} {cert.expiry_date ? `| Expires: ${cert.expiry_date}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-300 hover:text-white"
                          onClick={() => {
                            setEditingCert(cert);
                            setIsCertFormOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-300 hover:text-destructive"
                          onClick={() => deleteCertification(cert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {cert.skills && cert.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cert.skills.map((s) => (
                            <Badge key={s} variant="secondary" className="bg-primary/20 text-white border-primary/30 text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {cert.credential_url && (
                        <div className="pt-2">
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-primary hover:underline gap-1 break-all"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {cert.credential_url}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: REVIEW QUEUE */}
          <TabsContent value="review" className="pt-6">
            {candidates.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-center py-12">
                <CardContent className="space-y-4">
                  <Inbox className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="text-xl font-medium text-white">Review queue is empty</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    When you import data from LinkedIn exports or PDF resumes, items land here for your explicit approval before adding to your profile.
                  </p>
                  <Button
                    onClick={() => setIsImportOpen(true)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex items-center justify-between text-amber-300 text-sm">
                  <span>{candidates.length} item(s) pending review. No data is added to your profile without approval.</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {candidates.map((cand) => {
                    const payload: any = cand.payload || {};
                    return (
                      <Card key={cand.id} className="bg-white/5 border-white/10 text-white">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="capitalize bg-primary/20 text-white border-primary/30">
                                {cand.kind}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-gray-400">
                                Source: {cand.source.replace('_', ' ')}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg font-semibold pt-1">
                              {cand.kind === "project" ? payload.title : payload.name}
                            </CardTitle>
                            {cand.kind === "certification" && payload.issuer && (
                              <p className="text-xs text-primary font-medium">Issuer: {payload.issuer}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
                              onClick={() => approveCandidate(cand)}
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-destructive"
                              onClick={() => dismissCandidate(cand.id)}
                            >
                              <X className="h-4 w-4" />
                              Dismiss
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-2">
                          {payload.description && (
                            <p className="text-sm text-gray-300">{payload.description}</p>
                          )}
                          {payload.technologies && payload.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {payload.technologies.map((t: string) => (
                                <Badge key={t} variant="outline" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {payload.project_url && (
                            <p className="text-xs text-primary truncate">{payload.project_url}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ProjectForm
          isOpen={isProjectFormOpen}
          onClose={() => setIsProjectFormOpen(false)}
          onSubmit={async (data) => {
            if (editingProject) {
              await updateProject({ id: editingProject.id, updates: data });
            } else {
              await createProject(data);
            }
          }}
          initialData={editingProject}
        />

        <CertificationForm
          isOpen={isCertFormOpen}
          onClose={() => setIsCertFormOpen(false)}
          onSubmit={async (data) => {
            if (editingCert) {
              await updateCertification({ id: editingCert.id, updates: data });
            } else {
              await createCertification(data);
            }
          }}
          initialData={editingCert}
        />

        <ImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
      </div>
    </section>
  );
};
