// app/api/database/request/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'
import { Client as PostgreSQLClient } from 'pg'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
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

    const { dbType, databaseName, dbUser, dbPassword } = await request.json()

    if (!dbType || !databaseName || !dbUser || !dbPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // หา server ที่มีประเภทที่ต้องการและ active
    const availableServers = await prisma.databaseServer.findMany({
      where: { 
        dbType,
        isActive: true 
      },
      orderBy: { createdAt: 'asc' } // เลือก server เก่าที่สุดก่อน
    })

    if (availableServers.length === 0) {
      return NextResponse.json({ 
        error: `No active ${dbType.toUpperCase()} servers available`, 
        details: 'Please contact administrator to add database servers' 
      }, { status: 404 })
    }

    // เลือก server ที่มีจำนวนฐานข้อมูลน้อยที่สุด (เพื่อ Load Balancing)
    const serverCounts = await Promise.all(
      availableServers.map(async (server) => {
        const count = await prisma.databaseInstance.count({
          where: { serverId: server.id }
        })
        return { server, count }
      })
    )

    // เรียงตามจำนวนฐานข้อมูลน้อยที่สุด
    serverCounts.sort((a, b) => a.count - b.count)
    const selectedServer = serverCounts[0].server
    const serverId = selectedServer.id
    const databaseServer = selectedServer

    console.log(`🎯 Selected server: ${databaseServer.name} (${databaseServer.host}:${databaseServer.port}) - Current databases: ${serverCounts[0].count}`)

    // ตรวจสอบว่า user นี้ยังไม่เคยขอใช้ database ชื่อนี้ใน server นี้
    const existingDb = await prisma.databaseInstance.findUnique({
      where: {
        serverId_databaseName: {
          serverId,
          databaseName
        }
      }
    })

    if (existingDb) {
      return NextResponse.json({ error: 'Database name already exists on this server' }, { status: 400 })
    }

    // ตรวจสอบว่า username ไม่ซ้ำ
    const existingUser = await prisma.databaseInstance.findUnique({
      where: {
        serverId_dbUser: {
          serverId,
          dbUser
        }
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Database username already exists on this server' }, { status: 400 })
    }

    console.log(`🗃️ Creating database for user ${user.username}: ${databaseName}`)

    try {
      let connectionString = ''
      
      if (databaseServer.dbType === 'mysql') {
        // MySQL Database Creation
        const connection = await mysql.createConnection({
          host: databaseServer.host,
          port: databaseServer.port,
          user: databaseServer.rootUser,
          password: databaseServer.rootPass
        })

        // สร้าง database
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``)
        console.log(`✅ MySQL Database ${databaseName} created`)

        // สร้าง user และกำหนดสิทธิ์เฉพาะ database นั้น
        await connection.execute(`CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`)
        await connection.execute(`GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${dbUser}'@'%'`)
        await connection.execute('FLUSH PRIVILEGES')

        console.log(`✅ MySQL User ${dbUser} created with access to ${databaseName} only`)
        await connection.end()
        
        connectionString = `mysql://${dbUser}:${dbPassword}@${databaseServer.host}:${databaseServer.port}/${databaseName}`
        
      } else if (databaseServer.dbType === 'postgresql') {
        // PostgreSQL Database Creation
        const client = new PostgreSQLClient({
          host: databaseServer.host,
          port: databaseServer.port,
          user: databaseServer.rootUser,
          password: databaseServer.rootPass,
          database: 'postgres' // Connect to default database
        })
        
        await client.connect()
        
        // สร้าง database
        await client.query(`CREATE DATABASE "${databaseName}"`)
        console.log(`✅ PostgreSQL Database ${databaseName} created`)
        
        // สร้าง user
        await client.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`)
        
        // กำหนดสิทธิ์แบบจำกัด - ป้องกันการเข้าถึงของคนอื่น
        await client.query(`GRANT CONNECT ON DATABASE "${databaseName}" TO "${dbUser}"`)
        
        // เชื่อมต่อไปยัง database ที่สร้างเพื่อกำหนดสิทธิ์ schema
        await client.end()
        
        const dbClient = new PostgreSQLClient({
          host: databaseServer.host,
          port: databaseServer.port,
          user: databaseServer.rootUser,
          password: databaseServer.rootPass,
          database: databaseName
        })
        
        await dbClient.connect()
        
        // กำหนดสิทธิ์ใน schema เฉพาะ
        await dbClient.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO "${dbUser}"`)
        await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${dbUser}"`)
        await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${dbUser}"`)
        await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`)
        await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`)
        
        // ป้องกันการเข้าถึง database อื่น
        await dbClient.query(`REVOKE ALL ON DATABASE postgres FROM "${dbUser}"`)
        await dbClient.query(`REVOKE ALL ON DATABASE template1 FROM "${dbUser}"`)
        
        console.log(`✅ PostgreSQL User ${dbUser} created with restricted access to ${databaseName} only`)
        await dbClient.end()
        
        connectionString = `postgresql://${dbUser}:${dbPassword}@${databaseServer.host}:${databaseServer.port}/${databaseName}`
      }

      // บันทึกลงฐานข้อมูล
      const databaseInstance = await prisma.databaseInstance.create({
        data: {
          databaseName,
          dbUser,
          dbPassword,
          status: 'active',
          userId: user.id,
          serverId,
          connectionString
        },
        include: {
          server: true
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Database created successfully',
        database: {
          databaseName,
          dbUser,
          dbPassword,
          host: databaseServer.host,
          port: databaseServer.port,
          connectionString,
          serverName: databaseServer.name,
          dbType: databaseServer.dbType
        }
      })

    } catch (dbError: any) {
      console.error('❌ Database creation failed:', dbError)
      
      // บันทึก error ลงฐานข้อมูล
      await prisma.databaseInstance.create({
        data: {
          databaseName,
          dbUser,
          dbPassword,
          status: 'failed',
          userId: user.id,
          serverId
        }
      })

      return NextResponse.json({
        error: 'Failed to create database',
        details: dbError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Database request error:', error)
    return NextResponse.json({
      error: 'Failed to process database request',
      details: error.message
    }, { status: 500 })
  }
}

// GET: ดู database ของ user
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

    const databases = await prisma.databaseInstance.findMany({
      where: { userId: user.id },
      include: {
        server: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // ดึงรายการประเภทฐานข้อมูลที่ใช้ได้ และจำนวน server แต่ละประเภท
    const dbTypeStats = await prisma.databaseServer.groupBy({
      by: ['dbType'],
      where: { isActive: true },
      _count: {
        id: true
      }
    })

    // สร้างข้อมูลที่มีรายละเอียด
    const availableDbTypes = await Promise.all(
      dbTypeStats.map(async (stat) => {
        const servers = await prisma.databaseServer.findMany({
          where: {
            dbType: stat.dbType,
            isActive: true
          },
          select: {
            id: true,
            name: true
          }
        })

        return {
          dbType: stat.dbType,
          count: stat._count.id,
          servers
        }
      })
    )

    return NextResponse.json({
      databases,
      availableDbTypes
    })

  } catch (error: any) {
    console.error('Get databases error:', error)
    return NextResponse.json({
      error: 'Failed to get databases',
      details: error.message
    }, { status: 500 })
  }
}