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
import { ArrowLeft, Edit, Loader2, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  visibility: 'public' | 'private';
  createdAt: string;
  companyName: string;
}

export default function ViewJobPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userRole = sessionStorage.getItem('userRole');

    if (!isLoggedIn || userRole !== 'company') {
      router.push('/login');
      return;
    }

    if (params.id) {
      fetchJob();
    }
  }, [router, params.id]);

  const fetchJob = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/company/jobs/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setJob(data);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Job",
          description: "Could not fetch the job details.",
        });
        router.push('/company/jobs');
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while loading the job.",
      });
      router.push('/company/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 pt-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <main className="min-h-screen p-6 pt-24 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/company/jobs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-headline font-bold">{job.title}</h1>
              <p className="text-muted-foreground mt-2">
                Posted on {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/company/jobs/${job._id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Job
            </Link>
          </Button>
        </div>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Details
              </CardTitle>
              <Badge variant={job.visibility === 'public' ? 'default' : 'outline'}>
                {job.visibility}
              </Badge>
            </div>
            <CardDescription>
              Complete information about this job posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Company */}
            <div>
              <h3 className="font-semibold mb-2">Company</h3>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job ID</p>
                  <p className="font-mono text-xs">{job._id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Use this job posting for candidate analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/company/bulk-upload">
                  Upload Resumes for Analysis
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/company/jobs/${job._id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit This Job
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
