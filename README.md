# Cegonzz Cold Storage - Sistema de captura de movimientos

## Como correrlo en tu computadora

1. Abre la Terminal en esta carpeta
2. Instala las dependencias:
   npm install
3. Corre la app:
   npm run dev
4. Abre tu navegador en: http://localhost:3000

## PIN de prueba
PIN: 1234 (operador "Mauricio")

## Que incluye
- Login por PIN de operador
- Captura de movimientos (entrada/salida) con reglas:
  - Bloquea salida si la tarima no esta registrada como "dentro"
  - Bloquea entrada si la posicion ya tiene 4 tarimas (limite de profundidad)
  - Avisa (sin bloquear) si sacas una tarima que no es la mas antigua (FIFO)
- Alta de tarima nueva con seleccion/creacion de cliente
- Dashboard de ocupacion por zona y por cliente
- Base de datos local SQLite (se guarda en la carpeta /data, no se sube a GitHub)

## Estructura de ubicaciones
2200 posiciones ya generadas: 4 zonas x 5 racks x 5 posiciones x 5 niveles,
formato Z{zona}-R{rack}-P{posicion}-N{nivel}, ej: Z2-R04-P07-N05
Cada posicion admite hasta 4 tarimas (orden FIFO).
