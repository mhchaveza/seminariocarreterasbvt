export const SITE = {
  name: "II Seminario Internacional de Carreteras de Bajo Volumen de Tránsito",
  shortName: "II Seminario Internacional",
  url: "https://seminariocarreteras.udem.edu.co",
  description:
    "Espacio académico y técnico de la Universidad de Medellín que reúne expertos, entidades públicas, empresas y academia para compartir soluciones innovadoras en infraestructura vial de bajo volumen.",
  locale: "es-CO",
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  location: {
    name: "Universidad de Medellín",
    venue: "Auditorio del bloque administrativo Héctor Ospina Botero",
    address: "Carrera 87 No. 30-65",
    city: "Medellín",
    region: "Antioquia",
    country: "Colombia",
  },
  organizer: {
    name: "Universidad de Medellín",
    url: "https://udemedellin.edu.co",
  },
  contact: {
    comercial: { name: "Claudia Cálad", phone: "+57 318 8896944" },
    logistica: { name: "Mary Barrera", phone: "+57 310 5600518" },
    email: "seminariointernacional_lvr@udemedellin.edu.co",
  },
};

export const NAV_LINKS = [
  { href: "/#objetivo", label: "Objetivo" },
  { href: "/#ejes", label: "Ejes Temáticos" },
  { href: "/#agenda", label: "Agenda" },
  { href: "/#panelistas", label: "Panelistas" },
  /* { href: "/novedades", label: "Novedades" }, */
  { href: "/patrocinio", label: "Patrocinio" },
 /*  { href: "/inscripcion", label: "Inscripción" }, */
];

// API de Solsticio (panel de eventos) — el sitio consume el contenido publicado
// de este tenant y evento. Sobreescribible con variables de entorno en build.
export const API = {
  baseUrl:
    import.meta.env.SOLSTICIO_API_URL ?? "https://api-32lumq5syq-uc.a.run.app",
  tenantId:
    import.meta.env.SOLSTICIO_TENANT_ID ?? "tenant_VrI54uzXeHTF8velKZr7HdLpQuB3",
  eventId: import.meta.env.SOLSTICIO_EVENT_ID ?? "9vFAfi6duLPxFXuTtS2k",
};
