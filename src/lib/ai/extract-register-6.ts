import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const nullableString = z.string().nullable();
const extractedSchema = z.object({
  record_type: z.literal(6).nullable(), operator_name: nullableString, renspa: nullableString,
  lot: nullableString, surface_ha: z.number().nullable(), crop: nullableString, variety: nullableString,
  application_date: nullableString, issue: nullableString, product_name: nullableString,
  active_ingredient: nullableString, applied_dose: nullableString, estimated_harvest_date: nullableString,
  machine: nullableString, weather: nullableString, observations: nullableString, confidence: z.number(),
});

const stringOrNull = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const numberOrNull = { anyOf: [{ type: "number" }, { type: "null" }] } as const;
const outputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    record_type: { anyOf: [{ type: "integer", const: 6 }, { type: "null" }], description: "6 sólo si el operador dijo explícitamente Registro 6; de lo contrario null." },
    operator_name: stringOrNull, renspa: stringOrNull, lot: stringOrNull, surface_ha: numberOrNull,
    crop: stringOrNull, variety: stringOrNull, application_date: { ...stringOrNull, description: "Fecha ISO YYYY-MM-DD; null si no fue indicada." },
    issue: stringOrNull, product_name: stringOrNull, active_ingredient: stringOrNull, applied_dose: stringOrNull,
    estimated_harvest_date: { ...stringOrNull, description: "Fecha ISO YYYY-MM-DD; null si no fue indicada." },
    machine: stringOrNull, weather: stringOrNull, observations: stringOrNull,
    confidence: { type: "number", description: "Confianza global entre 0 y 1." },
  },
  required: ["record_type", "operator_name", "renspa", "lot", "surface_ha", "crop", "variety", "application_date", "issue", "product_name", "active_ingredient", "applied_dose", "estimated_harvest_date", "machine", "weather", "observations", "confidence"],
} as const;

export type ExtractedRegister6 = z.infer<typeof extractedSchema>;

export async function extractRegister6(transcript: string, context?: { renspa?: string | null; farmName?: string | null }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta configurar ANTHROPIC_API_KEY en .env.local.");
  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().slice(0, 10);
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: "Extraés datos agrícolas de transcripciones producidas por reconocimiento de voz en español de Argentina. Corregí errores fonéticos evidentes usando contexto agronómico (por ejemplo: 'esplatences' puede significar 'Platense', 'pulga' en una lista de plagas puede significar 'pulgón' y 'polveriza' puede significar 'pulverizadora'). No inventes datos ni corrijas nombres de personas cuando no haya certeza. Conservá las unidades y los nombres comerciales tal como se oyen. Convertí fechas inequívocas a ISO. Si un dato no aparece, devolvé null. El Registro 6 corresponde a aplicación de fitosanitarios.",
    messages: [{ role: "user", content: `Fecha actual: ${today}\nContexto conocido (usalo sólo para resolver referencias inequívocas): establecimiento=${context?.farmName || "no informado"}; RENSPA=${context?.renspa || "no informado"}.\n\nTranscripción:\n${transcript}` }],
    output_config: { format: { type: "json_schema", schema: outputSchema } },
  });
  const block = response.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude no devolvió contenido estructurado.");
  const parsed = extractedSchema.parse(JSON.parse(block.text));
  return { ...parsed, confidence: Math.max(0, Math.min(1, parsed.confidence)) };
}
