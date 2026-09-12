"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Check, ChevronRight, CircleAlert, Clock3, Download, FileDown, FileSpreadsheet,
  Inbox, LayoutDashboard, MapPinned, MessageCircle, Mic2, Play, RefreshCw, Save,
  ExternalLink, Plus, ShieldCheck, Sparkles, Sprout, Table2, UserRound, Video,
} from "lucide-react";
import { demoRecords } from "@/lib/demo-data";
import { applicationToRegister6, establishmentToRegister1, mockSenasaRows, registerDefinitions } from "@/lib/senasa-records";
import type { ApplicationRecord, Establishment, Operator, RecordType, RegisterColumn, RegisterDefinition, ReviewStatus, SenasaRow } from "@/lib/types";

type View = "review" | "sheets" | "stats" | "fields";
type QueueView = "pending" | "approved";

const statusLabel: Record<ReviewStatus, string> = {
  recibido: "Recibido", procesando: "Procesando", pendiente_revision: "Pendiente de revisión",
  aprobado: "Aprobado", rechazado: "Rechazado",
};

const reviewFields: { key: keyof ApplicationRecord; label: string; type?: "number" | "textarea" | "date"; wide?: boolean }[] = [
  { key: "farm_name", label: "Establecimiento" }, { key: "renspa", label: "N.º RENSPA asociado" },
  { key: "operator_name", label: "Operario (según teléfono)" },
  { key: "lot", label: "N.º / nombre del lote" }, { key: "surface_ha", label: "Superficie (ha)", type: "number" },
  { key: "crop", label: "Cultivo" }, { key: "variety", label: "Variedad" },
  { key: "application_date", label: "Fecha", type: "date" }, { key: "issue", label: "Plaga, enfermedad y/o maleza" },
  { key: "product_name", label: "Producto utilizado" }, { key: "active_ingredient", label: "Principio activo*" },
  { key: "applied_dose", label: "Dosis aplicada (unidad / volumen o superficie)" }, { key: "estimated_harvest_date", label: "Fecha estimada de cosecha", type: "date" },
  { key: "machine", label: "Máquina utilizada" }, { key: "observations", label: "Observaciones (problemas climáticos o de otra naturaleza)", type: "textarea", wide: true },
];

function missingRequiredFields(record: ApplicationRecord) {
  return reviewFields.filter(({ key }) => {
    const value = record[key];
    if (key === "surface_ha") return typeof value !== "number" || value <= 0;
    return value === null || value === undefined || String(value).trim() === "";
  });
}

const pad2 = (value: number) => String(value).padStart(2, "0");
function currentLocalDate() {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
}

function formatReceivedAt(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const local = new Date(timestamp - 3 * 60 * 60 * 1000);
  return `${pad2(local.getUTCDate())}/${pad2(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}, ${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`;
}

function csvCell(value: unknown) {
  const valueAsText = String(value ?? "");
  return `"${valueAsText.replaceAll('"', '""')}"`;
}

function normalizeCrop(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-AR");
}

function cropLabel(value: string) {
  const normalized = normalizeCrop(value);
  return normalized ? normalized.charAt(0).toLocaleUpperCase("es-AR") + normalized.slice(1) : "";
}

export default function Home() {
  const [view, setView] = useState<View>("review");
  const [records, setRecords] = useState<ApplicationRecord[]>(demoRecords);
  const [selectedId, setSelectedId] = useState<string | null>(demoRecords[0].id);
  const [draft, setDraft] = useState<ApplicationRecord>(demoRecords[0]);
  const [activeRegister, setActiveRegister] = useState<RecordType>(6);
  const [dateFilter, setDateFilter] = useState("");
  const [cropFilter, setCropFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [establishmentFilter, setEstablishmentFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Modo demostración activo");
  const [queueView, setQueueView] = useState<QueueView>("pending");
  const [validationErrors, setValidationErrors] = useState<(keyof ApplicationRecord)[]>([]);
  const [configuredEstablishments, setConfiguredEstablishments] = useState<Establishment[]>([]);
  const [configuredOperators, setConfiguredOperators] = useState<Operator[]>([]);
  const [configurationMessage, setConfigurationMessage] = useState("Cargando configuración…");
  const [exportMessage, setExportMessage] = useState("");

  const selected = useMemo(() => selectedId ? records.find((item) => item.id === selectedId) : undefined, [records, selectedId]);
  const pendingCount = records.filter((item) => item.status === "pendiente_revision").length;
  const approvedCount = records.filter((item) => item.status === "aprobado").length;
  const visibleRecords = [...records]
    .filter((item) => queueView === "approved" ? item.status === "aprobado" : item.status !== "aprobado" && item.status !== "rechazado")
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  useEffect(() => {
    if (selected) {
      setDraft({
        ...selected,
        record_type: selected.record_type ?? 6,
        application_date: selected.application_date || currentLocalDate(),
        observations: selected.observations || selected.weather || "Ninguna",
      });
      setValidationErrors([]);
    }
  }, [selected]);
  useEffect(() => {
    fetch("/api/configuration", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        setConfiguredEstablishments(payload.establishments || []);
        setConfiguredOperators(payload.operators || []);
        setConfigurationMessage(ok ? "Estas opciones aparecen en el flujo de WhatsApp." : payload.error || "Configuración pendiente.");
      })
      .catch(() => setConfigurationMessage("No se pudo cargar la configuración."));
  }, []);

  const allRows = useMemo(() => {
    const approved = records.filter((item) => item.status === "aprobado" && !item.id.startsWith("demo-")).map(applicationToRegister6);
    const establishmentProfiles = configuredEstablishments.map(establishmentToRegister1);
    const configuredKeys = new Set(establishmentProfiles.flatMap((item) => [item.renspa, item.establishment.toLocaleLowerCase("es-AR")]));
    const demoRows = mockSenasaRows.filter((item) => item.recordType !== 1 || (!configuredKeys.has(item.renspa) && !configuredKeys.has(item.establishment.toLocaleLowerCase("es-AR"))));
    return [...demoRows, ...establishmentProfiles, ...approved];
  }, [records, configuredEstablishments]);
  const definition = registerDefinitions.find((item) => item.number === activeRegister)!;
  const registerRows = allRows.filter((item) => item.recordType === activeRegister);
  const crops = [...new Set(registerRows.map((item) => normalizeCrop(item.crop)).filter(Boolean))].sort();
  const responsibles = [...new Set(registerRows.map((item) => item.responsible).filter(Boolean))].sort();
  const establishments = [...new Set(registerRows.map((item) => item.establishment).filter(Boolean))].sort();
  const filteredRows = registerRows
    .filter((item) => !dateFilter || item.date === dateFilter)
    .filter((item) => !cropFilter || normalizeCrop(item.crop) === cropFilter)
    .filter((item) => !responsibleFilter || item.responsible === responsibleFilter)
    .filter((item) => !establishmentFilter || item.establishment === establishmentFilter);

  function changeRegister(number: RecordType) {
    setActiveRegister(number); setDateFilter(""); setCropFilter(""); setResponsibleFilter(""); setEstablishmentFilter(""); setExportMessage("");
  }

  function changeQueueView(next: QueueView) {
    setQueueView(next);
    const first = records.find((item) => next === "approved" ? item.status === "aprobado" : item.status !== "aprobado" && item.status !== "rechazado");
    if (first) setSelectedId(first.id);
  }

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/records", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && payload.records?.length) {
        const next = [...payload.records, ...demoRecords].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
        const firstVisible = next.find((item) => queueView === "approved" ? item.status === "aprobado" : item.status !== "aprobado" && item.status !== "rechazado");
        setRecords(next); setSelectedId(firstVisible?.id ?? null); setNotice("Registros actualizados desde Supabase");
      } else setNotice("No hay nuevos mensajes; se mantienen los datos de demostración");
    } catch { setNotice("Sin conexión a Supabase; se mantienen los datos de demostración"); }
    finally { setLoading(false); }
  }

  async function save(status: ReviewStatus) {
    if (status === "aprobado") {
      const missing = missingRequiredFields(draft);
      if (missing.length) {
        setValidationErrors(missing.map(({ key }) => key));
        setNotice(`No se puede aprobar. Completá: ${missing.map(({ label }) => label).join(", ")}.`);
        return;
      }
    }
    setValidationErrors([]);
    if (draft.id.startsWith("demo-")) {
      const updated = { ...draft, status, record_type: 6 as const };
      setRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
      setDraft(updated); if (status === "aprobado") { setQueueView("approved"); setSelectedId(null); }
      setNotice(status === "aprobado" ? "Registro 6 demo aprobado" : "Cambios demo guardados"); return;
    }
    setLoading(true);
    try {
      const editableValues = Object.fromEntries(reviewFields.map(({ key }) => [key, draft[key]]));
      const response = await fetch(`/api/records/${draft.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editableValues, establishment_id: draft.establishment_id, record_type: 6, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo actualizar el registro.");
      setRecords((current) => current.map((item) => item.id === payload.record.id ? payload.record : item));
      setDraft(payload.record);
      if (status === "aprobado") { setQueueView("approved"); setSelectedId(null); }
      setNotice(status === "aprobado" ? "Registro 6 aprobado e incorporado a Planillas" : "Borrador guardado");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo guardar el registro."); }
    finally { setLoading(false); }
  }

  async function processWithAi() {
    if (draft.id.startsWith("demo-")) { setNotice("La interpretación con IA se prueba con un audio real de WhatsApp."); return; }
    setLoading(true); setNotice("Whisper está transcribiendo; la primera vez puede tardar unos minutos…");
    setRecords((current) => current.map((item) => item.id === draft.id ? { ...item, status: "procesando" } : item));
    try {
      const response = await fetch(`/api/records/${draft.id}/process`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo interpretar el audio.");
      setRecords((current) => current.map((item) => item.id === payload.record.id ? payload.record : item));
      setDraft(payload.record); setNotice("IA completó los campos. Revisalos antes de aprobar.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo interpretar el audio.");
      setRecords((current) => current.map((item) => item.id === draft.id ? { ...item, status: "pendiente_revision" } : item));
    } finally { setLoading(false); }
  }

  function exportContext() {
    if (!establishmentFilter) {
      setExportMessage("Seleccioná un establecimiento antes de exportar. Cada archivo debe corresponder a un único RENSPA.");
      return null;
    }
    const register1 = allRows.find((item) => item.recordType === 1 && item.establishment === establishmentFilter && !item.demo)
      || allRows.find((item) => item.recordType === 1 && item.establishment === establishmentFilter);
    if (!register1) {
      setExportMessage("Ese establecimiento todavía no tiene una ficha de Registro 1. Completala desde Mis campos.");
      return null;
    }
    setExportMessage("");
    return { register1, rows: filteredRows, safeName: establishmentFilter.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "establecimiento" };
  }

  function rowsToCsv(columns: RegisterColumn[], rows: SenasaRow[]) {
    const header = columns.map((column) => csvCell(column.label)).join(";");
    const body = rows.map((item) => columns.map((column) => csvCell(item.values[column.key])).join(";")).join("\r\n");
    return `\uFEFF${header}\r\n${body}`;
  }

  async function downloadCsv() {
    const context = exportContext();
    if (!context) return;
    const register1Definition = registerDefinitions.find((item) => item.number === 1)!;
    if (activeRegister === 1) {
      const blob = new Blob([rowsToCsv(register1Definition.columns, [context.register1])], { type: "text/csv;charset=utf-8" });
      const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob);
      anchor.download = `${context.safeName}-registro-1.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
      return;
    }
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("registro-1-informacion-general.csv", rowsToCsv(register1Definition.columns, [context.register1]));
    zip.file(`registro-${activeRegister}.csv`, rowsToCsv(definition.columns, context.rows));
    const blob = await zip.generateAsync({ type: "blob" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob);
    anchor.download = `${context.safeName}-registros-1-y-${activeRegister}.zip`; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  async function downloadPdf() {
    const context = exportContext();
    if (!context) return;
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const renderRegister = (targetDefinition: RegisterDefinition, rows: SenasaRow[], addFirstPage: boolean) => {
      const sections = targetDefinition.sections || [{ title: targetDefinition.title, columns: targetDefinition.columns }];
      if (addFirstPage) document.addPage("a4", "landscape");
      document.setTextColor(20, 62, 49); document.setFontSize(15); document.text(targetDefinition.title, 14, 16);
      document.setFontSize(8); document.setTextColor(90); document.text(`${establishmentFilter} · RENSPA ${context.register1.renspa} · Exportado por AgroVoz`, 14, 22);
      let nextY = targetDefinition.sections ? 31 : 27;
      sections.forEach((section) => {
        if (targetDefinition.sections) {
          document.setFontSize(9); document.setTextColor(20, 62, 49); document.text(section.title, 14, nextY);
          nextY += 4;
        }
        const blankRows = targetDefinition.number === 1 ? [] : Array.from(
          { length: Math.max(3, 7 - rows.length) },
          (_, rowIndex) => [String(rows.length + rowIndex + 1), ...section.columns.map(() => "")],
        );
        autoTable(document, {
          startY: nextY, head: [["#", ...section.columns.map((column) => column.label)]],
          body: [...rows.map((item, rowIndex) => [String(rowIndex + 1), ...section.columns.map((column) => String(item.values[column.key] ?? ""))]),
            ...blankRows],
          styles: { fontSize: targetDefinition.number === 1 ? 5.4 : 6.5, cellPadding: targetDefinition.number === 1 ? 1.2 : 1.7 }, headStyles: { fillColor: [11, 107, 73] },
          alternateRowStyles: { fillColor: [244, 248, 246] }, margin: { left: 8, right: 8 },
        });
        const tableResult = document as typeof document & { lastAutoTable?: { finalY: number } };
        nextY = (tableResult.lastAutoTable?.finalY || nextY) + 9;
      });
    };
    const register1Definition = registerDefinitions.find((item) => item.number === 1)!;
    renderRegister(register1Definition, [context.register1], false);
    if (activeRegister !== 1) renderRegister(definition, context.rows, true);
    document.save(`${context.safeName}-registros-1-y-${activeRegister}.pdf`);
  }

  const navItems: { id: View; label: string; icon: typeof Inbox }[] = [
    { id: "review", label: "Revisión", icon: Inbox }, { id: "sheets", label: "Planillas", icon: Table2 },
    { id: "stats", label: "Estadísticas", icon: BarChart3 }, { id: "fields", label: "Mis campos", icon: MapPinned },
  ];

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandmark"><img src="/favicon.svg" alt=""/></span><div><strong>AgroVoz</strong><span>Registros BPA por voz</span></div></div>
        <nav className="main-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon size={16}/>{label}</button>)}</nav>
        <div className="sandbox"><span className="pulse"/> Twilio Sandbox</div>
      </header>

      {view === "review" && <>
        <section className="overview"><div><p className="eyebrow">BANDEJA OPERATIVA</p><h1>Registros recibidos por WhatsApp</h1><p>AgroVoz interpreta y guarda cada audio automáticamente; la única intervención humana es confirmar.</p></div><div className="overview-actions"><a className="whatsapp-button" href="/api/whatsapp/start" target="_blank" rel="noreferrer"><MessageCircle size={17}/>Activar AgroVoz<ExternalLink size={14}/></a><button className="secondary" onClick={refresh} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""}/>Actualizar</button></div></section>
        <section className="metrics" aria-label="Resumen">
          <article><span className="metric-icon amber"><Clock3/></span><div><b>{pendingCount}</b><span>Pendientes</span></div></article>
          <article><span className="metric-icon green"><ShieldCheck/></span><div><b>{approvedCount}</b><span>Aprobados</span></div></article>
          <article><span className="metric-icon blue"><MessageCircle/></span><div><b>{records.length}</b><span>Mensajes recibidos</span></div></article>
        </section>
        <div className="workspace">
          <aside className="queue"><div className="section-title"><div><Inbox size={18}/><strong>Bandeja</strong></div><span>{visibleRecords.length}</span></div><div className="queue-tabs"><button className={queueView === "pending" ? "active" : ""} onClick={() => changeQueueView("pending")}>Pendientes <b>{pendingCount}</b></button><button className={queueView === "approved" ? "active" : ""} onClick={() => changeQueueView("approved")}>Aprobados <b>{approvedCount}</b></button></div><div className="queue-list">{visibleRecords.map((record) => (
            <button key={record.id} className={`queue-item ${selectedId === record.id ? "active" : ""}`} onClick={() => setSelectedId(record.id)}>
              <span className="media-icon">{record.media_type?.startsWith("video") ? <Video/> : <Mic2/>}</span>
              <span className="queue-copy"><strong>{record.operator_name || "Operario sin identificar"}</strong><small>Registro {record.record_type ?? "por confirmar"} · {record.lot || "Sin lote"}</small><em className={`status ${record.status}`}>{statusLabel[record.status]}</em></span><ChevronRight size={17}/>
            </button>))}{!visibleRecords.length && <p className="queue-empty">No hay registros en esta vista.</p>}</div></aside>
          {selected && <section className="review">
            <div className="review-head"><div><p className="eyebrow">MENSAJE {selected.message_sid}</p><h2>Registro {draft.record_type ?? "sin identificar"}{draft.record_type === 6 ? " · Aplicación de fitosanitarios" : ""}</h2><p>Recibido {formatReceivedAt(selected.created_at)}</p></div><span className={`status large ${draft.status}`}>{statusLabel[draft.status]}</span></div>
            {!selected.record_type && <div className="type-warning"><CircleAlert/><div><strong>Falta confirmar el número de registro</strong><span>AgroVoz le pidió al operario que responda con el número. En este MVP sólo se admite el Registro 6.</span></div></div>}
            <div className="source-panel"><div className="source-top"><div className="source-icon"><Play size={18}/></div><div><strong>{selected.media_type?.startsWith("video") ? "Video recibido" : "Audio recibido"}</strong><span>Evidencia original asociada al registro</span></div></div>
              {selected.media_path && !selected.id.startsWith("demo-") && (selected.media_type?.startsWith("video") ? <video className="media-player video-player" controls preload="metadata" src={`/api/records/${selected.id}/media`}/> : <audio className="media-player" controls preload="metadata" src={`/api/records/${selected.id}/media`}/>)}
              {!selected.media_path && <p className="media-unavailable">El reproductor se habilita con un audio o video real recibido por WhatsApp.</p>}
              {selected.transcript && <blockquote>“{selected.transcript}”</blockquote>}
              <div className="confidence"><span>Confianza de extracción</span><div><i style={{ width: `${(selected.confidence ?? 0) * 100}%` }}/></div><b>{Math.round((selected.confidence ?? 0) * 100)}%</b></div>
            </div>
            <div className="legal-note"><CircleAlert/><div><strong>Validación obligatoria</strong><span>Verificá producto autorizado, dosis y período de carencia antes de aprobar.</span></div></div>
            <div className="record-form-head"><span>Campos oficiales del Registro 6</span><em>Único registro habilitado para carga en el MVP</em></div>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>{reviewFields.map(({ key, label, type, wide }) => {
              const invalid = validationErrors.includes(key);
              const fieldClass = `${wide ? "wide " : ""}${invalid ? "field-invalid" : ""}`;
              if (key === "farm_name") {
                const selectedEstablishment = configuredEstablishments.find((item) => item.id === draft.establishment_id || item.name === draft.farm_name || item.renspa === draft.renspa);
                return <label key={key} className={fieldClass}><span>{label}{invalid && <em>Obligatorio</em>}</span><select aria-invalid={invalid} value={selectedEstablishment?.id || ""} onChange={(event) => {
                  const establishment = configuredEstablishments.find((item) => item.id === event.target.value);
                  setDraft({ ...draft, establishment_id: establishment?.id || null, farm_name: establishment?.name || null, renspa: establishment?.renspa || null });
                  setValidationErrors((current) => current.filter((item) => item !== "farm_name" && item !== "renspa"));
                }}><option value="">Seleccioná un establecimiento</option>{configuredEstablishments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
              }
              if (key === "renspa") return <label key={key} className={fieldClass}><span>{label}{invalid && <em>Obligatorio</em>}</span><input aria-invalid={invalid} readOnly value={String(draft.renspa ?? "")} placeholder="Se completa al elegir el establecimiento"/></label>;
              return <label key={key} className={fieldClass}><span>{label}{invalid && <em>Obligatorio</em>}</span>{type === "textarea" ? <textarea aria-invalid={invalid} value={String(draft[key] ?? "")} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setValidationErrors((current) => current.filter((item) => item !== key)); }}/> : <input aria-invalid={invalid} type={type || "text"} value={String(draft[key] ?? "")} onChange={(event) => { setDraft({ ...draft, [key]: type === "number" ? (event.target.value ? Number(event.target.value) : null) : event.target.value }); setValidationErrors((current) => current.filter((item) => item !== key)); }}/>}</label>;
            })}</form>
            <div className="actions"><span>{notice}</span><button className="ai-button" onClick={processWithAi} disabled={loading || draft.id.startsWith("demo-")}><Sparkles size={17}/>{loading || draft.status === "procesando" ? "Interpretando…" : "Reintentar interpretación"}</button><button className="secondary" onClick={() => save("pendiente_revision")} disabled={loading}><Save size={17}/>Guardar correcciones</button><button className="primary" onClick={() => save("aprobado")} disabled={loading}><Check size={18}/>Confirmar Registro 6</button></div>
          </section>}
          {!selected && <section className="review-closed"><Check size={32}/><h2>{queueView === "approved" ? "Registro aprobado" : "Seleccioná un registro"}</h2><p>{queueView === "approved" ? "El detalle se cerró correctamente. Podés abrir cualquier registro desde la lista de Aprobados." : "Elegí un registro de la bandeja para revisar su información."}</p></section>}
        </div>
      </>}

      {view === "sheets" && <section className="page-shell">
        <div className="page-heading"><div><p className="eyebrow">TRAZABILIDAD BPA</p><h1>Planillas SENASA</h1><p>Registros organizados con las columnas del anexo oficial. Los datos “demo” permiten explorar el MVP.</p></div><div className="export-actions"><button className="secondary" onClick={() => void downloadCsv()}><Download size={16}/>{activeRegister === 1 ? "CSV" : "CSV (ZIP)"}</button><button className="primary" onClick={() => void downloadPdf()}><FileDown size={16}/>PDF</button></div></div>
        {exportMessage && <div className="export-warning"><CircleAlert size={17}/><span>{exportMessage}</span><button onClick={() => { setView("fields"); setExportMessage(""); }}>Completar Registro 1</button></div>}
        <div className="register-tabs">{registerDefinitions.map((item) => <button key={item.number} className={activeRegister === item.number ? "active" : ""} onClick={() => changeRegister(item.number)}><b>{item.number}</b><span>Registro {item.number}</span></button>)}</div>
        <article className="sheet-card"><div className="sheet-head"><div><span className="register-number">REGISTRO {definition.number}</span><h2>{definition.title.replace(/^Registro \d · /, "")}</h2><p>{definition.description}</p></div><span className="row-count">{filteredRows.length} fila{filteredRows.length === 1 ? "" : "s"}</span></div>
          <div className="filters">
            {definition.filters.includes("date") && <label><span>Fecha</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}/></label>}
            {definition.filters.includes("crop") && <label><span>Cultivo</span><select value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}><option value="">Todos</option>{crops.map((crop) => <option key={crop} value={crop}>{cropLabel(crop)}</option>)}</select></label>}
            {definition.filters.includes("responsible") && <label><span>Operario / responsable</span><select value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)}><option value="">Todos</option>{responsibles.map((person) => <option key={person}>{person}</option>)}</select></label>}
            {definition.filters.includes("establishment") && <label><span>Establecimiento</span><select value={establishmentFilter} onChange={(event) => setEstablishmentFilter(event.target.value)}><option value="">Todos</option>{establishments.map((establishment) => <option key={establishment}>{establishment}</option>)}</select></label>}
            <button className="filter-clear" onClick={() => { setDateFilter(""); setCropFilter(""); setResponsibleFilter(""); setEstablishmentFilter(""); }}>Limpiar filtros</button>
          </div>
          {definition.sections ? <div className="sheet-sections">{definition.sections.map((section) => <section key={section.title}><h3>{section.title}</h3><SpreadsheetTable columns={section.columns} rows={filteredRows}/></section>)}</div> : <SpreadsheetTable columns={definition.columns} rows={filteredRows}/>}
          <div className="sheet-foot"><CircleAlert size={15}/>{activeRegister === 1 ? "El Registro 1 mantiene una única ficha por RENSPA." : activeRegister === 6 ? "Las nuevas filas aparecen aquí después de su aprobación." : "Datos demostrativos; la carga real se habilitará en una etapa posterior."}</div>
        </article>
      </section>}

      {view === "stats" && <Stats rows={allRows}/>}
      {view === "fields" && <Fields rows={allRows} establishments={configuredEstablishments} operators={configuredOperators} message={configurationMessage} onEstablishmentsChange={setConfiguredEstablishments} onOperatorsChange={setConfiguredOperators} onMessageChange={setConfigurationMessage}/>}
      <footer><FileSpreadsheet size={17}/>Formato basado en el Anexo de Planillas y Registros de las Directrices BPA frutihortícolas.</footer>
    </main>
  );
}

function Stats({ rows }: { rows: SenasaRow[] }) {
  const crops = Object.entries(rows.reduce<Record<string, number>>((acc, item) => { const crop = normalizeCrop(item.crop); if (crop) acc[crop] = (acc[crop] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...crops.map(([, count]) => count), 1);
  return <section className="page-shell"><div className="page-heading"><div><p className="eyebrow">INDICADORES</p><h1>Estadísticas</h1><p>Una vista rápida de la actividad registrada en los siete libros.</p></div></div>
    <div className="summary-grid"><article><LayoutDashboard/><span>Filas totales</span><b>{rows.length}</b></article><article><Sprout/><span>Cultivos activos</span><b>{crops.length}</b></article><article><ShieldCheck/><span>Registros con responsable</span><b>{rows.filter(row => row.responsible).length}</b></article></div>
    <div className="analytics-grid"><article className="chart-card"><h2>Actividad por número de registro</h2><div className="record-stat-grid">{registerDefinitions.map((definition) => <div key={definition.number}><span>{definition.number}</span><div><b>{rows.filter(row => row.recordType === definition.number).length}</b><small>{definition.shortTitle}</small></div></div>)}</div></article>
      <article className="chart-card"><h2>Registros por cultivo</h2><div className="bar-list">{crops.map(([crop, count]) => <div key={crop}><span>{cropLabel(crop)}</span><i><b style={{ width: `${count / max * 100}%` }}/></i><strong>{count}</strong></div>)}</div></article></div>
  </section>;
}

function SpreadsheetTable({ columns, rows }: { columns: RegisterColumn[]; rows: SenasaRow[] }) {
  const blankCount = Math.max(3, 7 - rows.length);
  return <div className="table-wrap"><table><thead><tr><th className="row-number">#</th>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>
    {rows.map((item, index) => <tr key={item.id}><td className="row-number">{index + 1}</td>{columns.map((column) => <td key={column.key}>{item.values[column.key] ?? ""}</td>)}</tr>)}
    {Array.from({ length: blankCount }, (_, index) => <tr className="blank-sheet-row" key={`blank-${index}`}><td className="row-number">{rows.length + index + 1}</td>{columns.map((column) => <td key={column.key}>&nbsp;</td>)}</tr>)}
  </tbody></table></div>;
}

type EstablishmentDraft = Omit<Establishment, "id" | "updated_at">;

const emptyEstablishment: EstablishmentDraft = {
  name: "", renspa: "", address: "", locality: "", province: "", owner_phone: "", owner_phone_type: "",
  email: "", manager_phone: "", manager_phone_type: "", manager_address: "", bpa_responsible: "",
  bpa_address: "", bpa_locality: "", bpa_phone: "", bpa_phone_type: "", bpa_email: "", main_products: "",
  secondary_products: "", seniority: "", association: "", member_number: "", wholesale_market: null,
  private_company: null, own_transport: null, packing_shed: null, observations: "",
};

const establishmentFieldLabels: [keyof EstablishmentDraft, string][] = [
  ["name", "Empresa / establecimiento"], ["renspa", "N.º RENSPA"], ["address", "Dirección"],
  ["locality", "Localidad"], ["province", "Provincia"], ["owner_phone", "Teléfono del propietario"],
  ["owner_phone_type", "Tipo de teléfono del propietario"], ["email", "E-mail"],
  ["manager_phone", "Teléfono del encargado / mediero"], ["manager_phone_type", "Tipo de teléfono del encargado / mediero"],
  ["manager_address", "Dirección del encargado / mediero"], ["bpa_responsible", "Responsable BPA"],
  ["bpa_address", "Dirección del responsable BPA"], ["bpa_locality", "Localidad del responsable BPA"],
  ["bpa_phone", "Teléfono del responsable BPA"], ["bpa_phone_type", "Tipo de teléfono del responsable BPA"],
  ["bpa_email", "E-mail del responsable BPA"], ["main_products", "Principales productos"],
  ["secondary_products", "Producciones secundarias"], ["seniority", "Antigüedad en la producción"],
  ["association", "Entidad asociada"], ["member_number", "N.º de socio"], ["wholesale_market", "Mercado mayorista"],
  ["private_company", "Empresa particular"], ["own_transport", "Transporte propio"],
  ["packing_shed", "Galpón de empaque"], ["observations", "Observaciones"],
];

function missingEstablishmentFields(draft: EstablishmentDraft) {
  return establishmentFieldLabels.filter(([key]) => {
    const value = draft[key];
    return value === null || value === undefined || (typeof value === "string" && !value.trim());
  }).map(([, label]) => label);
}

function establishmentDraft(item: Establishment): EstablishmentDraft {
  const { id: _, updated_at: __, ...draft } = item;
  return draft;
}

function Fields({ rows, establishments, operators, message, onEstablishmentsChange, onOperatorsChange, onMessageChange }: { rows: SenasaRow[]; establishments: Establishment[]; operators: Operator[]; message: string; onEstablishmentsChange: (items: Establishment[]) => void; onOperatorsChange: (items: Operator[]) => void; onMessageChange: (message: string) => void }) {
  const [farmForm, setFarmForm] = useState<EstablishmentDraft>(emptyEstablishment);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [farmErrors, setFarmErrors] = useState<string[]>([]);
  const [operatorForm, setOperatorForm] = useState({ name: "", phone: "" });
  const general = rows.find((item) => item.recordType === 1 && item.renspa === farmForm.renspa) || rows.find((item) => item.recordType === 1);
  const recentByCrop = rows.filter((item) => item.crop).reduce<Map<string, { item: SenasaRow; count: number }>>((groups, item) => {
    const key = normalizeCrop(item.crop);
    const current = groups.get(key);
    groups.set(key, { item: !current || item.date > current.item.date ? item : current.item, count: (current?.count || 0) + 1 });
    return groups;
  }, new Map());
  const recent = [...recentByCrop.values()].sort((left, right) => right.item.date.localeCompare(left.item.date)).slice(0, 5);
  async function addConfiguration(payload: Record<string, unknown>) {
    const response = await fetch("/api/configuration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { onMessageChange(result.error || "No se pudo guardar."); return; }
    if (result.establishment) {
      onEstablishmentsChange([...establishments.filter((item) => item.renspa !== result.establishment.renspa), result.establishment]);
      setSelectedFarmId(result.establishment.id); setFarmForm(establishmentDraft(result.establishment)); setFarmErrors([]);
    }
    if (result.operator) { onOperatorsChange([...operators.filter((item) => item.phone !== result.operator.phone), result.operator]); setOperatorForm({ name: "", phone: "" }); }
    onMessageChange("Configuración guardada y disponible para el próximo flujo de WhatsApp.");
  }

  function saveEstablishment() {
    const missing = missingEstablishmentFields(farmForm);
    if (missing.length) {
      setFarmErrors(missing);
      onMessageChange("No se guardó el establecimiento: el Registro 1 debe quedar completo.");
      return;
    }
    setFarmErrors([]);
    void addConfiguration({ kind: "establishment", ...farmForm });
  }

  return <section className="page-shell"><div className="page-heading"><div><p className="eyebrow">CONTEXTO PRODUCTIVO</p><h1>Mis campos</h1><p>Datos estables del establecimiento para interpretar mejor los próximos audios y reducir correcciones.</p></div></div>
    <div className="configuration-note"><ShieldCheck size={17}/>{message}</div>
    <div className="config-grid"><article className="config-card"><div className="config-title"><MapPinned/><div><h2>Establecimientos y RENSPA</h2><p>Cada establecimiento tiene una única ficha de Registro 1.</p></div></div><div className="config-list">{establishments.map((item) => <button type="button" className={selectedFarmId === item.id ? "active" : ""} key={item.id} onClick={() => { setSelectedFarmId(item.id); setFarmForm(establishmentDraft(item)); setFarmErrors([]); }}><strong>{item.name}</strong><span>RENSPA {item.renspa} · {[item.locality, item.province].filter(Boolean).join(", ") || "Sin ubicación"}</span></button>)}{!establishments.length && <p>No hay establecimientos reales configurados.</p>}</div><button className="secondary new-farm" type="button" onClick={() => { setSelectedFarmId(null); setFarmForm(emptyEstablishment); setFarmErrors([]); }}><Plus size={16}/>Nuevo establecimiento</button></article>
      <article className="config-card"><div className="config-title"><UserRound/><div><h2>Operarios y teléfonos</h2><p>El nombre se completa desde el número que envía el audio.</p></div></div><div className="config-list">{operators.map((item) => <div key={item.id}><strong>{item.name}</strong><span>WhatsApp terminado en {item.phone.slice(-4).padStart(item.phone.length, "•")}</span></div>)}{!operators.length && <p>No hay operarios configurados.</p>}</div><form className="compact-form" onSubmit={(event) => { event.preventDefault(); void addConfiguration({ kind: "operator", ...operatorForm }); }}><input required placeholder="Nombre y apellido" value={operatorForm.name} onChange={(event) => setOperatorForm({ ...operatorForm, name: event.target.value })}/><input required placeholder="Teléfono con código de país, ej. +549…" value={operatorForm.phone} onChange={(event) => setOperatorForm({ ...operatorForm, phone: event.target.value })}/><button className="primary" type="submit"><Plus size={16}/>Agregar operario</button></form></article></div>
    <article className="register1-editor"><div className="register1-head"><div><span>REGISTRO 1 · INFORMACIÓN GENERAL</span><h2>{selectedFarmId ? "Editar ficha del establecimiento" : "Cargar un establecimiento"}</h2><p>Esta ficha se adjuntará automáticamente cuando exportes cualquier otro registro.</p></div><ShieldCheck/></div>
      <form className="register1-form" noValidate onSubmit={(event) => { event.preventDefault(); saveEstablishment(); }}>
        {farmErrors.length > 0 && <div className="register1-errors"><CircleAlert/><div><strong>No se puede guardar todavía</strong><span>Completá: {farmErrors.join(", ")}. Si un dato no corresponde, escribí “No corresponde” o elegí “No”.</span></div></div>}
        <fieldset><legend>Establecimiento</legend><div className="register1-grid">
          <label><span>Empresa / establecimiento y/o razón social</span><input value={farmForm.name} onChange={(event) => setFarmForm({ ...farmForm, name: event.target.value })}/></label>
          <label><span>N.º RENSPA</span><input value={farmForm.renspa} onChange={(event) => setFarmForm({ ...farmForm, renspa: event.target.value })}/></label>
          <label><span>Dirección</span><input value={farmForm.address || ""} onChange={(event) => setFarmForm({ ...farmForm, address: event.target.value })}/></label>
          <label><span>Localidad</span><input value={farmForm.locality || ""} onChange={(event) => setFarmForm({ ...farmForm, locality: event.target.value })}/></label>
          <label><span>Provincia</span><input value={farmForm.province || ""} onChange={(event) => setFarmForm({ ...farmForm, province: event.target.value })}/></label>
          <label><span>E-mail</span><input type="email" value={farmForm.email || ""} onChange={(event) => setFarmForm({ ...farmForm, email: event.target.value })}/></label>
          <label><span>Teléfono del propietario</span><input value={farmForm.owner_phone || ""} onChange={(event) => setFarmForm({ ...farmForm, owner_phone: event.target.value })}/></label>
          <label><span>Tipo de teléfono</span><select value={farmForm.owner_phone_type || ""} onChange={(event) => setFarmForm({ ...farmForm, owner_phone_type: event.target.value })}><option value="">Seleccionar</option><option>Fijo</option><option>Celular</option><option>Fax</option></select></label>
          <label><span>Teléfono del encargado / mediero</span><input value={farmForm.manager_phone || ""} onChange={(event) => setFarmForm({ ...farmForm, manager_phone: event.target.value })}/></label>
          <label><span>Tipo de teléfono</span><select value={farmForm.manager_phone_type || ""} onChange={(event) => setFarmForm({ ...farmForm, manager_phone_type: event.target.value })}><option value="">Seleccionar</option><option>Fijo</option><option>Celular</option><option>Fax</option></select></label>
          <label className="wide"><span>Dirección del encargado / mediero</span><input value={farmForm.manager_address || ""} onChange={(event) => setFarmForm({ ...farmForm, manager_address: event.target.value })}/></label>
        </div></fieldset>
        <fieldset><legend>Responsable de implementación de BPA</legend><div className="register1-grid">
          <label><span>Nombre y apellido</span><input value={farmForm.bpa_responsible || ""} onChange={(event) => setFarmForm({ ...farmForm, bpa_responsible: event.target.value })}/></label>
          <label><span>Dirección</span><input value={farmForm.bpa_address || ""} onChange={(event) => setFarmForm({ ...farmForm, bpa_address: event.target.value })}/></label>
          <label><span>Localidad</span><input value={farmForm.bpa_locality || ""} onChange={(event) => setFarmForm({ ...farmForm, bpa_locality: event.target.value })}/></label>
          <label><span>Teléfono</span><input value={farmForm.bpa_phone || ""} onChange={(event) => setFarmForm({ ...farmForm, bpa_phone: event.target.value })}/></label>
          <label><span>Tipo de teléfono</span><select value={farmForm.bpa_phone_type || ""} onChange={(event) => setFarmForm({ ...farmForm, bpa_phone_type: event.target.value })}><option value="">Seleccionar</option><option>Fijo</option><option>Celular</option><option>Fax</option></select></label>
          <label><span>E-mail</span><input type="email" value={farmForm.bpa_email || ""} onChange={(event) => setFarmForm({ ...farmForm, bpa_email: event.target.value })}/></label>
        </div></fieldset>
        <fieldset><legend>Producción y asociación</legend><div className="register1-grid">
          <label><span>Principales productos</span><input value={farmForm.main_products || ""} onChange={(event) => setFarmForm({ ...farmForm, main_products: event.target.value })}/></label>
          <label><span>Producciones secundarias</span><input value={farmForm.secondary_products || ""} onChange={(event) => setFarmForm({ ...farmForm, secondary_products: event.target.value })}/></label>
          <label><span>Antigüedad en la producción</span><input value={farmForm.seniority || ""} onChange={(event) => setFarmForm({ ...farmForm, seniority: event.target.value })}/></label>
          <label><span>Entidad a la que se encuentra asociado</span><input value={farmForm.association || ""} onChange={(event) => setFarmForm({ ...farmForm, association: event.target.value })}/></label>
          <label><span>N.º de socio</span><input value={farmForm.member_number || ""} onChange={(event) => setFarmForm({ ...farmForm, member_number: event.target.value })}/></label>
        </div></fieldset>
        <fieldset><legend>Comercialización e infraestructura</legend><div className="register1-grid yes-no-grid">
          {([['wholesale_market', 'Mercado mayorista'], ['private_company', 'Empresa particular'], ['own_transport', 'Transporte propio'], ['packing_shed', 'Galpón de empaque']] as const).map(([key, label]) => <label key={key}><span>{label}</span><select value={farmForm[key] === null ? "" : String(farmForm[key])} onChange={(event) => setFarmForm({ ...farmForm, [key]: event.target.value === "" ? null : event.target.value === "true" })}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></label>)}
          <label className="wide"><span>Observaciones</span><textarea value={farmForm.observations || ""} onChange={(event) => setFarmForm({ ...farmForm, observations: event.target.value })}/></label>
        </div></fieldset>
        <div className="register1-actions"><span>Todos los campos deben completarse al dar de alta el establecimiento.</span><button className="primary" type="submit"><Save size={17}/>{selectedFarmId ? "Guardar Registro 1" : "Crear establecimiento"}</button></div>
      </form>
    </article>
    <div className="field-layout"><article className="farm-card"><div className="farm-hero"><MapPinned/><div><span>VISTA PREVIA · REGISTRO 1</span><h2>{general?.values.establishment || "Sin establecimiento"}</h2><p>RENSPA {general?.values.renspa || "pendiente"}</p></div></div><dl><div><dt>Ubicación</dt><dd>{general?.values.locality || "—"}, {general?.values.province || "—"}</dd></div><div><dt>Responsable BPA</dt><dd>{general?.values.bpaResponsible || "—"}</dd></div><div><dt>Producciones</dt><dd>{general?.values.mainProducts || "—"}</dd></div><div><dt>Antigüedad</dt><dd>{general?.values.seniority || "—"}</dd></div></dl></article>
      <article className="recent-card"><h2>Cultivos y actividades recientes</h2>{recent.map(({ item, count }) => <div className="recent-row" key={normalizeCrop(item.crop)}><span className="crop-icon"><Sprout/></span><div><strong>{cropLabel(item.crop)}</strong><small>{count} {count === 1 ? "actividad" : "actividades"} · Última: Registro {item.recordType} · {item.responsible}</small></div><time>{item.date.split("-").reverse().join("/")}</time></div>)}</article></div>
  </section>;
}
