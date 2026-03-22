import { hashPassword, verifyUser } from './src/lib/auth';
import dotenv from 'dotenv';
dotenv.config();

async function testAuth() {
  const email = 'admin@elise.local';
  const password = 'admin123';
  const h = hashPassword(password);
  
  console.log('--- DEBUG AUTH ---');
  console.log('Email test:', email);
  console.log('Password test:', password);
  console.log('Hash généré:', h);
  console.log('ADMIN_EMAIL env:', process.env.ADMIN_EMAIL);
  console.log('ADMIN_PASSWORD_HASH env:', process.env.ADMIN_PASSWORD_HASH);
  
  const result = await verifyUser(email, h);
  console.log('Résultat verifyUser:', result ? 'SUCCESS' : 'FAILURE');

  if (!result) {
    if (email !== (process.env.ADMIN_EMAIL || 'admin@elise.local')) console.log('Mismatch Email');
    if (h !== process.env.ADMIN_PASSWORD_HASH) console.log('Mismatch Hash');
  }
}

testAuth().catch(console.error);
