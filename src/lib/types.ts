export type ReviewStatus = "recibido" | "procesando" | "pendiente_revision" | "aprobado" | "rechazado";

export type ApplicationRecord = {
  id: string;
  created_at: string;
  status: ReviewStatus;
  source_phone: string;
  message_sid: string;
  media_type: string | null;
  media_path: string | null;
  transcript: string | null;
  operator_name: string | null;
  farm_name: string | null;
  renspa: string | null;
  rfd_number: string | null;
  lot: string | null;
  surface_ha: number | null;
  crop: string | null;
  variety: string | null;
  issue: string | null;
  product_name: string | null;
  active_ingredient: string | null;
  recommended_dose: string | null;
  applied_dose: string | null;
  total_volume: string | null;
  days_to_harvest: number | null;
  machine: string | null;
  weather: string | null;
  observations: string | null;
  confidence: number | null;
};

