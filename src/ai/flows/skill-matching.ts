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
  prompt: `You are an expert AI career analyst with balanced judgment - realistic but fair. Analyze the Resume against the Job Description with professional objectivity.

⚠️ SCORING GUIDELINE: Be moderately strict. Most candidates should score 40-70%. Strong matches score 70-85%. Exceptional matches score 85%+.

Follow these steps:

1. **Job Description Analysis**
   - Extract required skills and group them as:
     - Core Requirements (must-have for the role)
     - Preferred Skills (nice-to-have)

2. **Resume Analysis - READ THOROUGHLY**
   - READ THE ENTIRE RESUME: Check skills section, experience, projects, technologies used
   - Identify ALL skills from the resume (case-insensitive):
     * React/ReactJS/React.js → counts as React
     * AWS/Amazon Web Services → counts as AWS
     * SQL/MySQL/PostgreSQL → counts as SQL
     * Git/GitHub → counts as version control
   - **Apply Reasonable Conceptual Mapping:**
     - (e.g., MongoDB in resume -> maps to NoSQL requirement).
     - (e.g., Express.js in resume -> maps to Node.js requirement).
     - (e.g., Jenkins + Docker + AWS/Azure → implies CI/CD Pipeline experience).
     - (e.g., Django experience → shows backend API skills, transferable to FastAPI)
   - Evaluate Project Quality: Distinguish between meaningful usage vs. keyword listing.
   - Give credit for demonstrated skills, even if mentioned briefly.
   - **IMPORTANT**: If a skill appears ANYWHERE in resume, don't mark it as missing

3. **Implied Skills**
   - Write a concise narrative (impliedSkills) describing inferred skills with concrete examples from the resume.

4. **Gap Analysis**
   - Matching Skills: List ALL skills that overlap between the JD and Resume:
     * Direct mentions (e.g., "React" in resume and "React" in JD)
     * Variations (e.g., "ReactJS" in resume matches "React" in JD)
     * Related skills (e.g., "Express.js" shows Node.js knowledge)
     * Skills demonstrated in projects
   - Missing Skills: ONLY list skills that are TRULY absent from the resume (not mentioned anywhere, not even in projects)

5. **Balanced Weighted Match Score - SCORING FORMULA:**
   - Start with base score = 0
   - For each Core Skill matched: +7 points
   - For each Core Skill missing: -8 points (moderate penalty)
   - For each Preferred Skill matched: +3 points
   - For each Preferred Skill missing: -1 point (light penalty)
   - Project Quality Multiplier: 0.9 to 1.15 (can boost or reduce based on quality)
   - If missing more than 40% of core skills: cap score at 60%
   - If missing more than 60% of core skills: cap score at 45%
   - Return integer matchScore (0–100). Be fair - recognize both strengths and gaps.

6. **Reasonable Status Thresholds**
   - 70–100 → Approved (strong match with most core skills)
   - 55–69 → Needs Improvement (has potential but notable gaps)
   - 0–54 → Not a Match (too many critical skill gaps)

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
              content: 'You are an expert AI career analyst with balanced, professional judgment. You thoroughly read resumes and provide fair but realistic assessments. You recognize both strengths and gaps honestly.'
            },
            {
              role: 'user',
              content: `Perform a REALISTIC and BALANCED analysis of the Resume against the Job Description. READ THE ENTIRE RESUME CAREFULLY and assess it fairly.

⚠️ SCORING GUIDELINE: Be moderately strict but fair. Most candidates should score 40-70%. Strong matches score 70-85%. Exceptional matches score 85%+.

Follow these steps:

1. **Job Description Analysis**
   - Extract required skills and group them as:
     - Core Requirements (must-have for the role)
     - Preferred Skills (nice-to-have)

2. **Resume Analysis - BE THOROUGH AND FAIR**
   - CRITICAL: Carefully read through the ENTIRE resume text word-by-word from start to finish
   - Check EVERYWHERE: skills section, experience descriptions, projects, technologies used, tools mentioned, education
   - Look for skills mentioned in ANY format, case-insensitive:
     - React/ReactJS/React.js/react → all count as React
     - AWS/Amazon Web Services/aws → all count as AWS
     - SQL/MySQL/PostgreSQL/sql → all count as SQL/database skills
     - Git/GitHub/git → all count as version control
     - Azure/Microsoft Azure → all count as Azure
   - **IMPORTANT**: If a skill appears ANYWHERE in the resume (even once), it counts as present
   - **Apply Reasonable Conceptual Mapping:**
     - MongoDB in resume → maps to NoSQL requirement
     - Express.js in resume → maps to Node.js requirement
     - Jenkins + Docker + AWS/Azure → implies CI/CD Pipeline experience
     - Django/Flask → shows backend API skills, transferable to similar frameworks
     - Any cloud provider (AWS/Azure/GCP) → shows cloud computing knowledge
   - **Project Analysis**: If skills are used in projects, they are PROVEN skills (give full credit)
   - Give credit for demonstrated skills, even if mentioned briefly
   - Do NOT mark a skill as missing if it appears ANYWHERE in the resume text

3. **Implied Skills**
   - Write a concise narrative (impliedSkills) describing inferred skills with concrete examples from the resume.

4. **Gap Analysis - CRITICAL INSTRUCTIONS**
   - Matching Skills: List ALL skills that appear ANYWHERE in the resume:
     * Skills explicitly listed in skills section
     * Technologies mentioned in project descriptions
     * Tools used in work experience
     * Skills demonstrated through projects or achievements
     * Consider case-insensitive and variations (React = ReactJS = React.js)
   - Missing Skills: ONLY list skills that are:
     * Required in the job description AND
     * Completely absent from the resume (not mentioned even once) AND
     * Cannot be reasonably inferred from related skills
   - **DOUBLE-CHECK**: Before marking a skill as missing, search the ENTIRE resume text one more time

5. **Balanced Weighted Match Score - USE THIS FAIR FORMULA:**
   - Start with base score = 0
   - For each Core Skill matched: +7 points
   - For each Core Skill missing: -8 points (moderate penalty)
   - For each Preferred Skill matched: +3 points
   - For each Preferred Skill missing: -1 point (light penalty)
   - Project Quality Multiplier: 0.9 to 1.15 (can boost or reduce based on quality)
   - **AUTOMATIC CAPS:**
     - If missing >40% of core skills: cap score at 60%
     - If missing >60% of core skills: cap score at 45%
   - Return integer matchScore (0–100). Be fair - recognize both strengths and gaps.

6. **Reasonable Status Thresholds**
   - 70–100 → Approved (strong match with most core skills)
   - 55–69 → Needs Improvement (has potential but notable gaps)
   - 0–54 → Not a Match (too many critical skill gaps)

Job Description:
${input.jobDescription}

Resume:
${input.resume}

**CRITICAL REMINDER BEFORE YOU RESPOND:**
- Search the resume text for each required skill (case-insensitive, check variations)
- If you find "React" or "ReactJS" or "React.js" anywhere → add "React" to matchingSkills
- If you find "AWS" or "Amazon Web Services" anywhere → add "AWS" to matchingSkills  
- If you find "Azure" or "Microsoft Azure" anywhere → add "Azure" to matchingSkills
- If you find "SQL" or "MySQL" or "PostgreSQL" anywhere → add "SQL" to matchingSkills
- If you find "Git" or "GitHub" or "GitLab" anywhere → add "Git" to matchingSkills
- Check project descriptions for technology mentions
- Be thorough and accurate

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
