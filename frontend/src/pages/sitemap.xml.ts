import { createClient } from "@/lib/supabase/client";

export async function GET() {
  const baseUrl = (
    import.meta.env.PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    "https://survei.kemenag-baritoutara.com"
  ).replace(/\/+$/, "");

  const now = new Date();
  const lastMod = now.toISOString().slice(0, 10);

  // 1. Static Primary and Secondary Routes with specific metadata & images
  interface RouteItem {
    path: string;
    freq: string;
    priority: string;
    images?: { url: string; title: string; caption: string }[];
  }

  const staticRoutes: RouteItem[] = [
    {
      path: "",
      freq: "daily",
      priority: "1.0",
      images: [
        {
          url: `${baseUrl}/arus.webp`,
          title: "SI-ARUS Logo",
          caption: "Sistem Informasi Analisis Rekapitulasi Ulasan Survei Kemenag Barito Utara",
        },
        {
          url: `${baseUrl}/maklumat-pelayanan.webp`,
          title: "Maklumat Pelayanan",
          caption: "Maklumat Pelayanan PTSP Kemenag Barito Utara",
        },
        {
          url: `${baseUrl}/hapakat.webp`,
          title: "Tata Nilai HAPAKAT",
          caption: "Harmonis, Amanah, Profesional, Akuntabel, Kreatif, Adil, Transparan",
        },
      ],
    },
    {
      path: "/survei",
      freq: "daily",
      priority: "0.9",
      images: [
        {
          url: `${baseUrl}/maklumat-pelayanan.webp`,
          title: "Maklumat Pelayanan PTSP",
          caption: "Standar Layanan Publik Kemenag Barito Utara",
        },
      ],
    },
    {
      path: "/hasil",
      freq: "hourly",
      priority: "0.9",
    },
    {
      path: "/hasil/ipkp",
      freq: "hourly",
      priority: "0.8",
    },
    {
      path: "/hasil/ipak",
      freq: "hourly",
      priority: "0.8",
    },
    {
      path: "/barcode",
      freq: "weekly",
      priority: "0.7",
    },
    {
      path: "/profil",
      freq: "monthly",
      priority: "0.7",
      images: [
        {
          url: `${baseUrl}/kemenag.svg`,
          title: "Kementerian Agama RI Logo",
          caption: "Logo Resmi Kementerian Agama Republik Indonesia",
        },
      ],
    },
    {
      path: "/arsip",
      freq: "weekly",
      priority: "0.7",
    },
  ];

  // 2. Dynamic Service Routes (from Database)
  const serviceRoutes: RouteItem[] = [];
  try {
    const supabase = createClient();
    if (supabase) {
      const { data: services } = await supabase
        .from("services")
        .select("id, name")
        .eq("is_active", true);

      if (Array.isArray(services)) {
        for (const s of services) {
          serviceRoutes.push({
            path: `/survei/layanan/${s.id}`,
            freq: "weekly",
            priority: "0.8",
          });
        }
      }
    }
  } catch {
    // Graceful fallback if database query during sitemap generation is unavailable
  }

  // 3. Dynamic Archive Routes (IPKP & IPAK for all periods)
  const cYear = now.getFullYear();
  const cQuarter = Math.floor(now.getMonth() / 3) + 1;
  const startYear = 2026;
  const startQuarter = 1;

  const dynamicArchiveRoutes: RouteItem[] = [];

  for (let y = cYear; y >= startYear; y--) {
    const qStart = y === startYear ? startQuarter : 1;
    const qEnd = y === cYear ? cQuarter : 4;

    for (let q = qStart; q <= qEnd; q++) {
      dynamicArchiveRoutes.push(
        { path: `/arsip/ipkp/${y}/q${q}`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/q${q}`, freq: "monthly", priority: "0.6" },
      );
    }

    if (qEnd >= 2) {
      dynamicArchiveRoutes.push(
        { path: `/arsip/ipkp/${y}/s1`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/s1`, freq: "monthly", priority: "0.6" },
      );
    }

    if (qEnd >= 4) {
      dynamicArchiveRoutes.push(
        { path: `/arsip/ipkp/${y}/s2`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/s2`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipkp/${y}/tahunan`, freq: "monthly", priority: "0.6" },
        { path: `/arsip/ipak/${y}/tahunan`, freq: "monthly", priority: "0.6" },
      );
    }
  }

  const allRoutes = [...staticRoutes, ...serviceRoutes, ...dynamicArchiveRoutes];

  const urlsXml = allRoutes
    .map((route) => {
      const loc = `${baseUrl}${route.path}`;
      const imageTags = (route.images || [])
        .map(
          (img) => `    <image:image>
      <image:loc>${img.url}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`
        )
        .join("\n");

      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${route.freq}</changefreq>
    <priority>${route.priority}</priority>
    <xhtml:link rel="alternate" hreflang="id" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="en" href="${loc}?lang=en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />
${imageTags ? imageTags + "\n" : ""}  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, max-age=7200, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}