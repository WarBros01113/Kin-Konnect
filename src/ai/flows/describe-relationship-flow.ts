
'use server';
/**
 * @fileOverview An AI flow to describe the genealogical relationship between two people based on a path.
 *
 * - describeRelationship - A function that takes a path and returns a human-readable relationship name.
 * - DescribeRelationshipInput - The input type for the flow.
 * - DescribeRelationshipOutput - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schema for AiRelationshipPathStep as it's used in the input
const AiRelationshipPathStepSchema = z.object({
  personName: z.string().describe("Name of the person in this step of the path."),
  connectionToPreviousPerson: z.string().describe("Describes how this person is related to the *previous* person in the path. For the first person, this will be 'Self' or 'Starting Point'."),
  gender: z.string().optional().describe("The gender of the person in this step (e.g., 'Male', 'Female', 'Other')."),
});

const DescribeRelationshipInputSchema = z.object({
  person1Name: z.string().describe("Name of the starting person (Person 1)."),
  person2Name: z.string().describe("Name of the target person (Person 2)."),
  person2Gender: z.string().optional().describe("The gender of the target person (Person 2). This is crucial for selecting the correct gendered term."),
  path: z.array(AiRelationshipPathStepSchema).min(1).describe("An array of steps detailing the path from Person 1 to Person 2. Each step includes a person's name and their connection to the previous person in the path."),
});

export type DescribeRelationshipInput = z.infer<typeof DescribeRelationshipInputSchema>;

const DescribeRelationshipOutputSchema = z.object({
  relationshipName: z.string().describe("The single, synthesized genealogical term for the relationship of Person 2 to Person 1 (e.g., 'Paternal Uncle', 'First Cousin Once Removed', 'Paternal Uncle\\'s Spouse', 'Self')."),
  explanation: z.string().describe("A brief explanation of how the relationship was derived from the path, using the actual names of the people involved."),
});

export type DescribeRelationshipOutput = z.infer<typeof DescribeRelationshipOutputSchema>;

export async function describeRelationship(input: DescribeRelationshipInput): Promise<DescribeRelationshipOutput> {
  if (input.path.length === 1 && input.person1Name === input.person2Name) {
    return { relationshipName: "Self (Same Person)", explanation: "This is the same person." };
  }
  return describeRelationshipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'describeRelationshipPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: DescribeRelationshipInputSchema},
  output: {schema: DescribeRelationshipOutputSchema},
  prompt: `You are a genealogy expert. Your task is to analyze a relationship path and provide a concise, gender-correct genealogical term and a detailed explanation for the relationship of Person 2 to Person 1.

**Context:**
- The starting person's name is **{{{person1Name}}}**.
- The target person's name is **{{{person2Name}}}**, and their gender is **{{{person2Gender}}}**.

**Relationship Path from {{{person1Name}}} to {{{person2Name}}}:**
This path shows the chain of connections. Each step describes the person's relationship to the one listed *before* it.
{{#each path}}
  - **{{personName}}** (is the **{{connectionToPreviousPerson}}** of the person above, Gender: {{gender}})
{{/each}}

**Instructions:**

1.  **Analyze the ENTIRE path** to understand the full chain of relationships, starting from {{{person1Name}}}.

2.  **Determine the final \`relationshipName\`.** This is the most critical step. The \`relationshipName\` MUST be a single, synthesized genealogical term describing Person 2's relationship to Person 1.
    - **DO NOT** just use the last connection in the path (e.g., "Spouse"). You must combine all steps.
    - **Example 1:** Path is "Admin -> Dad (Father) -> Perippa (Brother)". The relationship of Perippa to Admin is **"Paternal Uncle"**.
    - **Example 2:** Path is "Admin -> Dad (Father) -> Perippa (Brother) -> Peri Wife (Spouse)". The relationship of Peri Wife to Admin is **"Paternal Uncle's Wife"** or **"Paternal Aunt-in-law"**.
    - **Example 3:** Path is "User -> Mom (Mother) -> Sibling (Sister) -> Child (Son)". The relationship of Child to User is **"Nephew"** (specifically, a maternal nephew).
    - **Example 4:** A brother's spouse who is 'Female' is a **"Sister-in-law"**. A sister's spouse who is 'Male' is a **"Brother-in-law"**. Use the gender of {{{person2Name}}} to be precise.

3.  **Provide a clear, name-based \`explanation\`.**
    The explanation MUST trace the path using the names of the intermediate people. This is essential for clarity.
    - **Correct Explanation:** For a path like "Admin -> Dad (Father) -> Perippa (Brother) -> Peri Wife (Spouse)", the explanation for Peri Wife's relationship to Admin MUST be: "**Peri Wife** is the spouse of **Perippa**, who is the brother of **Admin's** father, **Dad**."
    - **Incorrect Explanation:** "This person is the spouse of the brother of Person 1's father." (This is too generic and unhelpful).

Output your response in the specified JSON format with both \`relationshipName\` and \`explanation\`.
`,
});

const describeRelationshipFlow = ai.defineFlow(
  {
    name: 'describeRelationshipFlow',
    inputSchema: DescribeRelationshipInputSchema,
    outputSchema: DescribeRelationshipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
