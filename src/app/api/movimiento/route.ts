import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { tarima_codigo, ubicacion_codigo, tipo, operador_id, forzar } = await req.json();

  if (!tarima_codigo || !ubicacion_codigo || !tipo || !operador_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const tarima = db
    .prepare("SELECT * FROM tarimas WHERE codigo = ?")
    .get(tarima_codigo) as any;

  if (!tarima) {
    return NextResponse.json({ error: "Tarima no encontrada. Da de alta primero." }, { status: 404 });
  }

  const ubicacion = db
    .prepare("SELECT * FROM ubicaciones WHERE codigo = ?")
    .get(ubicacion_codigo) as any;

  if (!ubicacion) {
    return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 });
  }

  if (tipo === "salida") {
    // Regla: bloquear salida si la tarima no está marcada como "dentro"
    if (tarima.estado !== "dentro") {
      return NextResponse.json(
        { error: "Esta tarima no está registrada como dentro del almacén. Movimiento bloqueado." },
        { status: 400 }
      );
    }

    // Aviso FIFO: revisar si hay una tarima más antigua en la misma ubicación
    if (!forzar) {
      const masAntigua = db
        .prepare(
          `SELECT codigo FROM tarimas
           WHERE ubicacion_id = ? AND estado = 'dentro' AND orden_fifo < ?
           ORDER BY orden_fifo ASC LIMIT 1`
        )
        .get(tarima.ubicacion_id, tarima.orden_fifo) as { codigo: string } | undefined;

      if (masAntigua) {
        return NextResponse.json(
          {
            warning: true,
            mensaje: `Hay una tarima más antigua (${masAntigua.codigo}) en esta posición. ¿Continuar de todas formas?`,
          },
          { status: 409 }
        );
      }
    }

    db.prepare("UPDATE tarimas SET estado = 'fuera', ubicacion_id = NULL, orden_fifo = NULL WHERE id = ?").run(
      tarima.id
    );
    db.prepare(
      "INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id) VALUES (?, ?, 'salida', ?)"
    ).run(tarima.id, ubicacion.id, operador_id);

    return NextResponse.json({ ok: true });
  }

  if (tipo === "entrada") {
    // Regla: no permitir más de 4 tarimas por ubicación
    const ocupadas = db
      .prepare("SELECT COUNT(*) as c FROM tarimas WHERE ubicacion_id = ? AND estado = 'dentro'")
      .get(ubicacion.id) as { c: number };

    if (ocupadas.c >= ubicacion.capacidad) {
      return NextResponse.json(
        { error: `Posición llena (${ubicacion.capacidad}/${ubicacion.capacidad}). Movimiento bloqueado.` },
        { status: 400 }
      );
    }

    const maxOrden = db
      .prepare("SELECT MAX(orden_fifo) as m FROM tarimas WHERE ubicacion_id = ?")
      .get(ubicacion.id) as { m: number | null };
    const siguienteOrden = (maxOrden.m ?? 0) + 1;

    db.prepare(
      "UPDATE tarimas SET estado = 'dentro', ubicacion_id = ?, orden_fifo = ? WHERE id = ?"
    ).run(ubicacion.id, siguienteOrden, tarima.id);
    db.prepare(
      "INSERT INTO movimientos (tarima_id, ubicacion_id, tipo, operador_id) VALUES (?, ?, 'entrada', ?)"
    ).run(tarima.id, ubicacion.id, operador_id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
}

// Últimos movimientos, para mostrar en pantalla
export async function GET() {
  const movimientos = db
    .prepare(
      `SELECT m.id, m.tipo, m.fecha, t.codigo as tarima_codigo, u.codigo as ubicacion_codigo, o.nombre as operador
       FROM movimientos m
       JOIN tarimas t ON t.id = m.tarima_id
       JOIN ubicaciones u ON u.id = m.ubicacion_id
       JOIN operadores o ON o.id = m.operador_id
       ORDER BY m.id DESC LIMIT 10`
    )
    .all();
  return NextResponse.json(movimientos);
}
