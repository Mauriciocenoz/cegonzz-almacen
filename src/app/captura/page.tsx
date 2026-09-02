"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Cliente = { id: number; nombre: string };
type Movimiento = {
  id: number;
  tipo: string;
  fecha: string;
  tarima_codigo: string;
  ubicacion_codigo: string;
  operador: string;
};

export default function CapturaPage() {
  const router = useRouter();
  const [operador, setOperador] = useState<{ id: number; nombre: string } | null>(null);
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada");
  const [tarimaCodigo, setTarimaCodigo] = useState("");
  const [ubicacionCodigo, setUbicacionCodigo] = useState("");
  const [tarimaEncontrada, setTarimaEncontrada] = useState<any>(null);
  const [tarimaNueva, setTarimaNueva] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [advertenciaFifo, setAdvertenciaFifo] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const tarimaInputRef = useRef<HTMLInputElement>(null);
  const ubicacionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("operador");
    if (!stored) {
      router.push("/");
      return;
    }
    setOperador(JSON.parse(stored));
    cargarClientes();
    cargarMovimientos();
  }, [router]);

  async function cargarClientes() {
    const res = await fetch("/api/clientes");
    setClientes(await res.json());
  }

  async function cargarMovimientos() {
    const res = await fetch("/api/movimiento");
    setMovimientos(await res.json());
  }

  async function buscarTarima(codigo: string) {
    if (!codigo) {
      setTarimaEncontrada(null);
      setTarimaNueva(false);
      return;
    }
    const res = await fetch(`/api/tarima?codigo=${encodeURIComponent(codigo)}`);
    const data = await res.json();
    if (data.found) {
      setTarimaEncontrada(data.tarima);
      setTarimaNueva(false);
    } else {
      setTarimaEncontrada(null);
      setTarimaNueva(true);
    }
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

  async function darDeAltaYRegistrar() {
    setMensaje("");
    if (!clienteId) {
      setMensaje("Selecciona un cliente");
      return;
    }
    const altaRes = await fetch("/api/tarima", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: tarimaCodigo, cliente_id: Number(clienteId) }),
    });
    const altaData = await altaRes.json();
    if (!altaRes.ok) {
      setMensaje(altaData.error);
      return;
    }
    await confirmarMovimiento(false);
  }

  async function confirmarMovimiento(forzar: boolean) {
    setMensaje("");
    setAdvertenciaFifo("");
    const res = await fetch("/api/movimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarima_codigo: tarimaCodigo,
        ubicacion_codigo: ubicacionCodigo,
        tipo,
        operador_id: operador?.id,
        forzar,
      }),
    });
    const data = await res.json();

    if (res.status === 409 && data.warning) {
      setAdvertenciaFifo(data.mensaje);
      return;
    }
    if (!res.ok) {
      setMensaje(data.error || "Error al registrar movimiento");
      return;
    }

    // Éxito: limpiar formulario
    setTarimaCodigo("");
    setUbicacionCodigo("");
    setTarimaEncontrada(null);
    setTarimaNueva(false);
    setClienteId("");
    await cargarMovimientos();
    tarimaInputRef.current?.focus();
  }

  function cerrarSesion() {
    localStorage.removeItem("operador");
    router.push("/");
  }

  if (!operador) return null;

  return (
    <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center">
      <div className="bg-white rounded-2xl shadow p-5 w-full max-w-md flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Cegonzz - Captura</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Operador: {operador.nombre}</span>
            <button onClick={cerrarSesion} className="text-xs text-neutral-400 underline">
              Salir
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTipo("entrada")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              tipo === "entrada" ? "bg-red-600 text-white border-red-600" : "border-neutral-300"
            }`}
          >
            Entrada
          </button>
          <button
            onClick={() => setTipo("salida")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              tipo === "salida" ? "bg-red-600 text-white border-red-600" : "border-neutral-300"
            }`}
          >
            Salida
          </button>
        </div>

        <div>
          <label className="text-xs text-neutral-500">Código de tarima</label>
          <input
            ref={tarimaInputRef}
            value={tarimaCodigo}
            onChange={(e) => setTarimaCodigo(e.target.value)}
            onBlur={() => buscarTarima(tarimaCodigo)}
            onKeyDown={(e) => e.key === "Enter" && buscarTarima(tarimaCodigo)}
            placeholder="Escanea o escribe el código"
            className="w-full border rounded-lg px-3 py-2 mt-1"
            autoFocus
          />
          {tarimaEncontrada && (
            <p className="text-xs text-neutral-500 mt-1">
              Cliente: {tarimaEncontrada.cliente} · Estado: {tarimaEncontrada.estado}
            </p>
          )}
          {tarimaNueva && (
            <p className="text-xs text-amber-600 mt-1">Tarima nueva — no está en el sistema</p>
          )}
        </div>

        {tarimaNueva && (
          <div>
            <label className="text-xs text-neutral-500">Cliente</label>
            {!mostrarNuevoCliente ? (
              <div className="flex gap-2 mt-1">
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2"
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
                  className="text-sm border rounded-lg px-3 py-2 whitespace-nowrap"
                >
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <input
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <button
                  onClick={agregarCliente}
                  className="text-sm bg-neutral-900 text-white rounded-lg px-3 py-2"
                >
                  Agregar
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-neutral-500">Código de ubicación</label>
          <input
            ref={ubicacionInputRef}
            value={ubicacionCodigo}
            onChange={(e) => setUbicacionCodigo(e.target.value)}
            placeholder="Ej. Z2-R04-P07-N05"
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>

        {mensaje && <p className="text-red-600 text-sm">{mensaje}</p>}

        {advertenciaFifo && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
            <p className="text-sm text-amber-800">{advertenciaFifo}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => confirmarMovimiento(true)}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm"
              >
                Continuar de todas formas
              </button>
              <button
                onClick={() => setAdvertenciaFifo("")}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!advertenciaFifo && (
          <button
            onClick={tarimaNueva ? darDeAltaYRegistrar : () => confirmarMovimiento(false)}
            disabled={!tarimaCodigo || !ubicacionCodigo}
            className="bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-3 font-medium"
          >
            {tarimaNueva ? "Dar de alta y registrar entrada" : "Confirmar movimiento"}
          </button>
        )}

        <div className="border-t pt-3">
          <p className="text-xs text-neutral-400 mb-2">Últimos movimientos</p>
          <div className="flex flex-col gap-1">
            {movimientos.map((m) => (
              <div key={m.id} className="flex justify-between text-xs">
                <span>
                  <span className={m.tipo === "entrada" ? "text-green-600" : "text-red-600"}>
                    {m.tipo === "entrada" ? "Entrada" : "Salida"}
                  </span>{" "}
                  · {m.tarima_codigo}
                </span>
                <span className="text-neutral-400">
                  {m.ubicacion_codigo} · {new Date(m.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <a href="/dashboard" className="text-center text-sm text-neutral-500 underline">
          Ver dashboard de ocupación
        </a>
      </div>
    </main>
  );
}
