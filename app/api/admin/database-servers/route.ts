// app/api/admin/database-servers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'
import { Client as PostgreSQLClient } from 'pg'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 })
    }

    const databaseServers = await prisma.databaseServer.findMany({
      include: {
        _count: {
          select: { databaseInstances: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ databaseServers })

  } catch (error: any) {
    console.error('Database servers fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch database servers',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 })
    }

    const { name, host, port, dbType, rootUser, rootPass, description } = await request.json()

    if (!name || !host || !rootUser || !rootPass) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Test connection
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
          database: 'postgres', // Connect to default postgres database
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

    // สร้าง database server
    const databaseServer = await prisma.databaseServer.create({
      data: {
        name,
        host,
        port: port || (dbType === 'postgresql' ? 5432 : 3306),
        dbType: dbType || 'mysql',
        rootUser,
        rootPass, // ในการใช้งานจริงควร encrypt
        description
      }
    })

    console.log(`✅ Database server ${name} added successfully`)

    return NextResponse.json({
      success: true,
      databaseServer
    })

  } catch (error: any) {
    console.error('Add database server error:', error)
    return NextResponse.json({
      error: 'Failed to add database server',
      details: error.message
    }, { status: 500 })
  }
}