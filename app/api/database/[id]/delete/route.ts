// app/api/database/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'
import { Client as PostgreSQLClient } from 'pg'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: databaseId } = await params

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

    // ตรวจสอบว่าฐานข้อมูลเป็นของ user ที่ร้องขอหรือไม่ (หรือเป็น admin)
    if (databaseInstance.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. You can only delete your own databases.' 
      }, { status: 403 })
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
        message: `Database ${databaseName} deleted successfully`
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