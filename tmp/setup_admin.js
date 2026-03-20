const { PrismaClient } = require('../node_modules/@prisma/client/system');
const crypto = require('crypto');

async function main() {
  const prisma = new PrismaClient();
  const email = 'admin@ivry.fr';
  const password = 'ivry'; // User can change this later
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

  console.log(`Creating user ${email}...`);
  
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, role: 'ADMIN' },
      create: {
        email,
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('User created/updated:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
