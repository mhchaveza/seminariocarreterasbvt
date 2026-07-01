import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// speakers, sponsors, topics y news se consumen en RUNTIME desde la API de
// Solsticio (ver `src/lib/solsticio.ts`), no como colecciones de contenido.
// La agenda se mantiene local (no se sirve por la API).

const agenda = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/agenda" }),
  schema: z.object({
    day: z.number().min(1).max(2),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    title: z.string(),
    type: z.enum([
      "conferencia",
      "panel",
      "taller",
      "pausa",
      "ceremonia",
      "networking",
    ]),
    speaker: z.string().optional(),
    room: z.string().optional(),
    description: z.string().optional(),
    order: z.number().default(100),
  }),
});

export const collections = { agenda };
