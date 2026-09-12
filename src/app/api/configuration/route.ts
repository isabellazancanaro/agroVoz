import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const establishmentSchema = z.object({ kind: z.literal("establishment"), name: z.string().min(2), renspa: z.string().min(3), locality: z.string().nullable().optional(), province: z.string().nullable().optional() });
const operatorSchema = z.object({ kind: z.literal("operator"), name: z.string().min(2), phone: z.string().min(8) });

function samePhone(left: string, right: string) {
  const a = left.replace(/\D/g, "");
  const b = right.replace(/\D/g, "");
  return Boolean(a && b && (a === b || (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10))));
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ establishments: [], operators: [], configured: false });
  const [establishments, operators] = await Promise.all([
    supabase.from("establishments").select("id,name,renspa,locality,province").eq("active", true).order("name"),
    supabase.from("operators").select("id,name,phone").eq("active", true).order("name"),
  ]);
  if (establishments.error || operators.error) return NextResponse.json({ error: "Ejecutá la migración 003 en Supabase.", establishments: [], operators: [] }, { status: 503 });
  return NextResponse.json({ establishments: establishments.data, operators: operators.data, configured: true });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  const payload = await request.json();
  const establishment = establishmentSchema.safeParse(payload);
  if (establishment.success) {
    const { kind: _, ...values } = establishment.data;
    const { data, error } = await supabase.from("establishments").upsert(values, { onConflict: "renspa" }).select("id,name,renspa,locality,province").single();
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ establishment: data });
  }
  const operator = operatorSchema.safeParse(payload);
  if (operator.success) {
    const { kind: _, ...values } = operator.data;
    const normalized = { ...values, phone: values.phone.replace("whatsapp:", "").replace(/[\s()-]/g, "") };
    const { data, error } = await supabase.from("operators").upsert(normalized, { onConflict: "phone" }).select("id,name,phone").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data: applications } = await supabase.from("applications").select("id,source_phone");
    const matchingIds = (applications || []).filter((item) => samePhone(item.source_phone, data.phone)).map((item) => item.id);
    if (matchingIds.length) await supabase.from("applications").update({ operator_id: data.id, operator_name: data.name }).in("id", matchingIds);
    return NextResponse.json({ operator: data, linkedApplications: matchingIds.length });
  }
  return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
}
