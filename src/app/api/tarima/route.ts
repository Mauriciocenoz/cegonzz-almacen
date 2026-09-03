import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await initDb();
  const codigo = req.nextUrl.searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ error: "Falta código" }, { status: 400 });

  const rows = await sql`
    SELECT t.id, t.codigo, t.estado, t.ubicacion_id, t.kilos, t.temperatura, t.lote, t.caducidad, t.embarque,
           t.sku, t.descripcion, t.marca, t.fecha_empaque, t.no_cajas, t.cajas_origen, t.tarimas_almacenar,
           c.nombre as cliente
    FROM tarimas t JOIN clientes c ON c.id = t.cliente_id
    WHERE t.codigo = ${codigo}
  `;

  if (rows.length === 0) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, tarima: rows[0] });
}

export async function POST(req: NextRequest) {
  await initDb();
  const {
    codigo,
    cliente_id,
    kilos,
    temperatura,
    lote,
    caducidad,
    embarque,
    sku,
    descripcion,
    marca,
    fecha_empaque,
    no_cajas,
    cajas_origen,
    tarimas_almacenar,
    recepcion_id,
  } = await req.json();

  if (!cliente_id) {
    return NextResponse.json({ error: "Falta el cliente" }, { status: 400 });
  }

  // Si no viene código (la tarima no traía uno escaneable), generamos uno propio
  let codigoFinal = codigo && codigo.trim() ? codigo.trim() : "";
  if (!codigoFinal) {
    codigoFinal = `INT-${Date.now().toString(36).toUpperCase()}`;
  }

  const existe = await sql`SELECT id FROM tarimas WHERE codigo = ${codigoFinal}`;
  if (existe.length > 0) {
    return NextResponse.json({ error: "Esa tarima ya existe" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO tarimas (
      codigo, cliente_id, estado, kilos, temperatura, lote, caducidad, embarque,
      sku, descripcion, marca, fecha_empaque, no_cajas, cajas_origen, tarimas_almacenar, recepcion_id
    )
    VALUES (
      ${codigoFinal}, ${cliente_id}, 'fuera', ${kilos ?? null}, ${temperatura ?? null}, ${lote ?? null}, ${caducidad ?? null}, ${embarque ?? null},
      ${sku ?? null}, ${descripcion ?? null}, ${marca ?? null}, ${fecha_empaque ?? null},
      ${no_cajas ?? null}, ${cajas_origen ?? null}, ${tarimas_almacenar ?? null}, ${recepcion_id ?? null}
    )
    RETURNING id
  `;
  return NextResponse.json({ id: rows[0].id, codigo: codigoFinal });
}
