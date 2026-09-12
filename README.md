# AgroVoz

AgroVoz es un MVP que transforma notas de voz enviadas por WhatsApp en registros agrícolas estructurados, revisables y exportables. Su objetivo es simplificar la carga de las planillas de Buenas Prácticas Agrícolas (BPA) utilizadas en la actividad frutihortícola, evitando que el operario tenga que completar formularios extensos mientras trabaja en el campo.

> Estado del producto: MVP funcional para demostración. El Registro 6 recibe datos reales por WhatsApp. El Registro 1 se administra como ficha única de cada establecimiento; los Registros 2, 3, 4, 5 y 7 conservan información demostrativa.

## Resumen ejecutivo

En muchos establecimientos agrícolas, la información de una aplicación se anota en papel, se comunica informalmente o se completa varias horas después. Esto genera trabajo duplicado, omisiones y menor trazabilidad.

AgroVoz propone un flujo más natural:

1. El operario inicia AgroVoz desde WhatsApp.
2. Selecciona el establecimiento donde está trabajando.
3. Selecciona el número de registro que quiere completar.
4. Recibe una guía con los datos que debe mencionar.
5. Envía una nota de voz.
6. AgroVoz transcribe el audio y estructura la información automáticamente.
7. Un responsable revisa y confirma el registro desde la aplicación web.
8. La información queda disponible en una planilla y puede descargarse como CSV o PDF.

La propuesta no busca eliminar el control humano. Busca reducir la fricción de carga y dejarle a la persona responsable la tarea de validar, corregir y confirmar.

## Problema que resuelve

- Los operarios trabajan lejos de una computadora y con las manos ocupadas.
- Las planillas reglamentarias tienen muchos campos y estructuras diferentes.
- La carga posterior depende de la memoria o de anotaciones informales.
- Transcribir manualmente audios o mensajes genera trabajo administrativo adicional.
- La información puede quedar separada del establecimiento, del operario o de la evidencia original.
- Resulta difícil consultar rápidamente el historial por cultivo, fecha, responsable o RENSPA.

## Propuesta de valor

AgroVoz convierte una acción cotidiana —mandar un audio por WhatsApp— en una carga agrícola estructurada.

Sus principales ventajas son:

- Menos tiempo dedicado a completar formularios.
- Menos duplicación entre trabajo de campo y administración.
- Asociación automática del teléfono con el nombre del operario.
- Asociación del establecimiento con su número RENSPA.
- Conservación del audio o video como evidencia de origen.
- Revisión humana antes de incorporar información definitiva.
- Planillas centralizadas dentro de la propia aplicación.
- Exportación en PDF y CSV.
- Información preparada para filtros, estadísticas y trazabilidad.

## Usuarios

### Operario

Trabaja en el establecimiento y registra una actividad mediante WhatsApp. No necesita ingresar a la aplicación administrativa ni conocer la estructura completa de cada planilla.

### Responsable o supervisor

Revisa la transcripción, escucha el audio original, corrige campos y confirma el registro desde la aplicación web.

### Productor o administrador

Consulta las planillas, establecimientos, cultivos recientes y estadísticas generales. También configura la relación entre campos, RENSPA, operarios y teléfonos.

## Flujo funcional de WhatsApp

1. El operario escribe `Activar AgroVoz` o utiliza el botón de acceso directo de la aplicación.
2. AgroVoz consulta el teléfono de origen e identifica al operario si está configurado.
3. WhatsApp pregunta en qué establecimiento se encuentra.
4. El operario elige una opción. Cada establecimiento está asociado previamente a un RENSPA.
5. WhatsApp pregunta qué número de registro quiere cargar y muestra el número junto con su descripción.
6. Para el MVP, el operario selecciona `Registro 6`.
7. AgroVoz solicita únicamente los datos que no puede deducir del contexto:
   - número o nombre del lote y superficie;
   - cultivo y variedad;
   - plaga, enfermedad o maleza;
   - producto utilizado y dosis aplicada;
   - fecha estimada de cosecha;
   - máquina utilizada;
   - observaciones relevantes.
8. El operario envía un audio.
9. WhatsApp confirma inmediatamente la recepción.
10. En segundo plano, AgroVoz guarda el archivo, lo transcribe y completa los campos mediante IA.
11. Si falta un dato obligatorio, AgroVoz envía por WhatsApp una lista breve de lo pendiente. El operario puede responder con otro audio o texto y la información se combina con la carga original.
12. Cuando el registro está completo, el supervisor abre la bandeja de Revisión y confirma el Registro 6.

La fecha de carga se completa automáticamente. El operario se obtiene del teléfono y el RENSPA se obtiene del establecimiento seleccionado; no hace falta mencionarlos en el audio.

La cuenta Trial de Twilio Sandbox utilizada en este MVP no habilita los selectores interactivos `list-picker`. Para mantener la demostración gratuita, AgroVoz muestra opciones numeradas y visuales. El soporte para combos queda preparado y desactivado mediante `TWILIO_ENABLE_INTERACTIVE_LISTS=false`; sólo debe habilitarse en una cuenta que tenga disponible esa función.

## Alcance del MVP

### Implementado

- Recepción de texto, audio o video desde Twilio Sandbox for WhatsApp.
- Almacenamiento privado del archivo original en Supabase Storage.
- Reproducción del audio o video desde la pantalla de Revisión.
- Transcripción automática de audio con Whisper ejecutado localmente.
- Extracción estructurada con Claude mediante la API de Anthropic.
- Flujo guiado por establecimiento y número de registro.
- Asociación `establecimiento → RENSPA`.
- Asociación `teléfono → operario`.
- Procesamiento automático sin necesidad de presionar un botón.
- Reintento manual de la interpretación si el procesamiento falla.
- Edición y confirmación humana del Registro 6.
- Planillas internas para los Registros 1 al 7.
- Filtros específicos según los campos disponibles en cada registro.
- Filtro por nombre del establecimiento en todos los registros; cada fila conserva internamente su RENSPA.
- Solicitud automática por WhatsApp de los datos obligatorios que la IA no haya podido completar.
- Exportación PDF conjunta: Registro 1 primero y registro operativo a continuación.
- Exportación CSV conjunta en un ZIP con un archivo para cada registro.
- Sección de estadísticas.
- Sección Mis campos para configurar establecimientos y operarios.
- Datos demostrativos para recorrer las secciones todavía no operativas.

### Fuera del alcance actual

- Número de WhatsApp productivo aprobado por Meta.
- Carga real por voz de los Registros 1, 2, 3, 4, 5 y 7.
- Integración automática con sistemas de SENASA.
- Presentación automática de declaraciones o documentación oficial.
- Validación automática de productos autorizados, dosis o períodos de carencia.
- Autenticación y permisos por organización.
- Hardware o cámara instalada en maquinaria.
- Funcionamiento sin conexión.

## Registros incluidos

La estructura visual toma como referencia el anexo de planillas de las Directrices para la Producción Primaria de Frutas y Hortalizas de SENASA:

https://www.argentina.gob.ar/sites/default/files/directrcesfrutihorticolas.pdf

### Registro 1 — Información general

Es una ficha única por cada RENSPA. La carga el administrador desde Mis campos y no el operario por WhatsApp. Incluye los datos generales del establecimiento y dos tablas de Datos adicionales: producción y asociación; comercialización e infraestructura.

### Registro 2 — Aplicación de fitosanitarios en material vegetal de inicio

Contempla aplicaciones sobre semillas o plantines.

### Registro 3 — Desinfección química del suelo

Registra los tratamientos químicos realizados sobre el suelo.

### Registro 4 — Esterilización de sustratos

Registra los tratamientos realizados sobre sustratos.

### Registro 5 — Fertilizaciones, abonos y enmiendas

Registra fertilizantes químicos, abonos orgánicos y enmiendas aplicadas.

### Registro 6 — Aplicación de fitosanitarios

Es el registro operativo del MVP. Recibe datos desde WhatsApp y genera una nueva fila después de la confirmación humana.

### Registro 7 — Inventario de fitosanitarios

Registra producto comercial, principio activo, compra, cantidad y vencimiento.

Todos los registros incorporan como metadatos internos la fecha de carga, el operario y el RENSPA para facilitar la trazabilidad y los filtros de AgroVoz.

## Pantallas de la aplicación

### Revisión

- Bandeja de mensajes recibidos.
- Estado del procesamiento.
- Reproductor de la evidencia original.
- Transcripción del audio.
- Indicador de confianza.
- Formulario con los campos del Registro 6.
- Guardado de correcciones.
- Confirmación final.
- Reintento manual de la IA.

### Planillas

- Pestañas `Registro 1` a `Registro 7`.
- Columnas adaptadas a cada registro.
- Filas vacías para conservar una apariencia de planilla.
- Filtros por fecha, cultivo, responsable y establecimiento cuando corresponden.
- Exportación obligatoria por establecimiento: el PDF incorpora primero el Registro 1 y el CSV entrega ambos registros dentro de un ZIP.
- Alta validada: el establecimiento sólo se guarda cuando su Registro 1 está completo.
- En la exportación solamente se exige elegir el establecimiento; la ficha ya validada se reutiliza automáticamente.

### Estadísticas

- Cantidad de filas por número de registro.
- Cultivos con actividad.
- Registros con responsables identificados.
- Distribución de registros por cultivo.

### Mis campos

- Alta y edición de la ficha completa del Registro 1 por establecimiento y RENSPA. Si un dato no aplica, se consigna `No corresponde`, `Ninguna` o `No`, según el campo.
- Alta de operarios con su teléfono de WhatsApp.
- Vista previa de la ficha del Registro 1 seleccionada.
- Actividades y cultivos recientes.

## Arquitectura

```text
Operario
   │ audio por WhatsApp
   ▼
Twilio Sandbox
   │ webhook HTTPS
   ▼
Next.js / AgroVoz
   ├── guarda evidencia ─────────────► Supabase Storage
   ├── guarda estado y contexto ─────► Supabase Database
   ├── transcribe audio ─────────────► Whisper local
   └── estructura la transcripción ──► Claude / Anthropic
                                           │
                                           ▼
                              Bandeja de revisión humana
                                           │ confirmar
                                           ▼
                                 Registro 6 + PDF / CSV
```

### Tecnologías

- Next.js 16 y React 19 para la aplicación web y los endpoints.
- Supabase Database para registros, configuración y auditoría.
- Supabase Storage para audio y video privado.
- Twilio Sandbox for WhatsApp para probar el canal conversacional.
- Whisper Small para transcripción local.
- Claude Haiku mediante Anthropic para estructurar la transcripción.
- jsPDF para exportar PDF.
- Vercel como destino previsto de despliegue.
- ngrok para exponer temporalmente el servidor local durante las pruebas.

## Modelo de datos principal

- `applications`: mensajes recibidos, transcripción, estado y campos interpretados.
- `register_6_applications`: filas confirmadas del Registro 6.
- `establishments`: ficha maestra del Registro 1, incluyendo nombre, RENSPA, responsables, producción y comercialización.
- `operators`: nombre del operario y teléfono asociado.
- `whatsapp_sessions`: etapa actual de cada conversación de WhatsApp.
- `audit_events`: eventos de interpretación, error y aprobación.
- `whatsapp-media`: bucket privado con la evidencia original.

## Puesta en marcha local

### 1. Base de datos

Crear un proyecto en Supabase y ejecutar en SQL Editor, en este orden:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_senasa_registers.sql`
3. `supabase/migrations/003_guided_whatsapp_flow.sql`
4. `supabase/migrations/004_establishment_register_1.sql`

### 2. Variables de entorno

Copiar `.env.example` como `.env.local` y completar:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SANDBOX_NUMBER=whatsapp:+14155238886
TWILIO_WEBHOOK_URL=https://TU-URL-NGROK/api/twilio/whatsapp
TWILIO_ENABLE_INTERACTIVE_LISTS=false

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
WHISPER_MODEL=onnx-community/whisper-small
```

Nunca subir `.env.local` al repositorio.

### 3. Dependencias y servidor

En PowerShell, si la política de ejecución bloquea `npm.ps1`, usar `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

La aplicación queda disponible en:

```text
http://localhost:3000
```

La primera transcripción descarga el modelo de Whisper y puede tardar varios minutos. El modelo queda en `.cache/huggingface`, una carpeta ignorada por Git.

### 4. Webhook local con ngrok

Con Next.js ejecutándose en el puerto 3000:

```powershell
ngrok http 3000
```

Copiar la URL HTTPS generada, agregar `/api/twilio/whatsapp` y usar exactamente la misma dirección en:

- `TWILIO_WEBHOOK_URL` dentro de `.env.local`;
- Twilio Console → Try WhatsApp → Sandbox settings → When a message comes in;
- método `POST`.

Reiniciar Next.js después de modificar `.env.local`.

## Preparación de la demo

Antes de presentar:

1. Confirmar que las cuatro migraciones estén aplicadas.
2. Iniciar la app con `npm.cmd run dev`.
3. Iniciar ngrok y verificar que la URL coincida en Twilio y `.env.local`.
4. Verificar que el teléfono de la demostración haya enviado el código `join ...` del Sandbox.
5. En Mis campos, cargar un establecimiento con RENSPA y un operario con el teléfono que realizará la demo.
6. Hacer una prueba completa al menos una vez para descargar previamente el modelo de Whisper.
7. Dejar abierta la aplicación en la pantalla de Revisión.
8. Tener preparado un audio corto, claro y con todos los datos necesarios.
9. Conservar un registro ya procesado como respaldo por si la red o Twilio fallan durante la presentación.

### Audio sugerido para la demostración

> Lote ciento dos, superficie cero coma ocho hectáreas. Cultivo tomate, variedad Platense. Se detectó pulgón. Aplicamos Producto Demo A, dosis doscientos cincuenta mililitros por hectárea, con mochila pulverizadora. La cosecha estimada es el veinte de septiembre. Sin viento y sin otras observaciones.

Usar nombres ficticios de productos y sustancias durante una demostración pública, salvo que la información haya sido validada por una persona competente.

## Guion de demo de 3 a 5 minutos

1. **Contexto:** explicar que el operario normalmente debería recordar o anotar la información y luego pasarla a una planilla.
2. **Mis campos:** mostrar que el establecimiento ya está relacionado con un RENSPA y el teléfono con un operario.
3. **Activación:** presionar Activar AgroVoz o escribir la frase en WhatsApp.
4. **Selección:** elegir el establecimiento y luego Registro 6.
5. **Carga:** enviar el audio sugerido.
6. **Automatización:** mostrar la confirmación inmediata de WhatsApp y explicar que la transcripción ocurre en segundo plano.
7. **Revisión:** actualizar la bandeja, abrir el mensaje, reproducir el audio y recorrer los campos completados.
8. **Control humano:** corregir un campo si se quiere demostrar la edición y presionar Confirmar Registro 6.
9. **Resultado:** abrir Planillas, filtrar por establecimiento y mostrar la nueva fila.
10. **Cierre:** descargar el PDF combinado —Registro 1 seguido del Registro 6— o el ZIP de CSV y mostrar Estadísticas.

## Pitch sugerido de 60 a 90 segundos

> En el campo, registrar una actividad suele significar detener el trabajo, completar una planilla extensa o acordarse de hacerlo más tarde. Eso genera demoras, errores y pérdida de trazabilidad. AgroVoz convierte una nota de voz de WhatsApp en un registro agrícola estructurado. El operario elige el establecimiento y el número de registro, cuenta lo que hizo y continúa trabajando. La aplicación identifica el RENSPA y al operario, conserva el audio original, transcribe la información y completa los campos con inteligencia artificial. Un responsable solamente revisa y confirma. En este MVP resolvemos el Registro 6 de aplicación de fitosanitarios y mostramos cómo escalar el mismo flujo a los otros registros de BPA. AgroVoz no reemplaza el control humano ni presenta información automáticamente ante SENASA: reduce el trabajo administrativo y mejora la calidad del dato desde su origen.

## Estructura sugerida para una presentación

1. Portada: AgroVoz — Registros agrícolas por voz.
2. Problema: carga manual, duplicación y pérdida de información.
3. Usuario: operario en campo y responsable administrativo.
4. Solución: WhatsApp + voz + IA + revisión humana.
5. Flujo del producto en nueve pasos.
6. Demo del Registro 6.
7. Planillas, filtros, RENSPA, evidencia y exportación.
8. Arquitectura técnica.
9. Alcance actual y limitaciones honestas.
10. Próximos pasos y potencial de expansión.
11. Cierre: menos formularios, mejor trazabilidad.

## Próximos pasos posibles

- Habilitar carga real para los otros seis registros.
- Agregar autenticación y organizaciones con distintos permisos.
- Permitir administrar lotes y cultivos por establecimiento.
- Validar datos obligatorios antes de solicitar confirmación.
- Incorporar un catálogo controlado de productos y principios activos.
- Evaluar técnicamente una integración con sistemas oficiales de SENASA.
- Migrar del Sandbox a un número productivo de WhatsApp Business.
- Agregar métricas de tiempo ahorrado y porcentaje de correcciones.
- Diseñar un modo de operación con conectividad intermitente.

## Consideraciones regulatorias y de seguridad

- AgroVoz organiza información; no reemplaza el criterio profesional ni la validación reglamentaria.
- El mensaje del operario no reemplaza una receta fitosanitaria cuando esta sea exigible.
- La integración directa con SENASA no está implementada ni confirmada.
- Producto, dosis, principio activo y período de carencia deben ser revisados antes de confirmar.
- Las claves de Twilio, Supabase y Anthropic se utilizan solamente en el servidor.
- El bucket de evidencia es privado y se accede mediante enlaces temporales.
- Para producción deben incorporarse autenticación, permisos, retención de datos, consentimiento, auditoría y políticas de respaldo.

## Prompt maestro para generar la presentación, demo y pitch

Copiar el siguiente bloque en una herramienta de IA junto con este README:

```text
Actuá como especialista en producto, storytelling y presentaciones de startups AgTech. Usá el README de AgroVoz como única fuente de verdad. No inventes integraciones, clientes, métricas, validaciones regulatorias ni funciones que no estén indicadas como implementadas.

Prepará tres entregables en español rioplatense claro y profesional:

1. Una presentación de 10 a 11 diapositivas. Para cada diapositiva indicá título, mensaje principal, texto visible de máximo 35 palabras, visual sugerido y notas del orador. La narrativa debe seguir problema → usuario → solución → funcionamiento → demo → valor → arquitectura → alcance → próximos pasos → cierre.

2. Un guion de demostración de 3 a 5 minutos, cronometrado por secciones. Debe mostrar Mis campos, la activación desde WhatsApp, la selección de establecimiento y Registro 6, el envío de audio, la interpretación automática, la revisión humana, la confirmación, la aparición de la fila en Planillas y la exportación.

3. Un pitch oral de 60 a 90 segundos, natural y fácil de memorizar. Debe enfatizar que el operario sólo usa WhatsApp, que la IA reduce carga administrativa, que el RENSPA y el operario se resuelven por contexto y que siempre existe confirmación humana.

Audiencia: jurado, potenciales socios o responsables de una empresa agrícola. El nivel técnico debe ser accesible. Presentá el MVP con ambición, pero distinguí claramente lo que funciona hoy de lo que es una evolución futura. No afirmar que AgroVoz está integrado con SENASA: las planillas están basadas en su formato y la eventual integración es un próximo paso sujeto a validación técnica y regulatoria.

Tono: concreto, confiable, innovador y cercano al trabajo real del campo. Evitá exageraciones, jerga innecesaria y afirmaciones de ahorro o precisión sin datos medidos.
```

## Validación técnica actual

La aplicación compila correctamente con:

```powershell
npm.cmd run build
```

El flujo debe volver a probarse de punta a punta cada vez que cambien la URL de ngrok, las variables de entorno, el Sandbox de Twilio o las migraciones de Supabase.
