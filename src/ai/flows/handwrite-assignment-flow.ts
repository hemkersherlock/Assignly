'use server';
/**
 * @fileOverview An AI flow for converting text into a handwritten image.
 *
 * - handwriteAssignment - A function that takes text and returns a handwritten image.
 * - HandwriteAssignmentInput - The input type for the handwriteAssignment function.
 * - HandwriteAssignmentOutput - The return type for the handwriteAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HandwriteAssignmentInputSchema = z.object({
  text: z.string().describe('The text content to be converted into a handwritten image.'),
});
export type HandwriteAssignmentInput = z.infer<typeof HandwriteAssignmentInputSchema>;

const HandwriteAssignmentOutputSchema = z.object({
  handwrittenImage: z.string().describe("A data URI of the generated handwritten image. Format: 'data:image/png;base64,<encoded_data>'."),
});
export type HandwriteAssignmentOutput = z.infer<typeof HandwriteAssignmentOutputSchema>;


export async function handwriteAssignment(input: HandwriteAssignmentInput): Promise<HandwriteAssignmentOutput> {
  return handwriteAssignmentFlow(input);
}


const prompt = ai.definePrompt({
  name: 'handwriteAssignmentPrompt',
  input: {schema: HandwriteAssignmentInputSchema},
  output: {schema: HandwriteAssignmentOutputSchema},
  prompt: `Generate a realistic image of the following text written by hand on a piece of white-lined paper.

Text:
{{{text}}}`,
});

const handwriteAssignmentFlow = ai.defineFlow(
  {
    name: 'handwriteAssignmentFlow',
    inputSchema: HandwriteAssignmentInputSchema,
    outputSchema: HandwriteAssignmentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
