import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Crear una recepción nueva (solo el cliente, al inicio del camión)
export async function POST(req: NextRequest) {
  await initDb();
  const { cliente_id, operador_id } = await req.json();

  if (!cliente_id) {
    return NextResponse.json({ error: "Falta el cliente" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO recepciones (cliente_id, operador_id)
    VALUES (${cliente_id}, ${operador_id ?? null})
    RETURNING id
  `;

  const id = rows[0].id;
  const folio = `REC-${String(id).padStart(6, "0")}`;

  return NextResponse.json({ id, folio });
}

// Lista de recepciones pendientes de validar por Mesa de Control
export async function GET() {
  await initDb();
  const recepciones = await sql`
    SELECT r.id, r.fecha_inicio, c.nombre as cliente,
      (SELECT COUNT(*)::int FROM tarimas t WHERE t.recepcion_id = r.id) as num_tarimas,
      (SELECT COALESCE(SUM(t.kilos), 0) FROM tarimas t WHERE t.recepcion_id = r.id) as kilos_recibidos,
      (SELECT COALESCE(SUM(t.no_cajas), 0) FROM tarimas t WHERE t.recepcion_id = r.id) as cajas_recibidas
    FROM recepciones r
    JOIN clientes c ON c.id = r.cliente_id
    WHERE r.validado = FALSE
    ORDER BY r.fecha_inicio DESC
  `;
  return NextResponse.json(recepciones);
}
