import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import {
  newsLoader,
  speakersLoader,
  sponsorsLoader,
  topicsLoader,
} from "./lib/solsticio";

// speakers, sponsors, topics y news se consumen desde la API de Solsticio.
// La agenda se mantiene local (no se sirve por la API).

const speakers = defineCollection({
  loader: speakersLoader(),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    organization: z.string().optional(),
    country: z.string().optional(),
    speakerType: z.enum(["nacional", "internacional"]).optional(),
    photo: z.string().optional(),
    bio: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

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

const sponsors = defineCollection({
  loader: sponsorsLoader(),
  // `logo` ahora es una URL (string) servida por la API, no un asset local.
  schema: z.object({
    name: z.string(),
    tier: z.enum(["premium", "avanzado", "esencial", "patrocinador"]),
    logo: z.string().optional(),
    url: z.string().url().optional(),
    order: z.number().default(100),
  }),
});

const topics = defineCollection({
  loader: topicsLoader(),
  schema: z.object({
    title: z.string(),
    icon: z.string(),
    order: z.number().default(100),
  }),
});

const news = defineCollection({
  loader: newsLoader(),
  // `cover` ahora es una URL (string) opcional servida por la API.
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum([
      "anuncio",
      "agenda",
      "inscripciones",
      "patrocinio",
      "convocatoria",
      "logistica",
    ]),
    tags: z.array(z.string()).default([]),
    excerpt: z.string(),
    cover: z.string().optional(),
    author: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { speakers, agenda, sponsors, topics, news };
