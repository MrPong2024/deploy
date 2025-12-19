// app/api/deploy/[id]/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

interface StartParams {
  id: string
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<StartParams> }
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

    if (deployment.status !== 'stopped' && deployment.status !== 'failed' && deployment.status !== 'not_found' && deployment.status !== 'error') {
      return NextResponse.json({ 
        error: 'Deployment is not stopped',
        currentStatus: deployment.status 
      }, { status: 400 })
    }

    console.log(`🚀 Starting deployment: ${deployment.projectName}`)

    // อัพเดทสถานะเป็น building
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { 
        status: 'building',
        errorMessage: null
      }
    })

    try {
      // หยุด container เก่า (ถ้ายังมีอยู่)
      if (deployment.containerName) {
        try {
          await executeRemoteCommand(`docker stop "${deployment.containerName}" || true`, deployment.dockerHost)
          await executeRemoteCommand(`docker rm "${deployment.containerName}" || true`, deployment.dockerHost)
        } catch (e) {
          // ไม่ต้องสนใจ error
        }
      }

      // สร้าง container ใหม่ด้วย timestamp ใหม่
      const timestamp = Date.now()
      const newContainerName = `${session.user.name}-${deployment.projectName}-${timestamp}`.toLowerCase()
      const imageName = deployment.imageName || `${session.user.name}-${deployment.projectName}:latest`
      
      // ใช้ internal port ถ้ามี หรือ default เป็น 3000
      const appPort = deployment.internalPort || 3000
      
      console.log(`🚀 Running new container: ${newContainerName} (Port mapping: ${deployment.port} -> ${appPort})`)
      await executeRemoteCommand(`docker run -d --restart=unless-stopped --name "${newContainerName}" -p ${deployment.port}:${appPort} "${imageName}"`, deployment.dockerHost)

      // อัพเดท status ในฐานข้อมูล
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: 'running',
          containerName: newContainerName, // ใช้ชื่อ container ใหม่
          errorMessage: null
        }
      })

      console.log(`✅ Deployment ${deployment.projectName} started successfully`)

      return NextResponse.json({
        success: true,
        message: 'Deployment started successfully',
        projectName: deployment.projectName,
        deployUrl: deployment.deployUrl
      })

    } catch (error) {
      console.error('❌ Start failed:', error)
      
      // อัพเดท status เป็น failed
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'failed',
          errorMessage: `Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })

      return NextResponse.json({
        error: 'Failed to start deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Start error:', error)
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
    try {
      await execAsync('plink -V')
      try {
        await execAsync(`echo y | plink -ssh ${dockerUser}@${dockerHost} -pw ${dockerPassword} exit`, { timeout: 10000 })
      } catch (e) {}
      sshCommand = `plink -ssh -batch ${dockerUser}@${dockerHost} -pw ${dockerPassword} "${command}"`
    } catch (e) {
      throw new Error('SSH password authentication not available. Please install PuTTY (plink).')
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