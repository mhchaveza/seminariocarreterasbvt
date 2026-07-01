import type { Loader, LoaderContext } from "astro/loaders";
import { API, SITE } from "../consts";

/**
 * Loaders del Content Layer de Astro que consumen la API pública de Solsticio
 * para el tenant y evento configurados en `consts.ts`. Mantienen el mismo shape
 * que los esquemas de `content.config.ts`, por lo que los componentes del sitio
 * no requieren cambios.
 *
 * La agenda NO se consume desde la API (se mantiene local).
 */

type ApiItem = Record<string, any>;

async function fetchResource(
  resource: string,
  logger?: LoaderContext["logger"],
): Promise<ApiItem[]> {
  const url =
    `${API.baseUrl}/tenants/${encodeURIComponent(API.tenantId)}` +
    `/events/${encodeURIComponent(API.eventId)}/${resource}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger?.warn(
        `[solsticio] ${resource}: HTTP ${res.status}. ` +
          "¿El evento está publicado? Se usa una lista vacía.",
      );
      return [];
    }
    const json = await res.json();
    const list = json?.[resource];
    const items = Array.isArray(list) ? list : [];
    logger?.info(`[solsticio] ${resource}: ${items.length} desde la API (${API.eventId})`);
    return items;
  } catch (error) {
    logger?.warn(
      `[solsticio] ${resource}: error de red (${(error as Error).message}). ` +
        "Se usa una lista vacía.",
    );
    return [];
  }
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

let eventInfoPromise: Promise<ApiItem | null> | undefined;

/** Documento publicado del evento en Solsticio, cacheado para todo el build. */
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
 * se usa `SITE.location` como respaldo para no romper el build.
 */
export async function getEventLocation(): Promise<EventLocation> {
  eventInfoPromise ??= fetchEventInfo();
  const event = await eventInfoPromise;
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

const galleryPromises = new Map<string, Promise<GalleryPhotoItem[]>>();

/**
 * Fotos de una galería publicada del evento, identificada por su slug en el
 * panel de Solsticio. Si la API no responde o la galería no existe, devuelve
 * una lista vacía para que el sitio use sus imágenes locales de respaldo.
 * Cacheado por slug para todo el build.
 */
export async function getGalleryPhotos(slug: string): Promise<GalleryPhotoItem[]> {
  let promise = galleryPromises.get(slug);
  if (!promise) {
    promise = fetchGalleryPhotos(slug);
    galleryPromises.set(slug, promise);
  }
  return promise;
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

/** Extrae el cuerpo Markdown de un campo que puede ser string o RichTextContent. */
function markdownBody(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "body" in value) {
    return String((value as { body?: unknown }).body ?? "");
  }
  return "";
}

const NEWS_CATEGORIES = [
  "anuncio",
  "agenda",
  "inscripciones",
  "patrocinio",
  "convocatoria",
  "logistica",
] as const;

const SPONSOR_TIERS = [
  "premium",
  "avanzado",
  "esencial",
  "patrocinador",
] as const;

export function speakersLoader(): Loader {
  return {
    name: "solsticio:speakers",
    load: async ({ store, parseData, renderMarkdown, generateDigest, logger }) => {
      const items = await fetchResource("speakers", logger);
      store.clear();

      for (const s of items) {
        const id = s.slug || s.id;
        if (!id) continue;

        const data = await parseData({
          id,
          data: {
            name: s.name || s.fullName || "",
            title: s.title || s.role || "",
            organization: s.organization || s.company || undefined,
            country: s.country || undefined,
            speakerType:
              s.speakerType === "nacional" || s.speakerType === "internacional" ?
                s.speakerType :
                undefined,
            photo: s.photoUrl || s.photo || undefined,
            bio: s.bioShort || s.bio || undefined,
            featured: Boolean(s.isFeatured ?? s.featured ?? false),
            order: Number(s.order ?? s.sortOrder ?? 100),
          },
        });

        const md = markdownBody(s.body);
        const rendered = md ? await renderMarkdown(md) : undefined;
        store.set({ id, data, body: md, rendered, digest: generateDigest(s) });
      }
    },
  };
}

export function topicsLoader(): Loader {
  return {
    name: "solsticio:topics",
    load: async ({ store, parseData, generateDigest, logger }) => {
      const items = await fetchResource("topics", logger);
      store.clear();

      for (const t of items) {
        const id = t.slug || t.id;
        if (!id) continue;

        const data = await parseData({
          id,
          data: {
            title: t.title || "",
            icon: t.icon || "label",
            order: Number(t.order ?? t.sortOrder ?? 100),
          },
        });

        store.set({ id, data, digest: generateDigest(t) });
      }
    },
  };
}

export function sponsorsLoader(): Loader {
  return {
    name: "solsticio:sponsors",
    load: async ({ store, parseData, generateDigest, logger }) => {
      const items = await fetchResource("sponsors", logger);
      store.clear();

      for (const sp of items) {
        const id = sp.slug || sp.id;
        if (!id) continue;

        const tier = SPONSOR_TIERS.includes(sp.tier) ?
          sp.tier :
          (SPONSOR_TIERS.includes(sp.sponsorTier) ? sp.sponsorTier : "patrocinador");

        const data = await parseData({
          id,
          data: {
            name: sp.name || "",
            tier,
            logo: sp.logoUrl || sp["logo-url"] || undefined,
            url: sp.websiteUrl || sp.url || undefined,
            order: Number(sp.order ?? sp.sortOrder ?? 100),
          },
        });

        store.set({ id, data, digest: generateDigest(sp) });
      }
    },
  };
}

export function newsLoader(): Loader {
  return {
    name: "solsticio:news",
    load: async ({ store, parseData, renderMarkdown, generateDigest, logger }) => {
      const items = await fetchResource("news", logger);
      store.clear();

      for (const n of items) {
        const id = n.slug || n.id;
        if (!id) continue;

        const category = NEWS_CATEGORIES.includes(n.category) ? n.category : "anuncio";

        const data = await parseData({
          id,
          data: {
            title: n.title || "",
            date: n.date || n.publishedAt || Date.now(),
            category,
            tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
            excerpt: n.excerpt || "",
            author: n.author || n.authorName || undefined,
            draft: false,
          },
        });

        const md = markdownBody(n.content) || markdownBody(n.body);
        const rendered = md ? await renderMarkdown(md) : undefined;
        store.set({ id, data, body: md, rendered, digest: generateDigest(n) });
      }
    },
  };
}
