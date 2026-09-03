import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await initDb();
  const { pin } = await req.json();
  const rows = await sql`SELECT id, nombre, rol FROM operadores WHERE pin = ${pin}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }
  return NextResponse.json({ id: rows[0].id, nombre: rows[0].nombre, rol: rows[0].rol });
}
