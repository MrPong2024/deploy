// app/api/admin/docker-hosts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DockerHostParams {
  id: string
}

// PUT - อัพเดท Docker host
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<DockerHostParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { name, host, user: hostUser, password, description, isActive } = await request.json()

    const dockerHost = await prisma.dockerHost.findUnique({
      where: { id }
    })

    if (!dockerHost) {
      return NextResponse.json({ error: 'Docker host not found' }, { status: 404 })
    }

    const updatedHost = await prisma.dockerHost.update({
      where: { id },
      data: {
        name: name || dockerHost.name,
        host: host || dockerHost.host,
        user: hostUser || dockerHost.user,
        password: password !== undefined ? password : dockerHost.password,
        description: description !== undefined ? description : dockerHost.description,
        isActive: isActive !== undefined ? isActive : dockerHost.isActive
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Docker host updated successfully',
      dockerHost: {
        ...updatedHost,
        password: undefined // ไม่ส่ง password กลับไป
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to update Docker host',
      details: error.message
    }, { status: 500 })
  }
}

// DELETE - ลบ Docker host
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<DockerHostParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // ตรวจสอบว่ามี deployment ใช้ host นี้อยู่หรือไม่
    const deploymentsCount = await prisma.deployment.count({
      where: { hostId: id }
    })

    if (deploymentsCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete Docker host',
        details: `This host has ${deploymentsCount} active deployments. Please move or delete them first.`
      }, { status: 400 })
    }

    await prisma.dockerHost.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Docker host deleted successfully'
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to delete Docker host',
      details: error.message
    }, { status: 500 })
  }
}