import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  await initDb();
  const clientes = await sql`SELECT id, nombre, codigo_base FROM clientes ORDER BY nombre`;
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { nombre } = await req.json();
  if (!nombre || !nombre.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  // Asignamos el siguiente bloque de 1000 disponible (1000, 2000, 3000...)
  const [{ max_base }] = await sql`SELECT MAX(codigo_base) as max_base FROM clientes`;
  const codigoBase = (max_base ?? 0) + 1000;

  try {
    const rows = await sql`
      INSERT INTO clientes (nombre, codigo_base) VALUES (${nombre.trim()}, ${codigoBase}) RETURNING id
    `;
    return NextResponse.json({ id: rows[0].id, nombre: nombre.trim(), codigo_base: codigoBase });
  } catch {
    return NextResponse.json({ error: "Ese cliente ya existe" }, { status: 400 });
  }
}
