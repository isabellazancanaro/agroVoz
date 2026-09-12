export type ReviewStatus = "recibido" | "procesando" | "pendiente_revision" | "aprobado" | "rechazado";
export type RecordType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  record_type?: RecordType | null;
  application_date?: string | null;
  estimated_harvest_date?: string | null;
  establishment_id?: string | null;
  operator_id?: string | null;
};

export type SenasaValue = string | number | null;

export type SenasaRow = {
  id: string;
  recordType: RecordType;
  date: string;
  crop: string;
  responsible: string;
  renspa: string;
  establishment: string;
  values: Record<string, SenasaValue>;
  demo?: boolean;
};

export type RegisterColumn = {
  key: string;
  label: string;
};

export type RegisterDefinition = {
  number: RecordType;
  shortTitle: string;
  title: string;
  description: string;
  columns: RegisterColumn[];
  filters: ("date" | "crop" | "responsible" | "establishment")[];
  sections?: { title: string; columns: RegisterColumn[] }[];
};

export type Establishment = { id: string; name: string; renspa: string; locality: string | null; province: string | null };
export type Operator = { id: string; name: string; phone: string };
