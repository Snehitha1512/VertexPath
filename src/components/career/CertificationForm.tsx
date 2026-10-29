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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Loader2, ShieldAlert, Plus, AlertCircle, Sparkles } from "lucide-react";
import type { Certification, CertificationInsert } from "@/hooks/useCareerAssets";
import { validateSkillForCertification } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";

interface CertificationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CertificationInsert, "user_id">) => Promise<any>;
  initialData?: Certification | null;
}

export const CertificationForm: React.FC<CertificationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingSkill, setIsValidatingSkill] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setIssuer(initialData.issuer || "");
      setIssueDate(initialData.issue_date || "");
      setExpiryDate(initialData.expiry_date || "");
      setCredentialUrl(initialData.credential_url || "");
      setSkills(initialData.skills || []);
    } else {
      setName("");
      setIssuer("");
      setIssueDate("");
      setExpiryDate("");
      setCredentialUrl("");
      setSkills([]);
    }
    setSkillError(null);
  }, [initialData, isOpen]);

  const addSkillItem = async (skillValue: string) => {
    const trimmed = skillValue.trim().replace(/^,|,$/g, "");
    if (!trimmed) return;

    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput("");
      return;
    }

    if (!name.trim()) {
      setSkillError("Please enter the Certification Name first so skill relevance can be verified.");
      toast({
        title: "Certification Name Required",
        description: "Please enter the certification name before adding skills.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingSkill(true);
    setSkillError(null);

    try {
      const result = await validateSkillForCertification({
        certName: name,
        issuer,
        skill: trimmed,
      });

      if (!result.isValid) {
        const errorMsg =
          result.reason ||
          `"${trimmed}" does not appear to be relevant to "${name}". Please only add skills legitimately covered by this certification.`;
        setSkillError(errorMsg);
        toast({
          title: "Irrelevant Skill Rejected",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
      setSkillError(null);
    } catch (err: any) {
      console.warn("Skill validation error:", err);
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    } finally {
      setIsValidatingSkill(false);
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkillItem(skillInput);
    }
  };

  const handleSkillRemove = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Certification name is required", variant: "destructive" });
      return;
    }

    // Credential URL is mandatory
    let cleanUrl = credentialUrl.trim();
    if (!cleanUrl) {
      toast({
        title: "Credential URL is required",
        description: "Please provide a valid credential verification or badge link.",
        variant: "destructive",
      });
      return;
    }

    // Auto-prefix https:// if missing protocol
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // If pending input, try adding
    if (skillInput.trim()) {
      await addSkillItem(skillInput);
    }

    // Audit all skills
    if (skills.length > 0) {
      for (const s of skills) {
        const check = await validateSkillForCertification({ certName: name, issuer, skill: s });
        if (!check.isValid) {
          toast({
            title: "Irrelevant Skill Detected",
            description: check.reason || `Skill "${s}" does not belong to "${name}".`,
            variant: "destructive",
          });
          setSkillError(check.reason || `Skill "${s}" is irrelevant to "${name}".`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        issuer: issuer.trim() || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        credential_url: cleanUrl,
        skills,
        source_type: initialData?.source_type || "manual",
        verification_status: "unverified",
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
          <div className="flex items-center justify-between pr-4">
            <DialogTitle>{initialData ? "Edit Certification" : "Add Certification"}</DialogTitle>
            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Unverified
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cert-name">Certification Name *</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (skillError) setSkillError(null);
              }}
              placeholder="e.g. AWS Certified Solutions Architect - Associate"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cert-issuer">Issuer / Authority</Label>
            <Input
              id="cert-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g. Amazon Web Services, Google Cloud, Microsoft, Coursera"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cert-issue">Issue Date</Label>
              <Input
                id="cert-issue"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cert-expiry">Expiry Date (Optional)</Label>
              <Input
                id="cert-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cert-url">Credential URL / Verification Link *</Label>
            <Input
              id="cert-url"
              type="url"
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              placeholder="https://www.credly.com/badges/... or verification URL"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Required. Provide the public Credly badge URL or issuing certificate verification link.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cert-skills">
              Associated Skills
              <span className="text-xs text-muted-foreground ml-2">
                (Verified against certification curriculum)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="cert-skills"
                value={skillInput}
                onChange={(e) => {
                  setSkillInput(e.target.value);
                  if (skillError) setSkillError(null);
                }}
                onKeyDown={handleSkillKeyDown}
                placeholder="Type skill (e.g. Cloud Architecture, S3, IAM) and press Enter"
                disabled={isValidatingSkill}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSkillItem(skillInput)}
                disabled={!skillInput.trim() || isValidatingSkill}
                className="shrink-0"
              >
                {isValidatingSkill ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>

            {skillError && (
              <Alert variant="destructive" className="py-2 text-xs mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{skillError}</AlertDescription>
              </Alert>
            )}

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleSkillRemove(skill)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isValidatingSkill}
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
                "Save Certification"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
