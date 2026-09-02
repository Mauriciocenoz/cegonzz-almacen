import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  await initDb();
  const clientes = await sql`SELECT id, nombre FROM clientes ORDER BY nombre`;
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { nombre } = await req.json();
  if (!nombre || !nombre.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  try {
    const rows = await sql`INSERT INTO clientes (nombre) VALUES (${nombre.trim()}) RETURNING id`;
    return NextResponse.json({ id: rows[0].id, nombre: nombre.trim() });
  } catch {
    return NextResponse.json({ error: "Ese cliente ya existe" }, { status: 400 });
  }
}
