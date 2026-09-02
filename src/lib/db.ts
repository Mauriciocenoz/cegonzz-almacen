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
    await sql`INSERT INTO operadores (nombre, pin) VALUES ('Mauricio', '1234')`;
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
