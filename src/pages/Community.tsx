import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  MessageCircle, 
  Heart, 
  Share2, 
  Plus,
  Star,
  Trophy,
  BookOpen,
  Target,
  Calendar,
  TrendingUp
} from "lucide-react";

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  tags: string[];
  achievement?: string;
}

const Community: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedTab, setSelectedTab] = useState("feed");

  useEffect(() => {
    loadMockPosts();
  }, []);

  const loadMockPosts = () => {
    const mockPosts: Post[] = [
      {
        id: '1',
        author: 'Sarah Chen',
        avatar: '👩‍💻',
        content: 'Just completed the React Advanced Patterns course! The compound components pattern completely changed how I think about component design. Who else is working on React skills?',
        timestamp: '2 hours ago',
        likes: 24,
        comments: 8,
        tags: ['React', 'JavaScript', 'Frontend'],
        achievement: 'Course Completed'
      },
      {
        id: '2',
        author: 'Michael Rodriguez',
        avatar: '👨‍🔬',
        content: 'Landed my first data science role! Thanks to everyone who helped me on this journey. The Python for Data Science track on VertexPath was instrumental. Now working on machine learning fundamentals.',
        timestamp: '5 hours ago',
        likes: 89,
        comments: 23,
        tags: ['DataScience', 'Python', 'Career'],
        achievement: 'Job Landed'
      },
      {
        id: '3',
        author: 'Emily Johnson',
        avatar: '👩‍🎨',
        content: 'Anyone else struggling with AWS certification prep? The networking concepts are challenging. Looking for study partners or resources that helped you!',
        timestamp: '1 day ago',
        likes: 15,
        comments: 12,
        tags: ['AWS', 'Cloud', 'Certification']
      },
      {
        id: '4',
        author: 'David Kim',
        avatar: '👨‍💼',
        content: 'Hot take: Learning TypeScript made me a better JavaScript developer even when not using TS. The type thinking really helps with code design. What are your thoughts?',
        timestamp: '2 days ago',
        likes: 42,
        comments: 18,
        tags: ['TypeScript', 'JavaScript', 'Discussion']
      },
      {
        id: '5',
        author: 'Lisa Patel',
        avatar: '👩‍🔬',
        content: 'Week 3 of my career transition from marketing to UX design! Completed my first wireframe project. The learning curve is steep but so rewarding. Any UX designers here with advice?',
        timestamp: '3 days ago',
        likes: 33,
        comments: 15,
        tags: ['UX', 'Design', 'CareerChange']
      }
    ];

    setPosts(mockPosts);
  };

  const handlePostSubmit = () => {
    if (!newPost.trim()) return;

    const post: Post = {
      id: Date.now().toString(),
      author: user?.email?.split('@')[0] || 'Anonymous',
      avatar: '👤',
      content: newPost,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      tags: ['General']
    };

    setPosts([post, ...posts]);
    setNewPost("");
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };

  const leaderboard = [
    { name: 'Alex Thompson', points: 2450, streak: 28, avatar: '🏆' },
    { name: 'Maria Garcia', points: 2180, streak: 22, avatar: '⭐' },
    { name: 'James Wilson', points: 1950, streak: 19, avatar: '🎯' },
    { name: 'Sofia Chen', points: 1820, streak: 15, avatar: '🚀' },
    { name: 'Ryan Kumar', points: 1650, streak: 12, avatar: '💪' }
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Learning Community
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Connect with fellow learners, share achievements, and get inspired
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-muted p-1 rounded-lg max-w-md mx-auto">
          <button
            onClick={() => setSelectedTab("feed")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === "feed" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setSelectedTab("leaderboard")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === "leaderboard" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTab === "feed" && (
              <>
                {/* New Post */}
                {user && (
                  <Card className="bg-card/80 backdrop-blur border-border/50">
                    <CardContent className="p-6">
                      <Textarea
                        placeholder="Share your learning journey, ask questions, or celebrate achievements..."
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="mb-4"
                        rows={3}
                      />
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">💡 Tip</Badge>
                          <Badge variant="secondary" className="text-xs">🎉 Achievement</Badge>
                          <Badge variant="secondary" className="text-xs">❓ Question</Badge>
                        </div>
                        <Button onClick={handlePostSubmit} disabled={!newPost.trim()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Post
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Posts Feed */}
                <div className="space-y-6">
                  {posts.map((post) => (
                    <Card key={post.id} className="bg-card/80 backdrop-blur border-border/50">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-lg">
                            {post.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-foreground">{post.author}</h4>
                              {post.achievement && (
                                <Badge variant="secondary" className="text-xs">
                                  🏆 {post.achievement}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                            </div>
                            <p className="text-foreground mb-3 leading-relaxed">{post.content}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {post.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                              <button 
                                onClick={() => handleLike(post.id)}
                                className="flex items-center gap-1 hover:text-red-500 transition-colors"
                              >
                                <Heart className="h-4 w-4" />
                                {post.likes}
                              </button>
                              <button className="flex items-center gap-1 hover:text-primary transition-colors">
                                <MessageCircle className="h-4 w-4" />
                                {post.comments}
                              </button>
                              <button className="flex items-center gap-1 hover:text-primary transition-colors">
                                <Share2 className="h-4 w-4" />
                                Share
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {selectedTab === "leaderboard" && (
              <Card className="bg-card/80 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top Learners This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {leaderboard.map((user, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </div>
                      <div className="text-2xl">{user.avatar}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{user.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {user.points} points
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {user.streak} day streak
                          </span>
                        </div>
                      </div>
                      {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                      {index === 1 && <Trophy className="h-6 w-6 text-gray-400" />}
                      {index === 2 && <Trophy className="h-6 w-6 text-amber-600" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <Card className="bg-card/80 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Community Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Learners</span>
                  <span className="font-bold text-foreground">12,458</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Courses Completed</span>
                  <span className="font-bold text-foreground">8,234</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Skills Gained</span>
                  <span className="font-bold text-foreground">24,567</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Success Stories</span>
                  <span className="font-bold text-foreground">1,892</span>
                </div>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card className="bg-card/80 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['React Hooks', 'AWS Certification', 'Python Data Science', 'UI/UX Design', 'DevOps'].map((topic, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-foreground">{topic}</span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.floor(Math.random() * 100) + 20} posts
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card/80 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Study Groups
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Find Mentor
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Join Discussion
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Community;