"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import JsBarcode from "jsbarcode";

type Cliente = { id: number; nombre: string };

type UltimaTarima = {
  codigo: string;
  kilos: string;
  lote: string;
  caducidad: string;
  embarque: string;
  cliente: string;
};

const TIPOS_SERVICIO = [
  { key: "traspaleo", label: "Traspaleo" },
  { key: "romaneo", label: "Romaneo" },
  { key: "remontado", label: "Remontado" },
  { key: "reemplazo", label: "Reemplazo" },
  { key: "despunte", label: "Despunte" },
  { key: "traspaleo_granel", label: "Traspaleo a granel" },
  { key: "emplayado", label: "Emplayado" },
  { key: "picking", label: "Picking (cajas)" },
  { key: "descopetado", label: "Descopetado (cajas)" },
] as const;

export default function RecepcionPage() {
  const router = useRouter();
  const [operador, setOperador] = useState<{ id: number; nombre: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [recepcionId, setRecepcionId] = useState<number | null>(null);
  const [folio, setFolio] = useState("");
  const [editandoCliente, setEditandoCliente] = useState(true);

  // Datos del lote actual — se llenan una vez y aplican a varias tarimas seguidas
  const [lote, setLote] = useState("");
  const [caducidad, setCaducidad] = useState("");
  const [embarque, setEmbarque] = useState("");
  const [editandoLote, setEditandoLote] = useState(true);

  const [tarimaCodigo, setTarimaCodigo] = useState("");
  const [kilos, setKilos] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [sku, setSku] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [fechaEmpaque, setFechaEmpaque] = useState("");
  const [noCajas, setNoCajas] = useState("");
  const [cajasOrigen, setCajasOrigen] = useState("");
  const [tarimasAlmacenar, setTarimasAlmacenar] = useState("");
  const [sinCodigo, setSinCodigo] = useState(false);

  const [mostrarServicios, setMostrarServicios] = useState(false);
  const [servicios, setServicios] = useState<Record<string, string>>({});

  const [mensaje, setMensaje] = useState("");
  const [contador, setContador] = useState(0);
  const [ultimas, setUltimas] = useState<UltimaTarima[]>([]);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [horaUltima, setHoraUltima] = useState<Date | null>(null);
  const [ahora, setAhora] = useState<Date>(new Date());
  const [etiquetaParaImprimir, setEtiquetaParaImprimir] = useState<UltimaTarima | null>(null);

  const tarimaInputRef = useRef<HTMLInputElement>(null);
  const kilosInputRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const barcodePrintRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("operador");
    if (!stored) {
      router.push("/");
      return;
    }
    setOperador(JSON.parse(stored));
    cargarClientes();
  }, [router]);

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!etiquetaParaImprimir) return;
    const opciones = {
      format: "CODE128" as const,
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 16,
      margin: 6,
    };
    if (barcodeRef.current) JsBarcode(barcodeRef.current, etiquetaParaImprimir.codigo, opciones);
    if (barcodePrintRef.current) JsBarcode(barcodePrintRef.current, etiquetaParaImprimir.codigo, opciones);
  }, [etiquetaParaImprimir]);

  async function cargarClientes() {
    const res = await fetch("/api/clientes");
    setClientes(await res.json());
  }

  async function agregarCliente() {
    if (!nuevoClienteNombre.trim()) return;
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoClienteNombre }),
    });
    const data = await res.json();
    if (res.ok) {
      await cargarClientes();
      setClienteId(String(data.id));
      setNuevoClienteNombre("");
      setMostrarNuevoCliente(false);
    } else {
      setMensaje(data.error);
    }
  }

  async function confirmarCliente() {
    setMensaje("");
    if (!clienteId) {
      setMensaje("Selecciona el cliente antes de continuar");
      return;
    }
    const res = await fetch("/api/recepcion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: Number(clienteId), operador_id: operador?.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMensaje(data.error || "Error al iniciar la recepción");
      return;
    }
    setRecepcionId(data.id);
    setFolio(data.folio);
    setEditandoCliente(false);
  }

  async function recibirTarima() {
    setMensaje("");
    if (!recepcionId) {
      setMensaje("Primero confirma el cliente");
      return;
    }
    if (!kilos) {
      setMensaje("Captura los kilos de la tarima (de la hoja master)");
      kilosInputRef.current?.focus();
      return;
    }
    if (!sinCodigo && !tarimaCodigo) return;

    const codigoAEnviar = sinCodigo ? "" : tarimaCodigo;

    if (!sinCodigo) {
      const buscar = await fetch(`/api/tarima?codigo=${encodeURIComponent(tarimaCodigo)}`);
      const buscarData = await buscar.json();
      if (buscarData.found) {
        setMensaje("Esa tarima ya está registrada.");
        return;
      }
    }

    const alta = await fetch("/api/tarima", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo: codigoAEnviar,
        cliente_id: Number(clienteId),
        kilos,
        temperatura: temperatura || null,
        lote: lote || null,
        caducidad: caducidad || null,
        embarque: embarque || null,
        sku: sku || null,
        descripcion: descripcion || null,
        marca: marca || null,
        fecha_empaque: fechaEmpaque || null,
        no_cajas: noCajas || null,
        cajas_origen: cajasOrigen || null,
        tarimas_almacenar: tarimasAlmacenar || null,
        recepcion_id: recepcionId,
      }),
    });
    const altaData = await alta.json();
    if (!alta.ok) {
      setMensaje(altaData.error);
      return;
    }

    const codigoFinal = altaData.codigo;
    const tarimaIdNueva = altaData.id;

    const mov = await fetch("/api/movimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarima_codigo: codigoFinal,
        ubicacion_codigo: "ANDEN",
        tipo: "entrada",
        operador_id: operador?.id,
        forzar: true,
      }),
    });
    const movData = await mov.json();
    if (!mov.ok) {
      setMensaje(movData.error);
      return;
    }

    const serviciosLista = TIPOS_SERVICIO.map((s) => ({
      tipo: s.key,
      cantidad: Number(servicios[s.key] || 0),
    })).filter((s) => s.cantidad > 0);

    if (serviciosLista.length > 0) {
      await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarima_id: tarimaIdNueva, servicios: serviciosLista }),
      });
    }

    const clienteNombre = clientes.find((c) => String(c.id) === clienteId)?.nombre ?? "";
    const nuevaTarima: UltimaTarima = {
      codigo: codigoFinal,
      kilos,
      lote,
      caducidad,
      embarque,
      cliente: clienteNombre,
    };

    setContador((c) => c + 1);
    setUltimas((prev) => [nuevaTarima, ...prev].slice(0, 5));
    setHoraInicio((prev) => prev ?? new Date());
    setHoraUltima(new Date());
    setTarimaCodigo("");
    setKilos("");
    setTemperatura("");
    setSku("");
    setDescripcion("");
    setMarca("");
    setFechaEmpaque("");
    setNoCajas("");
    setCajasOrigen("");
    setTarimasAlmacenar("");
    setServicios({});
    setMostrarServicios(false);

    if (sinCodigo) {
      setEtiquetaParaImprimir(nuevaTarima);
    }

    tarimaInputRef.current?.focus();
  }

  function imprimirEtiqueta() {
    window.print();
  }

  function nuevoCamion() {
    setContador(0);
    setUltimas([]);
    setHoraInicio(null);
    setHoraUltima(null);
    setClienteId("");
    setEditandoCliente(true);
    setRecepcionId(null);
    setFolio("");
    setLote("");
    setCaducidad("");
    setEmbarque("");
    setEditandoLote(true);
    setMensaje("");
  }

  function nuevoLote() {
    setLote("");
    setCaducidad("");
    setEmbarque("");
    setEditandoLote(true);
  }

  function cerrarSesion() {
    localStorage.removeItem("operador");
    router.push("/");
  }

  function formatearDuracion(inicio: Date, fin: Date) {
    const segundosTotales = Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / 1000));
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    return `${minutos}m ${String(segundos).padStart(2, "0")}s`;
  }

  if (!operador) return null;

  const inputClass =
    "border rounded-lg px-3 py-2 text-neutral-900 placeholder:text-neutral-400 text-sm w-full";

  return (
    <>
      <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center print:hidden">
        <div className="bg-white rounded-2xl shadow p-5 w-full max-w-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-neutral-900">Cegonzz - Recepción</span>
            <div className="flex items-center gap-2">
              {folio && <span className="text-xs text-neutral-700">Folio: {folio}</span>}
              <span className="text-xs text-neutral-700">Operador: {operador.nombre}</span>
              <button onClick={cerrarSesion} className="text-xs text-neutral-600 underline">
                Salir
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 text-white rounded-xl p-4 text-center">
            <p className="text-xs text-neutral-300">Tarimas recibidas en esta sesión</p>
            <p className="text-3xl font-semibold">{contador}</p>
            {horaInicio && (
              <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-neutral-700">
                <div>
                  <p className="text-xs text-neutral-400">Inicio</p>
                  <p className="text-sm font-medium">
                    {horaInicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Duración</p>
                  <p className="text-sm font-medium">{formatearDuracion(horaInicio, ahora)}</p>
                </div>
                {horaUltima && (
                  <div>
                    <p className="text-xs text-neutral-400">Última tarima</p>
                    <p className="text-sm font-medium">
                      {horaUltima.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-blue-900">Cliente del camión</p>
              {!editandoCliente && (
                <button onClick={nuevoCamion} className="text-xs text-blue-900 underline">
                  Nuevo camión
                </button>
              )}
            </div>
            {editandoCliente ? (
              <div className="flex flex-col gap-2">
                {!mostrarNuevoCliente ? (
                  <div className="flex gap-2">
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setMostrarNuevoCliente(true)}
                      className="text-sm border rounded-lg px-3 py-2 whitespace-nowrap text-neutral-900"
                    >
                      + Nuevo
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={nuevoClienteNombre}
                      onChange={(e) => setNuevoClienteNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                      className={inputClass}
                    />
                    <button
                      onClick={agregarCliente}
                      className="text-sm bg-neutral-900 text-white rounded-lg px-3 py-2"
                    >
                      Agregar
                    </button>
                  </div>
                )}
                <button
                  onClick={confirmarCliente}
                  className="bg-blue-900 text-white rounded-lg py-2 text-sm font-medium"
                >
                  Confirmar y empezar a recibir
                </button>
              </div>
            ) : (
              <p className="text-xs text-blue-900">
                {clientes.find((c) => String(c.id) === clienteId)?.nombre}
              </p>
            )}
          </div>

          {/* Datos del lote actual */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-amber-800">Datos del lote actual</p>
              {!editandoLote && (
                <button onClick={nuevoLote} className="text-xs text-amber-800 underline">
                  Nuevo lote
                </button>
              )}
            </div>
            {editandoLote ? (
              <div className="grid grid-cols-3 gap-2">
                <input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Lote" className={inputClass} />
                <input
                  type="date"
                  value={caducidad}
                  onChange={(e) => setCaducidad(e.target.value)}
                  className={inputClass}
                />
                <input
                  value={embarque}
                  onChange={(e) => setEmbarque(e.target.value)}
                  placeholder="Embarque"
                  className={inputClass}
                />
                <button
                  onClick={() => setEditandoLote(false)}
                  disabled={!recepcionId}
                  className="col-span-3 bg-amber-800 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium"
                >
                  Usar estos datos para las siguientes tarimas
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-800">
                Lote: {lote || "—"} · Caducidad: {caducidad || "—"} · Embarque: {embarque || "—"}
              </p>
            )}
          </div>

          {/* Captura de tarima */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sinCodigo"
              checked={sinCodigo}
              onChange={(e) => setSinCodigo(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="sinCodigo" className="text-xs text-neutral-700">
              Esta tarima no trae código útil — generar uno propio
            </label>
          </div>

          {!sinCodigo && (
            <div>
              <label className="text-xs text-neutral-700">Código de tarima</label>
              <input
                ref={tarimaInputRef}
                value={tarimaCodigo}
                onChange={(e) => setTarimaCodigo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && kilosInputRef.current?.focus()}
                placeholder="Escanea el código del proveedor"
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
                autoFocus
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-neutral-700">Kilos (hoja master)</label>
              <input
                ref={kilosInputRef}
                value={kilos}
                onChange={(e) => setKilos(e.target.value)}
                placeholder="Ej. 850.5"
                inputMode="decimal"
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">Temperatura (°C)</label>
              <input
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                placeholder="Ej. -18"
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">No. de cajas</label>
              <input
                value={noCajas}
                onChange={(e) => setNoCajas(e.target.value)}
                inputMode="numeric"
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">SKU / Código de producto</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">Marca</label>
              <input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">Fecha de empaque</label>
              <input
                type="date"
                value={fechaEmpaque}
                onChange={(e) => setFechaEmpaque(e.target.value)}
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-neutral-700">Descripción del producto</label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">Cajas de origen</label>
              <input
                value={cajasOrigen}
                onChange={(e) => setCajasOrigen(e.target.value)}
                inputMode="numeric"
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">Tarimas a almacenar</label>
              <input
                value={tarimasAlmacenar}
                onChange={(e) => setTarimasAlmacenar(e.target.value)}
                inputMode="numeric"
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
          </div>

          {/* Servicios extra facturables */}
          <div>
            <button
              onClick={() => setMostrarServicios((v) => !v)}
              className="text-xs text-neutral-700 underline"
            >
              {mostrarServicios ? "Ocultar servicios extra" : "+ Agregar servicios extra a esta tarima"}
            </button>
            {mostrarServicios && (
              <div className="grid grid-cols-3 gap-2 mt-2 bg-neutral-50 border rounded-lg p-3">
                {TIPOS_SERVICIO.map((s) => (
                  <div key={s.key}>
                    <label className="text-xs text-neutral-700">{s.label}</label>
                    <input
                      value={servicios[s.key] || ""}
                      onChange={(e) => setServicios((prev) => ({ ...prev, [s.key]: e.target.value }))}
                      inputMode="numeric"
                      placeholder="0"
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {(sinCodigo || tarimaCodigo) && (
            <button
              onClick={recibirTarima}
              disabled={!recepcionId || editandoLote || !kilos}
              className="bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-3 font-medium"
            >
              {sinCodigo ? "Recibir y generar etiqueta" : "Recibir tarima"}
            </button>
          )}

          {mensaje && <p className="text-red-600 text-sm">{mensaje}</p>}

          {etiquetaParaImprimir && (
            <div className="border border-neutral-300 rounded-lg p-3 flex flex-col items-center gap-2">
              <p className="text-xs text-neutral-700">Etiqueta lista para imprimir</p>
              <svg ref={barcodeRef}></svg>
              <button
                onClick={imprimirEtiqueta}
                className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                Imprimir etiqueta
              </button>
            </div>
          )}

          {ultimas.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs text-neutral-600 mb-2">Últimas recibidas</p>
              <div className="flex flex-col gap-1">
                {ultimas.map((u, i) => (
                  <div key={i} className="text-xs text-neutral-700">
                    <span className="text-green-600">Recibida</span> · {u.codigo} · {u.kilos} kg
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end text-sm border-t pt-3">
            <a href="/dashboard" className="text-neutral-700 underline">
              Ver dashboard
            </a>
          </div>
          <a href="/captura" className="text-center text-sm text-neutral-700 underline">
            Ir a Acomodo
          </a>
        </div>
      </main>

      {etiquetaParaImprimir && (
        <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:p-4">
          <p className="text-lg font-bold">{etiquetaParaImprimir.cliente}</p>
          <svg ref={barcodePrintRef} className="my-2"></svg>
          <table className="text-sm mt-2">
            <tbody>
              <tr>
                <td className="pr-4 font-semibold">Kilos:</td>
                <td>{etiquetaParaImprimir.kilos}</td>
              </tr>
              <tr>
                <td className="pr-4 font-semibold">Lote:</td>
                <td>{etiquetaParaImprimir.lote || "-"}</td>
              </tr>
              <tr>
                <td className="pr-4 font-semibold">Caducidad:</td>
                <td>{etiquetaParaImprimir.caducidad || "-"}</td>
              </tr>
              <tr>
                <td className="pr-4 font-semibold">Embarque:</td>
                <td>{etiquetaParaImprimir.embarque || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
