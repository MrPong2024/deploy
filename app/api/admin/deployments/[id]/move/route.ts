// app/api/admin/deployments/[id]/move/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

interface MoveParams {
  id: string
}

// POST - ย้าย deployment ไป Docker host ใหม่
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<MoveParams> }
) {
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

    const { id: deploymentId } = await params
    const { newHostId } = await request.json()

    // หา deployment
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        dockerHost: true,
        user: true
      }
    })

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
    }

    // หา Docker host ใหม่
    const newHost = await prisma.dockerHost.findFirst({
      where: { 
        id: newHostId,
        isActive: true 
      }
    })

    if (!newHost) {
      return NextResponse.json({
        error: 'Target Docker host not found or inactive'
      }, { status: 400 })
    }

    // ตรวจสอบว่าไม่ใช่ host เดียวกัน
    if (deployment.hostId === newHostId) {
      return NextResponse.json({
        error: 'Deployment is already on this host'
      }, { status: 400 })
    }

    // หยุด container ในเครื่องเก่า
    if (deployment.containerName && deployment.dockerHost) {
      try {
        await executeRemoteCommand(
          `docker stop "${deployment.containerName}" || true`,
          deployment.dockerHost
        )
        await executeRemoteCommand(
          `docker rm "${deployment.containerName}" || true`,
          deployment.dockerHost
        )
        console.log(`🛑 Stopped container ${deployment.containerName} on ${deployment.dockerHost.host}`)
      } catch (error) {
        console.warn('Failed to stop old container:', error)
      }
    }

    // อัพเดท deployment status
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { 
        status: 'building',
        hostId: newHostId
      }
    })

    // รัน container ใหม่บนเครื่องใหม่ (ใช้การ rebuild แบบง่าย)
    try {
      const containerName = `${deployment.user.username}-${deployment.projectName}-${Date.now()}`.toLowerCase()
      
      // ย่อมต้อง clone และ build ใหม่
      const tempDir = `/tmp/deploy/${deployment.user.username}/${deployment.projectName}`
      
      // Clone project
      await executeRemoteCommand(`rm -rf "${tempDir}" || true`, newHost)
      await executeRemoteCommand(`git clone "${deployment.gitUrl}" "${tempDir}"`, newHost)
      
      // Build image
      const imageName = `${deployment.user.username}-${deployment.projectName}:${Date.now()}`.toLowerCase()
      const dockerfileContent = generateDockerfile()
      const dockerfileBase64 = Buffer.from(dockerfileContent).toString('base64')
      await executeRemoteCommand(`echo "${dockerfileBase64}" | base64 -d > "${tempDir}/Dockerfile"`, newHost)
      await executeRemoteCommand(`cd "${tempDir}" && docker build -t "${imageName}" .`, newHost)
      
      // Run container
      const appPort = 3000 // Default port
      await executeRemoteCommand(
        `docker run -d --restart=unless-stopped --name "${containerName}" -p ${deployment.port}:${appPort} "${imageName}"`,
        newHost
      )
      
      // Update deployment
      const deployUrl = `http://${newHost.host}:${deployment.port}`
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'running',
          containerName,
          imageName,
          deployUrl,
          hostId: newHostId
        }
      })

      console.log(`✅ Moved deployment ${deployment.projectName} to ${newHost.name}`)

      return NextResponse.json({
        success: true,
        message: `Deployment moved to ${newHost.name} successfully`,
        newHost: {
          id: newHost.id,
          name: newHost.name,
          host: newHost.host
        }
      })

    } catch (error: any) {
      // Rollback on error
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: 'failed',
          errorMessage: `Move failed: ${error.message}`
        }
      })

      throw error
    }

  } catch (error: any) {
    console.error('Move deployment error:', error)
    return NextResponse.json({
      error: 'Failed to move deployment',
      details: error.message
    }, { status: 500 })
  }
}

// Helper functions
async function executeRemoteCommand(command: string, dockerHost: any): Promise<string> {
  const host = dockerHost.host
  const user = dockerHost.user
  const password = dockerHost.password
  
  let sshCommand
  if (password) {
    try {
      await execAsync('sshpass -V')
      sshCommand = `sshpass -p "${password}" ssh -o StrictHostKeyChecking=no ${user}@${host} "${command}"`
    } catch (e) {
      try {
        await execAsync('plink -V')
        sshCommand = `echo y | plink -ssh -l ${user} -pw ${password} ${host} "${command}"`
      } catch (e2) {
        throw new Error('SSH password authentication not available')
      }
    }
  } else {
    sshCommand = `ssh -o StrictHostKeyChecking=no ${user}@${host} "${command}"`
  }
  
  const { stdout } = await execAsync(sshCommand)
  return stdout.trim()
}

function generateDockerfile(): string {
  return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN if npm run | grep -q "build"; then npm run build; else echo "No build script found, skipping build..."; fi

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]`
}