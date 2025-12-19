// app/api/deploy/[id]/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

interface UpdateParams {
  id: string
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<UpdateParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deploymentId } = await params

    // ดึงข้อมูล deployment พร้อม Docker host
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

    // อัพเดทสถานะเป็น building
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { 
        status: 'building',
        errorMessage: null
      }
    })

    console.log(`🔄 Updating deployment: ${deployment.projectName}`)

    try {
      // 1. Check for new commits
      const latestCommit = await getLatestCommitHash(deployment.gitUrl)
      console.log(`📋 Latest commit: ${latestCommit}`)
      console.log(`📋 Current commit: ${deployment.lastCommitHash || 'none'}`)

      if (deployment.lastCommitHash && deployment.lastCommitHash === latestCommit) {
        await prisma.deployment.update({
          where: { id: deploymentId },
          data: { 
            status: 'running',
            errorMessage: null
          }
        })
        return NextResponse.json({ 
          message: 'No updates available',
          upToDate: true 
        })
      }

      // Get Docker host from deployment
      const dockerHost = deployment.dockerHost

      // 2. Stop existing container
      if (deployment.containerName) {
        console.log(`🛑 Stopping container: ${deployment.containerName}`)
        await executeRemoteCommand(`docker stop "${deployment.containerName}" || true`, dockerHost)
        await executeRemoteCommand(`docker rm "${deployment.containerName}" || true`, dockerHost)
      } else {
        // หา container เก่าด้วย prefix ถ้าไม่มี containerName
        try {
          const oldContainerPrefix = `${session.user.name}-${deployment.projectName}`
          const containerList = await executeRemoteCommand(`docker ps -a --filter "name=${oldContainerPrefix}" --format "{{.Names}}"`, dockerHost)
          if (containerList.trim()) {
            const containers = containerList.split('\n').filter(name => name.trim())
            for (const oldContainer of containers) {
              await executeRemoteCommand(`docker stop "${oldContainer.trim()}" || true`, dockerHost)
              await executeRemoteCommand(`docker rm "${oldContainer.trim()}" || true`, dockerHost)
              console.log(`🛑 Stopped old container: ${oldContainer.trim()}`)
            }
          }
        } catch (e) {
          console.log('⚠️ Could not stop old containers:', e)
        }
      }

      // 3. Pull latest code และ build ใหม่
      const tempDir = `/tmp/deploy/${session.user.name}/${deployment.projectName}`
      
      console.log(`📥 Pulling latest code...`)
      await executeRemoteCommand(`rm -rf "${tempDir}" || true`, dockerHost)
      await executeRemoteCommand(`git clone "${deployment.gitUrl}" "${tempDir}"`, dockerHost)

      // Generate Dockerfile
      const dockerfileContent = await generateDockerfile(tempDir)
      const dockerfileBase64 = Buffer.from(dockerfileContent).toString('base64')
      await executeRemoteCommand(`echo "${dockerfileBase64}" | base64 -d > "${tempDir}/Dockerfile"`, dockerHost)

      // Build new image
      const newImageName = `${session.user.name}-${deployment.projectName}:${Date.now()}`
      console.log(`🔨 Building new image: ${newImageName}`)
      await executeRemoteCommand(`cd "${tempDir}" && DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t "${newImageName}" .`, dockerHost)

      // 4. Run new container
      const containerName = `${session.user.name}-${deployment.projectName}-${Date.now()}`.toLowerCase()
      
      // Detect port again for running container
      const detectedPort = await detectProjectPort(tempDir)
      console.log(`🚀 Running new container: ${containerName} (internal port: ${detectedPort}, external port: ${deployment.port})`)
      
      await executeRemoteCommand(
        `docker run -d --restart=unless-stopped --name "${containerName}" -p ${deployment.port}:${detectedPort} "${newImageName}"`,
        dockerHost
      )

      // 5. อัพเดท database พร้อมข้อมูล internal port
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'running',
          imageName: newImageName,
          containerName: containerName,
          lastCommitHash: latestCommit,
          lastUpdated: new Date(),
          errorMessage: `internalPort:${detectedPort}`
        }
      })

      console.log(`✅ Update completed!`)

      return NextResponse.json({
        message: 'Deployment updated successfully',
        deployUrl: deployment.deployUrl,
        lastCommitHash: latestCommit
      })

    } catch (error) {
      console.error('❌ Update failed:', error)
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'failed',
          errorMessage: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })

      return NextResponse.json({
        error: 'Deployment update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Update error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions
async function getLatestCommitHash(gitUrl: string): Promise<string> {
  try {
    // Use git ls-remote to get latest commit without cloning
    const { stdout } = await execAsync(`git ls-remote "${gitUrl}" HEAD`)
    const commitHash = stdout.split('\t')[0].trim()
    return commitHash
  } catch (error) {
    throw new Error(`Failed to get latest commit: ${error}`)
  }
}

async function executeRemoteCommand(command: string, targetDockerHost?: any): Promise<string> {
  const dockerHost = targetDockerHost?.host || process.env.DOCKER_HOST
  const dockerUser = targetDockerHost?.user || process.env.DOCKER_USER
  const dockerPassword = targetDockerHost?.password || process.env.DOCKER_PASSWORD
  
  console.log(`🔗 Executing remote command on ${dockerUser}@${dockerHost}`)
  
  // ตรวจสอบว่ามี sshpass หรือไม่ (สำหรับ password authentication)
  let hasSshpass = false
  try {
    await execAsync('sshpass -V')
    hasSshpass = true
  } catch (e) {
    // sshpass ไม่มี
  }

  let sshCommand
  if (dockerPassword && hasSshpass) {
    // ใช้ sshpass สำหรับ password authentication
    sshCommand = `sshpass -p "${dockerPassword}" ssh -o StrictHostKeyChecking=no ${dockerUser}@${dockerHost} "${command}"`
  } else if (dockerPassword && !hasSshpass) {
    // สำหรับ Windows - ลองใช้ plink (PuTTY) หรือวิธีอื่น
    try {
      await execAsync('plink -V')
      sshCommand = `echo y | plink -ssh -l ${dockerUser} -pw ${dockerPassword} ${dockerHost} "${command}"`
    } catch (e) {
      // ถ้าไม่มี plink ให้แนะนำวิธีแก้
      throw new Error(`SSH password authentication not available. Please:\n1. Install PuTTY (plink command)\n2. Or setup SSH key authentication\n3. Or use WSL with sshpass\nSee Setup page for instructions.`)
    }
  } else {
    // ใช้ SSH key authentication
    sshCommand = `ssh -o StrictHostKeyChecking=no ${dockerUser}@${dockerHost} "${command}"`
  }
  
  try {
    const { stdout, stderr } = await execAsync(sshCommand, { timeout: 300000 }) // 5 minute timeout
    
    if (stderr && !stderr.includes('Warning:') && !stderr.includes('docker build')) {
      console.log('SSH stderr:', stderr)
    }
    
    return stdout.trim()
  } catch (error: any) {
    console.error('SSH command failed:', error)
    throw new Error(`Remote command failed: ${error.message}`)
  }
}

async function generateDockerfile(projectPath: string): Promise<string> {
  // Detect project port from source code
  const detectedPort = await detectProjectPort(projectPath)
  console.log(`🔍 Detected port for update: ${detectedPort}`)
  
  const nodeVersion = "18"
  
  return `FROM node:${nodeVersion}-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build if build script exists
RUN if npm run | grep -q "build"; then npm run build; else echo "No build script found, skipping build..."; fi

# Expose the detected port
EXPOSE ${detectedPort}

# Set environment variable for port
ENV PORT=${detectedPort}

# Start the application
CMD ["npm", "start"]`
}

// ฟังก์ชันสำหรับ detect port จาก source code
async function detectProjectPort(tempDir: string): Promise<number> {
  try {
    console.log(`🔍 Starting port detection in directory: ${tempDir}`)
    
    // 1. ตรวจสอบใน package.json scripts
    const packageJsonPath = path.join(tempDir, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // ตรวจสอบใน scripts
      const scripts = packageJson.scripts || {}
      for (const [name, script] of Object.entries(scripts)) {
        const scriptStr = script as string
        // หา port ใน start command
        const portMatch = scriptStr.match(/(?:--port|PORT=|:)(\d+)/i)
        if (portMatch) {
          console.log(`📍 Port detected from package.json script '${name}': ${portMatch[1]}`)
          return parseInt(portMatch[1])
        }
      }
    }

    // 2. ตรวจสอบไฟล์ main entry points
    console.log(`🔍 Checking main entry point files...`)
    const mainFiles = ['server.js', 'index.js', 'app.js', 'main.js', 'src/server.js', 'src/index.js', 'src/app.js']
    
    for (const mainFile of mainFiles) {
      const filePath = path.join(tempDir, mainFile)
      if (fs.existsSync(filePath)) {
        console.log(`🔍 Reading file: ${mainFile}`)
        const content = fs.readFileSync(filePath, 'utf-8')
        console.log(`📄 File content preview: ${content.substring(0, 200)}...`)
        
        // หาต่าง patterns สำหรับ port
        const patterns = [
          /listen\s*\(\s*(\d+)/gi,
          /port\s*:\s*(\d+)/gi,
          /PORT\s*=\s*(\d+)/gi,
          /localhost:(\d+)/gi,
          /process\.env\.PORT\s*\|\|\s*(\d+)/gi,
          /app\.listen\s*\(\s*(\d+)/gi,
          /server\.listen\s*\(\s*(\d+)/gi,
          /\.listen\s*\(\s*(\d+)/gi
        ]
        
        for (const pattern of patterns) {
          const matches = content.matchAll(pattern)
          for (const match of matches) {
            const port = parseInt(match[1])
            if (port > 1000 && port < 65536) {
              console.log(`📍 Port detected from ${mainFile} with pattern ${pattern}: ${port}`)
              return port
            }
          }
        }
        
        // หา port ใน comment หรือ console.log ด้วย
        const commentPatterns = [
          /\/\/.*port.*?(\d{4})/gi,
          /console\.log.*port.*?(\d{4})/gi,
          /running.*?(\d{4})/gi,
          /localhost:(\d{4})/gi
        ]
        
        for (const pattern of commentPatterns) {
          const matches = content.matchAll(pattern)
          for (const match of matches) {
            const port = parseInt(match[1])
            if (port > 1000 && port < 65536) {
              console.log(`📍 Port detected from ${mainFile} comment/log with pattern ${pattern}: ${port}`)
              return port
            }
          }
        }
      }
    }

    console.log('📍 No specific port detected, using default 3000')
    return 3000
  } catch (error) {
    console.log('📍 Error detecting port, using default 3000:', error)
    return 3000
  }
}

