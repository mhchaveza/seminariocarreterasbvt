import { defineMiddleware } from "astro:middleware";
import { runWithRequestCache } from "./lib/request-cache";

// Envuelve cada request en un store de caché por petición, de modo que las
// llamadas a la API de Solsticio se deduplican dentro del renderizado de una
// misma página, pero se vuelven a consultar en el siguiente request.
export const onRequest = defineMiddleware((_context, next) =>
  runWithRequestCache(() => next()),
);
