import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Search, 
  Clock, 
  ExternalLink,
  Play,
  CheckCircle2,
  Filter
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  platform: string;
  url: string;
  is_free: boolean;
  difficulty: string;
  duration_hours: number;
  skill_tags: string[];
}

const CURATED_COURSES: Course[] = [
  {
    id: "c-1",
    title: "Meta Front-End Developer Professional Certificate",
    platform: "Coursera",
    url: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    is_free: false,
    difficulty: "Beginner",
    duration_hours: 60,
    skill_tags: ["React", "JavaScript", "HTML/CSS", "UI/UX", "Git"],
  },
  {
    id: "c-2",
    title: "CS50's Introduction to Computer Science",
    platform: "edX / Harvard",
    url: "https://cs50.harvard.edu/x/",
    is_free: true,
    difficulty: "Beginner",
    duration_hours: 45,
    skill_tags: ["C", "Python", "SQL", "Algorithms", "Data Structures"],
  },
  {
    id: "c-3",
    title: "Full Stack Open: Modern Web Development",
    platform: "University of Helsinki",
    url: "https://fullstackopen.com/",
    is_free: true,
    difficulty: "Intermediate",
    duration_hours: 80,
    skill_tags: ["React", "Node.js", "Express", "TypeScript", "PostgreSQL", "GraphQL"],
  },
  {
    id: "c-4",
    title: "AWS Certified Solutions Architect Associate",
    platform: "AWS Skill Builder",
    url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
    is_free: false,
    difficulty: "Intermediate",
    duration_hours: 40,
    skill_tags: ["AWS", "Cloud Architecture", "S3", "EC2", "VPC", "Serverless"],
  },
  {
    id: "c-5",
    title: "Deep Learning Specialization (Andrew Ng)",
    platform: "Coursera / DeepLearning.AI",
    url: "https://www.coursera.org/specializations/deep-learning",
    is_free: false,
    difficulty: "Advanced",
    duration_hours: 75,
    skill_tags: ["Deep Learning", "PyTorch", "Neural Networks", "CNN", "Transformers"],
  },
  {
    id: "c-6",
    title: "Docker & Kubernetes: The Practical Guide",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Intermediate",
    duration_hours: 24,
    skill_tags: ["Docker", "Kubernetes", "DevOps", "Microservices", "Containers"],
  },
  {
    id: "c-7",
    title: "Google Data Analytics Professional Certificate",
    platform: "Coursera",
    url: "https://www.coursera.org/professional-certificates/google-data-analytics",
    is_free: false,
    difficulty: "Beginner",
    duration_hours: 50,
    skill_tags: ["SQL", "Tableau", "R", "Spreadsheets", "Data Analysis"],
  },
  {
    id: "c-8",
    title: "Complete Python Bootcamp: Go From Zero to Hero",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Beginner",
    duration_hours: 22,
    skill_tags: ["Python", "OOP", "Scripting", "Data Structures"],
  },
  {
    id: "c-9",
    title: "FreeCodeCamp: Responsive Web Design Certification",
    platform: "FreeCodeCamp",
    url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
    is_free: true,
    difficulty: "Beginner",
    duration_hours: 300,
    skill_tags: ["HTML", "CSS", "Responsive Design", "Flexbox", "Grid"],
  },
  {
    id: "c-10",
    title: "CompTIA Security+ (SY0-701) Training",
    platform: "Professor Messer / CompTIA",
    url: "https://www.professormesser.com/",
    is_free: true,
    difficulty: "Intermediate",
    duration_hours: 30,
    skill_tags: ["Cybersecurity", "Network Security", "Threat Analysis", "Cryptography"],
  },
  {
    id: "c-11",
    title: "System Design Fundamentals & Architectures",
    platform: "Educative",
    url: "https://www.educative.io",
    is_free: false,
    difficulty: "Advanced",
    duration_hours: 35,
    skill_tags: ["System Design", "Scalability", "Load Balancing", "Caching", "Sharding"],
  },
  {
    id: "c-12",
    title: "Modern React with Redux & TypeScript",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Intermediate",
    duration_hours: 38,
    skill_tags: ["React", "TypeScript", "Redux Toolkit", "Vite", "Tailwind"],
  },
  {
    id: "c-13",
    title: "Building Microservices with Go",
    platform: "Pluralsight",
    url: "https://www.pluralsight.com",
    is_free: false,
    difficulty: "Advanced",
    duration_hours: 28,
    skill_tags: ["Golang", "Microservices", "gRPC", "Docker", "REST API"],
  },
  {
    id: "c-14",
    title: "Google Cybersecurity Professional Certificate",
    platform: "Coursera",
    url: "https://www.coursera.org/professional-certificates/google-cybersecurity",
    is_free: false,
    difficulty: "Beginner",
    duration_hours: 45,
    skill_tags: ["SIEM", "Python", "Linux", "SQL", "Incident Response"],
  },
  {
    id: "c-15",
    title: "Spring Boot 3 & Spring Cloud Microservices",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Advanced",
    duration_hours: 32,
    skill_tags: ["Java", "Spring Boot", "Kafka", "Microservices", "PostgreSQL"],
  },
  {
    id: "c-16",
    title: "Generative AI Fundamentals with Gemini & Vertex AI",
    platform: "Google Cloud Skills Boost",
    url: "https://www.cloudskillsboost.google/",
    is_free: true,
    difficulty: "Intermediate",
    duration_hours: 15,
    skill_tags: ["Gemini", "Vertex AI", "LLM", "Prompt Engineering", "Python"],
  },
  {
    id: "c-17",
    title: "Practical Ethical Hacking - Hands-on Labs",
    platform: "TCM Security",
    url: "https://academy.tcm-sec.com/",
    is_free: false,
    difficulty: "Intermediate",
    duration_hours: 25,
    skill_tags: ["Penetration Testing", "Metasploit", "Burp Suite", "Nmap", "Wireshark"],
  },
  {
    id: "c-18",
    title: "React Native - Cross-Platform Mobile Apps",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Intermediate",
    duration_hours: 30,
    skill_tags: ["React Native", "Expo", "iOS", "Android", "Mobile UI"],
  },
  {
    id: "c-19",
    title: "SQL for Data Science & Business Analytics",
    platform: "Coursera",
    url: "https://www.coursera.org",
    is_free: true,
    difficulty: "Beginner",
    duration_hours: 18,
    skill_tags: ["SQL", "Relational Databases", "PostgreSQL", "Data Querying"],
  },
  {
    id: "c-20",
    title: "Terraform for AWS Infrastructure as Code",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Intermediate",
    duration_hours: 16,
    skill_tags: ["Terraform", "AWS", "IaC", "DevOps", "CI/CD"],
  },
  {
    id: "c-21",
    title: "Flutter & Dart - The Complete Guide",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Beginner",
    duration_hours: 32,
    skill_tags: ["Flutter", "Dart", "Cross-Platform", "Mobile Apps", "Firebase"],
  },
  {
    id: "c-22",
    title: "Machine Learning with Python & Scikit-Learn",
    platform: "FreeCodeCamp",
    url: "https://www.freecodecamp.org",
    is_free: true,
    difficulty: "Intermediate",
    duration_hours: 20,
    skill_tags: ["Machine Learning", "Python", "Scikit-Learn", "Pandas", "NumPy"],
  },
  {
    id: "c-23",
    title: "Linux Command Line Basics for Developers",
    platform: "Coursera / IBM",
    url: "https://www.coursera.org",
    is_free: true,
    difficulty: "Beginner",
    duration_hours: 12,
    skill_tags: ["Linux", "Bash", "Command Line", "Server Management"],
  },
  {
    id: "c-24",
    title: "UI/UX Design Masterclass with Figma",
    platform: "Udemy",
    url: "https://www.udemy.com",
    is_free: false,
    difficulty: "Beginner",
    duration_hours: 22,
    skill_tags: ["Figma", "UI/UX Design", "Wireframing", "Design Systems"],
  },
];

const Courses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>(CURATED_COURSES);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(CURATED_COURSES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, selectedDifficulty, selectedType]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('title');

      if (coursesData && coursesData.length > 0) {
        // Merge Supabase courses with curated library without duplicates
        const existingTitles = new Set(coursesData.map(c => c.title.toLowerCase()));
        const merged = [
          ...coursesData,
          ...CURATED_COURSES.filter(c => !existingTitles.has(c.title.toLowerCase()))
        ];
        setCourses(merged);
      } else {
        setCourses(CURATED_COURSES);
      }
    } catch {
      setCourses(CURATED_COURSES);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.platform.toLowerCase().includes(term) ||
        (course.skill_tags && course.skill_tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(course => 
        course.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(course => 
        selectedType === "free" ? course.is_free : !course.is_free
      );
    }

    setFilteredCourses(filtered);
  };

  const addCourseToRoadmap = async (course: Course) => {
    if (!user) {
      toast({ title: "Please sign in to add courses to your roadmap." });
      return;
    }

    const newEntry = {
      user_id: user.id,
      title: course.title,
      description: `Learn ${course.title} on ${course.platform}`,
      skill_tag: course.skill_tags?.[0] || 'general',
      status: 'planned',
      start_date: new Date().toISOString().slice(0, 10),
    };

    // Save locally
    const cacheKey = `vertexpath_roadmap_entries_${user.id}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    cached.push({ id: crypto.randomUUID(), ...newEntry });
    localStorage.setItem(cacheKey, JSON.stringify(cached));

    // Try Supabase insert
    try {
      await supabase.from('roadmap_entries').insert(newEntry);
    } catch {}

    toast({
      title: "Course added to roadmap!",
      description: `"${course.title}" is now added to your learning timeline.`,
    });
  };

  return (
    <section className="min-h-screen bg-gradient-dark pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="text-primary border-primary/40 mb-3 inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Curated Course Library
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            Industry Learning Catalogue
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto">
            Discover {courses.length}+ expert courses from Harvard, Meta, Google, AWS, Coursera, and free resources.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by topic, skill (e.g. React, AWS, Python, Docker)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 rounded-md border border-white/20 bg-slate-900 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary flex-1 md:flex-none"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-md border border-white/20 bg-slate-900 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary flex-1 md:flex-none"
            >
              <option value="all">Free & Paid</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </select>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all duration-200 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant={course.is_free ? "default" : "secondary"} className={course.is_free ? "bg-green-600 text-white text-xs" : "bg-primary/20 text-primary border-primary/30 text-xs"}>
                    {course.is_free ? "Free Course" : "Paid / Certificate"}
                  </Badge>
                  <span className="text-xs font-semibold text-primary">{course.platform}</span>
                </div>
                <CardTitle className="text-base font-bold leading-snug line-clamp-2">{course.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {course.duration_hours}h estimated
                  </div>
                  <Badge variant="outline" className="text-[11px] border-white/10 text-gray-300">
                    {course.difficulty}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {course.skill_tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-[11px] bg-primary/20 text-white border-primary/30">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(course.url, '_blank')}
                    className="flex-1 text-xs border-white/20 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View Course
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addCourseToRoadmap(course)}
                    className="flex-1 text-xs bg-gradient-primary hover:opacity-90 text-white"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Add to Path
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No courses match your criteria</h3>
            <p className="text-gray-400 text-sm">Try resetting your filters or searching for another skill</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Courses;
