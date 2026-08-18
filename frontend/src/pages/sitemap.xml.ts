export function GET() {
  const baseUrl = import.meta.env.PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "";
  const now = new Date();
  const lastMod = now.toISOString().slice(0, 10);

  const routes: { path: string; freq: string; priority: string }[] = [
    { path: "", freq: "daily", priority: "1.0" },
    { path: "/survei", freq: "daily", priority: "0.9" },
    { path: "/hasil/ipkp", freq: "hourly", priority: "0.8" },
    { path: "/hasil/ipak", freq: "hourly", priority: "0.8" },
    { path: "/profil", freq: "monthly", priority: "0.5" },
  ];

  const urls = routes
    .map(
      (route) => `<url>
  <loc>${baseUrl}${route.path}</loc>
  <lastmod>${lastMod}</lastmod>
  <changefreq>${route.freq}</changefreq>
  <priority>${route.priority}</priority>
</url>`
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}