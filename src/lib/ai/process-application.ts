import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { extractRegister6 } from "./extract-register-6";
import { transcribeAudio } from "./transcribe";

export async function processApplication(applicationId: string, options?: { transcriptOverride?: string }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data: application, error } = await supabase.from("applications").select("*").eq("id", applicationId).single();
  if (error || !application) throw new Error(error?.message || "No se encontró el registro.");

  await supabase.from("applications").update({ status: "procesando" }).eq("id", applicationId);
  try {
    let transcript = options?.transcriptOverride?.trim() || application.transcript?.trim() || "";
    if (!options?.transcriptOverride && application.media_path) {
      const { data: media, error: mediaError } = await supabase.storage.from("whatsapp-media").download(application.media_path);
      if (mediaError || !media) throw new Error(mediaError?.message || "No se pudo descargar el audio.");
      transcript = await transcribeAudio(await media.arrayBuffer());
    }
    if (!transcript) throw new Error("El registro no tiene audio ni texto para interpretar.");
    await supabase.from("applications").update({ transcript, status: "procesando" }).eq("id", applicationId);

    const extracted = await extractRegister6(transcript, { renspa: application.renspa, farmName: application.farm_name });
    const updates = {
      transcript, ...(extracted.record_type ? { record_type: extracted.record_type } : {}),
      operator_name: application.operator_name ?? extracted.operator_name,
      renspa: application.renspa ?? extracted.renspa, lot: extracted.lot ?? application.lot,
      surface_ha: extracted.surface_ha ?? application.surface_ha, crop: extracted.crop ?? application.crop, variety: extracted.variety ?? application.variety,
      application_date: extracted.application_date ?? application.application_date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()),
      issue: extracted.issue ?? application.issue, product_name: extracted.product_name ?? application.product_name,
      active_ingredient: extracted.active_ingredient ?? application.active_ingredient, applied_dose: extracted.applied_dose ?? application.applied_dose,
      estimated_harvest_date: extracted.estimated_harvest_date ?? application.estimated_harvest_date, machine: extracted.machine ?? application.machine,
      weather: extracted.weather ?? application.weather,
      observations: extracted.observations ?? extracted.weather ?? application.observations ?? application.weather ?? "Ninguna",
      confidence: extracted.confidence,
      status: "pendiente_revision",
    };
    const { data: updated, error: updateError } = await supabase.from("applications").update(updates).eq("id", applicationId).select("*").single();
    if (updateError) throw new Error(updateError.message);
    await supabase.from("audit_events").insert({ application_id: applicationId, event_type: "ai_interpreted", payload: { transcription: "whisper-local", extraction: "anthropic" } });
    return updated;
  } catch (processingError) {
    const message = processingError instanceof Error ? processingError.message : "Error desconocido";
    await supabase.from("applications").update({ status: "pendiente_revision" }).eq("id", applicationId);
    await supabase.from("audit_events").insert({ application_id: applicationId, event_type: "ai_processing_failed", payload: { message } });
    throw processingError;
  }
}
