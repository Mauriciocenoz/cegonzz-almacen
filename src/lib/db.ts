import postgres from "postgres";

// La URL de conexión viene de una variable de entorno que Vercel llena
// automáticamente cuando conectas tu base de datos de Neon.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

const sql = postgres(connectionString, { ssl: "require" });

let inicializado = false;

export async function initDb() {
  if (inicializado) return;
  inicializado = true;

  await sql`
    CREATE TABLE IF NOT EXISTS operadores (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      pin TEXT NOT NULL UNIQUE
    )
  `;
  await sql`ALTER TABLE operadores ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'operador'`;

  await sql`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ubicaciones (
      id SERIAL PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      capacidad INTEGER NOT NULL DEFAULT 4
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tarimas (
      id SERIAL PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      estado TEXT NOT NULL DEFAULT 'fuera',
      ubicacion_id INTEGER REFERENCES ubicaciones(id),
      orden_fifo INTEGER
    )
  `;

  // Migración: agregar las columnas nuevas si la tabla ya existía de antes
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS kilos NUMERIC`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS lote TEXT`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS caducidad DATE`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS embarque TEXT`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS sku TEXT`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS descripcion TEXT`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS marca TEXT`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS fecha_empaque DATE`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS no_cajas INTEGER`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS cajas_origen INTEGER`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS tarimas_almacenar INTEGER`;
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS recepcion_id INTEGER`;

  // Recepciones — los datos generales de cada camión que llega (una vez por camión)
  await sql`
    CREATE TABLE IF NOT EXISTS recepciones (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      destino TEXT,
      transporte TEXT,
      placas TEXT,
      no_caja TEXT,
      hora_llegada TIMESTAMP,
      temperatura_caja TEXT,
      temperatura_producto TEXT,
      condiciones_unidad TEXT,
      tipo_conservacion TEXT,
      orden_compra TEXT,
      camara_destino TEXT,
      observaciones TEXT,
      operador_id INTEGER REFERENCES operadores(id),
      fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // Migración: campos que llena Mesa de Control (no el operador de recepción)
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS no_factura_remision TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS no_puerta TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS linea_transporte TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS no_tractor TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS placas_tracto TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS no_fleje TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS nombre_chofer TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS temperatura_display TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS temperatura_transporte_promedio TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_registro TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_entrada_rampa TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_inicio_carga TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_fin_carga TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_salida_rampa TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_liberacion TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS hora_cita TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS kilos_esperados NUMERIC`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS cajas_esperadas INTEGER`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS inspeccion_transporte JSONB`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS inspeccion_producto JSONB`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS acciones_correctivas TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS elaboro TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS valido TEXT`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS validado BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS fecha_validacion TIMESTAMP`;

  // Temperatura por tarima (la captura el operador de recepción, no Mesa de Control)
  await sql`ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS temperatura TEXT`;

  // Servicios extra facturables por tarima (traspaleo, romaneo, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS tarima_servicios (
      id SERIAL PRIMARY KEY,
      tarima_id INTEGER NOT NULL REFERENCES tarimas(id),
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      fecha TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS movimientos (
      id SERIAL PRIMARY KEY,
      tarima_id INTEGER NOT NULL REFERENCES tarimas(id),
      ubicacion_id INTEGER NOT NULL REFERENCES ubicaciones(id),
      tipo TEXT NOT NULL,
      operador_id INTEGER NOT NULL REFERENCES operadores(id),
      fecha TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  const [{ count: opCount }] = await sql`SELECT COUNT(*)::int as count FROM operadores`;
  if (opCount === 0) {
    await sql`INSERT INTO operadores (nombre, pin, rol) VALUES ('Mauricio', '1234', 'operador')`;
  }

  const [{ count: mesaCount }] = await sql`SELECT COUNT(*)::int as count FROM operadores WHERE rol = 'mesa_control'`;
  if (mesaCount === 0) {
    await sql`INSERT INTO operadores (nombre, pin, rol) VALUES ('Mesa de Control', '5678', 'mesa_control')`;
  }

  const [{ count: ubiCount }] = await sql`SELECT COUNT(*)::int as count FROM ubicaciones`;
  if (ubiCount === 0) {
    const codigos: string[] = [];
    for (let z = 1; z <= 4; z++) {
      for (let r = 1; r <= 5; r++) {
        for (let p = 1; p <= 5; p++) {
          for (let n = 1; n <= 5; n++) {
            codigos.push(
              `Z${z}-R${String(r).padStart(2, "0")}-P${String(p).padStart(2, "0")}-N${String(n).padStart(2, "0")}`
            );
          }
        }
      }
    }
    // Insertar en lotes para no exceder límites de una sola consulta
    const loteSize = 500;
    for (let i = 0; i < codigos.length; i += loteSize) {
      const lote = codigos.slice(i, i + loteSize).map((codigo) => ({ codigo }));
      await sql`INSERT INTO ubicaciones ${sql(lote, "codigo")}`;
    }
  }

  // Ubicación virtual "ANDEN" — donde quedan las tarimas recién bajadas del tráiler,
  // antes de que alguien las acomode en su posición final de cámara
  const andenExiste = await sql`SELECT id FROM ubicaciones WHERE codigo = 'ANDEN'`;
  if (andenExiste.length === 0) {
    await sql`INSERT INTO ubicaciones (codigo, capacidad) VALUES ('ANDEN', 99999)`;
  }
}

export default sql;
