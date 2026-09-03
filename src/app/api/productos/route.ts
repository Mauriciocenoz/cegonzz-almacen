import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await initDb();
  const codigo = req.nextUrl.searchParams.get("codigo");
  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  const buscar = req.nextUrl.searchParams.get("buscar");

  // Búsqueda por texto (descripción o código) dentro del catálogo de un cliente
  if (buscar && clienteId) {
    const texto = `%${buscar}%`;
    const resultados = await sql`
      SELECT id, cliente_id, codigo, descripcion, marca FROM productos
      WHERE cliente_id = ${clienteId} AND (descripcion ILIKE ${texto} OR CAST(codigo AS TEXT) ILIKE ${texto})
      ORDER BY descripcion ASC LIMIT 8
    `;
    return NextResponse.json({ resultados });
  }

  // Búsqueda exacta por código
  if (codigo) {
    const rows = await sql`SELECT id, cliente_id, codigo, descripcion, marca FROM productos WHERE codigo = ${codigo}`;
    if (rows.length === 0) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, producto: rows[0] });
  }

  return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
}

// Dar de alta un producto nuevo — le asigna el siguiente código dentro del
// bloque de 1000 de su cliente automáticamente
export async function POST(req: NextRequest) {
  await initDb();
  const { cliente_id, descripcion, marca } = await req.json();

  if (!cliente_id || !descripcion || !descripcion.trim()) {
    return NextResponse.json({ error: "Faltan datos (cliente y descripción)" }, { status: 400 });
  }

  const clienteRows = await sql`SELECT id, codigo_base FROM clientes WHERE id = ${cliente_id}`;
  if (clienteRows.length === 0) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  let codigoBase = clienteRows[0].codigo_base;

  if (codigoBase === null) {
    const [{ max_base }] = await sql`SELECT MAX(codigo_base) as max_base FROM clientes`;
    codigoBase = (max_base ?? 0) + 1000;
    await sql`UPDATE clientes SET codigo_base = ${codigoBase} WHERE id = ${cliente_id}`;
  }

  const [{ count: numProductos }] = await sql`
    SELECT COUNT(*)::int as count FROM productos WHERE cliente_id = ${cliente_id}
  `;
  const codigoNuevo = codigoBase + numProductos + 1;

  const rows = await sql`
    INSERT INTO productos (cliente_id, codigo, descripcion, marca)
    VALUES (${cliente_id}, ${codigoNuevo}, ${descripcion.trim()}, ${marca ?? null})
    RETURNING id
  `;

  return NextResponse.json({ id: rows[0].id, codigo: codigoNuevo, descripcion: descripcion.trim(), marca });
}
