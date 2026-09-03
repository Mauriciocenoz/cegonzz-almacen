import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await initDb();
  const { tarima_codigo, ubicacion_codigo, tipo, operador_id, forzar } = await req.json();

  if (!tarima_codigo || !ubicacion_codigo || !tipo || !operador_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const tarimaRows = await sql`SELECT * FROM tarimas WHERE codigo = ${tarima_codigo}`;
  if (tarimaRows.length === 0) {
    return NextResponse.json(
      { error: "Tarima no encontrada. Usa Recepción para darla de alta primero." },
      { status: 404 }
    );
  }
  const tarima = tarimaRows[0];

  const ubicacionRows = await sql`SELECT * FROM ubicaciones WHERE codigo = ${ubicacion_codigo}`;
  if (ubicacionRows.length === 0) {
    return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 });
  }
  const ubicacion = ubicacionRows[0];

  // SALIDA — la tarima sale definitivamente del almacén
  if (tipo === "salida") {
    if (tarima.estado !== "dentro") {
      return NextResponse.json(
        { error: "Esta tarima no está registrada como dentro del almacén. Movimiento bloqueado." },
        { status: 400 }
      );
    }

    if (!forzar) {
      const masAntiguaRows = await sql`
        SELECT codigo FROM tarimas
        WHERE ubicacion_id = ${tarima.ubicacion_id} AND estado = 'dentro' AND orden_fifo < ${tarima.orden_fifo}
        ORDER BY orden_fifo ASC LIMIT 1
      `;
      if (masAntiguaRows.length > 0) {
        return NextResponse.json(
          {
            warning: true,
            mensaje: `Hay una tarima más antigua (${masAntiguaRows[0].codigo}) en esta posición. ¿Continuar de todas formas?`,
          },
          { status: 409 }
        );
      }
    }

    await sql`UPDATE tarimas SET estado = 'fuera', ubicacion_id = NULL, orden_fifo = NULL WHERE id = ${tarima.id}`;
    await sql`
      INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id, cliente_id)
      VALUES (${tarima.id}, ${ubicacion.id}, 'salida', ${operador_id}, ${tarima.cliente_id})
    `;

    return NextResponse.json({ ok: true });
  }

  // RECEPCIÓN — baja del tráiler, queda en el andén (sin ubicación final todavía)
  if (tipo === "entrada") {
    if (tarima.estado === "dentro") {
      return NextResponse.json(
        { error: "Esta tarima ya fue recibida. No se puede recibir dos veces." },
        { status: 400 }
      );
    }

    const [{ count: ocupadas }] = await sql`
      SELECT COUNT(*)::int as count FROM tarimas WHERE ubicacion_id = ${ubicacion.id} AND estado = 'dentro'
    `;

    if (ocupadas >= ubicacion.capacidad) {
      return NextResponse.json(
        { error: `Posición llena (${ubicacion.capacidad}/${ubicacion.capacidad}). Movimiento bloqueado.` },
        { status: 400 }
      );
    }

    const [{ max_orden }] = await sql`
      SELECT MAX(orden_fifo) as max_orden FROM tarimas WHERE ubicacion_id = ${ubicacion.id}
    `;
    const siguienteOrden = (max_orden ?? 0) + 1;

    await sql`
      UPDATE tarimas SET estado = 'dentro', ubicacion_id = ${ubicacion.id}, orden_fifo = ${siguienteOrden}
      WHERE id = ${tarima.id}
    `;
    await sql`
      INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id, cliente_id)
      VALUES (${tarima.id}, ${ubicacion.id}, 'entrada', ${operador_id}, ${tarima.cliente_id})
    `;

    return NextResponse.json({ ok: true });
  }

  // ACOMODO — mover del andén a su posición final en cámara
  if (tipo === "acomodo") {
    if (tarima.estado !== "dentro") {
      return NextResponse.json(
        { error: "Esta tarima no ha sido recibida todavía. Usa Recepción primero." },
        { status: 400 }
      );
    }

    const ubicacionActualRows = await sql`SELECT codigo FROM ubicaciones WHERE id = ${tarima.ubicacion_id}`;
    const ubicacionActual = ubicacionActualRows[0]?.codigo;

    if (ubicacionActual !== "ANDEN") {
      return NextResponse.json(
        { error: "Esta tarima ya tiene una ubicación asignada en cámara, no está en el andén." },
        { status: 400 }
      );
    }

    if (ubicacion_codigo === "ANDEN") {
      return NextResponse.json({ error: "Escanea una ubicación final de rack, no el andén." }, { status: 400 });
    }

    const [{ count: ocupadas }] = await sql`
      SELECT COUNT(*)::int as count FROM tarimas WHERE ubicacion_id = ${ubicacion.id} AND estado = 'dentro'
    `;

    if (ocupadas >= ubicacion.capacidad) {
      return NextResponse.json(
        { error: `Posición llena (${ubicacion.capacidad}/${ubicacion.capacidad}). Movimiento bloqueado.` },
        { status: 400 }
      );
    }

    const [{ max_orden }] = await sql`
      SELECT MAX(orden_fifo) as max_orden FROM tarimas WHERE ubicacion_id = ${ubicacion.id}
    `;
    const siguienteOrden = (max_orden ?? 0) + 1;

    await sql`
      UPDATE tarimas SET ubicacion_id = ${ubicacion.id}, orden_fifo = ${siguienteOrden}
      WHERE id = ${tarima.id}
    `;
    await sql`
      INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id, cliente_id)
      VALUES (${tarima.id}, ${ubicacion.id}, 'acomodo', ${operador_id}, ${tarima.cliente_id})
    `;

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
}

export async function GET() {
  await initDb();
  const movimientos = await sql`
    SELECT m.id, m.tipo, m.fecha, t.codigo as tarima_codigo, u.codigo as ubicacion_codigo, o.nombre as operador
    FROM movimientos m
    JOIN tarimas t ON t.id = m.tarima_id
    JOIN ubicaciones u ON u.id = m.ubicacion_id
    JOIN operadores o ON o.id = m.operador_id
    ORDER BY m.id DESC LIMIT 10
  `;
  return NextResponse.json(movimientos);
}
