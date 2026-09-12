import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "twilio";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function twiml(message: string) {
  const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`, {
    status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicUrl = process.env.TWILIO_WEBHOOK_URL;
  const signature = request.headers.get("x-twilio-signature") || "";
  if (authToken && publicUrl && !validateRequest(authToken, signature, publicUrl, params)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return twiml("AgroVoz todavía no está conectado a la base de datos.");

  const messageSid = params.MessageSid;
  const sourcePhone = (params.From || "").replace("whatsapp:", "");
  const mediaUrl = params.MediaUrl0 || null;
  const mediaType = params.MediaContentType0 || null;
  let mediaPath: string | null = null;

  if (mediaUrl && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}` },
    });
    if (response.ok) {
      const bytes = await response.arrayBuffer();
      const extension = mediaType?.split("/")[1]?.replace("ogg; codecs=opus", "ogg") || "bin";
      mediaPath = `${new Date().toISOString().slice(0, 10)}/${messageSid}.${extension}`;
      const { error } = await supabase.storage.from("whatsapp-media").upload(mediaPath, bytes, { contentType: mediaType || "application/octet-stream", upsert: false });
      if (error) mediaPath = null;
    }
  }

  const { error } = await supabase.from("applications").upsert({
    message_sid: messageSid, source_phone: sourcePhone, media_type: mediaType, media_path: mediaPath,
    transcript: params.Body || null, status: "pendiente_revision", confidence: params.Body ? 0.45 : null,
  }, { onConflict: "message_sid", ignoreDuplicates: true });
  if (error) return twiml("No pudimos guardar el registro. Volvé a intentarlo más tarde.");
  return twiml("Recibido por AgroVoz. El registro quedó pendiente de revisión del supervisor.");
}

