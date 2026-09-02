import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Busca una tarima por código y devuelve su estado actual
export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ error: "Falta código" }, { status: 400 });

  const tarima = db
    .prepare(
      `SELECT t.id, t.codigo, t.estado, t.ubicacion_id, c.nombre as cliente
       FROM tarimas t JOIN clientes c ON c.id = t.cliente_id
       WHERE t.codigo = ?`
    )
    .get(codigo);

  if (!tarima) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, tarima });
}

// Da de alta una tarima nueva con su cliente
export async function POST(req: NextRequest) {
  const { codigo, cliente_id } = await req.json();
  if (!codigo || !cliente_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const existe = db.prepare("SELECT id FROM tarimas WHERE codigo = ?").get(codigo);
  if (existe) {
    return NextResponse.json({ error: "Esa tarima ya existe" }, { status: 400 });
  }
  const info = db
    .prepare("INSERT INTO tarimas (codigo, cliente_id, estado) VALUES (?, ?, 'fuera')")
    .run(codigo, cliente_id);
  return NextResponse.json({ id: info.lastInsertRowid });
}
