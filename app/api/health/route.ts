// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูลพื้นฐาน
    const { prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown'
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ 
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}