"use client";
import { useEffect, useState } from "react";

type DashboardData = {
  capacidadTotal: number;
  ocupadas: number;
  libres: number;
  zonas: Record<string, { capacidad: number; ocupadas: number }>;
  porCliente: { cliente: string; ocupadas: number }[];
  pendientesAcomodo: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <main className="p-8">Cargando...</main>;

  const pctTotal = data.capacidadTotal ? Math.round((data.ocupadas / data.capacidadTotal) * 100) : 0;

  return (
    <main className="min-h-screen bg-neutral-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-neutral-900">Dashboard de ocupación</h1>
          <div className="flex gap-4">
            <a href="/facturacion" className="text-sm text-neutral-700 underline">
              Facturación
            </a>
            <a href="/captura" className="text-sm text-neutral-700 underline">
              Volver a captura
            </a>
          </div>
        </div>

        {data.pendientesAcomodo > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-amber-800">Pendientes de acomodo</p>
              <p className="text-xs text-amber-700">Tarimas recibidas en el andén, aún sin ubicación final</p>
            </div>
            <p className="text-2xl font-semibold text-amber-800">{data.pendientesAcomodo}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-neutral-700">Posiciones totales</p>
            <p className="text-2xl font-semibold text-neutral-900">{data.capacidadTotal}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-neutral-700">Ocupadas</p>
            <p className="text-2xl font-semibold text-neutral-900">{data.ocupadas}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-neutral-700">Libres</p>
            <p className="text-2xl font-semibold text-neutral-900">{data.libres}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-neutral-700">Ocupación total</p>
            <p className="text-2xl font-medium text-blue-600">{pctTotal}%</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-neutral-900 mb-3">Ocupación por zona</p>
          <div className="flex flex-col gap-3">
            {Object.entries(data.zonas).map(([zona, info]) => {
              const pct = info.capacidad ? Math.round((info.ocupadas / info.capacidad) * 100) : 0;
              const color = pct >= 90 ? "bg-red-600" : pct >= 75 ? "bg-amber-500" : "bg-green-600";
              return (
                <div key={zona}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-900">{zona}</span>
                    <span className="text-neutral-700">
                      {pct}% · {info.capacidad - info.ocupadas} libres
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-neutral-900 mb-3">Posiciones por cliente</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-700 border-b">
                <th className="pb-2 font-normal">Cliente</th>
                <th className="pb-2 font-normal text-right">Ocupadas</th>
              </tr>
            </thead>
            <tbody>
              {data.porCliente.map((c) => (
                <tr key={c.cliente} className="border-b last:border-0">
                  <td className="py-2 text-neutral-900">{c.cliente}</td>
                  <td className="py-2 text-right text-neutral-900">{c.ocupadas}</td>
                </tr>
              ))}
              {data.porCliente.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-neutral-600">
                    Aún no hay tarimas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
