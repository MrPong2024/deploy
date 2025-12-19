// app/api/admin/database-servers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'
import { Client as PostgreSQLClient } from 'pg'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 })
    }

    const { name, host, port, dbType, rootUser, rootPass, description } = await request.json()

    if (!name || !host) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ตรวจสอบว่า server มีอยู่จริง
    const existingServer = await prisma.databaseServer.findUnique({
      where: { id }
    })

    if (!existingServer) {
      return NextResponse.json({ error: 'Database server not found' }, { status: 404 })
    }

    // Test connection ถ้ามีการเปลี่ยน credentials
    if (rootUser && rootPass) {
      try {
        console.log(`🧪 Testing database connection to ${host}:${port || (dbType === 'postgresql' ? 5432 : 3306)}`)
        
        if (dbType === 'mysql') {
          const connection = await mysql.createConnection({
            host,
            port: port || 3306,
            user: rootUser,
            password: rootPass,
            connectTimeout: 10000
          })
          await connection.ping()
          await connection.end()
          console.log('✅ MySQL connection test successful')
        } else if (dbType === 'postgresql') {
          const client = new PostgreSQLClient({
            host,
            port: port || 5432,
            user: rootUser,
            password: rootPass,
            database: 'postgres',
            connectionTimeoutMillis: 10000
          })
          await client.connect()
          await client.query('SELECT 1')
          await client.end()
          console.log('✅ PostgreSQL connection test successful')
        }
        
      } catch (error: any) {
        console.error('❌ Database connection test failed:', error)
        return NextResponse.json({
          error: 'Database connection test failed',
          details: error.message
        }, { status: 400 })
      }
    }

    // Update database server
    const updateData: any = {
      name,
      host,
      port: port || (dbType === 'postgresql' ? 5432 : 3306),
      dbType: dbType || 'mysql',
      description
    }

    // Update credentials ถ้ามีการส่งมา
    if (rootUser) updateData.rootUser = rootUser
    if (rootPass) updateData.rootPass = rootPass

    const databaseServer = await prisma.databaseServer.update({
      where: { id },
      data: updateData
    })

    console.log(`✅ Database server ${name} updated successfully`)

    return NextResponse.json({
      success: true,
      databaseServer
    })

  } catch (error: any) {
    console.error('Update database server error:', error)
    return NextResponse.json({
      error: 'Failed to update database server',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 })
    }

    // ตรวจสอบว่า server มีอยู่จริง
    const existingServer = await prisma.databaseServer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { databaseInstances: true }
        }
      }
    })

    if (!existingServer) {
      return NextResponse.json({ error: 'Database server not found' }, { status: 404 })
    }

    // ตรวจสอบว่ามีฐานข้อมูลที่ใช้งาน server นี้อยู่หรือไม่
    if (existingServer._count.databaseInstances > 0) {
      return NextResponse.json({
        error: 'Cannot delete database server',
        details: `Server has ${existingServer._count.databaseInstances} active database instances. Please delete all database instances first.`
      }, { status: 400 })
    }

    // ลบ database server
    await prisma.databaseServer.delete({
      where: { id }
    })

    console.log(`✅ Database server ${existingServer.name} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Database server deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete database server error:', error)
    return NextResponse.json({
      error: 'Failed to delete database server',
      details: error.message
    }, { status: 500 })
  }
}