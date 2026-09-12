import { NextResponse } from "next/server";
import { processApplication } from "@/lib/ai/process-application";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const record = await processApplication(id);
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el registro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
