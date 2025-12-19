// app/api/deploy/[id]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

interface StopParams {
  id: string
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<StopParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deploymentId } = await params

    // ดึงข้อมูล deployment
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        user: { username: session.user.name }
      },
      include: {
        dockerHost: true
      }
    })

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
    }

    if (deployment.status !== 'running') {
      return NextResponse.json({ 
        error: 'Deployment is not running',
        currentStatus: deployment.status 
      }, { status: 400 })
    }

    console.log(`🛑 Stopping deployment: ${deployment.projectName}`)

    try {
      // หยุด container
      if (deployment.containerName) {
        await executeRemoteCommand(`docker stop "${deployment.containerName}"`, deployment.dockerHost)
        await executeRemoteCommand(`docker rm "${deployment.containerName}"`, deployment.dockerHost)
        console.log(`✅ Container ${deployment.containerName} stopped and removed`)
      }

      // อัพเดท status ในฐานข้อมูล
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: 'stopped',
          errorMessage: null
        }
      })

      console.log(`✅ Deployment ${deployment.projectName} stopped successfully`)

      return NextResponse.json({
        success: true,
        message: 'Deployment stopped successfully',
        projectName: deployment.projectName
      })

    } catch (error) {
      console.error('❌ Stop failed:', error)
      
      // อัพเดท status เป็น failed
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'failed',
          errorMessage: `Stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })

      return NextResponse.json({
        error: 'Failed to stop deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Stop error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function
async function executeRemoteCommand(command: string, targetDockerHost?: any): Promise<string> {
  const dockerHost = targetDockerHost?.host || process.env.DOCKER_HOST
  const dockerUser = targetDockerHost?.user || process.env.DOCKER_USER
  const dockerPassword = targetDockerHost?.password || process.env.DOCKER_PASSWORD
  
  console.log(`🔗 Executing remote command on ${dockerUser}@${dockerHost}`)
  
  let sshCommand
  if (dockerPassword) {
    // ตรวจสอบว่ามี sshpass หรือไม่ (สำหรับ password authentication)
    let hasSshpass = false
    try {
      await execAsync('sshpass -V')
      hasSshpass = true
    } catch (e) {
      // sshpass ไม่มี
    }

    if (hasSshpass) {
      // ใช้ sshpass สำหรับ password authentication
      sshCommand = `sshpass -p "${dockerPassword}" ssh -o StrictHostKeyChecking=no ${dockerUser}@${dockerHost} "${command}"`
    } else {
      // สำหรับ Windows - ลองใช้ plink (PuTTY) หรือวิธีอื่น
      try {
        await execAsync('plink -V')
        try {
          await execAsync(`echo y | plink -ssh ${dockerUser}@${dockerHost} -pw ${dockerPassword} exit`, { timeout: 10000 })
        } catch (e) {}
        sshCommand = `plink -ssh -batch ${dockerUser}@${dockerHost} -pw ${dockerPassword} "${command}"`
      } catch (e) {
        // ถ้าไม่มี plink ให้แนะนำวิธีแก้
        throw new Error(`SSH password authentication not available. Please:\n1. Install PuTTY (plink command)\n2. Or setup SSH key authentication\n3. Or use WSL with sshpass\nSee Setup page for instructions.`)
      }
    }
  } else {
    sshCommand = `ssh -o StrictHostKeyChecking=no ${dockerUser}@${dockerHost} "${command}"`
  }
  
  try {
    const { stdout, stderr } = await execAsync(sshCommand)
    
    if (stderr && !stderr.includes('Warning:')) {
      console.log('SSH stderr:', stderr)
    }
    
    return stdout.trim()
  } catch (error: any) {
    console.error('SSH command failed:', error)
    throw new Error(`Remote command failed: ${error.message}`)
  }
}