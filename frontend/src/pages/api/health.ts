export function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}