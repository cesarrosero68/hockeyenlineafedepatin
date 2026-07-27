import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BUCKET = "club-logos";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("path") ?? "";
    const path = raw.replace(/^\/+/, "");

    if (!path || !/^[A-Za-z0-9._-]+$/.test(path)) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) {
      console.error("download failed", path, error?.message);
      return new Response(JSON.stringify({ error: "Not found", details: error?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(await data.arrayBuffer(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": data.type || "image/webp",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("club-logo error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
