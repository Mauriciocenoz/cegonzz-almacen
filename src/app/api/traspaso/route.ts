import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Cambia el dueño (cliente) de una tarima que ya está en cámara, sin que
// salga físicamente del almacén. Deja registro para que Facturación cobre
// correctamente a cada cliente el periodo que le corresponde.
export async function POST(req: NextRequest) {
  await initDb();
  const { tarima_codigo, nuevo_cliente_id, operador_id } = await req.json();

  if (!tarima_codigo || !nuevo_cliente_id || !operador_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const tarimaRows = await sql`SELECT * FROM tarimas WHERE codigo = ${tarima_codigo}`;
  if (tarimaRows.length === 0) {
    return NextResponse.json({ error: "Tarima no encontrada" }, { status: 404 });
  }
  const tarima = tarimaRows[0];

  if (tarima.estado !== "dentro") {
    return NextResponse.json(
      { error: "La tarima debe estar acomodada en cámara para poder traspasarse" },
      { status: 400 }
    );
  }

  if (tarima.cliente_id === nuevo_cliente_id) {
    return NextResponse.json({ error: "Ya pertenece a ese cliente" }, { status: 400 });
  }

  // Movimiento de "salida" para el cliente anterior (deja de pagar esta posición)
  await sql`
    INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id, cliente_id)
    VALUES (${tarima.id}, ${tarima.ubicacion_id}, 'traspaso_salida', ${operador_id}, ${tarima.cliente_id})
  `;
  // Movimiento de "entrada" para el cliente nuevo (empieza a pagar esta posición)
  await sql`
    INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id, cliente_id)
    VALUES (${tarima.id}, ${tarima.ubicacion_id}, 'traspaso_entrada', ${operador_id}, ${nuevo_cliente_id})
  `;

  await sql`UPDATE tarimas SET cliente_id = ${nuevo_cliente_id} WHERE id = ${tarima.id}`;

  return NextResponse.json({ ok: true });
}
