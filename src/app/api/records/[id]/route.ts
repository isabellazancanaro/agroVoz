import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendRecordToSheet } from "@/lib/google-sheets";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ApplicationRecord } from "@/lib/types";

const statusSchema = z.enum(["recibido", "procesando", "pendiente_revision", "aprobado", "rechazado"]);
const updateSchema = z.object({
  status: statusSchema.optional(), operator_name: z.string().nullable().optional(), farm_name: z.string().nullable().optional(),
  renspa: z.string().nullable().optional(), rfd_number: z.string().nullable().optional(), lot: z.string().nullable().optional(),
  surface_ha: z.number().nullable().optional(), crop: z.string().nullable().optional(), variety: z.string().nullable().optional(),
  issue: z.string().nullable().optional(), product_name: z.string().nullable().optional(), active_ingredient: z.string().nullable().optional(),
  recommended_dose: z.string().nullable().optional(), applied_dose: z.string().nullable().optional(), total_volume: z.string().nullable().optional(),
  days_to_harvest: z.number().nullable().optional(), machine: z.string().nullable().optional(), weather: z.string().nullable().optional(),
  observations: z.string().nullable().optional(), transcript: z.string().nullable().optional(), confidence: z.number().min(0).max(1).nullable().optional(),
}).strict();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("applications").update({ ...parsed.data, reviewed_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data.status === "aprobado") {
    await appendRecordToSheet(data as ApplicationRecord);
    await supabase.from("audit_events").insert({ application_id: id, event_type: "approved_and_synced", payload: { source: "dashboard" } });
  }
  return NextResponse.json({ record: data });
}

