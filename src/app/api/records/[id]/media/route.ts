import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const { id } = await context.params;
  const { data: record, error: recordError } = await supabase
    .from("applications")
    .select("media_path")
    .eq("id", id)
    .single();

  if (recordError || !record?.media_path) {
    return NextResponse.json({ error: "El registro no tiene un archivo asociado" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("whatsapp-media")
    .createSignedUrl(record.media_path, 10 * 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "No se pudo abrir el archivo" }, { status: 500 });
  }

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
