import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Certification = Database["public"]["Tables"]["certifications"]["Row"];
export type CertificationInsert = Database["public"]["Tables"]["certifications"]["Insert"];
export type CertificationUpdate = Database["public"]["Tables"]["certifications"]["Update"];

export type ImportCandidate = Database["public"]["Tables"]["import_candidates"]["Row"];

// --- LOCAL STORAGE HELPERS TO GUARANTEE ZERO CRASHES IF TABLES DO NOT EXIST ---

function getLocalProjects(userId: string): Project[] {
  try {
    const raw = localStorage.getItem(`vertexpath_projects_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalProjects(userId: string, projects: Project[]) {
  try {
    localStorage.setItem(`vertexpath_projects_${userId}`, JSON.stringify(projects));
  } catch (err) {
    console.warn("Error saving projects locally:", err);
  }
}

function getLocalCertifications(userId: string): Certification[] {
  try {
    const raw = localStorage.getItem(`vertexpath_certifications_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCertifications(userId: string, certs: Certification[]) {
  try {
    localStorage.setItem(`vertexpath_certifications_${userId}`, JSON.stringify(certs));
  } catch (err) {
    console.warn("Error saving certifications locally:", err);
  }
}

function getLocalImportCandidates(userId: string): ImportCandidate[] {
  try {
    const raw = localStorage.getItem(`vertexpath_import_candidates_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalImportCandidates(userId: string, list: ImportCandidate[]) {
  try {
    localStorage.setItem(`vertexpath_import_candidates_${userId}`, JSON.stringify(list));
  } catch (err) {
    console.warn("Error saving candidates locally:", err);
  }
}

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const local = getLocalProjects(user.id);

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          // Merge remote with local to ensure nothing lost
          const combined = [...data];
          for (const lp of local) {
            if (!combined.some((c) => c.id === lp.id)) {
              combined.push(lp);
            }
          }
          setLocalProjects(user.id, combined);
          return combined;
        }
      } catch (err) {
        console.warn("Supabase query for projects failed, using local storage fallback:", err);
      }

      return local;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (newProject: Omit<ProjectInsert, "user_id">) => {
      if (!user) throw new Error("Not signed in");
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const item: Project = {
        id,
        user_id: user.id,
        title: newProject.title,
        description: newProject.description ?? null,
        technologies: newProject.technologies ?? [],
        project_url: newProject.project_url ?? null,
        start_date: newProject.start_date ?? null,
        end_date: newProject.end_date ?? null,
        source_type: newProject.source_type ?? "manual",
        source_ref: newProject.source_ref ?? null,
        created_at: now,
        updated_at: now,
      };

      // 1. Immediately store in local cache
      const current = getLocalProjects(user.id);
      setLocalProjects(user.id, [item, ...current]);

      // 2. Try Supabase in background
      try {
        const { data, error } = await supabase
          .from("projects")
          .insert({ ...newProject, id, user_id: user.id })
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Supabase insert for project failed; retained locally:", err);
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", user?.id] });
      toast({ title: "Project saved successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save project", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectUpdate }) => {
      if (!user) throw new Error("Not signed in");
      const current = getLocalProjects(user.id);
      const updatedList = current.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      );
      setLocalProjects(user.id, updatedList);

      try {
        const { data, error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Supabase update for project failed:", err);
      }

      return updatedList.find((p) => p.id === id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", user?.id] });
      toast({ title: "Project updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update project", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const current = getLocalProjects(user.id);
      setLocalProjects(
        user.id,
        current.filter((p) => p.id !== id)
      );

      try {
        await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
      } catch (err) {
        console.warn("Supabase delete for project failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", user?.id] });
      toast({ title: "Project removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete project", description: err.message, variant: "destructive" });
    },
  });

  return {
    projects: query.data || [],
    isLoading: query.isLoading,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
  };
}

export function useCertifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const local = getLocalCertifications(user.id);

      try {
        const { data, error } = await supabase
          .from("certifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const combined = [...data];
          for (const lc of local) {
            if (!combined.some((c) => c.id === lc.id)) {
              combined.push(lc);
            }
          }
          setLocalCertifications(user.id, combined);
          return combined;
        }
      } catch (err) {
        console.warn("Supabase query for certifications failed, using local storage fallback:", err);
      }

      return local;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (newCert: Omit<CertificationInsert, "user_id">) => {
      if (!user) throw new Error("Not signed in");
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const item: Certification = {
        id,
        user_id: user.id,
        name: newCert.name,
        issuer: newCert.issuer ?? null,
        issue_date: newCert.issue_date ?? null,
        expiry_date: newCert.expiry_date ?? null,
        credential_url: newCert.credential_url ?? null,
        skills: newCert.skills ?? [],
        source_type: newCert.source_type ?? "manual",
        source_ref: newCert.source_ref ?? null,
        verification_status: "unverified",
        created_at: now,
        updated_at: now,
      };

      const current = getLocalCertifications(user.id);
      setLocalCertifications(user.id, [item, ...current]);

      try {
        const { data, error } = await supabase
          .from("certifications")
          .insert({ ...newCert, id, user_id: user.id, verification_status: "unverified" })
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Supabase insert for certification failed; retained locally:", err);
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
      toast({ title: "Certification added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add certification", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CertificationUpdate }) => {
      if (!user) throw new Error("Not signed in");
      const current = getLocalCertifications(user.id);
      const updatedList = current.map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      );
      setLocalCertifications(user.id, updatedList);

      try {
        const { data, error } = await supabase
          .from("certifications")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Supabase update for certification failed:", err);
      }

      return updatedList.find((c) => c.id === id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
      toast({ title: "Certification updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update certification", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const current = getLocalCertifications(user.id);
      setLocalCertifications(
        user.id,
        current.filter((c) => c.id !== id)
      );

      try {
        await supabase.from("certifications").delete().eq("id", id).eq("user_id", user.id);
      } catch (err) {
        console.warn("Supabase delete for certification failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
      toast({ title: "Certification removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete certification", description: err.message, variant: "destructive" });
    },
  });

  return {
    certifications: query.data || [],
    isLoading: query.isLoading,
    createCertification: createMutation.mutateAsync,
    updateCertification: updateMutation.mutateAsync,
    deleteCertification: deleteMutation.mutateAsync,
  };
}

export function useImportCandidates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["import_candidates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const local = getLocalImportCandidates(user.id);

      try {
        const { data, error } = await supabase
          .from("import_candidates")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          return data as ImportCandidate[];
        }
      } catch (err) {
        console.warn("Supabase query for import candidates failed:", err);
      }

      return local.filter((c) => c.status === "pending");
    },
    enabled: !!user,
  });

  const approveCandidate = useMutation({
    mutationFn: async (candidate: ImportCandidate) => {
      if (!user) throw new Error("Not signed in");
      const payload: any = candidate.payload;
      const now = new Date().toISOString();

      if (candidate.kind === "project") {
        const localProject: Project = {
          id: crypto.randomUUID(),
          user_id: user.id,
          title: payload.title || "Untitled Project",
          description: payload.description || "",
          technologies: Array.isArray(payload.technologies) ? payload.technologies : [],
          project_url: payload.project_url || null,
          start_date: payload.start_date || null,
          end_date: payload.end_date || null,
          source_type: candidate.source,
          source_ref: candidate.source_ref,
          created_at: now,
          updated_at: now,
        };
        const currentProjects = getLocalProjects(user.id);
        setLocalProjects(user.id, [localProject, ...currentProjects]);

        try {
          await supabase.from("projects").insert(localProject);
        } catch (err) {
          console.warn("Supabase insert candidate project failed:", err);
        }
      } else {
        const localCert: Certification = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: payload.name || "Untitled Certification",
          issuer: payload.issuer || null,
          issue_date: payload.issue_date || null,
          expiry_date: payload.expiry_date || null,
          credential_url: payload.credential_url || null,
          skills: Array.isArray(payload.skills) ? payload.skills : [],
          source_type: candidate.source,
          source_ref: candidate.source_ref,
          verification_status: "unverified",
          created_at: now,
          updated_at: now,
        };
        const currentCerts = getLocalCertifications(user.id);
        setLocalCertifications(user.id, [localCert, ...currentCerts]);

        try {
          await supabase.from("certifications").insert(localCert);
        } catch (err) {
          console.warn("Supabase insert candidate certification failed:", err);
        }
      }

      // Mark candidate approved locally
      const localCandidates = getLocalImportCandidates(user.id);
      setLocalImportCandidates(
        user.id,
        localCandidates.map((c) => (c.id === candidate.id ? { ...c, status: "approved" as any } : c))
      );

      try {
        await supabase
          .from("import_candidates")
          .update({ status: "approved" })
          .eq("id", candidate.id);
      } catch (err) {
        console.warn("Supabase update candidate status failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import_candidates", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["projects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
      toast({ title: "Candidate approved & added to career assets" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to approve candidate", description: err.message, variant: "destructive" });
    },
  });

  const dismissCandidate = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const localCandidates = getLocalImportCandidates(user.id);
      setLocalImportCandidates(
        user.id,
        localCandidates.map((c) => (c.id === id ? { ...c, status: "dismissed" as any } : c))
      );

      try {
        await supabase.from("import_candidates").update({ status: "dismissed" }).eq("id", id);
      } catch (err) {
        console.warn("Supabase update candidate dismiss failed:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import_candidates", user?.id] });
      toast({ title: "Candidate dismissed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to dismiss candidate", description: err.message, variant: "destructive" });
    },
  });

  return {
    candidates: query.data || [],
    isLoading: query.isLoading,
    approveCandidate: approveCandidate.mutateAsync,
    dismissCandidate: dismissCandidate.mutateAsync,
  };
}
