import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Recibe una lista de servicios extra aplicados a una tarima y los guarda todos
export async function POST(req: NextRequest) {
  await initDb();
  const { tarima_id, servicios } = await req.json();
  // servicios: [{ tipo: "traspaleo", cantidad: 2 }, ...]

  if (!tarima_id || !Array.isArray(servicios) || servicios.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const filas = servicios
    .filter((s: { tipo: string; cantidad: number }) => s.cantidad && s.cantidad > 0)
    .map((s: { tipo: string; cantidad: number }) => ({
      tarima_id,
      tipo: s.tipo,
      cantidad: s.cantidad,
    }));

  if (filas.length > 0) {
    await sql`INSERT INTO tarima_servicios ${sql(filas, "tarima_id", "tipo", "cantidad")}`;
  }

  return NextResponse.json({ ok: true });
}
