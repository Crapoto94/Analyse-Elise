import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const users = await prismaSystem.user.findMany({
      select: { id: true, email: true, role: true }
    });
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
  try {
    const { id } = await req.json();
    await prismaSystem.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
