import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generatePersonalizedRoadmap, RoadmapPath } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Circle, 
  Play, 
  ChevronRight, 
  Target, 
  Sparkles, 
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  target_job: string;
  skills: string;
  experience_years: string;
  industry: string;
  education_level: string;
  education_detail: string;
  bio: string;
}

const DEFAULT_FALLBACK_PATHS: RoadmapPath[] = [
  {
    level: 1,
    title: "Foundation Building",
    description: "Master the fundamental principles and core syntax",
    duration: "4-6 weeks",
    skills: ["Programming Fundamentals", "Data Structures", "Version Control"],
    courses: [
      {
        title: "Modern Core Fundamentals",
        provider: "FreeCodeCamp / Coursera",
        duration: "20 hours",
        difficulty: "Beginner",
        completed: false,
        progress: 0,
      },
      {
        title: "Git, GitHub & Collaborative Workflow",
        provider: "GitHub Learning",
        duration: "8 hours",
        difficulty: "Beginner",
        completed: false,
        progress: 0,
      },
    ],
    progress: 0,
    completed: false,
  },
  {
    level: 2,
    title: "Framework & Architecture Mastery",
    description: "Build scalable applications with industry-standard stacks",
    duration: "6-8 weeks",
    skills: ["Core Frameworks", "REST / GraphQL APIs", "Database Design"],
    courses: [
      {
        title: "Full-Stack Application Development",
        provider: "Udemy / edX",
        duration: "35 hours",
        difficulty: "Intermediate",
        completed: false,
        progress: 0,
      },
      {
        title: "Relational & Document Databases",
        provider: "Coursera",
        duration: "18 hours",
        difficulty: "Intermediate",
        completed: false,
        progress: 0,
      },
    ],
    progress: 0,
    completed: false,
  },
  {
    level: 3,
    title: "System Design & DevOps",
    description: "Cloud deployment, containerization, and distributed reliability",
    duration: "8-10 weeks",
    skills: ["Cloud Architecture", "Docker & Kubernetes", "CI/CD Pipelines"],
    courses: [
      {
        title: "Cloud Infrastructure Architecture",
        provider: "AWS / Google Cloud Training",
        duration: "30 hours",
        difficulty: "Advanced",
        completed: false,
        progress: 0,
      },
      {
        title: "Container Orchestration & Microservices",
        provider: "Linux Foundation",
        duration: "22 hours",
        difficulty: "Advanced",
        completed: false,
        progress: 0,
      },
    ],
    progress: 0,
    completed: false,
  },
  {
    level: 4,
    title: "Specialization & Production Leadership",
    description: "Deep dive into production scale, security, and specialized mastery",
    duration: "6-8 weeks",
    skills: ["Performance Optimization", "Security Best Practices", "Production Observability"],
    courses: [
      {
        title: "High-Throughput Systems Engineering",
        provider: "Industry Masterclass",
        duration: "25 hours",
        difficulty: "Advanced",
        completed: false,
        progress: 0,
      },
    ],
    progress: 0,
    completed: false,
  },
];

const PersonalizedRoadmap: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [learningPaths, setLearningPaths] = useState<RoadmapPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let profileData: any = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) profileData = data;
      } catch {
        // ignore
      }

      if (!profileData) {
        const cached = localStorage.getItem(`vertexpath_profile_${user.id}`);
        if (cached) {
          try {
            profileData = JSON.parse(cached);
          } catch {
            // ignore
          }
        }
      }

      setProfile(profileData);

      const hasTargetJob = Boolean(profileData?.target_job && profileData.target_job.trim().length > 0);
      const hasSkills = Boolean(profileData?.skills && profileData.skills.trim().length > 0);

      if (hasTargetJob && hasSkills) {
        await loadRoadmapForProfile(profileData);
      } else {
        setLearningPaths([]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmapForProfile = async (profileData: Profile) => {
    // Check local cached roadmap first
    if (user) {
      const cachedRoadmap = localStorage.getItem(`vertexpath_roadmap_${user.id}`);
      if (cachedRoadmap) {
        try {
          const parsed = JSON.parse(cachedRoadmap);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLearningPaths(parsed);
            recalcProgress(parsed);
            return;
          }
        } catch {}
      }
    }

    // Check if we have existing stored roadmap entries in database
    try {
      const { data: existingEntries } = await supabase
        .from("roadmap_entries")
        .select("*")
        .eq("user_id", user?.id || "")
        .order("created_at", { ascending: true });

      if (existingEntries && existingEntries.length > 0) {
        // Reconstruct roadmap from entries
        const reconstructed: RoadmapPath[] = DEFAULT_FALLBACK_PATHS.map((p, idx) => {
          const matchingEntries = existingEntries.filter((e) =>
            e.skill_tag?.startsWith(`level-${idx + 1}`)
          );
          if (matchingEntries.length > 0) {
            const completedCount = matchingEntries.filter((e) => e.status === "completed").length;
            const prog = Math.round((completedCount / matchingEntries.length) * 100);
            return {
              ...p,
              courses: matchingEntries.map((e) => ({
                title: e.title || "Course",
                provider: "VertexPath Curated",
                duration: "10-20 hours",
                difficulty: (idx === 0 ? "Beginner" : idx === 1 ? "Intermediate" : "Advanced") as any,
                completed: e.status === "completed",
                progress: e.status === "completed" ? 100 : 0,
              })),
              progress: prog,
              completed: prog === 100,
            };
          }
          return p;
        });

        setLearningPaths(reconstructed);
        recalcProgress(reconstructed);
        if (user) {
          localStorage.setItem(`vertexpath_roadmap_${user.id}`, JSON.stringify(reconstructed));
        }
        return;
      }
    } catch {}

    // Generate dynamically with Gemini
    await generateWithGemini(profileData);
  };

  const generateWithGemini = async (profileData: Profile) => {
    setIsGeneratingAi(true);
    try {
      const paths = await generatePersonalizedRoadmap(profileData);
      const finalPaths = paths && paths.length > 0 ? paths : DEFAULT_FALLBACK_PATHS;
      setLearningPaths(finalPaths);
      recalcProgress(finalPaths);

      // Persist generated courses into roadmap_entries table and localStorage
      if (user) {
        localStorage.setItem(`vertexpath_roadmap_${user.id}`, JSON.stringify(finalPaths));
        try {
          // Clear old auto-generated entries
          await supabase.from("roadmap_entries").delete().eq("user_id", user.id);

          const entriesToInsert: any[] = [];
          finalPaths.forEach((path, pIdx) => {
            path.courses.forEach((c) => {
              entriesToInsert.push({
                user_id: user.id,
                title: c.title,
                description: `Level ${path.level}: ${path.title} — ${path.description}`,
                skill_tag: `level-${pIdx + 1}`,
                status: c.completed ? "completed" : "planned",
                start_date: new Date().toISOString().slice(0, 10),
              });
            });
          });

          if (entriesToInsert.length > 0) {
            await supabase.from("roadmap_entries").insert(entriesToInsert);
          }
        } catch (dbErr) {
          console.warn("Could not save to roadmap_entries table, kept in local storage:", dbErr);
        }
      }

      toast({ title: "Roadmap personalized with Gemini AI!" });
    } catch (err: any) {
      console.warn("Gemini roadmap generation failed, using standard adaptive paths:", err);
      setLearningPaths(DEFAULT_FALLBACK_PATHS);
      recalcProgress(DEFAULT_FALLBACK_PATHS);
      if (user) {
        localStorage.setItem(`vertexpath_roadmap_${user.id}`, JSON.stringify(DEFAULT_FALLBACK_PATHS));
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const recalcProgress = (paths: RoadmapPath[]) => {
    if (!paths.length) return;
    const totalProg = paths.reduce((sum, p) => sum + p.progress, 0);
    const avg = Math.round(totalProg / paths.length);
    setOverallProgress(avg);

    const activeIdx = paths.findIndex((p) => !p.completed && p.progress < 100);
    setActiveStep(activeIdx === -1 ? paths.length - 1 : activeIdx);
  };

  const toggleCourseStatus = async (levelIndex: number, courseIndex: number) => {
    const updatedPaths = [...learningPaths];
    const targetPath = updatedPaths[levelIndex];
    const targetCourse = targetPath.courses[courseIndex];

    targetCourse.completed = !targetCourse.completed;
    targetCourse.progress = targetCourse.completed ? 100 : 0;

    // Recalculate level progress
    const completedCount = targetPath.courses.filter((c) => c.completed).length;
    targetPath.progress = Math.round((completedCount / targetPath.courses.length) * 100);
    targetPath.completed = targetPath.progress === 100;

    setLearningPaths(updatedPaths);
    recalcProgress(updatedPaths);

    // Sync with Supabase roadmap_entries & local storage
    if (user) {
      localStorage.setItem(`vertexpath_roadmap_${user.id}`, JSON.stringify(updatedPaths));
      try {
        await supabase
          .from("roadmap_entries")
          .update({
            status: targetCourse.completed ? "completed" : "planned",
            end_date: targetCourse.completed ? new Date().toISOString().slice(0, 10) : null,
          })
          .eq("user_id", user.id)
          .eq("title", targetCourse.title);
      } catch {}
    }

    toast({
      title: targetCourse.completed ? "Marked Complete!" : "Marked In Progress",
    });
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-dark pt-16 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading your personalized roadmap...
        </div>
      </section>
    );
  }

  const isProfileComplete = Boolean(
    profile &&
    profile.target_job &&
    profile.target_job.trim().length > 0 &&
    profile.skills &&
    profile.skills.trim().length > 0
  );

  if (!isProfileComplete) {
    return (
      <section className="min-h-screen bg-gradient-dark pt-16 flex items-center justify-center px-4">
        <Card className="bg-white/5 border border-white/10 text-center py-16 px-8 max-w-lg mx-auto rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            Profile Setup Required
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Your Roadmap is Empty
          </h2>
          <p className="text-gray-300 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            You skipped or haven't finished specifying your <strong className="text-white">Target Job Title</strong> and <strong className="text-white">Skill Set</strong>. Complete them in your profile so Gemini AI can construct your personalized milestone learning roadmap.
          </p>
          <Button
            onClick={() => (window.location.hash = "profile")}
            className="bg-gradient-primary hover:opacity-90 text-white font-medium px-6 h-11"
          >
            Complete Target Job & Skills
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-dark pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-primary border-primary/40 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Gemini LLM Powered
              </Badge>
              <span className="text-xs text-gray-400">Target Role:</span>
              <span className="text-sm font-semibold text-white">{profile.target_job || "Full-Stack Engineer"}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              Your Personalized Learning Roadmap
            </h1>
            <p className="text-gray-300 text-base max-w-2xl mt-1">
              Curated milestone path designed by Gemini AI based on your background and target career objectives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={isGeneratingAi}
              onClick={() => generateWithGemini(profile)}
              className="border-white/20 text-white hover:bg-white/10 gap-2"
            >
              {isGeneratingAi ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <RefreshCw className="h-4 w-4 text-primary" />
              )}
              Regenerate with Gemini
            </Button>
          </div>
        </div>

        {/* OVERALL PROGRESS CARD */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-300">Curriculum Completion Progress</span>
              <span className="text-lg font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {learningPaths.reduce((acc, p) => acc + p.courses.filter((c) => c.completed).length, 0)}
              </div>
              <div className="text-xs text-gray-400">Courses Finished</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {learningPaths.filter((p) => p.completed).length} / {learningPaths.length}
              </div>
              <div className="text-xs text-gray-400">Milestones Mastered</div>
            </div>
          </div>
        </div>

        {/* TIMELINE STEPS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {learningPaths.map((path, index) => {
            const isActive = index === activeStep;
            const isCompleted = path.completed || path.progress === 100;
            const isPrevious = index < activeStep;

            return (
              <Card
                key={index}
                onClick={() => setActiveStep(index)}
                className={cn(
                  "cursor-pointer bg-white/5 border-white/10 backdrop-blur transition-all duration-300 hover:bg-white/10 text-white",
                  isActive && "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-primary text-white"
                          : "bg-gray-700 text-gray-400"
                      )}
                    >
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : path.level}
                    </div>
                    <Badge variant="outline" className="text-[10px] text-gray-400 border-white/10">
                      {path.duration}
                    </Badge>
                  </div>

                  <CardTitle className="text-base text-white">{path.title}</CardTitle>
                  <p className="text-xs text-gray-400 line-clamp-2">{path.description}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Progress</span>
                      <span className="text-primary font-medium">{path.progress}%</span>
                    </div>
                    <Progress value={path.progress} className="h-1.5" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {path.skills.slice(0, 3).map((s, sIdx) => (
                      <Badge key={sIdx} variant="secondary" className="text-[10px] bg-primary/20 text-white border-primary/30">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ACTIVE STAGE DETAIL & COURSES */}
        {learningPaths[activeStep] && (
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white">
                      Stage {learningPaths[activeStep].level} of {learningPaths.length}
                    </Badge>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Estimated Duration: {learningPaths[activeStep].duration}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold text-white">
                    {learningPaths[activeStep].title}
                  </CardTitle>
                  <p className="text-sm text-gray-300">
                    {learningPaths[activeStep].description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {learningPaths[activeStep].skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-primary/40 text-primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Recommended Courses & Milestones ({learningPaths[activeStep].courses.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {learningPaths[activeStep].courses.map((course, cIdx) => (
                  <Card
                    key={cIdx}
                    className={cn(
                      "bg-white/5 border-white/10 text-white transition-colors",
                      course.completed && "border-green-500/40 bg-green-500/5"
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm leading-snug">{course.title}</h4>
                        {course.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Platform:</span>
                          <span className="text-primary font-medium">{course.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Difficulty:</span>
                          <span className="text-gray-300">{course.difficulty}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className={cn(
                          "w-full text-xs font-medium gap-1",
                          course.completed
                            ? "border border-green-500/40 text-green-400 hover:bg-green-500/10 bg-transparent"
                            : "bg-primary hover:bg-primary/90 text-white"
                        )}
                        onClick={() => toggleCourseStatus(activeStep, cIdx)}
                      >
                        {course.completed ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed (Click to Revert)
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            Mark Milestone Complete
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default PersonalizedRoadmap;
