"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RecepcionPendiente = {
  id: number;
  cliente: string;
  fecha_inicio: string;
  num_tarimas: number;
  kilos_recibidos: string;
  cajas_recibidas: string;
};

type TarimaDetalle = {
  codigo: string;
  descripcion: string | null;
  lote: string | null;
  fecha_empaque: string | null;
  caducidad: string | null;
  kilos: string | null;
  temperatura: string | null;
  no_cajas: number | null;
};

type ItemInspeccion = { label: string; cumple: string; observaciones: string; acciones?: string };

const ITEMS_TRANSPORTE: string[] = [
  "Transporte limpio y desinfectado, sin olores extraños ni presencia de cartón, madera, plástico ajeno, polvo, vidrio, plagas, objetos personales, piedras, metales, químicos, comida",
  "Transporte pre-enfriado según producto (congelado -12°C, refrigerado 0°C, seco ambiente)",
  "Sin material ajeno al embarque (cobijas, diablitos, maquinaria, piezas de metal, etc.)",
  "Cuenta con equipo de sujeción (gatas)",
  "Techo, paredes y piso sin parches ni perforaciones, forro adecuado, puertas cierran bien",
];

const ITEMS_PRODUCTO: string[] = [
  "Color (característico)",
  "Consistencia (de acuerdo a temperatura, sin pérdida de vacío si aplica)",
  "Empaque (primario y secundario)",
  "Etiqueta (cumple)",
  "Análisis Microbiológicos",
  "Cartas Garantía",
];

export default function MesaControlPage() {
  const router = useRouter();
  const [operador, setOperador] = useState<{ id: number; nombre: string; rol: string } | null>(null);
  const [pendientes, setPendientes] = useState<RecepcionPendiente[]>([]);
  const [recepcionId, setRecepcionId] = useState("");
  const [detalle, setDetalle] = useState<{ recepcion: any; tarimas: TarimaDetalle[]; totales: any } | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [documentoListo, setDocumentoListo] = useState(false);

  const [destino, setDestino] = useState("");
  const [noFacturaRemision, setNoFacturaRemision] = useState("");
  const [noPuerta, setNoPuerta] = useState("");
  const [lineaTransporte, setLineaTransporte] = useState("");
  const [noCaja, setNoCaja] = useState("");
  const [placas, setPlacas] = useState("");
  const [noTractor, setNoTractor] = useState("");
  const [placasTracto, setPlacasTracto] = useState("");
  const [noFleje, setNoFleje] = useState("");
  const [nombreChofer, setNombreChofer] = useState("");
  const [temperaturaDisplay, setTemperaturaDisplay] = useState("");
  const [temperaturaTransportePromedio, setTemperaturaTransportePromedio] = useState("");
  const [tipoConservacion, setTipoConservacion] = useState("");
  const [horaRegistro, setHoraRegistro] = useState("");
  const [horaEntradaRampa, setHoraEntradaRampa] = useState("");
  const [horaInicioCarga, setHoraInicioCarga] = useState("");
  const [horaFinCarga, setHoraFinCarga] = useState("");
  const [horaSalidaRampa, setHoraSalidaRampa] = useState("");
  const [horaLiberacion, setHoraLiberacion] = useState("");
  const [horaCita, setHoraCita] = useState("");
  const [kilosEsperados, setKilosEsperados] = useState("");
  const [cajasEsperadas, setCajasEsperadas] = useState("");
  const [inspTransporte, setInspTransporte] = useState<ItemInspeccion[]>(
    ITEMS_TRANSPORTE.map((label) => ({ label, cumple: "Sí", observaciones: "" }))
  );
  const [inspProducto, setInspProducto] = useState<ItemInspeccion[]>(
    ITEMS_PRODUCTO.map((label) => ({ label, cumple: "Sí", observaciones: "", acciones: "" }))
  );
  const [accionesCorrectivas, setAccionesCorrectivas] = useState("No aplica");
  const [elaboro, setElaboro] = useState("");
  const [valido, setValido] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("operador");
    if (!stored) {
      router.push("/");
      return;
    }
    const op = JSON.parse(stored);
    if (op.rol !== "mesa_control") {
      router.push("/captura");
      return;
    }
    setOperador(op);
    cargarPendientes();
  }, [router]);

  async function cargarPendientes() {
    const res = await fetch("/api/recepcion");
    setPendientes(await res.json());
  }

  async function seleccionarRecepcion(id: string) {
    setRecepcionId(id);
    setDetalle(null);
    setDocumentoListo(false);
    if (!id) return;
    const res = await fetch(`/api/recepcion/${id}`);
    const data = await res.json();
    if (res.ok) setDetalle(data);
  }

  function actualizarInspTransporte(i: number, campo: "cumple" | "observaciones", valor: string) {
    setInspTransporte((prev) => prev.map((item, idx) => (idx === i ? { ...item, [campo]: valor } : item)));
  }

  function actualizarInspProducto(i: number, campo: "cumple" | "observaciones" | "acciones", valor: string) {
    setInspProducto((prev) => prev.map((item, idx) => (idx === i ? { ...item, [campo]: valor } : item)));
  }

  async function validarYGenerar() {
    setMensaje("");
    if (!recepcionId) {
      setMensaje("Selecciona una recepción");
      return;
    }
    const res = await fetch(`/api/recepcion/${recepcionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destino,
        no_factura_remision: noFacturaRemision,
        no_puerta: noPuerta,
        linea_transporte: lineaTransporte,
        no_caja: noCaja,
        placas,
        no_tractor: noTractor,
        placas_tracto: placasTracto,
        no_fleje: noFleje,
        nombre_chofer: nombreChofer,
        temperatura_display: temperaturaDisplay,
        temperatura_transporte_promedio: temperaturaTransportePromedio,
        tipo_conservacion: tipoConservacion,
        hora_registro: horaRegistro,
        hora_entrada_rampa: horaEntradaRampa,
        hora_inicio_carga: horaInicioCarga,
        hora_fin_carga: horaFinCarga,
        hora_salida_rampa: horaSalidaRampa,
        hora_liberacion: horaLiberacion,
        hora_cita: horaCita,
        kilos_esperados: kilosEsperados || null,
        cajas_esperadas: cajasEsperadas || null,
        inspeccion_transporte: inspTransporte,
        inspeccion_producto: inspProducto,
        acciones_correctivas: accionesCorrectivas,
        elaboro,
        valido,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMensaje(data.error || "Error al validar");
      return;
    }
    setDocumentoListo(true);
    cargarPendientes();
  }

  function imprimirDocumento() {
    window.print();
  }

  function cerrarSesion() {
    localStorage.removeItem("operador");
    router.push("/");
  }

  if (!operador) return null;

  const inputClass = "border rounded-lg px-3 py-2 text-neutral-900 placeholder:text-neutral-400 text-sm w-full";
  const kilosCoinciden =
    kilosEsperados && detalle && Math.abs(Number(kilosEsperados) - Number(detalle.totales.kilos)) < 0.01;
  const cajasCoinciden =
    cajasEsperadas && detalle && Number(cajasEsperadas) === Number(detalle.totales.cajas);

  return (
    <>
      <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center print:hidden">
        <div className="bg-white rounded-2xl shadow p-5 w-full max-w-3xl flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-neutral-900">Cegonzz - Mesa de Control</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-700">{operador.nombre}</span>
              <button onClick={cerrarSesion} className="text-xs text-neutral-600 underline">
                Salir
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-700">Recepción pendiente de validar</label>
            <select
              value={recepcionId}
              onChange={(e) => seleccionarRecepcion(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">Seleccionar...</option>
              {pendientes.map((p) => (
                <option key={p.id} value={p.id}>
                  REC-{String(p.id).padStart(6, "0")} · {p.cliente} · {p.num_tarimas} tarimas
                </option>
              ))}
            </select>
          </div>

          {detalle && (
            <>
              <div className="bg-neutral-50 border rounded-lg p-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-neutral-600">Cliente</p>
                  <p className="text-neutral-900 font-medium">{detalle.recepcion.cliente}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Tarimas recibidas</p>
                  <p className="text-neutral-900 font-medium">{detalle.totales.numTarimas}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Kilos recibidos</p>
                  <p className="text-neutral-900 font-medium">{detalle.totales.kilos}</p>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-900 mb-2">
                  Validación contra la orden del cliente
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-neutral-700">Kilos esperados (orden)</label>
                    <input
                      value={kilosEsperados}
                      onChange={(e) => setKilosEsperados(e.target.value)}
                      inputMode="decimal"
                      className={`${inputClass} mt-1`}
                    />
                    {kilosEsperados && (
                      <p className={`text-xs mt-1 ${kilosCoinciden ? "text-green-600" : "text-red-600"}`}>
                        {kilosCoinciden ? "✓ Coincide" : `⚠ No coincide (recibido: ${detalle.totales.kilos})`}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Cajas esperadas (orden)</label>
                    <input
                      value={cajasEsperadas}
                      onChange={(e) => setCajasEsperadas(e.target.value)}
                      inputMode="numeric"
                      className={`${inputClass} mt-1`}
                    />
                    {cajasEsperadas && (
                      <p className={`text-xs mt-1 ${cajasCoinciden ? "text-green-600" : "text-red-600"}`}>
                        {cajasCoinciden ? "✓ Coincide" : `⚠ No coincide (recibido: ${detalle.totales.cajas})`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Datos del camión y chofer</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-neutral-700">Destino</label>
                    <input value={destino} onChange={(e) => setDestino(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">No. Factura/Remisión</label>
                    <input
                      value={noFacturaRemision}
                      onChange={(e) => setNoFacturaRemision(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">No. de puerta</label>
                    <input value={noPuerta} onChange={(e) => setNoPuerta(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Línea de transporte</label>
                    <input
                      value={lineaTransporte}
                      onChange={(e) => setLineaTransporte(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">No. de caja</label>
                    <input value={noCaja} onChange={(e) => setNoCaja(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Placas de la caja</label>
                    <input value={placas} onChange={(e) => setPlacas(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">No. de tractor</label>
                    <input value={noTractor} onChange={(e) => setNoTractor(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Placas del tracto</label>
                    <input
                      value={placasTracto}
                      onChange={(e) => setPlacasTracto(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">No. de fleje</label>
                    <input value={noFleje} onChange={(e) => setNoFleje(e.target.value)} className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Nombre del chofer</label>
                    <input
                      value={nombreChofer}
                      onChange={(e) => setNombreChofer(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Tipo de conservación</label>
                    <select
                      value={tipoConservacion}
                      onChange={(e) => setTipoConservacion(e.target.value)}
                      className={`${inputClass} mt-1`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Congelado">Congelado</option>
                      <option value="Ráfaga">Ráfaga</option>
                      <option value="Fresco">Fresco</option>
                      <option value="Seco">Seco</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Temperatura de display</label>
                    <input
                      value={temperaturaDisplay}
                      onChange={(e) => setTemperaturaDisplay(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Temp. transporte (promedio)</label>
                    <input
                      value={temperaturaTransportePromedio}
                      onChange={(e) => setTemperaturaTransportePromedio(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-blue-900 mt-3 mb-2">Horarios</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-neutral-700">Registro</label>
                    <input
                      type="time"
                      value={horaRegistro}
                      onChange={(e) => setHoraRegistro(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Entrada a rampa</label>
                    <input
                      type="time"
                      value={horaEntradaRampa}
                      onChange={(e) => setHoraEntradaRampa(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Inicio de carga</label>
                    <input
                      type="time"
                      value={horaInicioCarga}
                      onChange={(e) => setHoraInicioCarga(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Fin de carga</label>
                    <input
                      type="time"
                      value={horaFinCarga}
                      onChange={(e) => setHoraFinCarga(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Salida de rampa</label>
                    <input
                      type="time"
                      value={horaSalidaRampa}
                      onChange={(e) => setHoraSalidaRampa(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Liberación</label>
                    <input
                      type="time"
                      value={horaLiberacion}
                      onChange={(e) => setHoraLiberacion(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-700">Cita</label>
                    <input
                      type="time"
                      value={horaCita}
                      onChange={(e) => setHoraCita(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 border rounded-lg p-3">
                <p className="text-xs font-semibold text-neutral-900 mb-2">Inspección del transporte</p>
                <div className="flex flex-col gap-3">
                  {inspTransporte.map((item, i) => (
                    <div key={i} className="border-b pb-2 last:border-0">
                      <p className="text-xs text-neutral-700 mb-1">{item.label}</p>
                      <div className="flex gap-2">
                        <select
                          value={item.cumple}
                          onChange={(e) => actualizarInspTransporte(i, "cumple", e.target.value)}
                          className={inputClass}
                          style={{ maxWidth: 90 }}
                        >
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                        <input
                          value={item.observaciones}
                          onChange={(e) => actualizarInspTransporte(i, "observaciones", e.target.value)}
                          placeholder="Observaciones"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-50 border rounded-lg p-3">
                <p className="text-xs font-semibold text-neutral-900 mb-2">Inspección de producto</p>
                <div className="flex flex-col gap-3">
                  {inspProducto.map((item, i) => (
                    <div key={i} className="border-b pb-2 last:border-0">
                      <p className="text-xs text-neutral-700 mb-1">{item.label}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={item.cumple}
                          onChange={(e) => actualizarInspProducto(i, "cumple", e.target.value)}
                          className={inputClass}
                        >
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                        <input
                          value={item.observaciones}
                          onChange={(e) => actualizarInspProducto(i, "observaciones", e.target.value)}
                          placeholder="Observaciones"
                          className={inputClass}
                        />
                        <input
                          value={item.acciones}
                          onChange={(e) => actualizarInspProducto(i, "acciones", e.target.value)}
                          placeholder="Acciones correctivas"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-700">Acciones correctivas generales</label>
                <input
                  value={accionesCorrectivas}
                  onChange={(e) => setAccionesCorrectivas(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-700">Elaboró</label>
                  <input value={elaboro} onChange={(e) => setElaboro(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
                <div>
                  <label className="text-xs text-neutral-700">Verificó / Validó</label>
                  <input value={valido} onChange={(e) => setValido(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
              </div>

              {mensaje && <p className="text-red-600 text-sm">{mensaje}</p>}

              {!documentoListo ? (
                <button
                  onClick={validarYGenerar}
                  className="bg-neutral-900 text-white rounded-lg py-3 font-medium"
                >
                  Validar y generar documento
                </button>
              ) : (
                <button
                  onClick={imprimirDocumento}
                  className="bg-green-700 text-white rounded-lg py-3 font-medium"
                >
                  Imprimir / Guardar como PDF
                </button>
              )}
            </>
          )}
        </div>
      </main>

      {/* Documento final imprimible */}
      {documentoListo && detalle && (
        <div className="hidden print:block print:p-6 text-sm">
          <h1 className="text-lg font-bold mb-2">Cegonzz - Recibo de Producto</h1>
          <p>Folio: REC-{String(detalle.recepcion.id).padStart(6, "0")}</p>
          <p>Cliente: {detalle.recepcion.cliente}</p>
          <p>Destino: {destino} · Orden/Remisión: {noFacturaRemision}</p>
          <p>
            Transporte: {lineaTransporte} · Placas: {placas} · Tracto: {placasTracto} · Chofer: {nombreChofer}
          </p>
          <p>
            Conservación: {tipoConservacion} · Temp. display: {temperaturaDisplay} · Temp. transporte: {temperaturaTransportePromedio}
          </p>

          <table className="w-full mt-3 border-collapse text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Tarima</th>
                <th className="text-left py-1">Descripción</th>
                <th className="text-left py-1">Lote</th>
                <th className="text-left py-1">Empaque</th>
                <th className="text-left py-1">Caducidad</th>
                <th className="text-right py-1">Cajas</th>
                <th className="text-right py-1">Kilos</th>
                <th className="text-right py-1">Temp.</th>
              </tr>
            </thead>
            <tbody>
              {detalle.tarimas.map((t, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1">{t.codigo}</td>
                  <td className="py-1">{t.descripcion || "-"}</td>
                  <td className="py-1">{t.lote || "-"}</td>
                  <td className="py-1">{t.fecha_empaque || "-"}</td>
                  <td className="py-1">{t.caducidad || "-"}</td>
                  <td className="py-1 text-right">{t.no_cajas || "-"}</td>
                  <td className="py-1 text-right">{t.kilos || "-"}</td>
                  <td className="py-1 text-right">{t.temperatura || "-"}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1" colSpan={5}>
                  TOTAL
                </td>
                <td className="py-1 text-right">{detalle.totales.cajas}</td>
                <td className="py-1 text-right">{detalle.totales.kilos}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 font-semibold">Validación contra orden del cliente</p>
          <p>
            Kilos esperados: {kilosEsperados || "-"} ({kilosCoinciden ? "Coincide" : "No coincide"}) · Cajas esperadas:{" "}
            {cajasEsperadas || "-"} ({cajasCoinciden ? "Coincide" : "No coincide"})
          </p>

          <p className="mt-3 font-semibold">Inspección del transporte</p>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {inspTransporte.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 pr-2">{item.label}</td>
                  <td className="py-1 pr-2 font-medium">{item.cumple}</td>
                  <td className="py-1">{item.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 font-semibold">Inspección de producto</p>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {inspProducto.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 pr-2">{item.label}</td>
                  <td className="py-1 pr-2 font-medium">{item.cumple}</td>
                  <td className="py-1 pr-2">{item.observaciones}</td>
                  <td className="py-1">{item.acciones}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3">Acciones correctivas: {accionesCorrectivas}</p>

          <div className="flex justify-between mt-8">
            <p>Elaboró: {elaboro}</p>
            <p>Validó: {valido}</p>
          </div>
        </div>
      )}
    </>
  );
}
