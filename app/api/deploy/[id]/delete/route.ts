// app/api/deploy/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

interface DeleteParams {
  id: string
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<DeleteParams> }
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

    console.log(`🗑️ Deleting deployment: ${deployment.projectName}`)

    try {
      // หยุดและลบ container (ถ้ามี)
      if (deployment.containerName) {
        try {
          await executeRemoteCommand(`docker stop "${deployment.containerName}" || true`, deployment.dockerHost)
          await executeRemoteCommand(`docker rm "${deployment.containerName}" || true`, deployment.dockerHost)
          console.log(`✅ Container ${deployment.containerName} stopped and removed`)
        } catch (e) {
          console.warn('Container cleanup warning:', e)
        }
      }

      // ลบ image (ถ้ามี) และ related images
      if (deployment.imageName) {
        try {
          await executeRemoteCommand(`docker rmi "${deployment.imageName}" || true`, deployment.dockerHost)
          console.log(`✅ Image ${deployment.imageName} removed`)
        } catch (e) {
          console.warn('Image cleanup warning:', e)
        }
      }

      // ลบ images ที่เกี่ยวข้องทั้งหมด (ตาม pattern)
      try {
        const imagePattern = `${session.user.name}-${deployment.projectName}`.toLowerCase()
        await executeRemoteCommand(`docker images --filter "reference=${imagePattern}*" -q | xargs -r docker rmi || true`, deployment.dockerHost)
        console.log(`✅ Related images with pattern ${imagePattern}* removed`)
      } catch (e) {
        console.warn('Related images cleanup warning:', e)
      }

      // ลบ dangling images (optional - ประหยัดพื้นที่)
      try {
        await executeRemoteCommand(`docker image prune -f || true`, deployment.dockerHost)
        console.log(`✅ Dangling images cleaned up`)
      } catch (e) {
        console.warn('Dangling images cleanup warning:', e)
      }

      // ลบ temp directory
      try {
        const tempDir = `/tmp/deploy/${session.user.name}/${deployment.projectName}`
        await executeRemoteCommand(`rm -rf "${tempDir}" || true`, deployment.dockerHost)
        console.log(`✅ Temp directory cleaned up`)
      } catch (e) {
        console.warn('Directory cleanup warning:', e)
      }

      // ลบจากฐานข้อมูล
      await prisma.deployment.delete({
        where: { id: deploymentId }
      })

      console.log(`✅ Deployment ${deployment.projectName} deleted successfully`)

      return NextResponse.json({
        success: true,
        message: 'Deployment deleted successfully',
        projectName: deployment.projectName
      })

    } catch (error) {
      console.error('❌ Delete failed:', error)
      
      return NextResponse.json({
        error: 'Failed to delete deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Delete error:', error)
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
      sshCommand = `sshpass -p "${dockerPassword}" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${dockerUser}@${dockerHost} "${command}"`
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
    sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${dockerUser}@${dockerHost} "${command}"`
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