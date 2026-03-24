import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { hashPassword, getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const users = await prismaSystem.user.findMany({
      select: { id: true, email: true, role: true }
    });
    return NextResponse.json(Array.isArray(users) ? users : []);
  } catch (err: any) {
    console.error("[API USERS] Error fetching users:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { email, password, role } = await req.json();
    const user = await prismaSystem.user.create({
      data: {
        email,
        password: hashPassword(password),
        role
      }
    });
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { id, password, role } = await req.json();
    const data: any = { role };
    if (password) data.password = hashPassword(password);
    
    const user = await prismaSystem.user.update({
      where: { id },
      data
    });
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { id } = await req.json();
    await prismaSystem.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
