import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { extractFromText, getGeminiApiKey, setGeminiApiKey } from "@/lib/ai";
import { Upload, FileText, Globe, Loader2, CheckCircle2, Sparkles, ArrowLeft, KeyRound } from "lucide-react";

interface UploadFormProps {
  initialMethod?: "file" | "linkedin" | "text";
  onBack?: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ initialMethod = "file", onBack }) => {
  const { user } = useAuth();
  const [uploadMethod, setUploadMethod] = useState<"file" | "linkedin" | "text">(initialMethod);
  const [file, setFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedStats, setExtractedStats] = useState<{ projects: number; certs: number; skills: number } | null>(null);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [customKey, setCustomKey] = useState(getGeminiApiKey());

  const handleSaveCustomKey = () => {
    if (customKey.trim()) {
      setGeminiApiKey(customKey.trim());
      toast({ title: "Gemini API Key updated!", description: "Key stored securely for this browser session." });
      setIsKeyDialogOpen(false);
    }
  };

  useEffect(() => {
    if (initialMethod) {
      setUploadMethod(initialMethod);
    }
  }, [initialMethod]);

  const stableHash = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf") || droppedFile.type === "text/plain") {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or text file",
          variant: "destructive",
        });
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const extractTextFromPdf = async (fileObj: File): Promise<string> => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
      }
      const arrayBuffer = await fileObj.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    } catch (err) {
      console.warn("pdfjs-dist extraction failed, falling back to basic reader:", err);
      // Fallback: try reading as text
      return await fileObj.text();
    }
  };

  const processTextWithGemini = async (text: string) => {
    if (!user) return;
    const data = await extractFromText(text);

    let projCount = 0;
    let certCount = 0;

    // Cache locally
    const localProjectsKey = `vertexpath_projects_${user.id}`;
    const localCertsKey = `vertexpath_certifications_${user.id}`;
    const existingProjects = JSON.parse(localStorage.getItem(localProjectsKey) || "[]");
    const existingCerts = JSON.parse(localStorage.getItem(localCertsKey) || "[]");

    for (const proj of data.projects || []) {
      if (!proj.title) continue;
      const ref = `ai_${stableHash(proj.title)}`;
      const newProj = {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: proj.title,
        description: proj.description || "",
        technologies: proj.technologies || [],
        project_url: proj.project_url || "https://github.com",
        source_type: "resume",
        source_ref: ref,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      existingProjects.push(newProj);
      projCount++;

      // Try inserting into Supabase
      try {
        await supabase.from("projects").insert(newProj);
      } catch {}
    }

    for (const cert of data.certifications || []) {
      if (!cert.name) continue;
      const ref = `ai_${stableHash(cert.name)}`;
      const newCert = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: cert.name,
        issuer: cert.issuer || "Verified Issuer",
        issue_date: cert.issue_date || null,
        credential_url: cert.credential_url || "https://credential.net",
        skills: cert.skills || [],
        source_type: "resume",
        source_ref: ref,
        verification_status: "unverified",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      existingCerts.push(newCert);
      certCount++;

      // Try inserting into Supabase
      try {
        await supabase.from("certifications").insert(newCert);
      } catch {}
    }

    localStorage.setItem(localProjectsKey, JSON.stringify(existingProjects));
    localStorage.setItem(localCertsKey, JSON.stringify(existingCerts));

    // Update profile skills
    if (data.skills && data.skills.length > 0) {
      const profileKey = `vertexpath_profile_${user.id}`;
      const profile = JSON.parse(localStorage.getItem(profileKey) || "{}");
      const existing = profile.skills ? profile.skills.split(",").map((s: string) => s.trim()) : [];
      const merged = Array.from(new Set([...existing, ...data.skills])).join(", ");
      const updatedProfile = { ...profile, id: user.id, skills: merged };
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      try {
        await supabase.from("profiles").update({ skills: merged }).eq("id", user.id);
      } catch {}
    }

    setExtractedStats({
      projects: projCount,
      certs: certCount,
      skills: data.skills?.length || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please sign in first" });
      return;
    }

    setIsProcessing(true);
    setExtractedStats(null);

    try {
      if (uploadMethod === "file" && file) {
        const text = await extractTextFromPdf(file);
        if (!text.trim()) {
          throw new Error("Could not extract readable text from this file. Please paste text directly.");
        }
        await processTextWithGemini(text);
      } else if (uploadMethod === "text" && resumeText) {
        await processTextWithGemini(resumeText);
      } else if (uploadMethod === "linkedin" && linkedinUrl) {
        const profileKey = `vertexpath_profile_${user.id}`;
        const profile = JSON.parse(localStorage.getItem(profileKey) || "{}");
        localStorage.setItem(profileKey, JSON.stringify({ ...profile, linkedin_url: linkedinUrl }));
        try {
          await supabase.from("profiles").update({ linkedin_url: linkedinUrl }).eq("id", user.id);
        } catch {}
        toast({ title: "LinkedIn URL saved to your profile!" });
        setTimeout(() => {
          window.location.hash = "career";
        }, 800);
        return;
      }

      toast({
        title: "Resume parsed successfully with Gemini AI!",
        description: "Items are staged in your Career Assets and Profile.",
      });
    } catch (error: any) {
      toast({
        title: "Processing error",
        description: error.message || "Please check your file or paste resume text directly.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-dark pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-300 hover:text-white mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        )}

        <div className="text-center mb-10">
          <Badge variant="outline" className="text-primary border-primary/40 mb-3 inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Gemini AI Parser
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Upload & Analyze Your Career Assets
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto">
            Extract projects, certifications, and skills into your verified portfolio with zero manual typing.
          </p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm text-white shadow-xl">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="text-lg">Select Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant={uploadMethod === "file" ? "default" : "outline"}
                onClick={() => setUploadMethod("file")}
                className={`flex-1 ${uploadMethod === "file" ? "bg-gradient-primary text-white" : "border-white/20 text-white hover:bg-white/10"}`}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF Resume
              </Button>
              <Button
                type="button"
                variant={uploadMethod === "linkedin" ? "default" : "outline"}
                onClick={() => setUploadMethod("linkedin")}
                className={`flex-1 ${uploadMethod === "linkedin" ? "bg-gradient-primary text-white" : "border-white/20 text-white hover:bg-white/10"}`}
              >
                <Globe className="mr-2 h-4 w-4" />
                Paste LinkedIn URL
              </Button>
              <Button
                type="button"
                variant={uploadMethod === "text" ? "default" : "outline"}
                onClick={() => setUploadMethod("text")}
                className={`flex-1 ${uploadMethod === "text" ? "bg-gradient-primary text-white" : "border-white/20 text-white hover:bg-white/10"}`}
              >
                <FileText className="mr-2 h-4 w-4" />
                Paste Text
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              {uploadMethod === "file" && (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver 
                      ? "border-primary bg-primary/5" 
                      : "border-white/20 hover:border-white/40"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 text-primary mx-auto" />
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-gray-400 text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="mt-2 text-white border-white/20 hover:bg-white/10"
                      >
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-white mb-1">
                          Drop your resume PDF here, or click to browse
                        </p>
                        <p className="text-gray-400 text-sm">
                          LinkedIn "Save to PDF" or standard PDF resumes
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <Label
                        htmlFor="file-upload"
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        Browse Files
                      </Label>
                    </div>
                  )}
                </div>
              )}

              {/* LinkedIn URL */}
              {uploadMethod === "linkedin" && (
                <div className="space-y-3">
                  <Label htmlFor="linkedin" className="text-white">
                    LinkedIn Profile URL
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Your LinkedIn profile link will be attached to your resume header. For full project & certification import, you can also use PDF upload or LinkedIn CSV export in Career Assets.
                  </p>
                </div>
              )}

              {/* Text Input */}
              {uploadMethod === "text" && (
                <div className="space-y-3">
                  <Label htmlFor="resume-text" className="text-white">
                    Paste Your Resume / Experience Text
                  </Label>
                  <Textarea
                    id="resume-text"
                    placeholder="Paste the text from your resume, projects, and credentials here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[180px]"
                    required
                  />
                </div>
              )}

              {/* SUCCESS RESULTS BOX */}
              {extractedStats && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Extraction Complete!</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Extracted <strong>{extractedStats.projects}</strong> project(s), <strong>{extractedStats.certs}</strong> certification(s), and <strong>{extractedStats.skills}</strong> skill(s).
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      onClick={() => (window.location.hash = "career")}
                    >
                      View in Career Assets
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white text-xs hover:bg-white/10"
                      onClick={() => (window.location.hash = "roadmap")}
                    >
                      View Roadmap
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={
                  isProcessing || 
                  (uploadMethod === "file" && !file) ||
                  (uploadMethod === "linkedin" && !linkedinUrl) ||
                  (uploadMethod === "text" && !resumeText)
                }
                className="w-full bg-gradient-primary hover:opacity-90 text-white py-3"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting structured data with Gemini AI...
                  </>
                ) : uploadMethod === "linkedin" ? (
                  "Save LinkedIn Profile"
                ) : (
                  "Process with Gemini AI"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default UploadForm;
