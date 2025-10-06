const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Database connection
const connectionString = 'postgresql://postgres:postgres@localhost:5432/simstudio';
const sql = postgres(connectionString);
const db = drizzle(sql);

async function createDevUser() {
  try {
    // Create user directly in database
    await sql`
      INSERT INTO users (id, name, email, created_at, updated_at) 
      VALUES ('dev-user-123', 'Developer', 'dev@local.test', NOW(), NOW()) 
      ON CONFLICT (email) DO NOTHING
    `;
    
    console.log('✅ Usuario de desarrollo creado: dev@local.test');
    
    // Create session for direct login
    await sql`
      INSERT INTO session (id, user_id, expires_at, token) 
      VALUES ('dev-session-123', 'dev-user-123', NOW() + INTERVAL '30 days', 'dev-token-123') 
      ON CONFLICT DO NOTHING
    `;
    
    console.log('✅ Sesión de desarrollo creada');
    console.log('🌐 Ve a http://localhost:3000 y ya deberías tener acceso');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await sql.end();
}

createDevUser();
