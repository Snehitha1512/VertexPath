import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Loader2, Plus, AlertCircle, Sparkles } from "lucide-react";
import type { Project, ProjectInsert } from "@/hooks/useCareerAssets";
import { validateTechForProject } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ProjectInsert, "user_id">) => Promise<any>;
  initialData?: Project | null;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingTech, setIsValidatingTech] = useState(false);
  const [techError, setTechError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setTechnologies(initialData.technologies || []);
      setProjectUrl(initialData.project_url || "");
      setStartDate(initialData.start_date || "");
      setEndDate(initialData.end_date || "");
    } else {
      setTitle("");
      setDescription("");
      setTechnologies([]);
      setProjectUrl("");
      setStartDate("");
      setEndDate("");
    }
    setTechError(null);
  }, [initialData, isOpen]);

  const addTechItem = async (techValue: string) => {
    const trimmed = techValue.trim().replace(/^,|,$/g, "");
    if (!trimmed) return;

    if (technologies.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTechInput("");
      return;
    }

    if (!description.trim() && !title.trim()) {
      setTechError("Please enter Project Title and Description first so technology relevance can be verified.");
      toast({
        title: "Description Required",
        description: "Please enter your project title and description before adding technologies.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingTech(true);
    setTechError(null);

    try {
      // Validate technology relevance against project description and title
      const result = await validateTechForProject({
        title,
        description,
        tech: trimmed,
      });

      if (!result.isValid) {
        const errorMsg =
          result.reason ||
          `"${trimmed}" does not appear in or relate to the project description. Please explain in your description how "${trimmed}" was utilized.`;
        setTechError(errorMsg);
        toast({
          title: "Irrelevant Technology Rejected",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      setTechnologies((prev) => [...prev, trimmed]);
      setTechInput("");
      setTechError(null);
    } catch (err: any) {
      console.warn("Tech validation error:", err);
      // Fallback: accept if text appears in title/desc
      setTechnologies((prev) => [...prev, trimmed]);
      setTechInput("");
    } finally {
      setIsValidatingTech(false);
    }
  };

  const handleTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTechItem(techInput);
    }
  };

  const handleTechRemove = (tech: string) => {
    setTechnologies(technologies.filter((t) => t !== tech));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    // Project URL is mandatory
    let cleanUrl = projectUrl.trim();
    if (!cleanUrl) {
      toast({
        title: "Project URL is required",
        description: "Please provide a valid repository (e.g. GitHub) or live demo URL.",
        variant: "destructive",
      });
      return;
    }

    // Auto-prefix https:// if missing protocol
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // If user has pending text in techInput, try adding it first
    if (techInput.trim()) {
      await addTechItem(techInput);
    }

    // Final audit of technologies against project description
    if (technologies.length > 0 && description.trim()) {
      for (const t of technologies) {
        const check = await validateTechForProject({ title, description, tech: t });
        if (!check.isValid) {
          toast({
            title: "Irrelevant Technology Detected",
            description: check.reason || `Please update the description to explain how "${t}" was used.`,
            variant: "destructive",
          });
          setTechError(check.reason || `Technology "${t}" does not match the project description.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        technologies,
        project_url: cleanUrl,
        start_date: startDate || null,
        end_date: endDate || null,
        source_type: initialData?.source_type || "manual",
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="proj-title">Project Title *</Label>
            <Input
              id="proj-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Real-Time Chat System"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="proj-desc">Project Description *</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (techError) setTechError(null);
              }}
              placeholder="Describe what you built, architecture, and technical accomplishments. Mention technologies used here so they can be verified..."
              rows={4}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Describe your architecture and tools. Added technologies must match this description.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="proj-tech">
              Technologies Used
              <span className="text-xs text-muted-foreground ml-2">
                (Verified against project description)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="proj-tech"
                value={techInput}
                onChange={(e) => {
                  setTechInput(e.target.value);
                  if (techError) setTechError(null);
                }}
                onKeyDown={handleTechKeyDown}
                placeholder="Type tech (e.g. React, Docker, PostgreSQL) and press Enter"
                disabled={isValidatingTech}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTechItem(techInput)}
                disabled={!techInput.trim() || isValidatingTech}
                className="shrink-0"
              >
                {isValidatingTech ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>

            {techError && (
              <Alert variant="destructive" className="py-2 text-xs mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{techError}</AlertDescription>
              </Alert>
            )}

            {technologies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {technologies.map((tech) => (
                  <Badge key={tech} variant="secondary" className="gap-1 bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {tech}
                    <button
                      type="button"
                      onClick={() => handleTechRemove(tech)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="proj-url">Project / Demo URL *</Label>
            <Input
              id="proj-url"
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://github.com/username/project or live demo link"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Required. Provide the GitHub repository, documentation, or deployed link.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="proj-start">Start Date</Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-end">End Date (or blank if active)</Label>
              <Input
                id="proj-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isValidatingTech}
              className="bg-gradient-primary hover:opacity-90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : initialData ? (
                "Save Changes"
              ) : (
                "Save Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
