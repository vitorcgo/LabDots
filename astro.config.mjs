import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Endereço público do site, usado nas tags de prévia (LinkedIn, WhatsApp) que exigem URL completa.
// Na Vercel vem sozinho do domínio de produção; com domínio próprio, defina SITE_URL no painel.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL ?? (vercel ? `https://${vercel}` : undefined);

export default defineConfig({
  site,
  vite: {
    plugins: [tailwindcss()],
  },
});
