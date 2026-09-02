import sql, { initDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  await initDb();

  const ubicaciones = await sql`SELECT id, codigo, capacidad FROM ubicaciones`;
  const ubicacionesReales = ubicaciones.filter((u) => u.codigo !== "ANDEN");

  const ocupadasPorUbicacion = await sql`
    SELECT ubicacion_id, COUNT(*)::int as c FROM tarimas WHERE estado = 'dentro' GROUP BY ubicacion_id
  `;

  const mapaOcupadas: Record<number, number> = {};
  for (const r of ocupadasPorUbicacion) {
    mapaOcupadas[r.ubicacion_id] = r.c;
  }

  const zonas: Record<string, { capacidad: number; ocupadas: number }> = {};
  let capacidadTotal = 0;
  let totalOcupadas = 0;

  for (const u of ubicacionesReales) {
    const zona = u.codigo.split("-")[0];
    if (!zonas[zona]) zonas[zona] = { capacidad: 0, ocupadas: 0 };
    zonas[zona].capacidad += u.capacidad;
    const ocup = mapaOcupadas[u.id] || 0;
    zonas[zona].ocupadas += ocup;
    capacidadTotal += u.capacidad;
    totalOcupadas += ocup;
  }

  const porCliente = await sql`
    SELECT c.nombre as cliente, COUNT(*)::int as ocupadas
    FROM tarimas t JOIN clientes c ON c.id = t.cliente_id
    JOIN ubicaciones u ON u.id = t.ubicacion_id
    WHERE t.estado = 'dentro' AND u.codigo != 'ANDEN'
    GROUP BY c.nombre ORDER BY ocupadas DESC
  `;

  const [{ count: pendientesAcomodo }] = await sql`
    SELECT COUNT(*)::int as count FROM tarimas t
    JOIN ubicaciones u ON u.id = t.ubicacion_id
    WHERE t.estado = 'dentro' AND u.codigo = 'ANDEN'
  `;

  return NextResponse.json({
    capacidadTotal,
    ocupadas: totalOcupadas,
    libres: capacidadTotal - totalOcupadas,
    zonas,
    porCliente,
    pendientesAcomodo,
  });
}
