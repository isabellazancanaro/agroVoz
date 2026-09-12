import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const statusSchema = z.enum(["recibido", "procesando", "pendiente_revision", "aprobado", "rechazado"]);
const updateSchema = z.object({
  status: statusSchema.optional(), operator_name: z.string().nullable().optional(), farm_name: z.string().nullable().optional(),
  renspa: z.string().nullable().optional(), rfd_number: z.string().nullable().optional(), lot: z.string().nullable().optional(),
  surface_ha: z.number().nullable().optional(), crop: z.string().nullable().optional(), variety: z.string().nullable().optional(),
  issue: z.string().nullable().optional(), product_name: z.string().nullable().optional(), active_ingredient: z.string().nullable().optional(),
  recommended_dose: z.string().nullable().optional(), applied_dose: z.string().nullable().optional(), total_volume: z.string().nullable().optional(),
  days_to_harvest: z.number().nullable().optional(), machine: z.string().nullable().optional(), weather: z.string().nullable().optional(),
  observations: z.string().nullable().optional(), transcript: z.string().nullable().optional(), confidence: z.number().min(0).max(1).nullable().optional(),
  record_type: z.literal(6).nullable().optional(), application_date: z.string().date().nullable().optional(),
  estimated_harvest_date: z.string().date().nullable().optional(),
  establishment_id: z.string().uuid().nullable().optional(),
}).strict();

const requiredForApproval: [string, string][] = [
  ["farm_name", "Establecimiento"], ["renspa", "N.º RENSPA"], ["operator_name", "Operario"],
  ["lot", "N.º o nombre del lote"], ["surface_ha", "Superficie"], ["crop", "Cultivo"], ["variety", "Variedad"],
  ["application_date", "Fecha"], ["issue", "Plaga, enfermedad y/o maleza"], ["product_name", "Producto utilizado"],
  ["active_ingredient", "Principio activo"], ["applied_dose", "Dosis aplicada"],
  ["estimated_harvest_date", "Fecha estimada de cosecha"], ["machine", "Máquina utilizada"], ["observations", "Observaciones"],
];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  const approving = parsed.data.status === "aprobado";
  const initialUpdate = approving ? { ...parsed.data, status: "pendiente_revision" as const } : parsed.data;
  const { data, error } = await supabase.from("applications").update({ ...initialUpdate, reviewed_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (approving) {
    const missing = requiredForApproval.filter(([key]) => data[key] === null || data[key] === undefined || data[key] === "" || (key === "surface_ha" && Number(data[key]) <= 0)).map(([, label]) => label);
    if (missing.length) return NextResponse.json({ error: `No se puede aprobar. Faltan: ${missing.join(", ")}.`, missing }, { status: 422 });
    const applicationDate = data.application_date || data.created_at.slice(0, 10);
    const { error: registerError } = await supabase.from("register_6_applications").upsert({
      application_id: id, application_date: applicationDate, renspa: data.renspa, lot: data.lot,
      surface_ha: data.surface_ha, crop: data.crop, variety: data.variety, issue: data.issue,
      product_name: data.product_name, active_ingredient: data.active_ingredient, applied_dose: data.applied_dose,
      estimated_harvest_date: data.estimated_harvest_date, machine: data.machine,
      responsible: data.operator_name, observations: data.observations || data.weather,
    }, { onConflict: "application_id" });
    if (registerError) return NextResponse.json({ error: registerError.message }, { status: 500 });
    const { data: approved, error: approvalError } = await supabase.from("applications").update({ status: "aprobado", reviewed_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 500 });
    await supabase.from("audit_events").insert({ application_id: id, event_type: "approved_register_6", payload: { source: "dashboard" } });
    return NextResponse.json({ record: approved });
  }
  return NextResponse.json({ record: data });
}
