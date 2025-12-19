// app/api/admin/docker-hosts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

// ฟังก์ชันทดสอบการเชื่อมต่อ
async function testConnection(host: string, user: string, password?: string): Promise<boolean> {
  try {
    let sshCommand
    if (password) {
      // ตรวจสอบว่ามี sshpass หรือไม่ (สำหรับ Linux/Mac)
      try {
        await execAsync('sshpass -V')
        sshCommand = `sshpass -p "${password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host} "echo 'Connection OK'"`
      } catch (e) {
        // ลองใช้ plink (PuTTY) สำหรับ Windows
        try {
          await execAsync('plink -V')
          // สำหรับ Windows plink - ต้องยอมรับ host key ก่อน
          try {
            // ลองยอมรับ host key ก่อน (ignore error)
            await execAsync(`echo y | plink -ssh ${user}@${host} -pw ${password} exit`, { timeout: 10000 })
          } catch (e) {
            // ignore error from host key caching
          }
          // จากนั้นรัน command จริงใน batch mode
          sshCommand = `plink -ssh -batch ${user}@${host} -pw ${password} "echo 'Connection OK'"`
        } catch (e2) {
          throw new Error('SSH password authentication not available. Please install PuTTY (plink) or sshpass.')
        }
      }
    } else {
      // ใช้ SSH key authentication
      sshCommand = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host} "echo 'Connection OK'"`
    }
    
    const { stdout } = await execAsync(sshCommand, { timeout: 15000 })
    return stdout.includes('Connection OK')
  } catch (error) {
    console.error(`Connection test failed for ${user}@${host}:`, error)
    return false
  }
}

// GET - ดู Docker hosts ทั้งหมด
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const dockerHosts = await prisma.dockerHost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deployments: true }
        }
      }
    })

    return NextResponse.json({
      dockerHosts: dockerHosts.map(host => ({
        ...host,
        password: undefined, // ไม่ส่ง password กลับไป
        deploymentCount: host._count.deployments
      }))
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get Docker hosts',
      details: error.message
    }, { status: 500 })
  }
}

// POST - สร้าง Docker host ใหม่
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { name, host, user: hostUser, password, description, testConnection: shouldTest } = await request.json()

    if (!name || !host || !hostUser) {
      return NextResponse.json({ 
        error: 'Required fields: name, host, user' 
      }, { status: 400 })
    }

    // ทดสอบการเชื่อมต่อถ้าร้องขอ
    if (shouldTest) {
      const connectionOk = await testConnection(host, hostUser, password)
      if (!connectionOk) {
        return NextResponse.json({
          error: 'Connection test failed',
          details: `Unable to connect to ${hostUser}@${host}. Please check hostname, username, and password.`
        }, { status: 400 })
      }
    }

    // ตรวจสอบว่ามี host+user ซ้ำหรือไม่
    const existingHost = await prisma.dockerHost.findUnique({
      where: {
        host_user: {
          host,
          user: hostUser
        }
      }
    })

    if (existingHost) {
      return NextResponse.json({
        error: 'Docker host already exists',
        details: `Host ${hostUser}@${host} already exists`
      }, { status: 409 })
    }

    const dockerHost = await prisma.dockerHost.create({
      data: {
        name,
        host,
        user: hostUser,
        password: password || null,
        description: description || null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Docker host created successfully',
      dockerHost: {
        ...dockerHost,
        password: undefined // ไม่ส่ง password กลับไป
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to create Docker host',
      details: error.message
    }, { status: 500 })
  }
}