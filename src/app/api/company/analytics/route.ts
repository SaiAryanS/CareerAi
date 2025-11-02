import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ai } from '@/ai/genkit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ message: 'User email is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user || user.role !== 'company') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all batches for this company
    const batches = await db.collection('batchAnalyses')
      .find({ companyId: user._id })
      .toArray();

    // Fetch all jobs
    const jobs = await db.collection('jobs')
      .find({ createdBy: user._id })
      .toArray();

    // Calculate analytics
    const totalCandidates = batches.reduce((sum, b) => sum + (b.totalResumes || 0), 0);
    const completedBatches = batches.filter(b => b.status === 'completed');
    
    // Get all results from completed batches
    const allResults: any[] = [];
    completedBatches.forEach(batch => {
      if (batch.results && Array.isArray(batch.results)) {
        allResults.push(...batch.results.map((r: any) => ({
          ...r,
          jobTitle: batch.jobTitle,
          batchId: batch.batchId,
        })));
      }
    });

    // Calculate score distribution
    const scoreRanges = {
      excellent: allResults.filter(r => r.matchScore >= 80).length,
      good: allResults.filter(r => r.matchScore >= 60 && r.matchScore < 80).length,
      average: allResults.filter(r => r.matchScore >= 40 && r.matchScore < 60).length,
      poor: allResults.filter(r => r.matchScore < 40).length,
    };

    // Calculate average match score
    const avgMatchScore = allResults.length > 0
      ? Math.round(allResults.reduce((sum, r) => sum + r.matchScore, 0) / allResults.length)
      : 0;

    // Get top skills from all results
    const skillsMap = new Map<string, number>();
    allResults.forEach(result => {
      if (result.matchingSkills) {
        result.matchingSkills.forEach((skill: string) => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
      }
    });

    const topSkills = Array.from(skillsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // Get top candidates
    const topCandidates = allResults
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)
      .map(r => ({
        fileName: r.fileName,
        matchScore: r.matchScore,
        jobTitle: r.jobTitle,
      }));

    // Prepare data for AI insights
    const analyticsData = {
      totalCandidates,
      totalBatches: batches.length,
      completedBatches: completedBatches.length,
      avgMatchScore,
      scoreDistribution: scoreRanges,
      topSkills: topSkills.slice(0, 5),
      totalJobs: jobs.length,
      jobTitles: jobs.map(j => j.title),
    };

    // Generate AI insights using Qwen2.5-Coder
    let aiInsights = "No insights available yet. Analyze more candidates to generate insights.";
    
    if (totalCandidates > 0) {
      try {
        const prompt = `You are an AI hiring analytics expert. Analyze the following recruitment data and provide actionable insights in 3-4 concise bullet points. Focus on trends, recommendations, and improvements.

Data:
- Total Candidates Analyzed: ${analyticsData.totalCandidates}
- Total Batches: ${analyticsData.totalBatches}
- Average Match Score: ${analyticsData.avgMatchScore}%
- Score Distribution:
  * Excellent (80-100): ${scoreRanges.excellent} candidates
  * Good (60-79): ${scoreRanges.good} candidates
  * Average (40-59): ${scoreRanges.average} candidates
  * Poor (0-39): ${scoreRanges.poor} candidates
- Top Skills Found: ${topSkills.slice(0, 5).map(s => s.skill).join(', ')}
- Job Positions: ${jobs.slice(0, 5).map(j => j.title).join(', ')}

Provide insights about:
1. Overall candidate quality and trends
2. Skills availability in the market
3. Recommendations for improving candidate matching
4. Hiring strategy suggestions

Format as bullet points, each starting with "•". Keep it professional and actionable.`;

        const result = await ai.generate({
          model: 'openai/qwen2.5-coder-7b-instruct',
          prompt,
        });

        aiInsights = result.text || aiInsights;
      } catch (error) {
        console.error('Error generating AI insights:', error);
        // Use fallback insights based on data
        aiInsights = generateFallbackInsights(analyticsData, scoreRanges);
      }
    }

    return NextResponse.json({
      analytics: analyticsData,
      scoreDistribution: scoreRanges,
      topSkills,
      topCandidates,
      aiInsights,
      companyName: user.companyInfo?.companyName || 'Your Company',
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ 
      message: 'An internal server error occurred' 
    }, { status: 500 });
  }
}

function generateFallbackInsights(data: any, scoreRanges: any): string {
  const insights = [];
  
  // Insight 1: Overall quality
  const excellentPercentage = data.totalCandidates > 0 
    ? Math.round((scoreRanges.excellent / data.totalCandidates) * 100) 
    : 0;
  
  if (excellentPercentage > 30) {
    insights.push(`• Strong candidate pool: ${excellentPercentage}% of candidates scored excellent (80+). Your job descriptions are attracting qualified talent.`);
  } else if (excellentPercentage < 10) {
    insights.push(`• Candidate quality challenge: Only ${excellentPercentage}% scored excellent. Consider broadening your sourcing channels or refining job requirements.`);
  } else {
    insights.push(`• Moderate candidate quality: ${excellentPercentage}% scored excellent. There's room to improve candidate sourcing or job posting visibility.`);
  }

  // Insight 2: Skills availability
  if (data.topSkills.length > 0) {
    const topSkillsList = data.topSkills.slice(0, 3).map((s: any) => s.skill).join(', ');
    insights.push(`• Most common skills: ${topSkillsList}. These skills are readily available in the candidate market.`);
  }

  // Insight 3: Average score insight
  if (data.avgMatchScore >= 70) {
    insights.push(`• High average match score (${data.avgMatchScore}%): Your job requirements align well with candidate qualifications. Continue current sourcing strategies.`);
  } else if (data.avgMatchScore < 50) {
    insights.push(`• Low average match score (${data.avgMatchScore}%): Consider adjusting job requirements or expanding candidate search criteria to improve match rates.`);
  } else {
    insights.push(`• Average match score is ${data.avgMatchScore}%: Room for improvement. Review job requirements to ensure they're realistic and well-targeted.`);
  }

  // Insight 4: Batch efficiency
  if (data.completedBatches > 5) {
    insights.push(`• High hiring activity: ${data.completedBatches} completed analyses. You're actively building your team. Consider implementing structured interview processes for efficiency.`);
  }

  return insights.join('\n');
}
