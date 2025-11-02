'use server';
/**
 * @fileOverview Implements AI skill matching between a resume and a job description.
 *
 * - analyzeSkills - A function that analyzes skills in a resume against a job description.
 */

import { ai } from '@/ai/genkit';
import {
  AnalyzeSkillsInputSchema,
  AnalyzeSkillsOutputSchema,
  type AnalyzeSkillsInput,
  type AnalyzeSkillsOutput,
} from '@/ai/schemas';

// Helper function to validate if document is a resume
async function isValidResume(documentText: string): Promise<boolean> {
  try {
    console.log('Validating if document is a resume...');
    
    // Check if document has minimum length
    if (documentText.length < 100) {
      console.log('Document too short to be a resume');
      return false;
    }

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
            content: 'You are a document classifier. Your job is to determine if a document is a resume/CV or not. A resume typically contains: contact information, work experience, education, skills, and professional summary. Respond with only "true" or "false".'
          },
          {
            role: 'user',
            content: `Analyze this document and determine if it is a resume or CV. Look for typical resume sections like:
- Contact information (name, email, phone)
- Work experience or employment history
- Education background
- Skills section (technical, soft skills)
- Professional summary or objective

Documents that are NOT resumes include: project reports, academic papers, hackathon reports, research papers, articles, letters, invoices, etc.

DOCUMENT TEXT:
${documentText.substring(0, 2000)}

Respond with ONLY "true" if this is a resume/CV, or "false" if it is not. No other text.`
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.warn('Resume validation failed, defaulting to false');
      return false;
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim().toLowerCase();
    const isResume = result.includes('true');
    
    console.log('Resume validation result:', isResume);
    return isResume;
  } catch (error) {
    console.error('Resume validation error:', error);
    return false; // Default to false if validation fails
  }
}

export async function analyzeSkills(
  input: AnalyzeSkillsInput
): Promise<AnalyzeSkillsOutput> {
  // First, validate if the document is a resume
  const isResume = await isValidResume(input.resume);
  
  if (!isResume) {
    console.log('Document is not a valid resume, returning 0% score');
    return {
      matchScore: 0,
      scoreRationale: 'This document does not appear to be a resume or CV. Please upload a valid resume containing your work experience, education, skills, and contact information.',
      matchingSkills: [],
      missingSkills: [],
      impliedSkills: '',
      status: 'Not a Match',
    };
  }
  
  return analyzeSkillsFlow(input);
}

const analyzeSkillsPrompt = ai.definePrompt({
  name: 'analyzeSkillsPrompt',
  input: { schema: AnalyzeSkillsInputSchema },
  output: { schema: AnalyzeSkillsOutputSchema },
  config: {
    temperature: 0.7,
  },
  prompt: `You are an expert AI career analyst with the critical eye of a senior hiring manager. Perform a harsh, realistic analysis of the Resume against the Job Description. Focus only on the skills, technologies, and experience explicitly required for the role.

Follow these steps:

1. **Job Description Analysis**
   - Extract required skills and group them as:
     - Core Requirements (must-have for the role)
     - Preferred Skills (secondary / nice-to-have)

2. **Resume Analysis**
   - Identify all direct skills from the resume.
   - **Apply Conceptual Mapping & Skill Equivalency:** This is critical. Map related technologies to the required skills.
     - (e.g., MongoDB in resume -> maps to NoSQL requirement).
     - (e.g., Express.js in resume -> maps to Node.js requirement).
     - **(e.g., Jenkins + Docker + AWS/Azure in resume -> strongly implies CI/CD Pipeline experience).**
     - **(e.g., Experience with Django in resume -> should be considered equivalent or very similar to FastAPI if the project context is building APIs).**
   - Evaluate Project & Accomplishment Quality: distinguish between meaningful usage vs. keyword listing.

3. **Implied Skills**
   - Write a concise narrative (impliedSkills) describing inferred skills with concrete examples from the resume.

4. **Gap Analysis**
   - Matching Skills: list skills that overlap between the JD (Core/Preferred) and the Resume (direct, mapped, or implied).
   - Missing Skills: list skills required in the JD but are genuinely absent from the Resume, even after conceptual mapping.

5. **Weighted Match Score**
   - Core skills weigh most.
   - Penalize missing skills proportionally to importance; reduce penalty for close equivalents (like Django for FastAPI).
   - Ignore irrelevant skills not tied to the JD.
   - Apply a Project Quality Multiplier (strong relevant projects = higher score).
   - Return integer matchScore (0–100).

6. **Status**
   - 75–100 → Approved
   - 50–74 → Needs Improvement
   - 0–49 → Not a Match

You MUST respond with valid JSON only. Do not include markdown code blocks, explanations, or any text outside the JSON object.

Job Description:
{{{jobDescription}}}

Resume:
{{{resume}}}
`,
});

const analyzeSkillsFlow = ai.defineFlow(
  {
    name: 'analyzeSkillsFlow',
    inputSchema: AnalyzeSkillsInputSchema,
    outputSchema: AnalyzeSkillsOutputSchema,
  },
  async input => {
    try {
      // Make direct API call to LM Studio's OpenAI-compatible endpoint
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
              content: 'You are an expert AI career analyst with the critical eye of a senior hiring manager. You thoroughly read resumes to identify ALL skills present before making your assessment. You analyze resumes against job descriptions and provide structured JSON responses.'
            },
            {
              role: 'user',
              content: `Perform a thorough, realistic analysis of the Resume against the Job Description. READ THE ENTIRE RESUME CAREFULLY to identify all skills before making your assessment.

Follow these steps:

1. **Job Description Analysis**
   - Extract required skills and group them as:
     - Core Requirements (must-have for the role)
     - Preferred Skills (secondary / nice-to-have)

2. **Resume Analysis - CRITICAL: READ ENTIRE RESUME FIRST**
   - Carefully read through the ENTIRE resume text from start to finish
   - Identify all direct skills from the resume (check skills section, experience, projects, education)
   - Look for skills mentioned in ANY format (e.g., "HTML", "HTML5", "html", "HTML/CSS")
   - **Apply Conceptual Mapping & Skill Equivalency:** This is critical. Map related technologies to the required skills.
     - (e.g., MongoDB in resume -> maps to NoSQL requirement).
     - (e.g., Express.js in resume -> maps to Node.js requirement).
     - **(e.g., Jenkins + Docker + AWS/Azure in resume -> strongly implies CI/CD Pipeline experience).**
     - **(e.g., Experience with Django in resume -> should be considered equivalent or very similar to FastAPI if the project context is building APIs).**
   - Evaluate Project & Accomplishment Quality: distinguish between meaningful usage vs. keyword listing.

3. **Implied Skills**
   - Write a concise narrative (impliedSkills) describing inferred skills with concrete examples from the resume.

4. **Gap Analysis**
   - Matching Skills: list skills that overlap between the JD (Core/Preferred) and the Resume (direct, mapped, or implied).
   - Missing Skills: list skills required in the JD but are genuinely absent from the Resume, even after conceptual mapping.

5. **Weighted Match Score**
   - Core skills weigh most.
   - Penalize missing skills proportionally to importance; reduce penalty for close equivalents (like Django for FastAPI).
   - Ignore irrelevant skills not tied to the JD.
   - Apply a Project Quality Multiplier (strong relevant projects = higher score).
   - Return integer matchScore (0–100).

6. **Status**
   - 75–100 → Approved
   - 50–74 → Needs Improvement
   - 0–49 → Not a Match

Job Description:
${input.jobDescription}

Resume:
${input.resume}

You MUST respond with ONLY a valid JSON object matching this structure (no markdown, no explanation, just the raw JSON):
{"matchScore": <number 0-100>, "scoreRationale": "<string>", "matchingSkills": ["<string>", ...], "missingSkills": ["<string>", ...], "impliedSkills": "<string>", "status": "<Approved|Needs Improvement|Not a Match>"}`
            }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LM Studio API error response:', errorText);
        throw new Error(`LM Studio API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content;

      // Clean up the response - remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse the JSON response
      const output = JSON.parse(responseText) as AnalyzeSkillsOutput;
      
      // Validate that output contains the required fields
      if (!output || typeof output.matchScore !== 'number') {
        throw new Error('Invalid response from model - missing or invalid matchScore');
      }
      
      // Ensure all required fields exist
      if (!output.scoreRationale || !output.matchingSkills || !output.missingSkills || !output.impliedSkills || !output.status) {
        throw new Error('Invalid response from model - missing required fields');
      }
      
      return output;
    } catch (error) {
      console.error('Error in analyzeSkillsFlow:', error);
      
      // Return a default response if the model fails
      return {
        matchScore: 0,
        scoreRationale: 'Unable to analyze resume due to an error with the AI model. Please try again.',
        matchingSkills: [],
        missingSkills: [],
        impliedSkills: 'Analysis could not be completed.',
        status: 'Not a Match',
      };
    }
  }
);
