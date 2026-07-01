import { marked } from "marked";
import { API, SITE } from "../consts";
import { cachedPerRequest } from "./request-cache";

/**
 * Consumo en RUNTIME de la API pública de Solsticio para el tenant y evento
 * configurados en `consts.ts`. Cada request vuelve a consultar la API (el
 * contenido publicado en el panel se refleja sin re-desplegar); dentro del
 * renderizado de una misma página las llamadas se deduplican vía
 * `cachedPerRequest` (ver `request-cache.ts` + `middleware.ts`).
 *
 * La agenda NO se consume desde la API (se mantiene local como colección de
 * contenido en `content.config.ts`).
 */

type ApiItem = Record<string, any>;

async function fetchResource(resource: string): Promise<ApiItem[]> {
  const url =
    `${API.baseUrl}/tenants/${encodeURIComponent(API.tenantId)}` +
    `/events/${encodeURIComponent(API.eventId)}/${resource}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(
        `[solsticio] ${resource}: HTTP ${res.status}. ` +
          "¿El evento está publicado? Se usa una lista vacía.",
      );
      return [];
    }
    const json = await res.json();
    const list = json?.[resource];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn(
      `[solsticio] ${resource}: error de red (${(error as Error).message}). ` +
        "Se usa una lista vacía.",
    );
    return [];
  }
}

/** Extrae el cuerpo Markdown de un campo que puede ser string o RichTextContent. */
function markdownBody(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "body" in value) {
    return String((value as { body?: unknown }).body ?? "");
  }
  return "";
}

/** Renderiza Markdown → HTML en runtime (para inyectar con `set:html`). */
function renderMarkdown(md: string): string {
  if (!md.trim()) return "";
  return marked.parse(md, { async: false }) as string;
}

export interface EventLocation {
  name: string;
  venue: string;
  address: string;
  city: string;
  region: string;
  country: string;
  mapUrl?: string;
}

/** Documento publicado del evento en Solsticio. */
async function fetchEventInfo(): Promise<ApiItem | null> {
  const url =
    `${API.baseUrl}/tenants/${encodeURIComponent(API.tenantId)}` +
    `/events/${encodeURIComponent(API.eventId)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.event as ApiItem) ?? null;
  } catch {
    return null;
  }
}

/**
 * Ubicación del evento gestionada desde el panel de Solsticio
 * (`event.location`). Si la API no responde o el campo está incompleto,
 * se usa `SITE.location` como respaldo para no romper el render.
 */
export async function getEventLocation(): Promise<EventLocation> {
  const event = await cachedPerRequest("event-info", fetchEventInfo);
  const loc = (event?.location ?? {}) as Record<string, unknown>;
  const text = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

  return {
    name: text(loc.name) || SITE.location.name,
    venue: text(loc.venue) || SITE.location.venue,
    address: text(loc.address) || SITE.location.address,
    city: text(loc.city) || text(event?.city) || SITE.location.city,
    region: text(loc.region) || SITE.location.region,
    country: text(loc.country) || SITE.location.country,
    mapUrl: text(loc.mapUrl) || undefined,
  };
}

export interface GalleryPhotoItem {
  url: string;
  caption?: string;
}

/**
 * Fotos de una galería publicada del evento, identificada por su slug en el
 * panel de Solsticio. Si la API no responde o la galería no existe, devuelve
 * una lista vacía para que el sitio use sus imágenes locales de respaldo.
 */
export async function getGalleryPhotos(slug: string): Promise<GalleryPhotoItem[]> {
  return cachedPerRequest(`gallery:${slug}`, () => fetchGalleryPhotos(slug));
}

async function fetchGalleryPhotos(slug: string): Promise<GalleryPhotoItem[]> {
  const url =
    `${API.baseUrl}/tenants/${encodeURIComponent(API.tenantId)}` +
    `/events/${encodeURIComponent(API.eventId)}/galleries/${encodeURIComponent(slug)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const photos = json?.gallery?.photos;
    if (!Array.isArray(photos)) return [];

    return photos
      .slice()
      .sort((a, b) => Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0))
      .map((p) => ({
        url: typeof p?.url === "string" ? p.url : "",
        caption: typeof p?.caption === "string" && p.caption.trim() ?
          p.caption.trim() :
          undefined,
      }))
      .filter((p) => p.url);
  } catch {
    return [];
  }
}

const NEWS_CATEGORIES = [
  "anuncio",
  "agenda",
  "inscripciones",
  "patrocinio",
  "convocatoria",
  "logistica",
] as const;
type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const SPONSOR_TIERS = [
  "premium",
  "avanzado",
  "esencial",
  "patrocinador",
] as const;
type SponsorTier = (typeof SPONSOR_TIERS)[number];

// Shapes con `{ id, data, ... }` para que los componentes usen `x.data.*` y
// `x.id` igual que cuando venían de las colecciones de contenido.

export interface SpeakerItem {
  id: string;
  body: string;
  bodyHtml: string;
  data: {
    name: string;
    title: string;
    organization?: string;
    country?: string;
    speakerType?: "nacional" | "internacional";
    photo?: string;
    bio?: string;
    featured: boolean;
    order: number;
  };
}

export async function getSpeakers(): Promise<SpeakerItem[]> {
  const items = await cachedPerRequest("speakers", () => fetchResource("speakers"));

  return items
    .map((s): SpeakerItem | null => {
      const id = s.slug || s.id;
      if (!id) return null;

      const body = markdownBody(s.body);
      const speakerType =
        s.speakerType === "nacional" || s.speakerType === "internacional" ?
          s.speakerType :
          undefined;

      return {
        id: String(id),
        body,
        bodyHtml: renderMarkdown(body),
        data: {
          name: s.name || s.fullName || "",
          title: s.title || s.role || "",
          organization: s.organization || s.company || undefined,
          country: s.country || undefined,
          speakerType,
          photo: s.photoUrl || s.photo || undefined,
          bio: s.bioShort || s.bio || undefined,
          featured: Boolean(s.isFeatured ?? s.featured ?? false),
          order: Number(s.order ?? s.sortOrder ?? 100),
        },
      };
    })
    .filter((s): s is SpeakerItem => s !== null)
    .sort((a, b) => a.data.order - b.data.order);
}

export interface TopicItem {
  id: string;
  data: { title: string; icon: string; order: number };
}

export async function getTopics(): Promise<TopicItem[]> {
  const items = await cachedPerRequest("topics", () => fetchResource("topics"));

  return items
    .map((t): TopicItem | null => {
      const id = t.slug || t.id;
      if (!id) return null;
      return {
        id: String(id),
        data: {
          title: t.title || "",
          icon: t.icon || "label",
          order: Number(t.order ?? t.sortOrder ?? 100),
        },
      };
    })
    .filter((t): t is TopicItem => t !== null)
    .sort((a, b) => a.data.order - b.data.order);
}

export interface SponsorItem {
  id: string;
  data: {
    name: string;
    tier: SponsorTier;
    logo?: string;
    label?: string;
    logoMaxWidth?: number;
    url?: string;
    order: number;
  };
}

export async function getSponsors(): Promise<SponsorItem[]> {
  const items = await cachedPerRequest("sponsors", () => fetchResource("sponsors"));

  return items
    .map((sp): SponsorItem | null => {
      const id = sp.slug || sp.id;
      if (!id) return null;

      const tier: SponsorTier = SPONSOR_TIERS.includes(sp.tier) ?
        sp.tier :
        (SPONSOR_TIERS.includes(sp.sponsorTier) ? sp.sponsorTier : "patrocinador");

      return {
        id: String(id),
        data: {
          name: sp.name || "",
          tier,
          logo: sp.logoUrl || sp["logo-url"] || undefined,
          label: typeof sp.label === "string" && sp.label.trim() ? sp.label.trim() : undefined,
          logoMaxWidth: Number.isFinite(Number(sp.logoMaxWidth)) ? Number(sp.logoMaxWidth) : undefined,
          url: sp.websiteUrl || sp.url || undefined,
          order: Number(sp.order ?? sp.sortOrder ?? 100),
        },
      };
    })
    .filter((sp): sp is SponsorItem => sp !== null)
    .sort((a, b) => a.data.order - b.data.order);
}

export interface NewsItem {
  id: string;
  body: string;
  bodyHtml: string;
  data: {
    title: string;
    date: Date;
    category: NewsCategory;
    tags: string[];
    excerpt: string;
    cover?: string;
    author?: string;
    draft: boolean;
  };
}

export async function getNews(): Promise<NewsItem[]> {
  const items = await cachedPerRequest("news", () => fetchResource("news"));

  return items
    .map((n): NewsItem | null => {
      const id = n.slug || n.id;
      if (!id) return null;

      const category: NewsCategory = NEWS_CATEGORIES.includes(n.category) ?
        n.category :
        "anuncio";
      const body = markdownBody(n.content) || markdownBody(n.body);

      return {
        id: String(id),
        body,
        bodyHtml: renderMarkdown(body),
        data: {
          title: n.title || "",
          date: new Date(n.date || n.publishedAt || Date.now()),
          category,
          tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
          excerpt: n.excerpt || "",
          cover: n.cover || n.coverUrl || undefined,
          author: n.author || n.authorName || undefined,
          draft: false,
        },
      };
    })
    .filter((n): n is NewsItem => n !== null)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Una novedad por su id/slug (para la página de detalle). */
export async function getNewsById(id: string): Promise<NewsItem | undefined> {
  const all = await getNews();
  return all.find((n) => n.id === id);
}
