// app/api/database/my-databases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ดึงฐานข้อมูลของ user
    const databaseInstances = await prisma.databaseInstance.findMany({
      where: { userId: user.id },
      include: {
        server: {
          select: { name: true, host: true, port: true, dbType: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ databaseInstances })
  } catch (error) {
    console.error('❌ Error fetching user databases:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}