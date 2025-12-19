import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ดูรายการผู้ใช้ทั้งหมด (สำหรับ Admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isApproved: true,
        createdAt: true,
        _count: {
          select: {
            deployments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// อนุมัติ/ปฏิเสธผู้ใช้
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const { userId, action } = await request.json(); // action: 'approve', 'reject', 'toggle_admin'

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'approve':
        updateData = { isApproved: true };
        break;
      case 'reject':
        updateData = { isApproved: false };
        break;
      case 'toggle_admin':
        // ดึงข้อมูลผู้ใช้ปัจจุบันเพื่อ toggle role
        const currentUser = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!currentUser) {
          return NextResponse.json(
            { error: 'ไม่พบผู้ใช้' },
            { status: 404 }
          );
        }
        
        updateData = { 
          role: currentUser.role === 'admin' ? 'user' : 'admin' 
        };
        break;
      default:
        return NextResponse.json(
          { error: 'คำสั่งไม่ถูกต้อง' },
          { status: 400 }
        );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isApproved: true,
      }
    });

    return NextResponse.json({ 
      message: 'อัพเดทสำเร็จ',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// ลบผู้ใช้
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'ไม่พบ userId' },
        { status: 400 }
      );
    }

    // ป้องกันการลบตัวเอง
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบตัวเองได้' },
        { status: 400 }
      );
    }

    // ลบผู้ใช้ (Deployment จะถูกลบตาม cascade)
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ 
      message: 'ลบผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}