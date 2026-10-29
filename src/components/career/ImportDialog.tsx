import React, { useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractFromText } from "@/lib/ai";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("csv");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");

  const stableHash = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  const upsertCandidateRecord = async (record: {
    kind: "project" | "certification";
    source: string;
    source_ref: string;
    payload: any;
  }) => {
    if (!user) return;
    const item = {
      id: crypto.randomUUID(),
      user_id: user.id,
      kind: record.kind,
      source: record.source,
      source_ref: record.source_ref,
      status: "pending",
      payload: record.payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save locally to guarantee offline / missing table resilience
    try {
      const raw = localStorage.getItem(`vertexpath_import_candidates_${user.id}`);
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(
        (c: any) => c.source_ref === record.source_ref && c.kind === record.kind
      );
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.unshift(item);
      }
      localStorage.setItem(`vertexpath_import_candidates_${user.id}`, JSON.stringify(list));
    } catch {}

    // Try Supabase
    try {
      await supabase.from("import_candidates").upsert(
        {
          user_id: user.id,
          kind: record.kind,
          source: record.source,
          source_ref: record.source_ref,
          status: "pending",
          payload: record.payload,
        },
        { onConflict: "user_id,kind,source,source_ref" }
      );
    } catch (err) {
      console.warn("Supabase import_candidates upsert failed (retained locally):", err);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsProcessing(true);
    setExtractedSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          if (!rows || rows.length === 0) {
            toast({ title: "CSV is empty", variant: "destructive" });
            setIsProcessing(false);
            return;
          }

          let addedProjects = 0;
          let addedCerts = 0;

          // Determine if it's Certifications or Projects from headers
          const firstRow = rows[0];
          const keys = Object.keys(firstRow).map((k) => k.toLowerCase());

          const isCertCsv = keys.some((k) => k.includes("name") || k.includes("authority") || k.includes("license"));
          const isProjectCsv = keys.some((k) => k.includes("title") || k.includes("project"));

          for (const row of rows) {
            // Find key by tolerant matching
            const findVal = (terms: string[]) => {
              for (const [key, val] of Object.entries(row)) {
                if (terms.some((t) => key.toLowerCase().includes(t))) {
                  return val?.trim();
                }
              }
              return undefined;
            };

            if (isProjectCsv || (!isCertCsv && findVal(["title", "project"]))) {
              const title = findVal(["title", "project", "name"]);
              if (!title) continue;
              const description = findVal(["description", "summary", "detail"]) || "";
              const url = findVal(["url", "link"]);
              const startDate = findVal(["started", "start"]);
              const endDate = findVal(["finished", "end"]);

              const sourceRef = `csv_${stableHash(`${title}_${url || ""}`)}`;

              await upsertCandidateRecord({
                kind: "project",
                source: "linkedin_export",
                source_ref: sourceRef,
                payload: {
                  title,
                  description,
                  technologies: [],
                  project_url: url || null,
                  start_date: startDate || null,
                  end_date: endDate || null,
                },
              });
              addedProjects++;
            } else {
              const name = findVal(["name", "certification", "title"]);
              if (!name) continue;
              const authority = findVal(["authority", "issuer", "organization"]);
              const url = findVal(["url", "link"]);
              const startDate = findVal(["started", "issue", "start"]);
              const endDate = findVal(["expires", "expiry", "end"]);

              const sourceRef = `csv_${stableHash(`${name}_${authority || ""}`)}`;

              await upsertCandidateRecord({
                kind: "certification",
                source: "linkedin_export",
                source_ref: sourceRef,
                payload: {
                  name,
                  issuer: authority || null,
                  issue_date: startDate || null,
                  expiry_date: endDate || null,
                  credential_url: url || null,
                  skills: [],
                },
              });
              addedCerts++;
            }
          }

          queryClient.invalidateQueries({ queryKey: ["import_candidates", user.id] });
          setExtractedSummary(
            `Imported ${addedProjects} project(s) and ${addedCerts} certification(s) to your review queue!`
          );
          toast({ title: "Import successful", description: "Review and approve items in the review queue." });
        } catch (err: any) {
          toast({ title: "CSV Parsing failed", description: err.message, variant: "destructive" });
        } finally {
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setIsProcessing(false);
        toast({ title: "Failed to read CSV", description: err.message, variant: "destructive" });
      },
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsProcessing(true);
    setExtractedSummary(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }

      await processExtractedText(fullText, "profile_pdf");
    } catch (err: any) {
      toast({ title: "PDF Extraction failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteProcess = async () => {
    if (!pastedText.trim() || !user) return;
    setIsProcessing(true);
    setExtractedSummary(null);
    try {
      await processExtractedText(pastedText, "resume");
    } catch (err: any) {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const processExtractedText = async (text: string, source: "profile_pdf" | "resume") => {
    if (!user) return;

    const data = await extractFromText(text);

    let projCount = 0;
    let certCount = 0;

    for (const proj of data.projects || []) {
      if (!proj.title) continue;
      const ref = `ai_${stableHash(proj.title)}`;
      await upsertCandidateRecord({
        kind: "project",
        source,
        source_ref: ref,
        payload: {
          title: proj.title,
          description: proj.description || "",
          technologies: proj.technologies || [],
          project_url: proj.project_url || null,
        },
      });
      projCount++;
    }

    for (const cert of data.certifications || []) {
      if (!cert.name) continue;
      const ref = `ai_${stableHash(cert.name)}`;
      await upsertCandidateRecord({
        kind: "certification",
        source,
        source_ref: ref,
        payload: {
          name: cert.name,
          issuer: cert.issuer || null,
          issue_date: cert.issue_date || null,
          credential_url: cert.credential_url || null,
          skills: [],
        },
      });
      certCount++;
    }

    queryClient.invalidateQueries({ queryKey: ["import_candidates", user.id] });
    setExtractedSummary(
      `Extracted ${projCount} project(s) and ${certCount} certification(s) to your review queue!`
    );
    toast({ title: "Extraction Complete", description: "All extracted items are ready in your review queue." });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Import Career Assets</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="csv">LinkedIn CSV</TabsTrigger>
            <TabsTrigger value="pdf">Resume / PDF</TabsTrigger>
            <TabsTrigger value="text">Paste Text</TabsTrigger>
          </TabsList>

          {/* TAB 1: LinkedIn CSV */}
          <TabsContent value="csv" className="space-y-4 pt-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium text-foreground">Official LinkedIn Data Export Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                <li>Go to LinkedIn → <strong>Settings & Privacy</strong></li>
                <li>Select <strong>Data Privacy</strong> → <em>Get a copy of your data</em></li>
                <li>Choose "Certifications" or "Projects" and download the CSV archive</li>
                <li>Upload <code>Certifications.csv</code> or <code>Projects.csv</code> below</li>
              </ol>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <Label htmlFor="csv-file-input" className="cursor-pointer text-primary hover:underline">
                  Choose CSV File
                </Label>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </div>
              <p className="text-xs text-muted-foreground">Uploads are parsed client-side and never sent to third-party scrapers.</p>
            </div>
          </TabsContent>

          {/* TAB 2: PDF Extraction */}
          <TabsContent value="pdf" className="space-y-4 pt-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium text-foreground">Resume or LinkedIn "Save to PDF":</p>
              <p className="text-xs text-muted-foreground">
                You can use LinkedIn's <strong>"More" → "Save to PDF"</strong> profile export or any resume PDF. Text is extracted securely and structured via Gemini LLM.
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <Label htmlFor="pdf-file-input" className="cursor-pointer text-primary hover:underline">
                  Choose PDF Resume
                </Label>
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </div>
              <p className="text-xs text-muted-foreground">Supports LinkedIn PDF exports and standard text PDFs.</p>
            </div>
          </TabsContent>

          {/* TAB 3: Paste Text */}
          <TabsContent value="text" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="paste-area">Paste Resume or Profile Text</Label>
              <Textarea
                id="paste-area"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the text from your resume or LinkedIn profile here..."
                rows={6}
              />
            </div>
            <Button
              onClick={handlePasteProcess}
              disabled={isProcessing || !pastedText.trim()}
              className="w-full"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extract Career Data with Gemini
            </Button>
          </TabsContent>
        </Tabs>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-4 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Extracting career assets with Gemini AI...</span>
          </div>
        )}

        {extractedSummary && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{extractedSummary}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

