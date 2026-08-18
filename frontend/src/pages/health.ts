export function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "SI-ARUS Kemenag Barito Utara Frontend",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
