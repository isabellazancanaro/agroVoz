import type { ApplicationRecord, Establishment, RegisterColumn, RegisterDefinition, RecordType, SenasaRow } from "./types";

const metadata: RegisterColumn[] = [
  { key: "recordedAt", label: "Fecha de carga" },
  { key: "operatorName", label: "Operario" },
  { key: "renspa", label: "N.º RENSPA" },
];

const register1General: RegisterColumn[] = [
  { key: "establishment", label: "Empresa / establecimiento y/o razón social" }, { key: "renspa", label: "N.º RENSPA" },
  { key: "address", label: "Dirección" }, { key: "locality", label: "Localidad" }, { key: "province", label: "Provincia" },
  { key: "ownerPhone", label: "Teléfono del propietario" }, { key: "ownerPhoneType", label: "Tipo (fijo / celular / fax)" },
  { key: "email", label: "E-mail" }, { key: "managerPhone", label: "Teléfono del encargado / mediero" },
  { key: "managerPhoneType", label: "Tipo (fijo / celular / fax)" }, { key: "managerAddress", label: "Dirección encargado / mediero" },
  { key: "bpaResponsible", label: "Responsable de implementación de BPA" }, { key: "bpaAddress", label: "Dirección responsable BPA" },
  { key: "bpaLocality", label: "Localidad responsable BPA" }, { key: "bpaPhone", label: "Teléfono responsable BPA" },
  { key: "bpaPhoneType", label: "Tipo (fijo / celular / fax)" }, { key: "bpaEmail", label: "E-mail responsable BPA" },
  { key: "recordedAt", label: "Fecha de actualización" }, { key: "operatorName", label: "Operario" },
];

const register1Production: RegisterColumn[] = [
  { key: "mainProducts", label: "Principales productos" }, { key: "secondaryProducts", label: "Producciones secundarias" },
  { key: "seniority", label: "Antigüedad en la producción" }, { key: "association", label: "Entidad a la que se encuentra asociado" },
  { key: "memberNumber", label: "N.º de socio" },
];

const register1Commercial: RegisterColumn[] = [
  { key: "wholesaleMarket", label: "Mercado mayorista (sí / no)" }, { key: "privateCompany", label: "Empresa particular (sí / no)" },
  { key: "ownTransport", label: "Transporte propio (sí / no)" }, { key: "packingShed", label: "Galpón de empaque (sí / no)" },
  { key: "observations", label: "Observaciones" },
];

export const registerDefinitions: RegisterDefinition[] = [
  { number: 1, shortTitle: "Información general", title: "Registro 1 · Información general", description: "Una ficha única por cada número RENSPA.", filters: ["establishment", "responsible"], columns: [...register1General, ...register1Production, ...register1Commercial], sections: [
    { title: "Datos del establecimiento y responsables", columns: register1General },
    { title: "Datos adicionales · Producción y asociación", columns: register1Production },
    { title: "Datos adicionales · Comercialización e infraestructura", columns: register1Commercial },
  ] },
  { number: 2, shortTitle: "Material vegetal", title: "Registro 2 · Aplicación de fitosanitarios en material vegetal de inicio", description: "Aplicaciones realizadas sobre semillas o plantines.", filters: ["date", "responsible", "establishment"], columns: [...metadata,
    { key: "material", label: "Semilla o plantín" }, { key: "variety", label: "Variedad" }, { key: "surface", label: "Superficie (ha)" },
    { key: "lot", label: "N.º / nombre del lote" }, { key: "date", label: "Fecha" }, { key: "issue", label: "Plaga, enfermedad o maleza" },
    { key: "product", label: "Producto utilizado" }, { key: "recommendedDose", label: "Dosis recomendada/ha" }, { key: "appliedDose", label: "Dosis aplicada/ha" },
    { key: "totalVolume", label: "Volumen total aplicado" }, { key: "harvestDays", label: "Días a cosecha" }, { key: "machine", label: "Máquina utilizada" },
    { key: "responsible", label: "Aplicador / responsable" }, { key: "observations", label: "Observaciones (clima / otra)" },
  ] },
  { number: 3, shortTitle: "Desinfección de suelo", title: "Registro 3 · Desinfección química del suelo", description: "Tratamientos químicos realizados sobre el suelo.", filters: ["date", "crop", "responsible", "establishment"], columns: [...metadata,
    { key: "producer", label: "Productor" }, { key: "lotSurface", label: "N.º / nombre del lote y superficie" }, { key: "cropVariety", label: "Cultivo / variedad" },
    { key: "cause", label: "Causa / motivo" }, { key: "date", label: "Fecha" }, { key: "product", label: "Producto comercial" },
    { key: "activeIngredient", label: "Principio activo" }, { key: "dose", label: "Dosis (unidad / volumen o superficie)" },
    { key: "method", label: "Método de aplicación" }, { key: "responsible", label: "Aplicador / responsable" },
  ] },
  { number: 4, shortTitle: "Esterilización de sustratos", title: "Registro 4 · Esterilización de sustratos", description: "Tratamientos de esterilización realizados sobre sustratos.", filters: ["date", "crop", "responsible", "establishment"], columns: [...metadata,
    { key: "producer", label: "Productor" }, { key: "lotSurface", label: "N.º / nombre del lote y superficie" }, { key: "cropVariety", label: "Cultivo / variedad" },
    { key: "cause", label: "Causa / motivo" }, { key: "date", label: "Fecha" }, { key: "product", label: "Producto comercial" },
    { key: "activeIngredient", label: "Principio activo" }, { key: "dose", label: "Dosis (unidad / volumen o superficie)" },
    { key: "method", label: "Método de aplicación" }, { key: "responsible", label: "Aplicador / responsable" },
  ] },
  { number: 5, shortTitle: "Fertilizaciones", title: "Registro 5 · Fertilizaciones, abonos y enmiendas", description: "Fertilizantes químicos, abonos orgánicos y enmiendas aplicadas.", filters: ["date", "crop", "responsible", "establishment"], columns: [...metadata,
    { key: "producer", label: "Productor" }, { key: "lotSurface", label: "N.º / nombre del lote y superficie" }, { key: "cropVariety", label: "Cultivo / variedad" },
    { key: "date", label: "Fecha" }, { key: "product", label: "Producto" }, { key: "dose", label: "Dosis" },
    { key: "method", label: "Forma de aplicación" }, { key: "responsible", label: "Aplicador / responsable" }, { key: "observations", label: "Observaciones" },
  ] },
  { number: 6, shortTitle: "Aplicación de fitosanitarios", title: "Registro 6 · Aplicación de fitosanitarios", description: "Registro operativo habilitado para carga por WhatsApp en este MVP.", filters: ["date", "crop", "responsible", "establishment"], columns: [...metadata,
    { key: "lotSurface", label: "N.º / nombre de lote y superficie" }, { key: "cropVariety", label: "Cultivo / variedad" }, { key: "date", label: "Fecha" },
    { key: "issue", label: "Plaga, enfermedad y/o maleza" }, { key: "product", label: "Producto utilizado" }, { key: "activeIngredient", label: "Principio activo*" },
    { key: "appliedDose", label: "Dosis aplicada (unidad / volumen o superficie)" }, { key: "estimatedHarvest", label: "Fecha estimada de cosecha" },
    { key: "machine", label: "Máquina utilizada" }, { key: "responsible", label: "Aplicador / responsable" }, { key: "observations", label: "Observaciones (problemas climáticos o de otra naturaleza)" },
  ] },
  { number: 7, shortTitle: "Inventario", title: "Registro 7 · Inventario de fitosanitarios", description: "Existencias, compras y vencimientos de productos fitosanitarios.", filters: ["date", "responsible", "establishment"], columns: [...metadata,
    { key: "product", label: "Producto comercial" }, { key: "activeIngredient", label: "Principio activo" }, { key: "purchaseDate", label: "Fecha de compra" },
    { key: "quantity", label: "Cantidad (kg o litros)" }, { key: "expirationDate", label: "Fecha de vencimiento" },
  ] },
];

const DEMO_RENSPA = "04.001.0.01234/00";
const row = (id: string, recordType: RecordType, date: string, crop: string, responsible: string, values: SenasaRow["values"]): SenasaRow => ({
  id, recordType, date, crop, responsible, renspa: String(values.renspa || DEMO_RENSPA), establishment: String(values.establishment || values.producer || "La Esperanza"), demo: true,
  values: { recordedAt: date.split("-").reverse().join("/"), operatorName: responsible, renspa: DEMO_RENSPA, ...values },
});

export const mockSenasaRows: SenasaRow[] = [
  row("r1-1", 1, "2026-09-12", "", "Lucía Pereyra", { establishment: "La Esperanza", renspa: DEMO_RENSPA, address: "Camino Rural Km 12", locality: "Colonia Caroya", province: "Córdoba", ownerPhone: "351 555-0100", ownerPhoneType: "Celular", email: "establecimiento@ejemplo.com", managerPhone: "351 555-0101", managerPhoneType: "Celular", managerAddress: "Camino Rural Km 12", bpaResponsible: "Lucía Pereyra", bpaAddress: "Ruta 9 Km 748", bpaLocality: "Colonia Caroya", bpaPhone: "351 555-0102", bpaPhoneType: "Celular", bpaEmail: "bpa@ejemplo.com", mainProducts: "Tomate, pimiento", secondaryProducts: "Lechuga", seniority: "12 años", association: "Cooperativa regional", memberNumber: "184", wholesaleMarket: "Sí", privateCompany: "No", ownTransport: "Sí", packingShed: "Sí", observations: "Datos demostrativos" }),
  row("r2-1", 2, "2026-08-18", "", "Martín López", { material: "Plantín", variety: "Platense", surface: "1,5", lot: "L-103", date: "18/08/2026", issue: "Pulgón", product: "Producto demo A", recommendedDose: "250 ml/ha", appliedDose: "250 ml/ha", totalVolume: "120 l", harvestDays: "7", machine: "Mochila", responsible: "Martín López", observations: "Sin viento" }),
  row("r3-1", 3, "2026-07-28", "Pimiento", "Carla Ruiz", { producer: "La Esperanza", lotSurface: "L-202 · 0,8 ha", cropVariety: "Pimiento California", cause: "Prevención de hongos", date: "28/07/2026", product: "Desinfectante demo", activeIngredient: "Sustancia demo", dose: "2 l/ha", method: "Riego localizado", responsible: "Carla Ruiz" }),
  row("r4-1", 4, "2026-08-04", "Lechuga", "Carla Ruiz", { producer: "La Esperanza", lotSurface: "Invernadero 2 · 0,3 ha", cropVariety: "Lechuga mantecosa", cause: "Preparación de sustrato", date: "04/08/2026", product: "Producto demo B", activeIngredient: "Sustancia demo", dose: "1 kg/m³", method: "Mezcla", responsible: "Carla Ruiz" }),
  row("r5-1", 5, "2026-08-23", "Tomate", "Diego Suárez", { producer: "La Esperanza", lotSurface: "L-103 · 1,5 ha", cropVariety: "Tomate Platense", date: "23/08/2026", product: "Compost maduro", dose: "3 t/ha", method: "Incorporación al suelo", responsible: "Diego Suárez", observations: "Aplicado antes del riego" }),
  row("r6-1", 6, "2026-09-05", "Tomate", "Martín López", { lotSurface: "L-103 · 1,5 ha", cropVariety: "Tomate Platense", date: "05/09/2026", issue: "Pulgón", product: "Producto demo A", activeIngredient: "Sustancia demo", appliedDose: "250 ml/ha", estimatedHarvest: "19/09/2026", machine: "Mochila pulverizadora", responsible: "Martín López", observations: "Sin viento" }),
  row("r6-2", 6, "2026-09-09", "Pimiento", "Carla Ruiz", { lotSurface: "L-202 · 0,8 ha", cropVariety: "Pimiento California", date: "09/09/2026", issue: "Trips", product: "Producto demo C", activeIngredient: "Sustancia demo", appliedDose: "180 ml/ha", estimatedHarvest: "23/09/2026", machine: "Pulverizadora", responsible: "Carla Ruiz", observations: "Aplicación al amanecer" }),
  row("r7-1", 7, "2026-09-01", "", "Lucía Pereyra", { product: "Producto demo A", activeIngredient: "Sustancia demo", purchaseDate: "01/09/2026", quantity: "20 l", expirationDate: "01/09/2028" }),
];

const yesNo = (value: boolean | null) => value === null ? "" : value ? "Sí" : "No";

export function establishmentToRegister1(establishment: Establishment): SenasaRow {
  const date = (establishment.updated_at || new Date().toISOString()).slice(0, 10);
  return {
    id: `establishment-${establishment.id}`, recordType: 1, date, crop: "",
    responsible: establishment.bpa_responsible || "Sin identificar", renspa: establishment.renspa,
    establishment: establishment.name,
    values: {
      establishment: establishment.name, renspa: establishment.renspa, address: establishment.address,
      locality: establishment.locality, province: establishment.province, ownerPhone: establishment.owner_phone,
      ownerPhoneType: establishment.owner_phone_type, email: establishment.email, managerPhone: establishment.manager_phone,
      managerPhoneType: establishment.manager_phone_type, managerAddress: establishment.manager_address,
      bpaResponsible: establishment.bpa_responsible, bpaAddress: establishment.bpa_address,
      bpaLocality: establishment.bpa_locality, bpaPhone: establishment.bpa_phone,
      bpaPhoneType: establishment.bpa_phone_type, bpaEmail: establishment.bpa_email,
      mainProducts: establishment.main_products, secondaryProducts: establishment.secondary_products,
      seniority: establishment.seniority, association: establishment.association, memberNumber: establishment.member_number,
      wholesaleMarket: yesNo(establishment.wholesale_market), privateCompany: yesNo(establishment.private_company),
      ownTransport: yesNo(establishment.own_transport), packingShed: yesNo(establishment.packing_shed),
      observations: establishment.observations, recordedAt: date.split("-").reverse().join("/"),
      operatorName: establishment.bpa_responsible,
    },
  };
}

export function applicationToRegister6(record: ApplicationRecord): SenasaRow {
  const date = record.application_date || record.created_at.slice(0, 10);
  return { id: record.id, recordType: 6, date, crop: record.crop || "", responsible: record.operator_name || "Sin identificar", renspa: record.renspa || "Sin RENSPA", establishment: record.farm_name || "Sin establecimiento", demo: record.id.startsWith("demo-"), values: {
    recordedAt: record.created_at.slice(0, 10).split("-").reverse().join("/"), operatorName: record.operator_name, renspa: record.renspa,
    lotSurface: `${record.lot || "Sin lote"}${record.surface_ha ? ` · ${record.surface_ha} ha` : ""}`,
    cropVariety: `${record.crop || "Sin cultivo"}${record.variety ? ` · ${record.variety}` : ""}`,
    date: date.split("-").reverse().join("/"), issue: record.issue, product: record.product_name, activeIngredient: record.active_ingredient,
    appliedDose: record.applied_dose, estimatedHarvest: record.estimated_harvest_date?.split("-").reverse().join("/") ?? null,
    machine: record.machine, responsible: record.operator_name, observations: record.observations || record.weather,
  } };
}
