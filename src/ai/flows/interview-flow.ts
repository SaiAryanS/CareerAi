'use server';
/**
 * @fileOverview Implements AI flows for generating interview questions and evaluating answers.
 *
 * - generateInterviewQuestions - A function that creates interview questions based on a job description.
 * - evaluateInterviewAnswer - A function that evaluates a user's answer to a specific question.
 */

import { ai } from '@/ai/genkit';
import {
  GenerateQuestionsInputSchema,
  GenerateQuestionsOutputSchema,
  EvaluateAnswerInputSchema,
  EvaluateAnswerOutputSchema,
  type GenerateQuestionsOutput,
  type EvaluateAnswerOutput,
} from '@/ai/schemas';
import { z } from 'zod';


export async function generateInterviewQuestions(
  jobDescription: string
): Promise<GenerateQuestionsOutput> {
  return generateInterviewQuestionsFlow({ jobDescription });
}

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: { schema: GenerateQuestionsInputSchema },
  output: { schema: GenerateQuestionsOutputSchema },
  config: {
    temperature: 0.8,
  },
  prompt: `You are a senior hiring manager preparing for an interview. Based on the provided Job Description, generate a list of exactly 5 interview questions. The questions should cover the key skills and responsibilities mentioned. They MUST progressively increase in difficulty:
- Question 1: A basic introductory or screening question.
- Questions 2-3: Intermediate questions about specific skills or experiences.
- Questions 4-5: Advanced, scenario-based, or behavioral questions that require deep thought.

You MUST respond with valid JSON only. Do not include markdown code blocks, explanations, or any text outside the JSON object.

Job Description:
{{{jobDescription}}}
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async (input) => {
    try {
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
              content: 'You are a senior hiring manager preparing for an interview. You generate structured interview questions in JSON format.'
            },
            {
              role: 'user',
              content: `Based on the provided Job Description, generate a list of exactly 5 interview questions. The questions should cover the key skills and responsibilities mentioned. They MUST progressively increase in difficulty:
- Question 1: A basic introductory or screening question.
- Questions 2-3: Intermediate questions about specific skills or experiences.
- Questions 4-5: Advanced, scenario-based, or behavioral questions that require deep thought.

Job Description:
${input.jobDescription}

You MUST respond with ONLY a valid JSON object matching this structure (no markdown, no explanation, just the raw JSON):
{"questions": ["<question1>", "<question2>", "<question3>", "<question4>", "<question5>"]}`
            }
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LM Studio API error response:', errorText);
        throw new Error(`LM Studio API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content;

      // Clean up the response
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const output = JSON.parse(responseText);
      
      // Validate output
      if (!output || !Array.isArray(output.questions) || output.questions.length !== 5) {
        throw new Error('Invalid response from model - expected array of 5 questions');
      }
      
      return output;
    } catch (error) {
      console.error('Error in generateInterviewQuestionsFlow:', error);
      
      // Return default questions if the model fails
      return {
        questions: [
          'Tell me about yourself and your relevant experience.',
          'What interests you about this role?',
          'Can you describe a challenging project you worked on?',
          'How do you stay current with industry trends and technologies?',
          'Where do you see yourself in the next few years?',
        ],
      };
    }
  }
);


export async function evaluateInterviewAnswer(
  input: z.infer<typeof EvaluateAnswerInputSchema>
): Promise<EvaluateAnswerOutput> {
  return evaluateInterviewAnswerFlow(input);
}

const evaluateAnswerPrompt = ai.definePrompt({
  name: 'evaluateAnswerPrompt',
  input: { schema: EvaluateAnswerInputSchema },
  output: { schema: EvaluateAnswerOutputSchema },
  config: {
    temperature: 0.5,
  },
  prompt: `You are an expert interviewer evaluating a candidate's response. Analyze the user's answer in the context of the Job Description and the specific Question asked.

Your evaluation should be fair and constructive. Avoid being overly harsh for minor omissions, but remain realistic about the quality of the answer. A good answer is clear, relevant, and demonstrates the skills required in the job description.

Job Description:
{{{jobDescription}}}

Question Asked:
"{{{question}}}"

User's Answer:
"{{{userAnswer}}}"

Provide a score from 1 to 10 based on the quality of the answer (clarity, relevance, accuracy). Also, provide concise, constructive feedback explaining the score. Be specific about what was good and what could be improved.

You MUST respond with valid JSON only. Do not include markdown code blocks, explanations, or any text outside the JSON object.`,
});

const evaluateInterviewAnswerFlow = ai.defineFlow(
  {
    name: 'evaluateInterviewAnswerFlow',
    inputSchema: EvaluateAnswerInputSchema,
    outputSchema: EvaluateAnswerOutputSchema,
  },
  async (input) => {
    try {
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
              content: 'You are an expert interviewer evaluating candidate responses. You provide scores and feedback in JSON format.'
            },
            {
              role: 'user',
              content: `Analyze the user's answer in the context of the Job Description and the specific Question asked.

Your evaluation should be fair and constructive. Avoid being overly harsh for minor omissions, but remain realistic about the quality of the answer. A good answer is clear, relevant, and demonstrates the skills required in the job description.

Job Description:
${input.jobDescription}

Question Asked:
"${input.question}"

User's Answer:
"${input.userAnswer}"

Provide a score from 1 to 10 based on the quality of the answer (clarity, relevance, accuracy). Also, provide concise, constructive feedback explaining the score. Be specific about what was good and what could be improved.

You MUST respond with ONLY a valid JSON object matching this structure (no markdown, no explanation, just the raw JSON):
{"score": <number 1-10>, "feedback": "<constructive feedback string>"}`
            }
          ],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LM Studio API error response:', errorText);
        throw new Error(`LM Studio API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content;

      // Clean up the response
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const output = JSON.parse(responseText);
      
      // Validate output
      if (!output || typeof output.score !== 'number' || !output.feedback) {
        throw new Error('Invalid response from model - missing score or feedback');
      }
      
      return output;
    } catch (error) {
      console.error('Error in evaluateInterviewAnswerFlow:', error);
      
      // Return default evaluation if the model fails
      return {
        score: 5,
        feedback: 'Unable to evaluate answer due to an error with the AI model. Please try again.',
      };
    }
  }
);
