export function GET() {
  const baseUrl = (
    import.meta.env.PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    ""
  ).replace(/\/+$/, "");
  const now = new Date();
  const lastMod = now.toISOString().slice(0, 10);

  // 1. Static Primary and Sub-Menu Routes
  const staticRoutes: { path: string; freq: string; priority: string }[] = [
    { path: "", freq: "daily", priority: "1.0" },
    { path: "/survei", freq: "daily", priority: "0.9" },
    { path: "/hasil", freq: "hourly", priority: "0.9" },
    { path: "/hasil/ipkp", freq: "hourly", priority: "0.8" },
    { path: "/hasil/ipak", freq: "hourly", priority: "0.8" },
    { path: "/barcode", freq: "weekly", priority: "0.7" },
    { path: "/profil", freq: "monthly", priority: "0.7" },
    { path: "/arsip", freq: "monthly", priority: "0.7" },
  ];

  // 2. Dynamic Archive Routes (IPKP & IPAK for all existing periods)
  const cYear = now.getFullYear();
  const cQuarter = Math.floor(now.getMonth() / 3) + 1;
  const startYear = 2026;
  const startQuarter = 2;

  const dynamicArchiveRoutes: { path: string; freq: string; priority: string }[] = [];

  for (let y = cYear; y >= startYear; y--) {
    const qStart = y === startYear ? startQuarter : 1;
    const qEnd = y === cYear ? cQuarter : 4;

    for (let q = qStart; q <= qEnd; q++) {
      dynamicArchiveRoutes.push(
        { path: `/arsip/ipkp/${y}/q${q}`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/q${q}`, freq: "monthly", priority: "0.6" }
      );
    }

    if (qEnd >= 2) {
      dynamicArchiveRoutes.push(
        { path: `/arsip/ipkp/${y}/s1`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/s1`, freq: "monthly", priority: "0.6" }
      );
    }

    if (qEnd >= 4) {
      dynamicArchiveRoutes.push(
        { path: `/arsip/ipkp/${y}/s2`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/s2`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipkp/${y}/tahunan`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/tahunan`, freq: "monthly", priority: "0.6" }
      );
    }
  }

  const allRoutes = [...staticRoutes, ...dynamicArchiveRoutes];

  const urls = allRoutes
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
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}