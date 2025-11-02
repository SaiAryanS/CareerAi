'use server';
/**
 * @fileOverview Implements an AI agent that can analyze resumes and generate interview questions conversationally.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  AnalyzeSkillsInputSchema,
  AnalyzeSkillsOutputSchema,
  CareerAgentInputSchema,
  GenerateQuestionsInputSchema,
  GenerateQuestionsOutputSchema,
  type CareerAgentInput,
} from '@/ai/schemas';
import { analyzeSkills } from './skill-matching';
import { generateInterviewQuestions } from './interview-flow';

// Define the tool for resume analysis
export const analyzeResumeTool = ai.defineTool(
  {
    name: 'analyzeResume',
    description:
      'Analyzes a resume against a job description to provide a match score and skill gap analysis. This should be the primary tool used when a user wants to evaluate their resume for a job.',
    inputSchema: AnalyzeSkillsInputSchema,
    outputSchema: AnalyzeSkillsOutputSchema,
  },
  async (input) => analyzeSkills(input)
);

// Define the tool for generating interview questions
export const generateInterviewQuestionsTool = ai.defineTool(
    {
        name: 'generateInterviewQuestions',
        description: 'Generates 5 interview questions based on a job description. Use this when the user agrees to practice for an interview.',
        inputSchema: GenerateQuestionsInputSchema,
        outputSchema: GenerateQuestionsOutputSchema,
    },
    async (input) => generateInterviewQuestions(input.jobDescription)
);


export const careerAgentFlow = ai.defineFlow(
  {
    name: 'careerAgentFlow',
    inputSchema: CareerAgentInputSchema,
    outputSchema: z.string(),
  },
  async ({ history, prompt }) => {
    // Build the conversation context for the agent with better structure
    let conversationContext = '';
    for (const msg of history) {
      const role = msg.role === 'user' ? 'User' : 'Agent';
      const text = msg.content?.[0]?.text || '';
      conversationContext += `${role}: ${text}\n\n`;
    }
    
    // Add current prompt to context
    const fullContext = conversationContext + `User: ${prompt}`;

    // Extract job description from the ENTIRE conversation (more aggressive search)
    let jobDescription = '';
    let resumeText = '';
    
    // Look for resume content (marked clearly by the client)
    const resumeMatch = fullContext.match(/\*\*RESUME CONTENT PROVIDED:\*\*\s*Here is the resume text:\s*([\s\S]*?)\s*\*\*END OF RESUME CONTENT\*\*/i);
    if (resumeMatch) {
      resumeText = resumeMatch[1].trim();
    } else {
      // Fallback: look for older format
      const oldResumeMatch = fullContext.match(/Here is the resume text:\s*([\s\S]{100,})/i);
      if (oldResumeMatch) {
        // Extract a large chunk after "Here is the resume text:"
        const afterResume = oldResumeMatch[1];
        // Take everything until we hit another "User:" or "Agent:" or end
        const endMatch = afterResume.match(/([\s\S]*?)(?=\n\n(?:User|Agent):|$)/);
        resumeText = endMatch ? endMatch[1].trim() : afterResume.trim();
      }
    }
    
    // Look for job description - be very aggressive in extraction
    // Try multiple patterns to catch job descriptions
    const patterns = [
      // Pattern 1: Explicit "job description:" or "Job Description:"
      /(?:job description|Job Description|JD)[:：]\s*([\s\S]{50,}?)(?=\n\n(?:User|Agent):|Here is the resume text:|$)/i,
      // Pattern 2: "I'm applying for..." or "I want to apply..."
      /(?:applying for|apply for|interested in|looking at)\s+(?:a\s+)?(.{10,}?role.{10,}?)(?=\n\n|Here is the resume text:|$)/i,
      // Pattern 3: Text blocks with "Requirements:", "Responsibilities:", etc (likely job descriptions)
      /((?:Position|Role|Title):.{10,}(?:Requirements|Responsibilities|Qualifications|Skills)[\s\S]{100,}?)(?=\n\n(?:User|Agent):|Here is the resume text:|$)/i,
      // Pattern 4: Large text blocks from user that look like job descriptions
      /User:\s*((?=[\s\S]*(?:experience|skills|requirements|responsibilities))[\s\S]{200,}?)(?=\n\nUser:|Here is the resume text:|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = fullContext.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Validate it looks like a job description (has key terms)
        if (extracted.length > 100 && 
            /(?:experience|skill|require|responsibilit|qualificat|developer|engineer|position)/i.test(extracted)) {
          jobDescription = extracted;
          break;
        }
      }
    }
    
    // Additional: If prompt itself is very long and looks like a JD, use it
    if (!jobDescription && prompt.length > 150 && 
        /(?:experience|skill|require|responsibilit|qualificat|developer|engineer|position)/i.test(prompt)) {
      jobDescription = prompt;
    }
    
    const hasJobDescription = jobDescription.length > 0;
    const hasResume = resumeText.length > 0;
    
    // Check if analysis has already been done (look for "Match Score" in history)
    const analysisAlreadyDone = fullContext.includes('Match Score:') || 
                                fullContext.includes('Resume Analysis Complete');
    
    // More precise check for when user wants interview questions
    // Only trigger if analysis is already done OR explicit question request
    const explicitQuestionRequest = (
      /\b(give|generate|show|create|provide|want|need|can you give)\s+(me\s+)?(more\s+)?(interview\s+)?questions?\b/i.test(prompt) ||
      /\b(yes|sure|please|ok|okay)\b/i.test(prompt.toLowerCase()) && 
        fullContext.toLowerCase().includes('would you like') && 
        fullContext.toLowerCase().includes('interview')
    );
    
    const wantsInterviewQuestions = explicitQuestionRequest && analysisAlreadyDone;

    // Decision logic: PRIORITY ORDER matters!
    
    // PRIORITY 1: We have both job description and resume - DO ANALYSIS FIRST!
    if (hasJobDescription && hasResume && jobDescription && resumeText && !analysisAlreadyDone) {
      const analysisResult = await analyzeSkills({ jobDescription, resume: resumeText });
      return `
### 📊 Resume Analysis Complete!

Here's how your resume stacks up against the job description:

**Match Score:** **${analysisResult.matchScore}%**

${analysisResult.scoreRationale}

---

#### ✅ **Matching Skills**
${analysisResult.matchingSkills.length > 0 
  ? analysisResult.matchingSkills.map(s => `- ${s}`).join('\n') 
  : "_No matching skills identified._"}

---

#### ❌ **Skills Gap**
${analysisResult.missingSkills.length > 0 
  ? analysisResult.missingSkills.map(s => `- ${s}`).join('\n') 
  : "_Great news! No significant skill gaps detected._"}

---

${analysisResult.matchScore >= 70 
  ? `🎯 **Strong Match!** Your resume shows excellent alignment with this role!\n\nWould you like me to generate some interview practice questions to help you prepare?` 
  : `💡 **Improvement Areas:** Consider gaining experience or certifications in the missing skills to strengthen your candidacy.\n\nWould you like me to analyze another resume or provide guidance on how to address these gaps?`}
      `;
    }
    
    // PRIORITY 2: User wants interview questions AFTER analysis is done
    if (wantsInterviewQuestions && jobDescription) {
      const interviewResult = await generateInterviewQuestions(jobDescription);
      return `
### 🎯 Interview Practice Questions

Here are 5 tailored interview questions based on the job description:

${interviewResult.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n\n')}

---

💪 **Tip:** For each question, prepare STAR-format answers (Situation, Task, Action, Result) using specific examples from your experience.

Would you like more interview questions or help with anything else?
      `;
    }
    
    // PRIORITY 3: Conversational response using Qwen2.5-Coder
    // Provide better context about what we already have
    let contextSummary = '';
    if (hasJobDescription) {
      contextSummary += '\n[CONTEXT: Job description has been provided in the conversation]';
    }
    if (hasResume) {
      contextSummary += '\n[CONTEXT: Resume has been uploaded and extracted]';
    }
    if (analysisAlreadyDone) {
      contextSummary += '\n[CONTEXT: Resume analysis has been completed and shown to user]';
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
            content: 'You are an intelligent AI Career Agent powered by Qwen2.5-Coder-7B. You are helpful, friendly, and professional. You excel at analyzing resumes, matching skills, and helping candidates prepare for interviews.'
          },
          {
            role: 'user',
            content: `Your capabilities:
- Analyze resumes against job descriptions to provide match scores and skill gap analysis
- Generate targeted interview questions based on job requirements (as many as needed!)
- Provide career advice and guidance

Current conversation history:
${fullContext}
${contextSummary}

IMPORTANT INSTRUCTIONS:
- If you see that BOTH a job description and resume have been provided BUT NO analysis yet, tell the user: "Perfect! I have both your job description and resume. Let me analyze them now..."
- If analysis has been completed and user asks for interview questions or more questions, respond: "Great! I'll generate ${wantsInterviewQuestions ? 'more ' : ''}interview questions for you right away..."
- If you see a job description but NO resume yet, say: "Great! I have the job description. Now please upload your resume PDF using the attachment button."
- If you see a resume but NO job description, say: "I have your resume. Now please share the job description for the position you're interested in."
- If you see NEITHER, ask: "To get started, please share the job description you're interested in, and then upload your resume."
- IMPORTANT: If user asks for "more questions" or "another set of questions", encourage them by saying you'll generate more questions!
- Be concise and encouraging
- Don't repeat information the user already provided
- Use emojis sparingly

Respond naturally to continue the conversation:`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
);


export async function careerAgent(input: CareerAgentInput) {
    return await careerAgentFlow(input);
}
