"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleAlert, Clock3, FileSpreadsheet, Inbox, Leaf, MessageCircle, Mic2, Play, RefreshCw, Save, ShieldCheck, Video } from "lucide-react";
import { demoRecords } from "@/lib/demo-data";
import type { ApplicationRecord, ReviewStatus } from "@/lib/types";

const statusLabel: Record<ReviewStatus, string> = {
  recibido: "Recibido",
  procesando: "Procesando",
  pendiente_revision: "Pendiente de revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const pad2 = (value: number) => String(value).padStart(2, "0");

function formatReceivedAt(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  // Córdoba uses UTC-3. UTC getters keep this output identical in Node and the browser.
  const cordobaTime = new Date(timestamp - 3 * 60 * 60 * 1000);
  return `${pad2(cordobaTime.getUTCDate())}/${pad2(cordobaTime.getUTCMonth() + 1)}/${cordobaTime.getUTCFullYear()}, ${pad2(cordobaTime.getUTCHours())}:${pad2(cordobaTime.getUTCMinutes())}:${pad2(cordobaTime.getUTCSeconds())}`;
}

const editableFields: { key: keyof ApplicationRecord; label: string; type?: "number" | "textarea" }[] = [
  { key: "operator_name", label: "Operario" }, { key: "farm_name", label: "Establecimiento" },
  { key: "renspa", label: "RENSPA" }, { key: "rfd_number", label: "N.º de Receta Fitosanitaria Digital" },
  { key: "lot", label: "Lote" }, { key: "surface_ha", label: "Superficie (ha)", type: "number" },
  { key: "crop", label: "Cultivo" }, { key: "variety", label: "Variedad" },
  { key: "issue", label: "Plaga, enfermedad o maleza" }, { key: "product_name", label: "Producto comercial" },
  { key: "active_ingredient", label: "Principio activo" }, { key: "recommended_dose", label: "Dosis recomendada" },
  { key: "applied_dose", label: "Dosis aplicada" }, { key: "total_volume", label: "Volumen total" },
  { key: "days_to_harvest", label: "Días hasta cosecha", type: "number" }, { key: "machine", label: "Máquina utilizada" },
  { key: "weather", label: "Condiciones climáticas" }, { key: "observations", label: "Observaciones", type: "textarea" },
];

export default function Home() {
  const [records, setRecords] = useState<ApplicationRecord[]>(demoRecords);
  const [selectedId, setSelectedId] = useState(demoRecords[0].id);
  const [draft, setDraft] = useState<ApplicationRecord>(demoRecords[0]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Modo demostración activo");

  const selected = useMemo(() => records.find((item) => item.id === selectedId) ?? records[0], [records, selectedId]);
  const pendingCount = records.filter((item) => item.status === "pendiente_revision").length;

  useEffect(() => { if (selected) setDraft(selected); }, [selected]);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/records", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && payload.records?.length) {
        setRecords(payload.records);
        setSelectedId(payload.records[0].id);
        setNotice("Registros actualizados desde Supabase");
      } else setNotice("Sin conexión a Supabase: se mantienen los datos de demostración");
    } catch { setNotice("Sin conexión a Supabase: se mantienen los datos de demostración"); }
    finally { setLoading(false); }
  }

  async function save(status: ReviewStatus) {
    if (draft.id.startsWith("demo-")) {
      const updated = { ...draft, status };
      setRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
      setDraft(updated);
      setNotice(status === "aprobado" ? "Demo aprobada y lista para sincronizar" : "Cambios guardados en la demostración");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/records/${draft.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, status }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setRecords((current) => current.map((item) => item.id === payload.record.id ? payload.record : item));
      setNotice(status === "aprobado" ? "Registro aprobado y sincronizado" : "Registro guardado");
    } catch { setNotice("No se pudo guardar. Revisá la conexión de Supabase."); }
    finally { setLoading(false); }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandmark"><Leaf size={22}/></span><div><strong>AgroVoz</strong><span>Control de aplicaciones</span></div></div>
        <div className="sandbox"><span className="pulse"/> Twilio Sandbox · prueba</div>
      </header>

      <section className="overview">
        <div><p className="eyebrow">OPERACIÓN DE CAMPO</p><h1>Registros recibidos por WhatsApp</h1><p>Revisá la información antes de incorporarla a la planilla y a la base de datos.</p></div>
        <button className="secondary" onClick={refresh} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""}/> Actualizar</button>
      </section>

      <section className="metrics" aria-label="Resumen">
        <article><span className="metric-icon amber"><Clock3/></span><div><b>{pendingCount}</b><span>Pendientes</span></div></article>
        <article><span className="metric-icon green"><ShieldCheck/></span><div><b>{records.filter(r => r.status === "aprobado").length}</b><span>Aprobados</span></div></article>
        <article><span className="metric-icon blue"><MessageCircle/></span><div><b>{records.length}</b><span>Mensajes recibidos</span></div></article>
      </section>

      <div className="workspace">
        <aside className="queue">
          <div className="section-title"><div><Inbox size={18}/><strong>Bandeja</strong></div><span>{records.length}</span></div>
          <div className="queue-list">
            {records.map((record) => (
              <button key={record.id} className={`queue-item ${selectedId === record.id ? "active" : ""}`} onClick={() => setSelectedId(record.id)}>
                <span className="media-icon">{record.media_type?.startsWith("video") ? <Video/> : <Mic2/>}</span>
                <span className="queue-copy"><strong>{record.operator_name || record.source_phone}</strong><small>{record.product_name || "Producto sin identificar"} · {record.lot || "Sin lote"}</small><em className={`status ${record.status}`}>{statusLabel[record.status]}</em></span>
                <ChevronRight size={17}/>
              </button>
            ))}
          </div>
        </aside>

        {selected && <section className="review">
          <div className="review-head">
            <div><p className="eyebrow">MENSAJE {selected.message_sid}</p><h2>Revisión del registro</h2><p>Recibido de {selected.source_phone} · {formatReceivedAt(selected.created_at)}</p></div>
            <span className={`status large ${draft.status}`}>{statusLabel[draft.status]}</span>
          </div>

          <div className="source-panel">
            <div className="source-top"><div className="source-icon"><Play size={18}/></div><div><strong>{selected.media_type?.startsWith("video") ? "Video recibido" : "Audio recibido"}</strong><span>Archivo original asociado al registro</span></div></div>
            {selected.transcript && <blockquote>“{selected.transcript}”</blockquote>}
            <div className="confidence"><span>Confianza de extracción</span><div><i style={{ width: `${(selected.confidence ?? 0) * 100}%` }}/></div><b>{Math.round((selected.confidence ?? 0) * 100)}%</b></div>
          </div>

          <div className="legal-note"><CircleAlert size={19}/><div><strong>Validación obligatoria</strong><span>El mensaje del operario no reemplaza la Receta Fitosanitaria Digital. Verificá RFD, producto autorizado y dosis antes de aprobar.</span></div></div>

          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            {editableFields.map(({ key, label, type }) => (
              <label key={key} className={type === "textarea" ? "wide" : ""}><span>{label}</span>
                {type === "textarea" ? <textarea value={String(draft[key] ?? "")} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}/> :
                  <input type={type || "text"} value={String(draft[key] ?? "")} onChange={(e) => setDraft({ ...draft, [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })}/>} 
              </label>
            ))}
          </form>

          <div className="actions"><span>{notice}</span><button className="secondary" onClick={() => save("pendiente_revision")} disabled={loading}><Save size={17}/> Guardar borrador</button><button className="primary" onClick={() => save("aprobado")} disabled={loading}><Check size={18}/> Aprobar y sincronizar</button></div>
        </section>}
      </div>

      <footer><FileSpreadsheet size={17}/> Al aprobar, el registro se guarda en Supabase y se agrega a la planilla configurada.</footer>
    </main>
  );
}
