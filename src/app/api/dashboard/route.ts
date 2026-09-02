import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const totales = db
    .prepare("SELECT COUNT(*) as total FROM ubicaciones")
    .get() as { total: number };

  const ocupadasPorUbicacion = db
    .prepare(
      `SELECT ubicacion_id, COUNT(*) as c FROM tarimas WHERE estado = 'dentro' GROUP BY ubicacion_id`
    )
    .all() as { ubicacion_id: number; c: number }[];

  const totalTarimasDentro = ocupadasPorUbicacion.reduce((acc, r) => acc + r.c, 0);

  // Ocupación por zona (extraemos la zona del código Z#-...)
  const ubicaciones = db.prepare("SELECT id, codigo, capacidad FROM ubicaciones").all() as {
    id: number;
    codigo: string;
    capacidad: number;
  }[];

  const zonas: Record<string, { capacidad: number; ocupadas: number }> = {};
  for (const u of ubicaciones) {
    const zona = u.codigo.split("-")[0]; // "Z2"
    if (!zonas[zona]) zonas[zona] = { capacidad: 0, ocupadas: 0 };
    zonas[zona].capacidad += u.capacidad;
    const ocupInfo = ocupadasPorUbicacion.find((o) => o.ubicacion_id === u.id);
    zonas[zona].ocupadas += ocupInfo ? ocupInfo.c : 0;
  }

  const capacidadTotal = ubicaciones.reduce((acc, u) => acc + u.capacidad, 0);

  const porCliente = db
    .prepare(
      `SELECT c.nombre as cliente, COUNT(*) as ocupadas
       FROM tarimas t JOIN clientes c ON c.id = t.cliente_id
       WHERE t.estado = 'dentro'
       GROUP BY c.nombre ORDER BY ocupadas DESC`
    )
    .all();

  return NextResponse.json({
    capacidadTotal,
    ocupadas: totalTarimasDentro,
    libres: capacidadTotal - totalTarimasDentro,
    zonas,
    porCliente,
  });
}
