"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Cliente = { id: number; nombre: string };

export default function RecepcionPage() {
  const router = useRouter();
  const [operador, setOperador] = useState<{ id: number; nombre: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [tarimaCodigo, setTarimaCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [contador, setContador] = useState(0);
  const [ultimas, setUltimas] = useState<string[]>([]);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [horaUltima, setHoraUltima] = useState<Date | null>(null);
  const [ahora, setAhora] = useState<Date>(new Date());
  const tarimaInputRef = useRef<HTMLInputElement>(null);

  // Reloj en vivo, para que la duración se vea correr mientras el operador trabaja
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("operador");
    if (!stored) {
      router.push("/");
      return;
    }
    setOperador(JSON.parse(stored));
    cargarClientes();
  }, [router]);

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

  async function recibirTarima() {
    setMensaje("");
    if (!clienteId) {
      setMensaje("Selecciona el cliente antes de escanear");
      return;
    }
    if (!tarimaCodigo) return;

    // Si la tarima no existe todavía, la damos de alta con el cliente seleccionado
    const buscar = await fetch(`/api/tarima?codigo=${encodeURIComponent(tarimaCodigo)}`);
    const buscarData = await buscar.json();

    if (!buscarData.found) {
      const alta = await fetch("/api/tarima", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: tarimaCodigo, cliente_id: Number(clienteId) }),
      });
      if (!alta.ok) {
        const err = await alta.json();
        setMensaje(err.error);
        return;
      }
    }

    const mov = await fetch("/api/movimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarima_codigo: tarimaCodigo,
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

    setContador((c) => c + 1);
    setUltimas((prev) => [tarimaCodigo, ...prev].slice(0, 5));
    setHoraInicio((prev) => prev ?? new Date());
    setHoraUltima(new Date());
    setTarimaCodigo("");
    tarimaInputRef.current?.focus();
  }

  function cerrarSesion() {
    localStorage.removeItem("operador");
    router.push("/");
  }

  function nuevaRecepcion() {
    setContador(0);
    setUltimas([]);
    setHoraInicio(null);
    setHoraUltima(null);
    setClienteId("");
    setMensaje("");
  }

  function formatearDuracion(inicio: Date, fin: Date) {
    const segundosTotales = Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / 1000));
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    return `${minutos}m ${String(segundos).padStart(2, "0")}s`;
  }

  if (!operador) return null;

  return (
    <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center">
      <div className="bg-white rounded-2xl shadow p-5 w-full max-w-md flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-neutral-900">Cegonzz - Recepción</span>
          <div className="flex items-center gap-2">
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

        <div>
          <label className="text-xs text-neutral-700">Cliente del camión (una sola vez)</label>
          {!mostrarNuevoCliente ? (
            <div className="flex gap-2 mt-1">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-neutral-900"
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
            <div className="flex gap-2 mt-1">
              <input
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className="flex-1 border rounded-lg px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
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

        <div>
          <label className="text-xs text-neutral-700">Código de tarima</label>
          <input
            ref={tarimaInputRef}
            value={tarimaCodigo}
            onChange={(e) => setTarimaCodigo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && recibirTarima()}
            placeholder="Escanea cada tarima al bajarla"
            disabled={!clienteId}
            className="w-full border rounded-lg px-3 py-2 mt-1 text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100"
            autoFocus
          />
          <p className="text-xs text-neutral-600 mt-1">
            Cada escaneo se registra sola — no hace falta tocar ningún botón.
          </p>
        </div>

        {mensaje && <p className="text-red-600 text-sm">{mensaje}</p>}

        {ultimas.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-neutral-600 mb-2">Últimas recibidas</p>
            <div className="flex flex-col gap-1">
              {ultimas.map((codigo, i) => (
                <div key={i} className="text-xs text-neutral-700">
                  <span className="text-green-600">Recibida</span> · {codigo}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-sm border-t pt-3">
          <button onClick={nuevaRecepcion} className="text-neutral-700 underline">
            Nueva recepción (otro camión)
          </button>
          <a href="/dashboard" className="text-neutral-700 underline">
            Ver dashboard
          </a>
        </div>
        <a href="/captura" className="text-center text-sm text-neutral-700 underline">
          Ir a Acomodo
        </a>
      </div>
    </main>
  );
}
