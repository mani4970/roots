import manifest from "@/public/manifest.json";

export const dynamic = "force-static";

export function GET() {
  // The original manifest derives its app ID from the root start URL.
  return Response.json({ ...manifest, id: manifest.start_url, orientation: "any" }, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
