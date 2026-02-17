const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
// Cargar .env localizado en la misma carpeta que este archivo
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// Si prefieres usar la librería `postgres`, importa el cliente desde `db.js`:
// const sql = require('./db');
// Ejemplo de uso con `sql` (tagged template): `const rows = await sql`SELECT * FROM usuarios``

// Middleware
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false   
  }
});
// RUTA DE PRUEBA: Obtener usuarios
const sql = require('./db');

app.get('/usuarios', async (req, res) => {
  try {
    if (process.env.DATABASE_URL && sql) {
      // Si hay DATABASE_URL, usar la librería `postgres`
      const rows = await sql`SELECT id, username, email, rol FROM usuarios`;
      return res.json(rows);
    }

    // Fallback: usar pg.Pool si no hay DATABASE_URL
    const result = await pool.query('SELECT id, username, email, rol FROM usuarios');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en /usuarios:', err);
    // En desarrollo mostramos el mensaje de error para depuración
    return res.status(500).json({ error: err.message || 'Error en el servidor' });
  }
});
app.get('/', (req, res) => {
  res.send('API de EsportsManager funcionando correctamente 🚀');
});

app.listen(port, () => {
  console.log(`Servidor de eSports corriendo en http://localhost:${port}`);
});