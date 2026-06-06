import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		publishedAt: z.coerce.date(),
		updatedAt: z.coerce.date().optional(),
		type: z.enum(['Thought', 'Deep-Dive', 'Brief Notes', 'Review']),
		categories: z.array(z.enum(['History', 'Thought', 'Personal', 'Fiction', 'Technology', 'Systems'])),
		tags: z.array(z.string()),
		readingMinutes: z.number().int().positive(),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { blog };
