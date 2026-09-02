"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cliente = { id: number; nombre: string };
type DiaFacturacion = {
  fecha: string;
  posicionesInicio: number;
  entradas: number;
  salidas: number;
  posicionesFin: number;
};

function primerDiaDelMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function FacturacionPage() {
  const router = useRouter();
  const [operador, setOperador] = useState<{ id: number; nombre: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoyStr());
  const [datos, setDatos] = useState<{ cliente: string; dias: DiaFacturacion[] } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

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

  async function generarReporte() {
    setMensaje("");
    if (!clienteId) {
      setMensaje("Selecciona un cliente");
      return;
    }
    setCargando(true);
    const res = await fetch(
      `/api/facturacion?cliente_id=${clienteId}&desde=${desde}&hasta=${hasta}`
    );
    const data = await res.json();
    setCargando(false);
    if (!res.ok) {
      setMensaje(data.error);
      setDatos(null);
      return;
    }
    setDatos(data);
  }

  if (!operador) return null;

  const totalEntradas = datos?.dias.reduce((acc, d) => acc + d.entradas, 0) ?? 0;
  const totalSalidas = datos?.dias.reduce((acc, d) => acc + d.salidas, 0) ?? 0;

  return (
    <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-neutral-900">Facturación</h1>
          <a href="/dashboard" className="text-sm text-neutral-700 underline">
            Ver dashboard
          </a>
        </div>

        <div className="bg-white rounded-xl p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-neutral-700">Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-neutral-900"
              >
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-700">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-neutral-900"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-700">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1 text-neutral-900"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generarReporte}
                disabled={cargando}
                className="w-full bg-neutral-900 disabled:opacity-40 text-white rounded-lg py-2 font-medium"
              >
                {cargando ? "Generando..." : "Generar reporte"}
              </button>
            </div>
          </div>
          {mensaje && <p className="text-red-600 text-sm">{mensaje}</p>}
        </div>

        {datos && (
          <div className="bg-white rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-neutral-900">{datos.cliente}</p>
              <p className="text-xs text-neutral-700">
                Total entradas: {totalEntradas} · Total salidas: {totalSalidas}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-700 border-b">
                  <th className="py-2 font-normal">Fecha</th>
                  <th className="py-2 font-normal text-right">Posiciones al arrancar</th>
                  <th className="py-2 font-normal text-right">Entrada</th>
                  <th className="py-2 font-normal text-right">Salida</th>
                  <th className="py-2 font-normal text-right">Posiciones al cerrar</th>
                </tr>
              </thead>
              <tbody>
                {datos.dias.map((d) => (
                  <tr key={d.fecha} className="border-b last:border-0">
                    <td className="py-2 text-neutral-900">
                      {new Date(d.fecha + "T00:00:00").toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="py-2 text-right text-neutral-900">{d.posicionesInicio}</td>
                    <td className="py-2 text-right text-green-600">
                      {d.entradas > 0 ? `+${d.entradas}` : "-"}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      {d.salidas > 0 ? `-${d.salidas}` : "-"}
                    </td>
                    <td className="py-2 text-right text-neutral-900">{d.posicionesFin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
