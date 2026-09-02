import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await initDb();
  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  const desde = req.nextUrl.searchParams.get("desde");
  const hasta = req.nextUrl.searchParams.get("hasta");

  if (!clienteId || !desde || !hasta) {
    return NextResponse.json({ error: "Faltan datos (cliente, desde, hasta)" }, { status: 400 });
  }

  const clienteRows = await sql`SELECT nombre FROM clientes WHERE id = ${clienteId}`;
  if (clienteRows.length === 0) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Solo cuentan para facturación los movimientos de "acomodo" (entra a cámara,
  // empieza a ocupar posición pagada) y "salida" (deja de ocupar). La recepción
  // en el andén no cuenta todavía.
  const movimientos = await sql`
    SELECT m.tipo, m.fecha
    FROM movimientos m
    JOIN tarimas t ON t.id = m.tarima_id
    WHERE t.cliente_id = ${clienteId}
      AND m.tipo IN ('acomodo', 'salida')
      AND m.fecha <= ${hasta + " 23:59:59"}
    ORDER BY m.fecha ASC
  `;

  // Calculamos el saldo de posiciones ocupadas justo antes del rango pedido
  let saldo = 0;
  let idx = 0;
  const desdeDate = new Date(desde + "T00:00:00");
  while (idx < movimientos.length && new Date(movimientos[idx].fecha) < desdeDate) {
    saldo += movimientos[idx].tipo === "acomodo" ? 1 : -1;
    idx++;
  }

  const dias: {
    fecha: string;
    posicionesInicio: number;
    entradas: number;
    salidas: number;
    posicionesFin: number;
  }[] = [];

  const cursor = new Date(desde + "T00:00:00");
  const fin = new Date(hasta + "T00:00:00");
  let movIdx = idx;

  while (cursor <= fin) {
    const fechaStr = cursor.toISOString().slice(0, 10);
    const posicionesInicio = saldo;
    let entradasDia = 0;
    let salidasDia = 0;

    while (movIdx < movimientos.length) {
      const movFechaStr = new Date(movimientos[movIdx].fecha).toISOString().slice(0, 10);
      if (movFechaStr !== fechaStr) break;
      if (movimientos[movIdx].tipo === "acomodo") {
        entradasDia++;
        saldo++;
      } else {
        salidasDia++;
        saldo--;
      }
      movIdx++;
    }

    dias.push({ fecha: fechaStr, posicionesInicio, entradas: entradasDia, salidas: salidasDia, posicionesFin: saldo });
    cursor.setDate(cursor.getDate() + 1);
  }

  return NextResponse.json({ cliente: clienteRows[0].nombre, dias });
}
