// app/api/admin/database-instances/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'
import { Client as PostgreSQLClient } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const databaseInstances = await prisma.databaseInstance.findMany({
      include: {
        user: {
          select: { username: true, firstName: true, lastName: true }
        },
        server: {
          select: { name: true, host: true, port: true, dbType: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ databaseInstances })
  } catch (error) {
    console.error('❌ Error fetching database instances:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { databaseId } = await request.json()

    if (!databaseId) {
      return NextResponse.json({ error: 'Database ID is required' }, { status: 400 })
    }

    // ดึงข้อมูลฐานข้อมูลที่จะลบ
    const databaseInstance = await prisma.databaseInstance.findUnique({
      where: { id: databaseId },
      include: {
        server: true,
        user: true
      }
    })

    if (!databaseInstance) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 })
    }

    const { server, databaseName, dbUser } = databaseInstance

    try {
      if (server.dbType === 'mysql') {
        // MySQL: ลบ database และ user
        const connection = await mysql.createConnection({
          host: server.host,
          port: server.port,
          user: server.rootUser,
          password: server.rootPass
        })

        // ลบ database
        await connection.execute(`DROP DATABASE IF EXISTS \`${databaseName}\``)
        console.log(`✅ MySQL Database ${databaseName} deleted`)

        // ลบ user
        await connection.execute(`DROP USER IF EXISTS '${dbUser}'@'%'`)
        console.log(`✅ MySQL User ${dbUser} deleted`)

        await connection.end()

      } else if (server.dbType === 'postgresql') {
        // PostgreSQL: ลบ database และ user
        const client = new PostgreSQLClient({
          host: server.host,
          port: server.port,
          user: server.rootUser,
          password: server.rootPass,
          database: 'postgres' // Connect to default database
        })

        await client.connect()

        // Terminate all connections to the database first
        await client.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()
        `)

        // ลบ database
        await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
        console.log(`✅ PostgreSQL Database ${databaseName} deleted`)

        // ลบ user
        await client.query(`DROP USER IF EXISTS "${dbUser}"`)
        console.log(`✅ PostgreSQL User ${dbUser} deleted`)

        await client.end()
      }

      // ลบจากฐานข้อมูล
      await prisma.databaseInstance.delete({
        where: { id: databaseId }
      })

      return NextResponse.json({
        success: true,
        message: `Database ${databaseName} and user ${dbUser} deleted successfully`
      })

    } catch (dbError: any) {
      console.error('❌ Database deletion failed:', dbError)
      
      // อัพเดท status เป็น failed
      await prisma.databaseInstance.update({
        where: { id: databaseId },
        data: { status: 'failed' }
      })

      return NextResponse.json({
        error: `Database deletion failed: ${dbError.message}`,
        details: dbError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error deleting database:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}