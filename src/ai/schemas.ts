/**
 * @fileOverview Defines the Zod schemas and TypeScript types for all AI flows.
 * This file does NOT use the 'use server' directive, allowing schemas and types
 * to be safely imported into both server and client components.
 */

import { z } from 'zod';

// Schemas for: skill-matching.ts
export const AnalyzeSkillsInputSchema = z.object({
  jobDescription: z.string().describe('The job description for the role.'),
  resume: z.string().describe('The text content of the resume.'),
});
export type AnalyzeSkillsInput = z.infer<typeof AnalyzeSkillsInputSchema>;

export const AnalyzeSkillsOutputSchema = z.object({
  matchScore: z
    .number()
    .describe('Match score (0–100) between the resume and job description.'),
  scoreRationale: z
    .string()
    .describe('Explanation of the score, referencing core vs. preferred skills and project quality.'),
  matchingSkills: z
    .array(z.string())
    .describe('Skills required by the job and found in the resume (explicitly or via mapping).'),
  missingSkills: z
    .array(z.string())
    .describe('Skills required by the job but missing from the resume.'),
  impliedSkills: z
    .string()
    .describe(
      'Brief narrative of inferred skills with examples. Ex: "Built REST API with Express.js → implies Node.js & API Development."'
    ),
  status: z
    .string()
    .describe('Status based on match score: "Approved" (70-100, strong match), "Needs Improvement" (55-69), or "Not a Match" (0-54).'),
});
export type AnalyzeSkillsOutput = z.infer<typeof AnalyzeSkillsOutputSchema>;


// Schemas for: interview-flow.ts
export const GenerateQuestionsInputSchema = z.object({
    jobDescription: z.string().describe('The full job description text.'),
});
  
export const GenerateQuestionsOutputSchema = z.object({
    questions: z
      .array(z.string())
      .length(5)
      .describe(
        'An array of exactly 5 interview questions. The questions must progressively increase in difficulty, from basic screening to more complex, scenario-based ones.'
      ),
});
export type GenerateQuestionsOutput = z.infer<
    typeof GenerateQuestionsOutputSchema
>;

export const EvaluateAnswerInputSchema = z.object({
    jobDescription: z.string().describe('The full job description text.'),
    question: z.string().describe('The interview question that was asked.'),
    userAnswer: z.string().describe("The user's answer to the question."),
});
  
export const EvaluateAnswerOutputSchema = z.object({
    score: z
      .number()
      .describe(
        'A score from 1 to 10 for the answer, based on relevance, clarity, and technical accuracy.'
      ),
    feedback: z
      .string()
      .describe(
        'Constructive feedback on the answer, highlighting strengths and areas for improvement.'
      ),
});
export type EvaluateAnswerOutput = z.infer<typeof EvaluateAnswerOutputSchema>;


// Schemas for: agent-flow.ts
export const CareerAgentInputSchema = z.object({
    history: z.array(z.any()),
    prompt: z.string(),
});
export type CareerAgentInput = z.infer<typeof CareerAgentInputSchema>;
