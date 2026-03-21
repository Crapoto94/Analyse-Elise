import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

async function checkAdmin() {
  const session = await getSession();
  return session?.role === 'ADMIN';
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const users = await prismaSystem.$queryRawUnsafe(`SELECT id, email, role, createdAt FROM "User" ORDER BY createdAt DESC`) as any[];
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const { email, password, role } = await req.json();
    const hashedPassword = hashPassword(password);
    
    await prismaSystem.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'USER'
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[User API] Create error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const { id } = await req.json();
    await prismaSystem.$executeRawUnsafe(`DELETE FROM "User" WHERE id = ${id}`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id, email, password, role } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  let updateFields = [];
  if (email) updateFields.push(`email = '${email}'`);
  if (role) updateFields.push(`role = '${role}'`);
  if (password) {
    const hashedPassword = hashPassword(password);
    updateFields.push(`password = '${hashedPassword}'`);
  }

  if (updateFields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  try {
    await prismaSystem.$executeRawUnsafe(`UPDATE "User" SET ${updateFields.join(', ')} WHERE id = ${id}`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
