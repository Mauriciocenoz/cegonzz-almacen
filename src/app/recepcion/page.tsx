"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import JsBarcode from "jsbarcode";

type Cliente = { id: number; nombre: string };

type ProductoResultado = { codigo: number; descripcion: string; marca: string | null };

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

  const [lote, setLote] = useState("");
  const [caducidad, setCaducidad] = useState("");
  const [embarque, setEmbarque] = useState("");
  const [editandoLote, setEditandoLote] = useState(true);

  const [codigoProveedor, setCodigoProveedor] = useState("");
  const [kilos, setKilos] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [noCajas, setNoCajas] = useState("");
  const [fechaEmpaque, setFechaEmpaque] = useState("");

  const [sku, setSku] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<ProductoResultado[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(false);
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaMarca, setNuevaMarca] = useState("");

  const [mostrarServicios, setMostrarServicios] = useState(false);
  const [servicios, setServicios] = useState<Record<string, string>>({});

  const [mensaje, setMensaje] = useState("");
  const [contador, setContador] = useState(0);
  const [ultimas, setUltimas] = useState<UltimaTarima[]>([]);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [horaUltima, setHoraUltima] = useState<Date | null>(null);
  const [ahora, setAhora] = useState<Date>(new Date());
  const [etiquetaParaImprimir, setEtiquetaParaImprimir] = useState<UltimaTarima | null>(null);

  const kilosInputRef = useRef<HTMLInputElement>(null);
  const productoInputRef = useRef<HTMLInputElement>(null);
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

  // Buscar productos del catálogo mientras el operador escribe (por descripción o código)
  useEffect(() => {
    if (productoSeleccionado || !clienteId || productoQuery.trim().length < 2) {
      setProductoResultados([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(
        `/api/productos?cliente_id=${clienteId}&buscar=${encodeURIComponent(productoQuery)}`
      );
      const data = await res.json();
      setProductoResultados(data.resultados || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [productoQuery, clienteId, productoSeleccionado]);

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

  function seleccionarProducto(p: ProductoResultado) {
    setSku(String(p.codigo));
    setDescripcion(p.descripcion);
    setMarca(p.marca || "");
    setProductoSeleccionado(true);
    setProductoQuery(`${p.codigo} · ${p.descripcion}`);
    setProductoResultados([]);
  }

  function limpiarProducto() {
    setSku("");
    setDescripcion("");
    setMarca("");
    setProductoSeleccionado(false);
    setProductoQuery("");
    setProductoResultados([]);
    setMostrarNuevoProducto(false);
  }

  async function agregarProductoNuevo() {
    if (!nuevaDescripcion.trim() || !clienteId) return;
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: Number(clienteId),
        descripcion: nuevaDescripcion,
        marca: nuevaMarca || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMensaje(data.error);
      return;
    }
    setSku(String(data.codigo));
    setDescripcion(data.descripcion);
    setMarca(data.marca || "");
    setProductoSeleccionado(true);
    setProductoQuery(`${data.codigo} · ${data.descripcion}`);
    setMostrarNuevoProducto(false);
    setNuevaDescripcion("");
    setNuevaMarca("");
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

    const alta = await fetch("/api/tarima", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo_proveedor: codigoProveedor || null,
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
    setCodigoProveedor("");
    setKilos("");
    setTemperatura("");
    setNoCajas("");
    setFechaEmpaque("");
    limpiarProducto();
    setServicios({});
    setMostrarServicios(false);

    // Cada tarima recibida siempre queda lista con su etiqueta propia para imprimir
    setEtiquetaParaImprimir(nuevaTarima);

    productoInputRef.current?.focus();
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
                  onClick={async () => {
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
                  }}
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
                <div>
                  <label className="text-xs text-neutral-700">Fecha de embarque</label>
                  <input
                    type="date"
                    value={embarque}
                    onChange={(e) => setEmbarque(e.target.value)}
                    className={inputClass}
                  />
                </div>
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
          <div>
            <label className="text-xs text-neutral-700">Código del proveedor (si trae, opcional)</label>
            <input
              value={codigoProveedor}
              onChange={(e) => setCodigoProveedor(e.target.value)}
              placeholder="Escanea el código del proveedor, si tiene"
              disabled={!recepcionId || editandoLote}
              className={`${inputClass} mt-1 disabled:bg-neutral-100`}
            />
            <p className="text-xs text-neutral-600 mt-1">
              El sistema genera su propio código para la tarima automáticamente — este campo es solo
              referencia.
            </p>
          </div>

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
              <label className="text-xs text-neutral-700">Fecha de empaque</label>
              <input
                type="date"
                value={fechaEmpaque}
                onChange={(e) => setFechaEmpaque(e.target.value)}
                disabled={!recepcionId || editandoLote}
                className={`${inputClass} mt-1 disabled:bg-neutral-100`}
              />
            </div>
            <div className="col-span-2 relative">
              <label className="text-xs text-neutral-700">Producto (busca por descripción o código)</label>
              <div className="flex gap-2 mt-1">
                <input
                  ref={productoInputRef}
                  value={productoQuery}
                  onChange={(e) => {
                    setProductoQuery(e.target.value);
                    setProductoSeleccionado(false);
                  }}
                  placeholder="Ej. pechuga, o 1003"
                  disabled={!recepcionId || editandoLote}
                  className={`${inputClass} disabled:bg-neutral-100`}
                />
                {productoSeleccionado && (
                  <button onClick={limpiarProducto} className="text-xs text-neutral-600 underline whitespace-nowrap">
                    Cambiar
                  </button>
                )}
              </div>

              {productoResultados.length > 0 && (
                <div className="absolute z-10 bg-white border rounded-lg shadow mt-1 w-full max-h-48 overflow-y-auto">
                  {productoResultados.map((p) => (
                    <button
                      key={p.codigo}
                      onClick={() => seleccionarProducto(p)}
                      className="block w-full text-left px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 border-b last:border-0"
                    >
                      <span className="font-medium">{p.codigo}</span> · {p.descripcion}
                      {p.marca && ` · ${p.marca}`}
                    </button>
                  ))}
                </div>
              )}

              {productoSeleccionado && (
                <p className="text-xs text-green-700 mt-1">
                  Código {sku} · {descripcion} {marca && `· ${marca}`}
                </p>
              )}

              {!productoSeleccionado &&
                productoQuery.trim().length >= 2 &&
                productoResultados.length === 0 &&
                !mostrarNuevoProducto && (
                  <div className="mt-1">
                    <p className="text-xs text-amber-700">No se encontró ese producto en el catálogo.</p>
                    <button
                      onClick={() => {
                        setNuevaDescripcion(productoQuery);
                        setMostrarNuevoProducto(true);
                      }}
                      className="text-xs text-neutral-700 underline"
                    >
                      + Registrar como producto nuevo
                    </button>
                  </div>
                )}

              {mostrarNuevoProducto && (
                <div className="flex gap-2 mt-1">
                  <input
                    value={nuevaDescripcion}
                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                    placeholder="Descripción del producto"
                    className={inputClass}
                  />
                  <input
                    value={nuevaMarca}
                    onChange={(e) => setNuevaMarca(e.target.value)}
                    placeholder="Marca (opcional)"
                    className={inputClass}
                  />
                  <button
                    onClick={agregarProductoNuevo}
                    className="bg-neutral-900 text-white rounded-lg px-3 py-2 text-sm whitespace-nowrap"
                  >
                    Asignar código
                  </button>
                </div>
              )}
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

          <button
            onClick={recibirTarima}
            disabled={!recepcionId || editandoLote || !kilos}
            className="bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-3 font-medium"
          >
            Recibir y generar etiqueta
          </button>

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
