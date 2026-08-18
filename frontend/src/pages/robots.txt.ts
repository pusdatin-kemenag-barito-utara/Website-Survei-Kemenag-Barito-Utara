export function GET() {
  const baseUrl = import.meta.env.PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "";
  const content = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(content, {
    headers: { "Content-Type": "text/plain" },
  });
}