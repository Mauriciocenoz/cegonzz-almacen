import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await initDb();
  const codigo = req.nextUrl.searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ error: "Falta código" }, { status: 400 });

  const rows = await sql`
    SELECT t.id, t.codigo, t.estado, t.ubicacion_id, c.nombre as cliente
    FROM tarimas t JOIN clientes c ON c.id = t.cliente_id
    WHERE t.codigo = ${codigo}
  `;

  if (rows.length === 0) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, tarima: rows[0] });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { codigo, cliente_id } = await req.json();
  if (!codigo || !cliente_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const existe = await sql`SELECT id FROM tarimas WHERE codigo = ${codigo}`;
  if (existe.length > 0) {
    return NextResponse.json({ error: "Esa tarima ya existe" }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO tarimas (codigo, cliente_id, estado) VALUES (${codigo}, ${cliente_id}, 'fuera') RETURNING id
  `;
  return NextResponse.json({ id: rows[0].id });
}
