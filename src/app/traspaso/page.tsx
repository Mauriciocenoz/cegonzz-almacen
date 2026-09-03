"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Cliente = { id: number; nombre: string };

export default function TraspasoPage() {
  const router = useRouter();
  const [operador, setOperador] = useState<{ id: number; nombre: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tarimaCodigo, setTarimaCodigo] = useState("");
  const [tarimaInfo, setTarimaInfo] = useState<any>(null);
  const [nuevoClienteId, setNuevoClienteId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState("");
  const tarimaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("operador");
    if (!stored) {
      router.push("/");
      return;
    }
    setOperador(JSON.parse(stored));
    fetch("/api/clientes")
      .then((r) => r.json())
      .then(setClientes);
  }, [router]);

  async function buscarTarima() {
    setMensaje("");
    setExito("");
    setTarimaInfo(null);
    if (!tarimaCodigo) return;
    const res = await fetch(`/api/tarima?codigo=${encodeURIComponent(tarimaCodigo)}`);
    const data = await res.json();
    if (!data.found) {
      setMensaje("Tarima no encontrada");
      return;
    }
    if (data.tarima.estado !== "dentro") {
      setMensaje("Esta tarima no está acomodada en cámara todavía");
      return;
    }
    setTarimaInfo(data.tarima);
  }

  async function confirmarTraspaso() {
    setMensaje("");
    if (!nuevoClienteId) {
      setMensaje("Selecciona el cliente nuevo");
      return;
    }
    const res = await fetch("/api/traspaso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarima_codigo: tarimaCodigo,
        nuevo_cliente_id: Number(nuevoClienteId),
        operador_id: operador?.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMensaje(data.error);
      return;
    }
    const nuevoNombre = clientes.find((c) => String(c.id) === nuevoClienteId)?.nombre;
    setExito(`Tarima ${tarimaCodigo} traspasada a ${nuevoNombre}`);
    setTarimaCodigo("");
    setTarimaInfo(null);
    setNuevoClienteId("");
    tarimaInputRef.current?.focus();
  }

  function cerrarSesion() {
    localStorage.removeItem("operador");
    router.push("/");
  }

  if (!operador) return null;

  const inputClass = "border rounded-lg px-3 py-2 text-neutral-900 placeholder:text-neutral-400 text-sm w-full";

  return (
    <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center">
      <div className="bg-white rounded-2xl shadow p-5 w-full max-w-md flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-neutral-900">Cegonzz - Traspaso</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-700">Operador: {operador.nombre}</span>
            <button onClick={cerrarSesion} className="text-xs text-neutral-600 underline">
              Salir
            </button>
          </div>
        </div>
        <p className="text-xs text-neutral-600">
          Cambia el dueño de una tarima que ya está en cámara, sin que salga del almacén.
        </p>

        <div>
          <label className="text-xs text-neutral-700">Código de tarima</label>
          <input
            ref={tarimaInputRef}
            value={tarimaCodigo}
            onChange={(e) => setTarimaCodigo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarTarima()}
            onBlur={buscarTarima}
            placeholder="Escanea o escribe el código"
            className={`${inputClass} mt-1`}
            autoFocus
          />
        </div>

        {tarimaInfo && (
          <div className="bg-neutral-50 border rounded-lg p-3 text-sm">
            <p className="text-neutral-900 font-medium">Dueño actual: {tarimaInfo.cliente}</p>
            <p className="text-neutral-700 text-xs">
              Kilos: {tarimaInfo.kilos || "-"} · Ubicación actual conservada
            </p>
          </div>
        )}

        {tarimaInfo && (
          <div>
            <label className="text-xs text-neutral-700">Nuevo dueño</label>
            <select
              value={nuevoClienteId}
              onChange={(e) => setNuevoClienteId(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes
                .filter((c) => c.nombre !== tarimaInfo.cliente)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>
        )}

        {mensaje && <p className="text-red-600 text-sm">{mensaje}</p>}
        {exito && <p className="text-green-700 text-sm">{exito}</p>}

        {tarimaInfo && (
          <button
            onClick={confirmarTraspaso}
            disabled={!nuevoClienteId}
            className="bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-3 font-medium"
          >
            Confirmar traspaso
          </button>
        )}

        <div className="flex justify-between text-sm border-t pt-3">
          <a href="/captura" className="text-neutral-700 underline">
            Ir a Acomodo
          </a>
          <a href="/dashboard" className="text-neutral-700 underline">
            Ver dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
