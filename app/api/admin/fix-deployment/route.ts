// app/api/admin/fix-deployment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin หรือไม่
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { deploymentId, newStatus, containerName, deployUrl } = await request.json()

    if (!deploymentId || !newStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // อัพเดต deployment status
    const updatedDeployment = await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: newStatus,
        containerName: containerName || undefined,
        deployUrl: deployUrl || undefined,
        errorMessage: newStatus === 'running' ? null : undefined
      }
    })

    return NextResponse.json({ 
      success: true, 
      deployment: updatedDeployment 
    })

  } catch (error: any) {
    console.error('Fix deployment error:', error)
    return NextResponse.json({
      error: 'Failed to fix deployment',
      details: error.message
    }, { status: 500 })
  }
}