import sql, { initDb } from "@/lib/db";
import { NextResponse } from "next/server";

const CATALOGO: Record<string, { base: number; productos: { codigo: number; descripcion: string }[] }> =
{"COLDS": {"base": 1000, "productos": [{"codigo": 1001, "descripcion": "PECHUGA C/H COOPAVEL"}, {"codigo": 1002, "descripcion": "MEDIA DE PECHUGA S/H SEARA"}, {"codigo": 1003, "descripcion": "TAMBORES CONCENTRADO DE JUGO"}, {"codigo": 1004, "descripcion": "ALA DE POLLO"}, {"codigo": 1005, "descripcion": "LOMO DE CERDO C/H SADIA"}, {"codigo": 1006, "descripcion": "PIERNA DE PUERCO DESHUESADA F CARNES"}, {"codigo": 1007, "descripcion": "PIERNA DE PUERCO S/H"}, {"codigo": 1008, "descripcion": "PIERNA DE CERDO S/H AURORA"}, {"codigo": 1009, "descripcion": "PIERNA DE PUERCO C/H REBANADO"}, {"codigo": 1010, "descripcion": "CHULETA DE CERDO CGL AURORA"}, {"codigo": 1011, "descripcion": "CHULETA DE CERDO SMITHFIELD"}, {"codigo": 1012, "descripcion": "CHULETA DE CERDO CGL"}, {"codigo": 1013, "descripcion": "PULPA BLANCA"}, {"codigo": 1014, "descripcion": "PULPA NEGRA"}, {"codigo": 1015, "descripcion": "JUGO DE PIÑA"}, {"codigo": 1016, "descripcion": "JUGO DE SANDIA"}, {"codigo": 1017, "descripcion": "DIEZMILLO DE RES"}, {"codigo": 1018, "descripcion": "COSTILLA DE CERDO"}, {"codigo": 1019, "descripcion": "CORAZON DE RES"}, {"codigo": 1020, "descripcion": "CARNE DE CABEZA"}, {"codigo": 1021, "descripcion": "PALETA DE RES S/H AL VACIO"}, {"codigo": 1022, "descripcion": "PECHUGA DE POLLO AURORA"}]}, "DAWN": {"base": 2000, "productos": [{"codigo": 2001, "descripcion": "DONA LEV FRITA"}, {"codigo": 2002, "descripcion": "DONA LEV SOFT"}, {"codigo": 2003, "descripcion": "DONA SOFT"}, {"codigo": 2004, "descripcion": "ROSCA DE LECHE CONDENSADA"}, {"codigo": 2005, "descripcion": "TEXAS DONUT"}]}, "Jorge Valencia": {"base": 3000, "productos": [{"codigo": 3001, "descripcion": "DRUMETTE SEARA"}, {"codigo": 3002, "descripcion": "JAMONCITO ALA DE POLLO"}, {"codigo": 3003, "descripcion": "PECHUGA S/H S/P"}, {"codigo": 3004, "descripcion": "FILETILLO DE POLLO CGL"}, {"codigo": 3005, "descripcion": "PECHUGA S/H AURORA"}, {"codigo": 3006, "descripcion": "RIÑON DE CERDO AGROSUPER"}, {"codigo": 3007, "descripcion": "DEDO PING BACHOCO"}, {"codigo": 3008, "descripcion": "JAMONCITO DE ALA GT FOODS"}, {"codigo": 3009, "descripcion": "FILETE DE PECHUGA AGROSUPER"}, {"codigo": 3010, "descripcion": "PECHUGA S/H Y S/P AURORA"}, {"codigo": 3011, "descripcion": "PECHUGA DE POLLO SANDERSON"}]}, "Jose Barbeito": {"base": 4000, "productos": [{"codigo": 4001, "descripcion": "PAPA ONDULADA"}, {"codigo": 4002, "descripcion": "AROS DE CEBOLLA"}, {"codigo": 4003, "descripcion": "DINO NUGGET DE POLLO PREMIUM"}, {"codigo": 4004, "descripcion": "PALOMITA DE POLLO EMPANIZADA"}, {"codigo": 4005, "descripcion": "MEDIA PECHUGA SELECTA"}, {"codigo": 4006, "descripcion": "PRODUCTOS VARIOS BEATUS FOODS"}, {"codigo": 4007, "descripcion": "PECHUGA MARIPOSA FRESKESITO"}]}, "MORENO": {"base": 5000, "productos": [{"codigo": 5001, "descripcion": "PECHUGA DE AVE GENA"}, {"codigo": 5002, "descripcion": "PECHUGA DE AVE VALLE"}]}, "QUIN": {"base": 6000, "productos": [{"codigo": 6001, "descripcion": "CHIKEN BREAST FILLET"}]}, "Sunland": {"base": 7000, "productos": [{"codigo": 7001, "descripcion": "PECHUGA DE POLLO SANDERSON"}]}}
;

// Carga (o actualiza) el catálogo real de clientes y productos de Cegonzz.
// Es seguro correrlo más de una vez: no duplica clientes ni productos ya existentes.
export async function POST() {
  await initDb();

  let clientesCreados = 0;
  let clientesActualizados = 0;
  let productosCreados = 0;
  let productosExistentes = 0;

  for (const nombre of Object.keys(CATALOGO)) {
    const { base, productos } = CATALOGO[nombre];

    const existente = await sql`SELECT id, codigo_base FROM clientes WHERE nombre = ${nombre}`;
    let clienteId: number;

    if (existente.length === 0) {
      const rows = await sql`
        INSERT INTO clientes (nombre, codigo_base) VALUES (${nombre}, ${base}) RETURNING id
      `;
      clienteId = rows[0].id;
      clientesCreados++;
    } else {
      clienteId = existente[0].id;
      if (existente[0].codigo_base !== base) {
        await sql`UPDATE clientes SET codigo_base = ${base} WHERE id = ${clienteId}`;
        clientesActualizados++;
      }
    }

    for (const p of productos) {
      const yaExiste = await sql`SELECT id FROM productos WHERE codigo = ${p.codigo}`;
      if (yaExiste.length > 0) {
        productosExistentes++;
        continue;
      }
      await sql`
        INSERT INTO productos (cliente_id, codigo, descripcion) VALUES (${clienteId}, ${p.codigo}, ${p.descripcion})
      `;
      productosCreados++;
    }
  }

  return NextResponse.json({
    ok: true,
    clientesCreados,
    clientesActualizados,
    productosCreados,
    productosExistentes,
  });
}
