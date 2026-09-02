"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
  const [tipo, setTipo] = useState<"acomodo" | "salida">("acomodo");
  const [tarimaCodigo, setTarimaCodigo] = useState("");
  const [ubicacionCodigo, setUbicacionCodigo] = useState("");
  const [tarimaEncontrada, setTarimaEncontrada] = useState<any>(null);
  const [tarimaNoRecibida, setTarimaNoRecibida] = useState(false);
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
    cargarMovimientos();
  }, [router]);

  async function cargarMovimientos() {
    const res = await fetch("/api/movimiento");
    setMovimientos(await res.json());
  }

  async function buscarTarima(codigo: string, saltarFoco = false) {
    if (!codigo) {
      setTarimaEncontrada(null);
      setTarimaNoRecibida(false);
      return;
    }
    const res = await fetch(`/api/tarima?codigo=${encodeURIComponent(codigo)}`);
    const data = await res.json();
    if (data.found) {
      setTarimaEncontrada(data.tarima);
      setTarimaNoRecibida(false);
    } else {
      setTarimaEncontrada(null);
      setTarimaNoRecibida(true);
    }
    if (saltarFoco) {
      ubicacionInputRef.current?.focus();
    }
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

    setTarimaCodigo("");
    setUbicacionCodigo("");
    setTarimaEncontrada(null);
    setTarimaNoRecibida(false);
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
          <span className="font-semibold text-neutral-900">Cegonzz - Acomodo</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-700">Operador: {operador.nombre}</span>
            <button onClick={cerrarSesion} className="text-xs text-neutral-600 underline">
              Salir
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTipo("acomodo")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              tipo === "acomodo" ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 text-neutral-900"
            }`}
          >
            Acomodo
          </button>
          <button
            onClick={() => setTipo("salida")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              tipo === "salida" ? "bg-red-600 text-white border-red-600" : "border-neutral-300 text-neutral-900"
            }`}
          >
            Salida
          </button>
        </div>

        <div>
          <label className="text-xs text-neutral-700">Código de tarima</label>
          <input
            ref={tarimaInputRef}
            value={tarimaCodigo}
            onChange={(e) => setTarimaCodigo(e.target.value)}
            onBlur={() => buscarTarima(tarimaCodigo)}
            onKeyDown={(e) => e.key === "Enter" && buscarTarima(tarimaCodigo, true)}
            placeholder="Escanea o escribe el código"
            className="w-full border rounded-lg px-3 py-2 mt-1 text-neutral-900 placeholder:text-neutral-400"
            autoFocus
          />
          {tarimaEncontrada && (
            <p className="text-xs text-neutral-700 mt-1">
              Cliente: {tarimaEncontrada.cliente} · Estado: {tarimaEncontrada.estado}
            </p>
          )}
          {tarimaNoRecibida && (
            <p className="text-xs text-red-600 mt-1">
              Esta tarima no ha sido recibida. Pásala primero por Recepción.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-neutral-700">Código de ubicación</label>
          <input
            ref={ubicacionInputRef}
            value={ubicacionCodigo}
            onChange={(e) => setUbicacionCodigo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tarimaCodigo && ubicacionCodigo && !tarimaNoRecibida) {
                confirmarMovimiento(false);
              }
            }}
            placeholder="Ej. Z2-R04-P07-N05"
            className="w-full border rounded-lg px-3 py-2 mt-1 text-neutral-900 placeholder:text-neutral-400"
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
            onClick={() => confirmarMovimiento(false)}
            disabled={!tarimaCodigo || !ubicacionCodigo || tarimaNoRecibida}
            className="bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-3 font-medium"
          >
            Confirmar movimiento
          </button>
        )}

        <div className="border-t pt-3">
          <p className="text-xs text-neutral-600 mb-2">Últimos movimientos</p>
          <div className="flex flex-col gap-1">
            {movimientos.map((m) => (
              <div key={m.id} className="flex justify-between text-xs">
                <span>
                  <span
                    className={
                      m.tipo === "entrada" ? "text-blue-600" : m.tipo === "acomodo" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {m.tipo === "entrada" ? "Recepción" : m.tipo === "acomodo" ? "Acomodo" : "Salida"}
                  </span>{" "}
                  · {m.tarima_codigo}
                </span>
                <span className="text-neutral-600">
                  {m.ubicacion_codigo} · {new Date(m.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between text-sm border-t pt-3">
          <a href="/recepcion" className="text-neutral-700 underline">
            Ir a Recepción
          </a>
          <a href="/dashboard" className="text-neutral-700 underline">
            Ver dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
