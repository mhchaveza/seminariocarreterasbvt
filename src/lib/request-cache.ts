import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Caché de deduplicación por request. NO persiste entre peticiones: cada request
 * arranca con un Map vacío (ver `src/middleware.ts`), así el contenido siempre
 * se relee de la API. Solo evita que, dentro del renderizado de una misma
 * página, se repita la misma llamada (p.ej. `getEventLocation()` en BaseLayout,
 * Footer y la página) más de una vez.
 */

type RequestStore = Map<string, Promise<unknown>>;

const storage = new AsyncLocalStorage<RequestStore>();

/** Ejecuta `fn` con un store nuevo para el request actual. */
export function runWithRequestCache<T>(fn: () => T): T {
  return storage.run(new Map(), fn);
}

/**
 * Devuelve el resultado cacheado para `key` dentro del request actual, o ejecuta
 * `factory` y lo guarda. Fuera de un request (p.ej. durante el build) no hay
 * store: simplemente ejecuta `factory` sin deduplicar.
 */
export function cachedPerRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const store = storage.getStore();
  if (!store) return factory();

  const existing = store.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = factory();
  store.set(key, promise);
  return promise;
}
