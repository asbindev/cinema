'use server';

/**
 * @fileOverview A movie description AI agent.
 *
 * - generateMovieDescription - A function that generates movie descriptions.
 * - GenerateMovieDescriptionInput - The input type for the generateMovieDescription function.
 * - GenerateMovieDescriptionOutput - The return type for the generateMovieDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMovieDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the movie.'),
  genre: z.string().describe('The genre of the movie.'),
  actors: z.string().describe('The main actors in the movie.'),
  director: z.string().describe('The director of the movie.'),
  plotKeywords: z.string().describe('Keywords describing the plot of the movie.'),
});
export type GenerateMovieDescriptionInput = z.infer<
  typeof GenerateMovieDescriptionInputSchema
>;

const GenerateMovieDescriptionOutputSchema = z.object({
  description: z.string().describe('A description of the movie.'),
});
export type GenerateMovieDescriptionOutput = z.infer<
  typeof GenerateMovieDescriptionOutputSchema
>;

export async function generateMovieDescription(
  input: GenerateMovieDescriptionInput
): Promise<GenerateMovieDescriptionOutput> {
  return generateMovieDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMovieDescriptionPrompt',
  input: {schema: GenerateMovieDescriptionInputSchema},
  output: {schema: GenerateMovieDescriptionOutputSchema},
  prompt: `You are a movie expert and will generate a description of the movie given the following information:

Title: {{{title}}}
Genre: {{{genre}}}
Actors: {{{actors}}}
Director: {{{director}}}
Plot Keywords: {{{plotKeywords}}}

Write a compelling and concise description of the movie that will entice users to watch it.`,
});

const generateMovieDescriptionFlow = ai.defineFlow(
  {
    name: 'generateMovieDescriptionFlow',
    inputSchema: GenerateMovieDescriptionInputSchema,
    outputSchema: GenerateMovieDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
