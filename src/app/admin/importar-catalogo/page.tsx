"use client";
import { useState } from "react";

export default function ImportarCatalogoPage() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState("");

  async function importar() {
    setCargando(true);
    setError("");
    setResultado(null);
    const res = await fetch("/api/importar-catalogo", { method: "POST" });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) {
      setError(data.error || "Error al importar");
      return;
    }
    setResultado(data);
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md flex flex-col gap-4 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Cargar catálogo real</h1>
        <p className="text-sm text-neutral-700">
          Esto carga tus 7 clientes (COLDS, DAWN, Jorge Valencia, Jose Barbeito, MORENO, QUIN, Sunland)
          con sus 49 productos ya codificados, tal como están en tu Excel. Es seguro darle clic más de
          una vez — no duplica nada.
        </p>
        <button
          onClick={importar}
          disabled={cargando}
          className="bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-3 font-medium"
        >
          {cargando ? "Cargando..." : "Cargar catálogo"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {resultado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 text-left">
            <p>✓ Clientes creados: {resultado.clientesCreados}</p>
            <p>✓ Clientes actualizados: {resultado.clientesActualizados}</p>
            <p>✓ Productos creados: {resultado.productosCreados}</p>
            <p>· Productos que ya existían: {resultado.productosExistentes}</p>
          </div>
        )}
        <a href="/recepcion" className="text-sm text-neutral-700 underline mt-2">
          Ir a Recepción
        </a>
      </div>
    </main>
  );
}
