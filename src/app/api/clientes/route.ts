import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const clientes = db.prepare("SELECT id, nombre FROM clientes ORDER BY nombre").all();
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const { nombre } = await req.json();
  if (!nombre || !nombre.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  try {
    const info = db.prepare("INSERT INTO clientes (nombre) VALUES (?)").run(nombre.trim());
    return NextResponse.json({ id: info.lastInsertRowid, nombre: nombre.trim() });
  } catch {
    return NextResponse.json({ error: "Ese cliente ya existe" }, { status: 400 });
  }
}
