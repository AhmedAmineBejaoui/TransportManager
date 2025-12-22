import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '192.168.1.13',        // 👉 Remplace si PostgreSQL tourne sur une autre machine
  port: 5432,
  user: 'transport_app',
  password: 'motdepasse123',  // 👉 Mets ton vrai mot de passe
  database: 'transport_manager'
});

try {
  const res = await pool.query('SELECT NOW()');
  console.log('✅ Connexion réussie !');
  console.log('🕒 Heure du serveur PostgreSQL :', res.rows[0].now);
} catch (err) {
  console.error('❌ Erreur de connexion :', err.message);
} finally {
  pool.end();
}

