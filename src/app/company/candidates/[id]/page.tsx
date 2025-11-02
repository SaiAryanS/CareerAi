"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  Eye,
  TrendingUp,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface CandidateResult {
  fileName: string;
  matchScore: number;
  status: string;
  matchingSkills: string[];
  missingSkills: string[];
  impliedSkills: string[];
  strengths: string[];
  recommendations: string[];
  extractedText: string;
  processedAt: string;
}

interface BatchData {
  _id: string;
  jobTitle: string;
  status: string;
  totalResumes: number;
  processedResumes: number;
  averageScore: number;
  results: CandidateResult[];
  createdAt: string;
  completedAt?: string;
}

export default function CandidatesPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const batchId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [filteredResults, setFilteredResults] = useState<CandidateResult[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userRole = sessionStorage.getItem('userRole');

    if (!isLoggedIn || userRole !== 'company') {
      router.push('/login');
      return;
    }

    fetchBatchResults();
  }, [router, batchId]);

  const fetchBatchResults = async () => {
    try {
      const response = await fetch(`/api/company/batch-results/${batchId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch results');
      }

      const data = await response.json();
      setBatchData(data);
      setFilteredResults(data.results || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load batch results",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (value: number[]) => {
    const score = value[0];
    setMinScore(score);
    if (batchData) {
      setFilteredResults(
        batchData.results.filter((r) => r.matchScore >= score)
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      "Approved": { variant: "default", icon: CheckCircle2 },
      "Needs Improvement": { variant: "secondary", icon: AlertCircle },
      "Not a Match": { variant: "destructive", icon: XCircle },
      "Error": { variant: "destructive", icon: XCircle },
    };

    const { variant, icon: Icon } = config[status] || config["Not a Match"];

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const exportToCSV = () => {
    if (!batchData) return;

    const headers = ["File Name", "Match Score", "Status", "Matching Skills", "Missing Skills"];
    const rows = filteredResults.map((r) => [
      r.fileName,
      r.matchScore.toString(),
      r.status,
      r.matchingSkills.join("; "),
      r.missingSkills.join("; "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates_${batchData.jobTitle}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported Successfully",
      description: `${filteredResults.length} candidates exported to CSV`,
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 pt-24">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!batchData) {
    return (
      <main className="min-h-screen p-6 pt-24">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Batch Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested batch analysis could not be found.
              </p>
              <Button asChild>
                <Link href="/company/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

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
            <h1 className="text-4xl font-headline font-bold">Candidate Analysis Results</h1>
            <p className="text-muted-foreground mt-2">
              {batchData.jobTitle} • {filteredResults.length} candidates
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batchData.totalResumes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batchData.averageScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Candidates</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {batchData.results.filter((r) => r.matchScore >= 80).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Job Position</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate">{batchData.jobTitle}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Filter Candidates</CardTitle>
                <CardDescription>
                  Show only candidates with a minimum match score
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="minScore" className="text-base font-medium">
                  Minimum Match Score
                </Label>
                <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                  {minScore}%
                </Badge>
              </div>
              <Slider
                id="minScore"
                min={0}
                max={100}
                step={5}
                value={[minScore]}
                onValueChange={handleFilterChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredResults.length}</span> of <span className="font-semibold text-foreground">{batchData.results.length}</span> candidates
              </p>
              {minScore > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange([0])}
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Candidates Ranked by Match Score</CardTitle>
            <CardDescription>
              Click on a candidate to view detailed analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Matching Skills</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No candidates match the current filter criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result, index) => (
                    <TableRow key={index} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{result.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(result.processedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(result.matchScore)}`}>
                            {result.matchScore}%
                          </span>
                          <Progress value={result.matchScore} className="w-20 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(result.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {result.matchingSkills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {result.matchingSkills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{result.matchingSkills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCandidate(result)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{result.fileName}</DialogTitle>
                              <DialogDescription>
                                Detailed AI-powered analysis
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Score */}
                              <div>
                                <h3 className="font-semibold mb-2">Match Score</h3>
                                <div className="flex items-center gap-4">
                                  <span className={`text-4xl font-bold ${getScoreColor(result.matchScore)}`}>
                                    {result.matchScore}%
                                  </span>
                                  <div className="flex-1">
                                    <Progress value={result.matchScore} className="h-3" />
                                  </div>
                                </div>
                              </div>

                              {/* Status */}
                              <div>
                                <h3 className="font-semibold mb-2">Status</h3>
                                {getStatusBadge(result.status)}
                              </div>

                              {/* Matching Skills */}
                              <div>
                                <h3 className="font-semibold mb-2">Matching Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                  {result.matchingSkills.map((skill, i) => (
                                    <Badge key={i} variant="default">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Missing Skills */}
                              {result.missingSkills.length > 0 && (
                                <div>
                                  <h3 className="font-semibold mb-2">Missing Skills</h3>
                                  <div className="flex flex-wrap gap-2">
                                    {result.missingSkills.map((skill, i) => (
                                      <Badge key={i} variant="destructive">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Implied Skills */}
                              {result.impliedSkills.length > 0 && (
                                <div>
                                  <h3 className="font-semibold mb-2">Implied Skills</h3>
                                  <div className="flex flex-wrap gap-2">
                                    {result.impliedSkills.map((skill, i) => (
                                      <Badge key={i} variant="secondary">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Strengths */}
                              {result.strengths.length > 0 && (
                                <div>
                                  <h3 className="font-semibold mb-2">Strengths</h3>
                                  <ul className="list-disc list-inside space-y-1">
                                    {result.strengths.map((strength, i) => (
                                      <li key={i} className="text-sm">{strength}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Recommendations */}
                              {result.recommendations.length > 0 && (
                                <div>
                                  <h3 className="font-semibold mb-2">Recommendations</h3>
                                  <ul className="list-disc list-inside space-y-1">
                                    {result.recommendations.map((rec, i) => (
                                      <li key={i} className="text-sm text-muted-foreground">{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
