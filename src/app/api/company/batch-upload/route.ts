import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting PDF extraction, buffer size:', buffer.length);
      
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parsing error:', errData.parserError);
        reject(new Error(`PDF parsing failed: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages with better spacing
          let text = '';
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any, pageIndex: number) => {
              if (page.Texts) {
                // Sort texts by Y position (top to bottom) then X position (left to right)
                const sortedTexts = page.Texts.sort((a: any, b: any) => {
                  const yDiff = a.y - b.y;
                  if (Math.abs(yDiff) < 0.1) { // Same line
                    return a.x - b.x;
                  }
                  return yDiff;
                });
                
                let lastY = -1;
                sortedTexts.forEach((textItem: any) => {
                  if (textItem.R) {
                    // Add newline if we moved to a new line
                    if (lastY !== -1 && Math.abs(textItem.y - lastY) > 0.1) {
                      text += '\n';
                    }
                    lastY = textItem.y;
                    
                    textItem.R.forEach((r: any) => {
                      if (r.T) {
                        try {
                          // Decode and add space after each text element
                          const decoded = decodeURIComponent(r.T);
                          text += decoded + ' ';
                        } catch (decodeError) {
                          // If decoding fails, use the raw text
                          text += r.T + ' ';
                        }
                      }
                    });
                  }
                });
              }
              // Add double newline between pages
              if (pageIndex < pdfData.Pages.length - 1) {
                text += '\n\n';
              }
            });
          }
          
          // Clean up multiple spaces and normalize whitespace
          text = text.replace(/\s+/g, ' ').trim();
          
          console.log('PDF extraction successful, text length:', text.length);
          console.log('First 500 chars:', text.substring(0, 500));
          resolve(text);
        } catch (error) {
          reject(new Error(`Failed to process PDF data: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
      
      // Parse the buffer
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('PDF extraction error:', error);
      reject(new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

// Helper function to validate if document is a resume
async function isValidResume(documentText: string): Promise<boolean> {
  try {
    console.log('Validating if document is a resume...');
    
    // Check if document has minimum length
    if (documentText.length < 100) {
      console.log('Document too short to be a resume');
      return false;
    }

    // Use pattern matching first for quick validation (accepts most resumes)
    const resumeKeywords = [
      /\b(skills?|education|experience|projects?)\b/i,
      /\b(email|phone|linkedin|github)\b/i,
      /\b(developer|engineer|analyst|designer|manager)\b/i,
      /\b(university|college|bachelor|master|degree)\b/i,
      /\b(python|java|javascript|react|node|sql|aws|docker)\b/i,
    ];

    // If document contains at least 2 resume indicators, likely a resume
    const matchCount = resumeKeywords.filter(pattern => pattern.test(documentText)).length;
    if (matchCount >= 2) {
      console.log('Document matches resume patterns, accepting as valid resume');
      return true;
    }

    // Fall back to AI validation for edge cases
    const response = await fetch('http://192.168.0.105:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder-7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a LENIENT document classifier. Accept ANY document that could be a resume/CV, including creative layouts, portfolios, or unconventional formats. Only reject obvious non-resumes like academic papers, reports, or invoices. Respond with only "true" or "false".'
          },
          {
            role: 'user',
            content: `Determine if this is a resume/CV. Be LENIENT - accept any document that shows:
- ANY mention of skills, experience, or projects
- Contact info (name, email, phone) OR professional profile
- Education OR work history
- Technical skills OR professional abilities

ACCEPT: Traditional resumes, modern layouts, creative designs, portfolios, CVs
REJECT ONLY: Academic papers, project reports, research documents, invoices, letters

DOCUMENT TEXT:
${documentText.substring(0, 2000)}

Respond with ONLY "true" if this could be a resume/CV, or "false" if it's clearly not. When in doubt, say "true".`
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.warn('Resume validation API failed, defaulting to TRUE (accept resume)');
      return true; // Changed: Default to accepting if validation fails
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim().toLowerCase();
    const isResume = result.includes('true');
    
    console.log('AI resume validation result:', isResume);
    return isResume;
  } catch (error) {
    console.error('Resume validation error:', error);
    return true; // Changed: Default to accepting if validation fails
  }
}

// Helper function to analyze a resume against job description
async function analyzeResume(resumeText: string, jobDescription: string): Promise<any> {
  try {
    console.log('Starting AI analysis, resume length:', resumeText.length);
    
    const response = await fetch('http://192.168.0.105:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder-7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical recruiter with balanced professional judgment. You provide fair but realistic assessments, recognizing both strengths and gaps. You read resumes thoroughly and evaluate honestly.'
          },
          {
            role: 'user',
            content: `Perform a REALISTIC and BALANCED analysis of this resume against the job description. READ THE ENTIRE RESUME TEXT CAREFULLY to identify all skills present and assess fairly.

⚠️ SCORING GUIDELINES:
- Be moderately strict but fair
- Most candidates should score 40-70%
- Strong matches score 70-85%
- Exceptional matches score 85%+

SKILL IDENTIFICATION:
- Look for skills anywhere in the resume text (skills section, experience, projects, education)
- Consider variations (e.g., "HTML5" matches "HTML", "CSS3" matches "CSS", "Python 3" matches "Python")
- Look for skills in context (e.g., "built with Python", "using HTML/CSS", "developed in JavaScript")
- Case-insensitive matching (HTML = html = Html)
- Give credit for demonstrated skills, even if mentioned briefly

BALANCED SCORING FORMULA:
1. Identify Core (must-have) vs Preferred (nice-to-have) skills from job description
2. Calculate score:
   - Each Core Skill matched: +7 points
   - Each Core Skill missing: -8 points (moderate penalty)
   - Each Preferred Skill matched: +3 points
   - Each Preferred Skill missing: -1 point (light penalty)
   - Project Quality Multiplier: 0.9 to 1.15 (can boost or reduce)
   - If missing >40% of core skills: cap score at 60%
   - If missing >60% of core skills: cap score at 45%

STATUS THRESHOLDS (REASONABLE):
- 75-100: Approved (strong match with most core skills)
- 55-74: Needs Improvement (has potential but notable gaps)
- 0-54: Not a Match (too many critical skill gaps)

JOB DESCRIPTION:
${jobDescription}

RESUME TEXT (Read carefully from start to end):
${resumeText}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no other text):
{
  "matchScore": <number 0-100>,
  "status": "<Approved|Needs Improvement|Not a Match>",
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "impliedSkills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LM Studio API error response:', errorText);
      throw new Error(`LM Studio API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI response received');
    const analysisText = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      console.log('Analysis successful, match score:', parsedData.matchScore);
      return parsedData;
    }
    
    console.error('No JSON found in AI response');
    throw new Error('Invalid analysis response format');
  } catch (error) {
    console.error('Analysis error:', error);
    throw error; // Re-throw to provide more specific error message
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = formData.get('jobId') as string;
    const userEmail = formData.get('userEmail') as string;

    if (!jobId || !userEmail) {
      return NextResponse.json({ message: 'Job ID and user email are required' }, { status: 400 });
    }

    // Get all resume files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('resume_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ message: 'No resume files provided' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user and job details
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user || user.role !== 'company') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId) });
    if (!job) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    // Create batch record
    const batch = {
      companyId: user._id,
      jobId: new ObjectId(jobId),
      jobTitle: job.title,
      status: 'processing' as const,
      totalResumes: files.length,
      processedResumes: 0,
      resumes: [] as any[],
      results: [] as any[],
      createdAt: new Date(),
    };

    const batchResult = await db.collection('batchAnalyses').insertOne(batch);
    const batchId = batchResult.insertedId;

    // Process resumes in the background (we'll do it synchronously for now)
    const results = [];
    let processedCount = 0;

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const resumeText = await extractTextFromPDF(buffer);
        
        // Validate if document is a resume
        const isResume = await isValidResume(resumeText);
        
        if (!isResume) {
          console.log(`${file.name} is not a valid resume, assigning 0% score`);
          results.push({
            fileName: file.name,
            matchScore: 0,
            status: 'Not a Match',
            matchingSkills: [],
            missingSkills: [],
            impliedSkills: [],
            strengths: [],
            recommendations: ['This document does not appear to be a resume or CV. Please upload a valid resume.'],
            extractedText: resumeText.substring(0, 5000),
            processedAt: new Date(),
          });
          processedCount++;
          
          // Update progress
          await db.collection('batchAnalyses').updateOne(
            { _id: batchId },
            { 
              $set: { 
                processedResumes: processedCount,
                results: results 
              } 
            }
          );
          continue; // Skip to next file
        }
        
        // Analyze resume
        const analysis = await analyzeResume(resumeText, job.description);
        
        const result = {
          fileName: file.name,
          matchScore: analysis.matchScore,
          status: analysis.status,
          matchingSkills: analysis.matchingSkills,
          missingSkills: analysis.missingSkills,
          impliedSkills: analysis.impliedSkills,
          strengths: analysis.strengths,
          recommendations: analysis.recommendations,
          extractedText: resumeText.substring(0, 5000), // Store first 5000 chars
          processedAt: new Date(),
        };

        results.push(result);
        processedCount++;

        // Update progress
        await db.collection('batchAnalyses').updateOne(
          { _id: batchId },
          { 
            $set: { 
              processedResumes: processedCount,
              results: results 
            } 
          }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing ${file.name}:`, errorMessage, error);
        results.push({
          fileName: file.name,
          matchScore: 0,
          status: 'Error',
          matchingSkills: [],
          missingSkills: [],
          impliedSkills: [],
          strengths: [],
          recommendations: [`Failed to process: ${errorMessage}`],
          extractedText: '',
          processedAt: new Date(),
        });
        processedCount++;
      }
    }

    // Calculate average score
    const avgScore = results.reduce((sum, r) => sum + r.matchScore, 0) / results.length;

    // Mark batch as completed
    await db.collection('batchAnalyses').updateOne(
      { _id: batchId },
      { 
        $set: { 
          status: 'completed',
          processedResumes: processedCount,
          averageScore: Math.round(avgScore),
          results: results.sort((a, b) => b.matchScore - a.matchScore), // Sort by score descending
          completedAt: new Date(),
        } 
      }
    );

    return NextResponse.json({ 
      message: 'Batch processing completed',
      batchId: batchId.toString(),
      totalProcessed: processedCount,
      averageScore: Math.round(avgScore),
    }, { status: 200 });

  } catch (error) {
    console.error('Batch upload failed:', error);
    return NextResponse.json({ 
      message: 'An internal server error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
