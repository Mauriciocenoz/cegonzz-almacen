import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "almacen.db");
fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS operadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  capacidad INTEGER NOT NULL DEFAULT 4
);

CREATE TABLE IF NOT EXISTS tarimas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'fuera', -- 'dentro' | 'fuera'
  ubicacion_id INTEGER,
  orden_fifo INTEGER,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
);

CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarima_id INTEGER NOT NULL,
  ubicacion_id INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- 'entrada' | 'salida'
  operador_id INTEGER NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (tarima_id) REFERENCES tarimas(id),
  FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (operador_id) REFERENCES operadores(id)
);
`);

// Seed inicial: operador de prueba y algunas ubicaciones si no existen
const opCount = db.prepare("SELECT COUNT(*) as c FROM operadores").get() as { c: number };
if (opCount.c === 0) {
  db.prepare("INSERT INTO operadores (nombre, pin) VALUES (?, ?)").run("Mauricio", "1234");
}

const ubiCount = db.prepare("SELECT COUNT(*) as c FROM ubicaciones").get() as { c: number };
if (ubiCount.c === 0) {
  const insert = db.prepare("INSERT INTO ubicaciones (codigo) VALUES (?)");
  const zonas = [1, 2, 3, 4];
  for (const z of zonas) {
    for (let r = 1; r <= 5; r++) {
      for (let p = 1; p <= 5; p++) {
        for (let n = 1; n <= 5; n++) {
          const codigo = `Z${z}-R${String(r).padStart(2, "0")}-P${String(p).padStart(2, "0")}-N${String(n).padStart(2, "0")}`;
          insert.run(codigo);
        }
      }
    }
  }
}

export default db;
