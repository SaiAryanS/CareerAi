"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Edit, Trash2, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  visibility: 'public' | 'private';
  createdAt: string;
}

export default function CompanyJobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication and role
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userRole = sessionStorage.getItem('userRole');

    if (!isLoggedIn || userRole !== 'company') {
      router.push('/login');
      return;
    }

    fetchJobs();
  }, [router]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const userEmail = sessionStorage.getItem('userEmail');
      const response = await fetch(`/api/company/jobs?userEmail=${userEmail}`);
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Jobs",
          description: "Could not fetch your job postings.",
        });
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while loading jobs.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const response = await fetch(`/api/company/jobs/${jobId}?userEmail=${userEmail}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Job Deleted",
          description: "The job posting has been successfully deleted.",
        });
        fetchJobs();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete job');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 pt-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 pt-24 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold">Manage Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your job postings
            </p>
          </div>
          <Button asChild>
            <Link href="/company/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Job
            </Link>
          </Button>
        </div>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first job posting to start analyzing candidates
                </p>
                <Button asChild>
                  <Link href="/company/jobs/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Job
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Job Postings</CardTitle>
              <CardDescription>
                Manage all your job postings in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job._id}>
                        <TableCell className="font-medium">
                          {job.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {job.skills?.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {job.skills?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{job.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.visibility === 'public' ? 'default' : 'outline'}>
                            {job.visibility}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="View Details"
                            >
                              <Link href={`/company/jobs/${job._id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Edit Job"
                            >
                              <Link href={`/company/jobs/${job._id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete Job"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the job posting "{job.title}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(job._id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>What are job postings?</CardTitle>
            <CardDescription>
              Job postings help you analyze candidates effectively
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              • <strong>Private Postings:</strong> Only visible to your company
            </p>
            <p className="text-sm">
              • <strong>Bulk Analysis:</strong> Upload multiple resumes to match against a job
            </p>
            <p className="text-sm">
              • <strong>AI Scoring:</strong> Get AI-powered match scores for each candidate
            </p>
            <p className="text-sm">
              • <strong>Ranked Results:</strong> See candidates ranked by fit
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
