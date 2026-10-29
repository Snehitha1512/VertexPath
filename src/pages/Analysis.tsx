import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSkillGapsWithAI, SkillGapAnalysis } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Target, 
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Brain,
  Lightbulb,
  BookOpen,
  Sparkles,
  Loader2,
  RefreshCw
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface Profile {
  id: string;
  full_name: string;
  target_job: string;
  skills: string;
  experience_years: string;
  industry: string;
  education_level?: string;
}

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skillGaps, setSkillGaps] = useState<SkillGapAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{ title: string; description: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [overallScore, setOverallScore] = useState(68);

  useEffect(() => {
    if (user) {
      fetchAnalysisData();
    }
  }, [user]);

  const fetchAnalysisData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let profileData: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
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
        // Check cached analysis first
        const cachedAnalysis = localStorage.getItem(`vertexpath_analysis_${user.id}`);
        if (cachedAnalysis) {
          try {
            const parsed = JSON.parse(cachedAnalysis);
            if (parsed && parsed.skillGaps && parsed.skillGaps.length > 0) {
              setSkillGaps(parsed.skillGaps);
              setOverallScore(parsed.overallScore || 70);
              if (parsed.recommendations) setRecommendations(parsed.recommendations);
              setLoading(false);
              return;
            }
          } catch {}
        }
        await runAnalysis(profileData);
      } else {
        setSkillGaps([]);
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (profileData: Profile) => {
    setIsAnalyzingAi(true);
    try {
      const result = await analyzeSkillGapsWithAI(profileData);
      if (result && result.skillGaps && result.skillGaps.length > 0) {
        setSkillGaps(result.skillGaps);
        setOverallScore(result.overallScore || 70);
        if (result.recommendations) {
          setRecommendations(result.recommendations);
        }
        if (user) {
          localStorage.setItem(`vertexpath_analysis_${user.id}`, JSON.stringify(result));
        }
      } else {
        fallbackAnalysis(profileData);
      }
    } catch (err: any) {
      console.warn("AI skill analysis failed, using rule-based analysis:", err);
      fallbackAnalysis(profileData);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const fallbackAnalysis = (profileData: Profile) => {
    const userSkills = profileData.skills
      ? profileData.skills.split(',').map(s => s.trim().toLowerCase())
      : [];

    const defaultSkills = [
      { name: 'Core Language', target: 90, current: userSkills.some(s => s.includes('python') || s.includes('javascript')) ? 80 : 45 },
      { name: 'Modern Frameworks', target: 85, current: userSkills.some(s => s.includes('react') || s.includes('node')) ? 75 : 40 },
      { name: 'Databases & SQL', target: 80, current: userSkills.some(s => s.includes('sql') || s.includes('postgres')) ? 70 : 35 },
      { name: 'System Design', target: 75, current: 40 },
      { name: 'Cloud & Infrastructure', target: 75, current: userSkills.some(s => s.includes('aws') || s.includes('docker')) ? 65 : 30 },
      { name: 'Testing & CI/CD', target: 70, current: 45 },
    ];

    const computed = defaultSkills.map(s => {
      const gap = Math.max(0, s.target - s.current);
      return {
        skill: s.name,
        currentLevel: s.current,
        targetLevel: s.target,
        gap,
        priority: (gap > 30 ? 'high' : gap > 15 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      };
    });

    setSkillGaps(computed);
    const avgScore = Math.round(
      (computed.reduce((sum, s) => sum + s.currentLevel, 0) /
        computed.reduce((sum, s) => sum + s.targetLevel, 0)) * 100
    );
    setOverallScore(avgScore);
    setRecommendations([
      { title: 'Focus on System Design', description: 'Deepen architecture skills to reach senior expectations for your target role.', type: 'priority' },
      { title: 'Leverage Strong Foundations', description: 'Your core language competency is close to target. Build complex portfolio projects.', type: 'strength' },
      { title: 'Closing Critical Gaps', description: 'Consistent practical labs can close your primary high-priority gaps in 6-8 weeks.', type: 'timeline' }
    ]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-400" />;
      default: return null;
    }
  };

  const radarData = skillGaps.map(skill => ({
    skill: skill.skill,
    current: skill.currentLevel,
    target: skill.targetLevel,
    fullMark: 100
  }));

  const priorityData = [
    { name: 'High Priority', value: skillGaps.filter(s => s.priority === 'high').length, color: '#ef4444' },
    { name: 'Medium Priority', value: skillGaps.filter(s => s.priority === 'medium').length, color: '#f59e0b' },
    { name: 'Low Priority', value: skillGaps.filter(s => s.priority === 'low').length, color: '#10b981' },
  ];

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-dark pt-16 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Analyzing skills with Gemini AI...
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
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            Profile Setup Required
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Skill Analysis Unavailable
          </h2>
          <p className="text-gray-300 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            You skipped or haven't finished specifying your <strong className="text-white">Target Job Title</strong> and <strong className="text-white">Skill Set</strong>. Complete them in your profile so Gemini AI can benchmark your skills and provide gap recommendations.
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-primary border-primary/40 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Gemini LLM Analysis
              </Badge>
              <span className="text-xs text-gray-400">Target Role:</span>
              <span className="text-sm font-semibold text-white">{profile.target_job || "Target Job"}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              Skill Gap Analysis
            </h1>
            <p className="text-gray-300 text-sm max-w-2xl mt-1">
              AI-driven insights comparing your current skills against actual industry benchmarks.
            </p>
          </div>

          <Button
            variant="outline"
            disabled={isAnalyzingAi}
            onClick={() => runAnalysis(profile)}
            className="border-white/20 text-white hover:bg-white/10 gap-2"
          >
            {isAnalyzingAi ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-primary" />
            )}
            Re-analyze with Gemini
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Overall Match</p>
                  <p className="text-3xl font-bold text-white">{overallScore}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <Progress value={overallScore} className="mt-3" />
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Skills to Improve</p>
                  <p className="text-3xl font-bold text-white">
                    {skillGaps.filter(s => s.gap > 0).length}
                  </p>
                </div>
                <Target className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">High Priority Gaps</p>
                  <p className="text-3xl font-bold text-red-400">
                    {skillGaps.filter(s => s.priority === 'high').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Mastered Competencies</p>
                  <p className="text-3xl font-bold text-green-400">
                    {skillGaps.filter(s => s.gap === 0).length}
                  </p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Radar Chart */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Current Proficiency vs Target Benchmark
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <PolarRadiusAxis 
                      angle={0} 
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Radar
                      name="Target Benchmark"
                      dataKey="target"
                      stroke="#0f766e"
                      fill="#0f766e"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Your Current Level"
                      dataKey="current"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Gap Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-4 text-xs">
                {priorityData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-300">{item.name}</span>
                    </div>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Brain className="h-5 w-5 text-primary" />
                  Detailed Competency Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {skillGaps.map((skill, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white text-sm">{skill.skill}</h4>
                        <div className={`flex items-center gap-1 ${getPriorityColor(skill.priority)}`}>
                          {getPriorityIcon(skill.priority)}
                          <span className="text-xs uppercase font-semibold">{skill.priority}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {skill.currentLevel}% → {skill.targetLevel}%
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Progress value={skill.targetLevel} className="h-2 opacity-30 bg-gray-700" />
                      <Progress 
                        value={skill.currentLevel} 
                        className="h-2 absolute top-0 bg-transparent" 
                      />
                    </div>
                    
                    {skill.gap > 0 && (
                      <div className="text-xs text-gray-400">
                        {skill.gap} points needed to reach target role requirement
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1">
                    <h4 className="font-semibold text-white text-xs">{rec.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white text-base">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gradient-primary hover:opacity-90 text-white text-xs" onClick={() => window.location.hash = "roadmap"}>
                  <Target className="h-4 w-4 mr-2" />
                  View Personalized Roadmap
                </Button>
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 text-xs" onClick={() => window.location.hash = "resume"}>
                  <Award className="h-4 w-4 mr-2" />
                  Build Tailored Resume
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Analysis;
