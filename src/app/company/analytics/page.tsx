"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award, 
  Lightbulb,
  ArrowLeft,
  Loader2,
  BarChart3,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  analytics: {
    totalCandidates: number;
    totalBatches: number;
    completedBatches: number;
    avgMatchScore: number;
    totalJobs: number;
  };
  scoreDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  topSkills: Array<{ skill: string; count: number }>;
  topCandidates: Array<{ fileName: string; matchScore: number; jobTitle: string }>;
  aiInsights: string;
  companyName: string;
}

export default function CompanyAnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    // Check authentication and role
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userRole = sessionStorage.getItem('userRole');

    if (!isLoggedIn || userRole !== 'company') {
      router.push('/login');
      return;
    }

    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const response = await fetch(`/api/company/analytics?userEmail=${userEmail}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen p-6 pt-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Failed to load analytics</p>
                <Button asChild variant="outline">
                  <Link href="/company/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const totalAnalyzed = data.analytics.totalCandidates;
  const distribution = data.scoreDistribution;

  return (
    <main className="min-h-screen p-6 pt-24 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
              <BarChart3 className="h-10 w-10 text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered hiring insights for {data.companyName}
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAnalyzed}</div>
              <p className="text-xs text-muted-foreground">
                Analyzed across {data.analytics.totalBatches} batches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.analytics.avgMatchScore}%</div>
              <Progress value={data.analytics.avgMatchScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.analytics.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                Job postings created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.analytics.totalBatches > 0 
                  ? Math.round((data.analytics.completedBatches / data.analytics.totalBatches) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {data.analytics.completedBatches} of {data.analytics.totalBatches} batches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Generated by Qwen2.5-Coder 7B analyzing your hiring data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm whitespace-pre-line">
              {data.aiInsights}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Score Distribution</CardTitle>
              <CardDescription>
                Quality breakdown of {totalAnalyzed} candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">Excellent</Badge>
                      <span className="text-sm text-muted-foreground">80-100%</span>
                    </div>
                    <span className="font-semibold">{distribution.excellent}</span>
                  </div>
                  <Progress 
                    value={totalAnalyzed > 0 ? (distribution.excellent / totalAnalyzed) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">Good</Badge>
                      <span className="text-sm text-muted-foreground">60-79%</span>
                    </div>
                    <span className="font-semibold">{distribution.good}</span>
                  </div>
                  <Progress 
                    value={totalAnalyzed > 0 ? (distribution.good / totalAnalyzed) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500">Average</Badge>
                      <span className="text-sm text-muted-foreground">40-59%</span>
                    </div>
                    <span className="font-semibold">{distribution.average}</span>
                  </div>
                  <Progress 
                    value={totalAnalyzed > 0 ? (distribution.average / totalAnalyzed) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Poor</Badge>
                      <span className="text-sm text-muted-foreground">0-39%</span>
                    </div>
                    <span className="font-semibold">{distribution.poor}</span>
                  </div>
                  <Progress 
                    value={totalAnalyzed > 0 ? (distribution.poor / totalAnalyzed) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Top Skills in Candidate Pool</CardTitle>
              <CardDescription>
                Most frequently found skills across all candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topSkills.length > 0 ? (
                <div className="space-y-3">
                  {data.topSkills.map((skill, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{skill.skill}</span>
                        <span className="text-sm text-muted-foreground">
                          {skill.count} candidates
                        </span>
                      </div>
                      <Progress 
                        value={(skill.count / Math.max(...data.topSkills.map(s => s.count))) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No skill data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Candidates */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Candidates</CardTitle>
            <CardDescription>
              Highest scoring candidates across all positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topCandidates.length > 0 ? (
              <div className="space-y-3">
                {data.topCandidates.map((candidate, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{candidate.fileName}</p>
                        <p className="text-sm text-muted-foreground">{candidate.jobTitle}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">
                      {candidate.matchScore}% Match
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                No candidate data available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Empty State for No Data */}
        {totalAnalyzed === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start analyzing candidates to see insights and trends
                </p>
                <Button asChild>
                  <Link href="/company/bulk-upload">
                    Upload Resumes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
