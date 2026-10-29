import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { SavedResume, ResumeContent, ResumeItem } from "@/lib/resume/types";
import type { Project } from "@/hooks/useCareerAssets";

function getLocalResumes(userId: string): SavedResume[] {
  try {
    const raw = localStorage.getItem(`vertexpath_resumes_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalResumes(userId: string, resumes: SavedResume[]) {
  try {
    localStorage.setItem(`vertexpath_resumes_${userId}`, JSON.stringify(resumes));
  } catch (err) {
    console.warn("Failed to save resumes locally:", err);
  }
}

export function useResumes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["resumes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const local = getLocalResumes(user.id);

      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const combined = [...(data as unknown as SavedResume[])];
          for (const lr of local) {
            if (!combined.some((c) => c.id === lr.id)) {
              combined.push(lr);
            }
          }
          setLocalResumes(user.id, combined);
          return combined;
        }
      } catch (err) {
        console.warn("Supabase query for resumes failed, using local storage:", err);
      }

      return local;
    },
    enabled: !!user,
  });

  const saveResumeMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      targetRole,
      jobDescription,
      content,
    }: {
      id?: string;
      name: string;
      targetRole?: string;
      jobDescription?: string;
      content: ResumeContent;
    }) => {
      if (!user) throw new Error("Not signed in");
      const resumeId = id || crypto.randomUUID();
      const now = new Date().toISOString();

      const resumeItem: SavedResume = {
        id: resumeId,
        user_id: user.id,
        name,
        target_role: targetRole || null,
        job_description: jobDescription || null,
        content,
        created_at: now,
        updated_at: now,
      };

      const current = getLocalResumes(user.id);
      const exists = current.some((r) => r.id === resumeId);
      const updated = exists
        ? current.map((r) => (r.id === resumeId ? resumeItem : r))
        : [resumeItem, ...current];
      setLocalResumes(user.id, updated);

      try {
        if (id) {
          const { data, error } = await supabase
            .from("resumes")
            .update({
              name,
              target_role: targetRole || null,
              job_description: jobDescription || null,
              content: content as any,
              updated_at: now,
            })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

          if (!error && data) return data as unknown as SavedResume;
        } else {
          const { data, error } = await supabase
            .from("resumes")
            .insert({
              id: resumeId,
              user_id: user.id,
              name,
              target_role: targetRole || null,
              job_description: jobDescription || null,
              content: content as any,
            })
            .select()
            .single();

          if (!error && data) return data as unknown as SavedResume;
        }
      } catch (err) {
        console.warn("Supabase save resume failed; stored locally:", err);
      }

      return resumeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes", user?.id] });
      toast({ title: "Resume saved successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save resume", description: err.message, variant: "destructive" });
    },
  });

  const deleteResumeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const current = getLocalResumes(user.id);
      setLocalResumes(
        user.id,
        current.filter((r) => r.id !== id)
      );

      try {
        await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);
      } catch (err) {
        console.warn("Supabase delete resume failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes", user?.id] });
      toast({ title: "Resume deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete resume", description: err.message, variant: "destructive" });
    },
  });

  /**
   * Helper to add or sync a project to the user's primary/active resume
   */
  const addProjectToResume = async (project: Project): Promise<{ added: boolean; resumeName: string }> => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to add projects to your resume.", variant: "destructive" });
      return { added: false, resumeName: "" };
    }

    const currentResumes = getLocalResumes(user.id);
    let targetResume = currentResumes[0];

    const bullets = project.description
      ? project.description.split("\n").filter((b) => b.trim().length > 0)
      : [];

    const projectItem: ResumeItem = {
      kind: "project",
      sourceId: project.id,
      title: project.title,
      subtitle: project.technologies?.join(", ") || "",
      bullets: bullets.length > 0 ? bullets : [project.description || ""],
      date: project.start_date || undefined,
      url: project.project_url || undefined,
    };

    if (!targetResume) {
      targetResume = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: "Master Resume",
        target_role: "Software Professional",
        job_description: null,
        content: {
          summary: "",
          skills: project.technologies || [],
          projects: [projectItem],
          certifications: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLocalResumes(user.id, [targetResume]);
      try {
        await supabase.from("resumes").insert({
          id: targetResume.id,
          user_id: user.id,
          name: targetResume.name,
          target_role: targetResume.target_role,
          content: targetResume.content as any,
        });
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["resumes", user.id] });
      return { added: true, resumeName: targetResume.name };
    }

    // Add or update project inside targetResume
    const existingProjects = targetResume.content?.projects || [];
    const alreadyExists = existingProjects.some((p) => p.sourceId === project.id);

    const updatedProjects = alreadyExists
      ? existingProjects.map((p) => (p.sourceId === project.id ? projectItem : p))
      : [...existingProjects, projectItem];

    const currentSkills = targetResume.content?.skills || [];
    const newTechs = project.technologies || [];
    const mergedSkills = Array.from(new Set([...currentSkills, ...newTechs]));

    const updatedContent: ResumeContent = {
      ...targetResume.content,
      projects: updatedProjects,
      skills: mergedSkills,
    };

    targetResume.content = updatedContent;
    targetResume.updated_at = new Date().toISOString();

    const updatedList = currentResumes.map((r) => (r.id === targetResume.id ? targetResume : r));
    setLocalResumes(user.id, updatedList);

    try {
      await supabase
        .from("resumes")
        .update({ content: updatedContent as any, updated_at: targetResume.updated_at })
        .eq("id", targetResume.id);
    } catch {}

    queryClient.invalidateQueries({ queryKey: ["resumes", user.id] });
    return { added: true, resumeName: targetResume.name };
  };

  const isProjectInResume = (projectId: string): boolean => {
    if (!user) return false;
    const currentResumes = getLocalResumes(user.id);
    return currentResumes.some((r) => r.content?.projects?.some((p) => p.sourceId === projectId));
  };

  return {
    resumes: query.data || [],
    isLoading: query.isLoading,
    saveResume: saveResumeMutation.mutateAsync,
    deleteResume: deleteResumeMutation.mutateAsync,
    addProjectToResume,
    isProjectInResume,
  };
}
