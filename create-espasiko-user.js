const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const postgres = require('postgres').default || require('postgres');

const sql = postgres('postgresql://postgres:postgres@localhost:5432/simstudio');

async function createEspasikoUser() {
  try {
    const userId = 'espasiko-user';
    const email = 'espasiko@local.dev';
    const name = 'Espasiko';
    const password = 'Ninami12$ya';
    
    console.log('🔐 Generando hash seguro de contraseña...');
    
    // Generar hash seguro de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('👤 Creando usuario Espasiko...');
    
    // Verificar si ya existe
    const existingUser = await sql`
      SELECT id FROM "user" WHERE email = ${email}
    `;
    
    if (existingUser.length === 0) {
      // Crear usuario
      await sql`
        INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) 
        VALUES (${userId}, ${name}, ${email}, true, NOW(), NOW())
      `;
      console.log('✅ Usuario creado: ' + email);
    } else {
      console.log('ℹ️ Usuario ya existe: ' + email);
    }
    
    // Crear cuenta con contraseña
    const accountId = randomBytes(16).toString('hex');
    
    // Verificar si ya existe la cuenta
    const existingAccount = await sql`
      SELECT id FROM account WHERE user_id = ${userId} AND provider_id = 'credential'
    `;
    
    if (existingAccount.length === 0) {
      await sql`
        INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${accountId}, ${userId}, 'credential', ${userId}, ${hashedPassword}, NOW(), NOW())
      `;
    } else {
      await sql`
        UPDATE account 
        SET password = ${hashedPassword}, updated_at = NOW()
        WHERE user_id = ${userId} AND provider_id = 'credential'
      `;
    }
    
    console.log('✅ Contraseña configurada para Espasiko');
    
    // Crear un workspace por defecto
    const workspaceId = 'espasiko-workspace';
    await sql`
      INSERT INTO workspace (id, name, owner_id, created_at, updated_at)
      VALUES (${workspaceId}, 'Mi Workspace', ${userId}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    
    console.log('✅ Workspace creado: Mi Workspace');
    
    console.log('🎉 ¡Listo! Puedes hacer login con:');
    console.log('📧 Email: espasiko@local.dev');
    console.log('🔑 Contraseña: Ninami12$ya');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

createEspasikoUser();
