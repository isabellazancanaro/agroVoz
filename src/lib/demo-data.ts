import type { ApplicationRecord } from "./types";

export const demoRecords: ApplicationRecord[] = [
  {
    id: "demo-1",
    created_at: "2026-09-12T04:15:00.000Z",
    status: "pendiente_revision",
    source_phone: "+54 9 351 555 0182",
    message_sid: "SM-DEMO-001",
    media_type: "audio/ogg",
    media_path: null,
    transcript: "Soy Martín López. Aplicación en lote L-103, tomate, producto BioControl A, dosis 250 mililitros cada diez litros. Sin viento. Máquina mochila. Receta RFD 2026-00184.",
    operator_name: "Martín López",
    farm_name: "Establecimiento Norte",
    renspa: "04.001.0.00000/00",
    rfd_number: "RFD-2026-00184",
    lot: "L-103",
    surface_ha: 1.5,
    crop: "Tomate",
    variety: "Platense",
    issue: "Pulgón",
    product_name: "BioControl A",
    active_ingredient: "Producto de demostración",
    recommended_dose: "250 ml / 10 l",
    applied_dose: "250 ml / 10 l",
    total_volume: "120 l",
    days_to_harvest: 7,
    machine: "Mochila pulverizadora",
    weather: "Sin viento",
    observations: "Registro de demostración con sustancia inerte.",
    confidence: 0.82
  }
];
