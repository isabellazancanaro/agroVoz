import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const requiredText = z.string().trim().min(1);
const establishmentSchema = z.object({
  kind: z.literal("establishment"), name: z.string().min(2), renspa: z.string().min(3),
  address: requiredText, locality: requiredText, province: requiredText,
  owner_phone: requiredText, owner_phone_type: requiredText, email: requiredText,
  manager_phone: requiredText, manager_phone_type: requiredText, manager_address: requiredText,
  bpa_responsible: requiredText, bpa_address: requiredText, bpa_locality: requiredText,
  bpa_phone: requiredText, bpa_phone_type: requiredText, bpa_email: requiredText,
  main_products: requiredText, secondary_products: requiredText, seniority: requiredText,
  association: requiredText, member_number: requiredText, wholesale_market: z.boolean(),
  private_company: z.boolean(), own_transport: z.boolean(), packing_shed: z.boolean(), observations: requiredText,
});
const operatorSchema = z.object({ kind: z.literal("operator"), name: z.string().min(2), phone: z.string().min(8) });

const establishmentColumns = "id,name,renspa,address,locality,province,owner_phone,owner_phone_type,email,manager_phone,manager_phone_type,manager_address,bpa_responsible,bpa_address,bpa_locality,bpa_phone,bpa_phone_type,bpa_email,main_products,secondary_products,seniority,association,member_number,wholesale_market,private_company,own_transport,packing_shed,observations,updated_at";

function samePhone(left: string, right: string) {
  const a = left.replace(/\D/g, "");
  const b = right.replace(/\D/g, "");
  return Boolean(a && b && (a === b || (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10))));
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ establishments: [], operators: [], configured: false });
  const [establishments, operators] = await Promise.all([
    supabase.from("establishments").select(establishmentColumns).eq("active", true).order("name"),
    supabase.from("operators").select("id,name,phone").eq("active", true).order("name"),
  ]);
  if (establishments.error || operators.error) return NextResponse.json({ error: "Ejecutá las migraciones pendientes de Supabase (incluida la 004).", establishments: [], operators: [] }, { status: 503 });
  return NextResponse.json({ establishments: establishments.data, operators: operators.data, configured: true });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  const payload = await request.json();
  const establishment = establishmentSchema.safeParse(payload);
  if (establishment.success) {
    const { kind: _, ...input } = establishment.data;
    const values = { ...input, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("establishments").upsert(values, { onConflict: "renspa" }).select(establishmentColumns).single();
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ establishment: data });
  }
  if (payload?.kind === "establishment") return NextResponse.json({ error: "El Registro 1 debe quedar completo. Revisá todos los campos." }, { status: 400 });
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
