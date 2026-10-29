import React, { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { rewriteDescription, RewriteResult } from "@/lib/ai";
import { Sparkles, Check, ArrowRight, Loader2, HelpCircle } from "lucide-react";
import type { ResumeItem } from "@/lib/resume/types";

interface ResumeItemEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ResumeItem | null;
  targetRole: string;
  onSave: (updatedItem: ResumeItem) => void;
}

export const ResumeItemEditDialog: React.FC<ResumeItemEditDialogProps> = ({
  isOpen,
  onClose,
  item,
  targetRole,
  onSave,
}) => {
  if (!item) return null;

  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle || "");
  const [bulletsText, setBulletsText] = useState((item.bullets || []).join("\n"));
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<RewriteResult | null>(null);

  const handleAiAction = async (
    mode: "shorter" | "longer" | "technical" | "achievement" | "role_focus"
  ) => {
    setIsAiLoading(true);
    setAiProposal(null);
    try {
      const textToRewrite = bulletsText.trim() || title;
      const res = await rewriteDescription({
        text: textToRewrite,
        mode,
        target_role: targetRole,
        tech: subtitle ? subtitle.split(",").map((s) => s.trim()) : [],
      });
      setAiProposal(res);
    } catch (err: any) {
      toast({
        title: "AI Rewrite Error",
        description: err.message || "Failed to generate AI rewrite",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiProposal = () => {
    if (!aiProposal) return;
    setBulletsText(aiProposal.bullets.join("\n"));
    setAiProposal(null);
    toast({ title: "Applied AI proposal to description" });
  };

  const handleSave = () => {
    const bullets = bulletsText
      .split("\n")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    onSave({
      ...item,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      bullets,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Resume Entry: <span className="text-primary">{item.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-subtitle">Subtitle / Technologies</Label>
              <Input
                id="edit-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="React, Node.js, AWS"
              />
            </div>
          </div>

          {/* BULLETS TEXTAREA */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="edit-bullets">Bullet Points (one per line)</Label>
              <span className="text-xs text-muted-foreground">Resume snapshot copy only</span>
            </div>
            <Textarea
              id="edit-bullets"
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
              rows={5}
              placeholder="Architected and deployed microservices..."
            />
          </div>

          {/* AI ASSIST ACTION BUTTONS */}
          <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Gemini AI Rewriting
              </span>
              <span className="text-[11px] text-muted-foreground">Target Role: {targetRole || "General"}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAiLoading}
                onClick={() => handleAiAction("shorter")}
                className="text-xs h-7"
              >
                Shorter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAiLoading}
                onClick={() => handleAiAction("longer")}
                className="text-xs h-7"
              >
                Longer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAiLoading}
                onClick={() => handleAiAction("technical")}
                className="text-xs h-7"
              >
                More Technical
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAiLoading}
                onClick={() => handleAiAction("achievement")}
                className="text-xs h-7"
              >
                Achievement Bullets
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAiLoading}
                onClick={() => handleAiAction("role_focus")}
                className="text-xs h-7"
              >
                Focus on Role
              </Button>
            </div>
          </div>

          {/* AI LOADING */}
          {isAiLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-primary text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Gemini is tailoring bullets without inventing facts...</span>
            </div>
          )}

          {/* PROPOSED VS CURRENT PANEL */}
          {aiProposal && (
            <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Proposed Bullets
                </span>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7 gap-1"
                  onClick={handleApplyAiProposal}
                >
                  <Check className="h-3 w-3" />
                  Accept Proposal
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-card p-3 rounded border">
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Current:</p>
                  <p className="whitespace-pre-line text-foreground/70">{bulletsText || "(empty)"}</p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-1">Proposed:</p>
                  <ul className="list-disc pl-4 space-y-1 text-foreground">
                    {aiProposal.bullets.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {aiProposal.missing_info && aiProposal.missing_info.length > 0 && (
                <div className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded flex items-start gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Strengthen this entry by answering:</span>
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-amber-400">
                      {aiProposal.missing_info.map((q, qIdx) => (
                        <li key={qIdx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save to Resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

