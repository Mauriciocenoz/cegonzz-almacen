import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const op = db.prepare("SELECT id, nombre FROM operadores WHERE pin = ?").get(pin) as
    | { id: number; nombre: string }
    | undefined;
  if (!op) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }
  return NextResponse.json({ id: op.id, nombre: op.nombre });
}
