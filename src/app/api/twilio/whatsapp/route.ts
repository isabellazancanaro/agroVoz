import { after, NextRequest, NextResponse } from "next/server";
import twilio, { validateRequest } from "twilio";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { processApplication } from "@/lib/ai/process-application";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { registerDefinitions } from "@/lib/senasa-records";

export const runtime = "nodejs";
export const maxDuration = 300;

type Choice = { id: string; item: string; description?: string };
type Session = { step: "inactive" | "selecting_establishment" | "selecting_register" | "awaiting_evidence" | "awaiting_missing_data"; establishment_id: string | null; register_number: number | null; application_id: string | null };

function xmlResponse(message?: string) {
  const safe = message?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = safe ? `<Response><Message>${safe}</Message></Response>` : "<Response/>";
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>${body}`, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

function numbered(body: string, choices: Choice[]) {
  const icons = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  const options = choices.map((choice, index) => `${icons[index] || `${index + 1}.`} *${choice.item}*${choice.description ? `\n   ${choice.description}` : ""}`).join("\n\n");
  return `${body}\n\n${options}\n\n↩️ *Respondé solamente con el número de la opción.*`;
}

async function sendPicker(to: string, body: string, button: string, choices: Choice[]) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SANDBOX_NUMBER;
  if (process.env.TWILIO_ENABLE_INTERACTIVE_LISTS !== "true" || !accountSid || !authToken || !from || !choices.length) return false;
  try {
    const client = twilio(accountSid, authToken);
    const content = await client.content.v1.contents.create({
      friendlyName: `agrovoz-${Date.now()}`, language: "es",
      types: { twilioListPicker: { body, button, items: choices } },
    });
    await client.messages.create({ from, to: `whatsapp:${to}`, contentSid: content.sid });
    return true;
  } catch (error) {
    console.error("No se pudo enviar el selector de Twilio; se usará texto numerado.", error);
    return false;
  }
}

async function sendText(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SANDBOX_NUMBER;
  if (!accountSid || !authToken || !from) return;
  await twilio(accountSid, authToken).messages.create({ from, to: `whatsapp:${to}`, body });
}

function missingRegister6Fields(record: Record<string, unknown>) {
  const required: [string, string][] = [
    ["lot", "N.º o nombre del lote"], ["surface_ha", "Superficie"], ["crop", "Cultivo"], ["variety", "Variedad"],
    ["issue", "Plaga, enfermedad y/o maleza"], ["product_name", "Producto utilizado"], ["active_ingredient", "Principio activo"],
    ["applied_dose", "Dosis aplicada y unidad"], ["estimated_harvest_date", "Fecha estimada de cosecha"],
    ["machine", "Máquina utilizada"], ["operator_name", "Nombre del operario"], ["observations", "Observaciones o indicar «sin observaciones»"],
  ];
  return required.filter(([key]) => record[key] === null || record[key] === undefined || record[key] === "").map(([, label]) => label);
}

function missingMessage(fields: string[]) {
  return ["⚠️ *Faltan algunos datos para completar el Registro 6:*", "", ...fields.map((field) => `• ${field}`), "", "Respondé con otro audio o un mensaje de texto incluyendo solamente esos datos."].join("\n");
}

function selection(params: Record<string, string>) {
  return (params.ButtonPayload || params.ListId || params.Body || "").trim();
}

function currentArgentinaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function samePhone(left: string, right: string) {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (!a || !b) return false;
  return a === b || (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10));
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicUrl = process.env.TWILIO_WEBHOOK_URL;
  const signature = request.headers.get("x-twilio-signature") || "";
  if (authToken && publicUrl && !validateRequest(authToken, signature, publicUrl, params)) return NextResponse.json({ error: "Firma inválida" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return xmlResponse("AgroVoz todavía no está conectado a la base de datos.");
  const sourcePhone = (params.From || "").replace("whatsapp:", "");
  const body = params.Body || "";
  const normalized = body.trim().toLocaleLowerCase("es-AR");
  const selectedValue = selection(params);

  const { data: operators } = await supabase.from("operators").select("id,name,phone").eq("active", true);
  const operator = operators?.find((item) => samePhone(item.phone, sourcePhone)) || null;
  const { data: sessionData } = await supabase.from("whatsapp_sessions").select("step,establishment_id,register_number,application_id").eq("phone", sourcePhone).maybeSingle();
  const session = sessionData as Session | null;

  if (normalized.includes("activar agrovoz")) {
    const { data: establishments, error } = await supabase.from("establishments").select("id,name,renspa,locality").eq("active", true).order("name").limit(10);
    if (error) return xmlResponse("Falta instalar la configuración del flujo. Ejecutá la migración 003 en Supabase.");
    if (!establishments?.length) return xmlResponse("No hay establecimientos configurados. Cargalos en AgroVoz antes de iniciar.");
    await supabase.from("whatsapp_sessions").upsert({ phone: sourcePhone, step: "selecting_establishment", establishment_id: null, register_number: null, application_id: null, updated_at: new Date().toISOString() });
    const choices = establishments.map((item) => ({ id: `field:${item.id}`, item: item.name, description: `RENSPA ${item.renspa}${item.locality ? ` · ${item.locality}` : ""}` }));
    const prompt = `Hola${operator?.name ? ` ${operator.name}` : ""} 👋\n\n¿En qué establecimiento estás trabajando?`;
    return await sendPicker(sourcePhone, prompt, "Seleccionar campo", choices) ? xmlResponse() : xmlResponse(numbered(prompt, choices));
  }

  if (!session) return xmlResponse("Para comenzar escribí: Activar AgroVoz");

  if (session.step === "selecting_establishment") {
    const { data: establishments } = await supabase.from("establishments").select("id,name,renspa,locality").eq("active", true).order("name").limit(10);
    const choiceIndex = /^\d+$/.test(selectedValue) ? Number(selectedValue) - 1 : -1;
    const fieldId = selectedValue.startsWith("field:") ? selectedValue.slice(6) : establishments?.[choiceIndex]?.id;
    const establishment = establishments?.find((item) => item.id === fieldId || item.name.toLocaleLowerCase("es-AR") === normalized);
    if (!establishment) return xmlResponse(numbered("No pude identificar el establecimiento. Elegí una opción:", (establishments || []).map((item) => ({ id: `field:${item.id}`, item: item.name, description: `RENSPA ${item.renspa}` }))));
    await supabase.from("whatsapp_sessions").update({ step: "selecting_register", establishment_id: establishment.id, register_number: null, updated_at: new Date().toISOString() }).eq("phone", sourcePhone);
    const choices = registerDefinitions.map((item) => ({ id: `register:${item.number}`, item: `Registro ${item.number}`, description: `${item.shortTitle}${item.number === 6 ? " · habilitado" : " · demo"}` }));
    const prompt = `📍 *Establecimiento:* ${establishment.name}\n\n¿Qué número de registro querés cargar?`;
    return await sendPicker(sourcePhone, prompt, "Seleccionar registro", choices) ? xmlResponse() : xmlResponse(numbered(prompt, choices));
  }

  if (session.step === "selecting_register") {
    const match = selectedValue.match(/(?:register:|registro\s*)?([1-7])$/i);
    const registerNumber = Number(match?.[1] || 0);
    if (!registerNumber) return xmlResponse("Elegí un número de Registro del 1 al 7.");
    if (registerNumber !== 6) return xmlResponse(`El Registro ${registerNumber} se puede consultar en la app, pero su carga todavía es demostrativa. Para este MVP elegí Registro 6.`);
    await supabase.from("whatsapp_sessions").update({ step: "awaiting_evidence", register_number: 6, updated_at: new Date().toISOString() }).eq("phone", sourcePhone);
    return xmlResponse(["✅ *Registro 6 seleccionado*", "", "🎙️ Enviá un audio contando:", "", "1️⃣ Lote y superficie", "2️⃣ Cultivo y variedad", "3️⃣ Plaga, enfermedad y/o maleza", "4️⃣ Producto, principio activo y dosis aplicada", "5️⃣ Fecha estimada de cosecha", "6️⃣ Máquina utilizada", "7️⃣ Observaciones climáticas o de otra naturaleza", "", "AgroVoz completa automáticamente la fecha, el establecimiento, el RENSPA y tu nombre."].join("\n"));
  }

  const mediaUrl = params.MediaUrl0 || null;
  const mediaType = params.MediaContentType0 || null;
  if (session.step === "awaiting_missing_data") {
    if (!session.application_id) return xmlResponse("No encontré el registro que estábamos completando. Escribí Activar AgroVoz para comenzar de nuevo.");
    let additionalTranscript = body.trim();
    let followupBytes: ArrayBuffer | null = null;
    let followupMediaPath: string | null = null;
    if (mediaUrl && process.env.TWILIO_ACCOUNT_SID && authToken) {
      const response = await fetch(mediaUrl, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${authToken}`).toString("base64")}` } });
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        followupBytes = bytes;
        const extension = mediaType?.includes("ogg") ? "ogg" : mediaType?.split("/")[1] || "bin";
        followupMediaPath = `${new Date().toISOString().slice(0, 10)}/${params.MessageSid}-followup.${extension}`;
        await supabase.storage.from("whatsapp-media").upload(followupMediaPath, bytes, { contentType: mediaType || "application/octet-stream", upsert: false });
      }
    }
    if (!additionalTranscript && !followupBytes) return xmlResponse("No pude leer la información adicional. Probá enviando otro audio o un mensaje de texto.");
    await supabase.from("audit_events").insert({ application_id: session.application_id, event_type: "whatsapp_missing_data_received", payload: { followup_media_path: followupMediaPath } });
    after(async () => {
      try {
        if (followupBytes) additionalTranscript = await transcribeAudio(followupBytes);
        const { data: application } = await supabase.from("applications").select("transcript").eq("id", session.application_id!).single();
        const combinedTranscript = `${application?.transcript || ""}\n\nInformación adicional enviada por WhatsApp:\n${additionalTranscript}`.trim();
        const updated = await processApplication(session.application_id!, { transcriptOverride: combinedTranscript });
        const missing = missingRegister6Fields(updated);
        await supabase.from("whatsapp_sessions").update({ step: missing.length ? "awaiting_missing_data" : "inactive", updated_at: new Date().toISOString() }).eq("phone", sourcePhone);
        await sendText(sourcePhone, missing.length ? missingMessage(missing) : "✅ *Registro 6 completo*\n\nYa incorporamos la información adicional. El registro quedó listo para revisión y confirmación en AgroVoz.");
      } catch {
        await sendText(sourcePhone, "No pudimos procesar la información adicional. Podés volver a enviarla o usar Reintentar interpretación desde AgroVoz.");
      }
    });
    return xmlResponse("✅ Información adicional recibida. AgroVoz está actualizando el Registro 6.");
  }
  if (session.step !== "awaiting_evidence" || session.register_number !== 6) return xmlResponse("Para iniciar una nueva carga escribí: Activar AgroVoz");
  if (!mediaUrl && !body.trim()) return xmlResponse("Enviá el audio con los datos solicitados para el Registro 6.");

  const { data: establishment } = await supabase.from("establishments").select("id,name,renspa").eq("id", session.establishment_id).single();
  if (!establishment) return xmlResponse("No pude recuperar el establecimiento. Escribí Activar AgroVoz para reiniciar.");
  let mediaPath: string | null = null;
  const messageSid = params.MessageSid;
  if (mediaUrl && process.env.TWILIO_ACCOUNT_SID && authToken) {
    const response = await fetch(mediaUrl, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${authToken}`).toString("base64")}` } });
    if (response.ok) {
      const bytes = await response.arrayBuffer();
      const extension = mediaType?.includes("ogg") ? "ogg" : mediaType?.split("/")[1] || "bin";
      mediaPath = `${new Date().toISOString().slice(0, 10)}/${messageSid}.${extension}`;
      const { error } = await supabase.storage.from("whatsapp-media").upload(mediaPath, bytes, { contentType: mediaType || "application/octet-stream", upsert: false });
      if (error) mediaPath = null;
    }
  }

  const { data: saved, error } = await supabase.from("applications").upsert({
    message_sid: messageSid, source_phone: sourcePhone, media_type: mediaType, media_path: mediaPath, transcript: body || null,
    status: "recibido", record_type: 6, application_date: currentArgentinaDate(), operator_id: operator?.id || null,
    operator_name: operator?.name || null, establishment_id: establishment.id, farm_name: establishment.name,
    renspa: establishment.renspa, confidence: null,
  }, { onConflict: "message_sid", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) return xmlResponse("No pudimos guardar el Registro 6. Volvé a intentarlo más tarde.");
  if (saved) {
    await supabase.from("whatsapp_sessions").update({ step: "awaiting_missing_data", application_id: saved.id, updated_at: new Date().toISOString() }).eq("phone", sourcePhone);
    after(async () => {
      try {
        const updated = await processApplication(saved.id);
        const missing = missingRegister6Fields(updated);
        await supabase.from("whatsapp_sessions").update({ step: missing.length ? "awaiting_missing_data" : "inactive", updated_at: new Date().toISOString() }).eq("phone", sourcePhone);
        await sendText(sourcePhone, missing.length ? missingMessage(missing) : "✅ *Registro 6 completo*\n\nLa información fue interpretada y quedó lista para revisión y confirmación en AgroVoz.");
      } catch { await sendText(sourcePhone, "Recibimos el audio, pero no pudimos interpretarlo. Podés volver a enviarlo o usar Reintentar interpretación desde AgroVoz."); }
    });
  }
  return xmlResponse(`Audio recibido para ${establishment.name} (RENSPA ${establishment.renspa}). AgroVoz está completando el Registro 6 automáticamente${operator?.name ? ` a nombre de ${operator.name}` : ". El teléfono todavía no tiene un operario asociado"}. Sólo falta la confirmación en la app.`);
}
