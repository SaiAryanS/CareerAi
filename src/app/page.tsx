
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      const userRole = sessionStorage.getItem('userRole');
      if (userRole === 'company') {
        router.push('/company/dashboard');
      } else {
        // For coach, individual, or any other role -> go to analyzer
        router.push('/analyze');
      }
    } else {
      router.push('/register');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-4 pt-20">
      <div className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline text-primary">
          Welcome to CareerPilot AI
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-muted-foreground">
          Analyze your resume against any job description with the power of AI. Get a detailed skill match analysis, identify missing keywords, and tailor your resume to land your dream job.
        </p>
        <div className="mt-10">
          <Button onClick={handleGetStarted} size="lg" className="font-bold">
            {isLoggedIn ? (sessionStorage.getItem('userRole') === 'company' ? 'Go to Dashboard' : 'Go to Analyzer') : 'Get Started for Free'} <ArrowRight className="ml-2" />
          </Button>
        </div>
      </div>
    </main>
  );
}
