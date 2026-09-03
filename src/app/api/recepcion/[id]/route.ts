import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;

  const recepcionRows = await sql`
    SELECT r.*, c.nombre as cliente
    FROM recepciones r JOIN clientes c ON c.id = r.cliente_id
    WHERE r.id = ${id}
  `;
  if (recepcionRows.length === 0) {
    return NextResponse.json({ error: "Recepción no encontrada" }, { status: 404 });
  }

  const tarimas = await sql`
    SELECT codigo, descripcion, lote, fecha_empaque, caducidad, kilos, temperatura, no_cajas
    FROM tarimas WHERE recepcion_id = ${id} ORDER BY id ASC
  `;

  const [{ kilos_total, cajas_total }] = await sql`
    SELECT COALESCE(SUM(kilos), 0) as kilos_total, COALESCE(SUM(no_cajas), 0) as cajas_total
    FROM tarimas WHERE recepcion_id = ${id}
  `;

  return NextResponse.json({
    recepcion: recepcionRows[0],
    tarimas,
    totales: { kilos: kilos_total, cajas: cajas_total, numTarimas: tarimas.length },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();

  const {
    destino,
    no_factura_remision,
    no_puerta,
    linea_transporte,
    no_caja,
    placas,
    no_tractor,
    placas_tracto,
    no_fleje,
    nombre_chofer,
    temperatura_display,
    temperatura_transporte_promedio,
    tipo_conservacion,
    hora_registro,
    hora_entrada_rampa,
    hora_inicio_carga,
    hora_fin_carga,
    hora_salida_rampa,
    hora_liberacion,
    hora_cita,
    kilos_esperados,
    cajas_esperadas,
    inspeccion_transporte,
    inspeccion_producto,
    acciones_correctivas,
    elaboro,
    valido,
  } = body;

  await sql`
    UPDATE recepciones SET
      destino = ${destino ?? null},
      no_factura_remision = ${no_factura_remision ?? null},
      no_puerta = ${no_puerta ?? null},
      linea_transporte = ${linea_transporte ?? null},
      no_caja = ${no_caja ?? null},
      placas = ${placas ?? null},
      no_tractor = ${no_tractor ?? null},
      placas_tracto = ${placas_tracto ?? null},
      no_fleje = ${no_fleje ?? null},
      nombre_chofer = ${nombre_chofer ?? null},
      temperatura_display = ${temperatura_display ?? null},
      temperatura_transporte_promedio = ${temperatura_transporte_promedio ?? null},
      tipo_conservacion = ${tipo_conservacion ?? null},
      hora_registro = ${hora_registro ?? null},
      hora_entrada_rampa = ${hora_entrada_rampa ?? null},
      hora_inicio_carga = ${hora_inicio_carga ?? null},
      hora_fin_carga = ${hora_fin_carga ?? null},
      hora_salida_rampa = ${hora_salida_rampa ?? null},
      hora_liberacion = ${hora_liberacion ?? null},
      hora_cita = ${hora_cita ?? null},
      kilos_esperados = ${kilos_esperados ?? null},
      cajas_esperadas = ${cajas_esperadas ?? null},
      inspeccion_transporte = ${inspeccion_transporte ? JSON.stringify(inspeccion_transporte) : null},
      inspeccion_producto = ${inspeccion_producto ? JSON.stringify(inspeccion_producto) : null},
      acciones_correctivas = ${acciones_correctivas ?? null},
      elaboro = ${elaboro ?? null},
      valido = ${valido ?? null},
      validado = TRUE,
      fecha_validacion = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
