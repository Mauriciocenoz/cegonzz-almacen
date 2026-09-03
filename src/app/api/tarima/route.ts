import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await initDb();
  const codigo = req.nextUrl.searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ error: "Falta código" }, { status: 400 });

  const rows = await sql`
    SELECT t.id, t.codigo, t.codigo_proveedor, t.estado, t.ubicacion_id, t.kilos, t.temperatura,
           t.lote, t.caducidad, t.embarque, t.sku, t.descripcion, t.marca, t.fecha_empaque, t.no_cajas,
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
    codigo_proveedor,
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
    recepcion_id,
  } = await req.json();

  if (!cliente_id) {
    return NextResponse.json({ error: "Falta el cliente" }, { status: 400 });
  }

  // El código de tarima SIEMPRE lo genera Cegonzz — es el que se imprime en la
  // etiqueta y se usa para escanear en Acomodo/Salida. El código del proveedor
  // (si trae uno) solo se guarda como referencia.
  const codigoFinal = `INT-${Date.now().toString(36).toUpperCase()}`;

  const rows = await sql`
    INSERT INTO tarimas (
      codigo, codigo_proveedor, cliente_id, estado, kilos, temperatura, lote, caducidad, embarque,
      sku, descripcion, marca, fecha_empaque, no_cajas, recepcion_id
    )
    VALUES (
      ${codigoFinal}, ${codigo_proveedor ?? null}, ${cliente_id}, 'fuera', ${kilos ?? null}, ${temperatura ?? null},
      ${lote ?? null}, ${caducidad ?? null}, ${embarque ?? null},
      ${sku ?? null}, ${descripcion ?? null}, ${marca ?? null}, ${fecha_empaque ?? null},
      ${no_cajas ?? null}, ${recepcion_id ?? null}
    )
    RETURNING id
  `;
  return NextResponse.json({ id: rows[0].id, codigo: codigoFinal });
}
