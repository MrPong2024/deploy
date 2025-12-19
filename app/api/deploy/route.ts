import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// ฟังก์ชันสำหรับดึง commit hash ล่าสุด
async function getLatestCommitHash(gitUrl: string): Promise<string> {
  try {
    // ใช้ git ls-remote เพื่อดึง commit hash โดยไม่ต้อง clone
    const { stdout } = await execAsync(`git ls-remote "${gitUrl}" HEAD`)
    const commitHash = stdout.split('\t')[0].trim()
    return commitHash
  } catch (error) {
    console.warn('⚠️ Failed to get commit hash:', error)
    return 'unknown'
  }
}

// ฟังก์ชันหา port ว่าง
async function findAvailablePort(startPort: number = 8000, targetDockerHost?: any): Promise<number> {
  for (let port = startPort; port < startPort + 1000; port++) {
    try {
      // ตรวจสอบว่า port ใช้งานอยู่หรือไม่ใน database
      const existingDeployment = await prisma.deployment.findFirst({
        where: { 
          port: port,
          status: { in: ['running', 'building'] }
        }
      })
      
      if (!existingDeployment) {
        // ตรวจสอบบน remote server ด้วยหลายวิธี
        try {
          // ลองใช้คำสั่งที่มีอยู่ในระบบ (ss, netstat, lsof)
          const checkCommands = [
            `ss -tuln | grep :${port}`,           // Modern replacement
            `netstat -tuln | grep :${port}`,      // Traditional
            `lsof -i :${port}`,                   // Alternative
            `docker ps --filter "publish=${port}" --format "{{.Names}}"`  // Docker specific (fixed format)
          ]
          
          let portInUse = false
          for (const cmd of checkCommands) {
            try {
              const result = await executeRemoteCommand(cmd, targetDockerHost)
              if (result.trim()) {
                portInUse = true
                break
              }
            } catch (e) {
              // ลองคำสั่งถัดไป
              continue
            }
          }
          
          if (!portInUse) {
            return port
          }
        } catch (e) {
          // ถ้าตรวจสอบไม่ได้ ให้ใช้ port นี้
          return port
        }
      }
    } catch (error) {
      return port // fallback ถ้าตรวจสอบไม่ได้
    }
  }
  throw new Error('No available port found')
}

// ฟังก์ชันสำหรับ detect framework ที่ใช้ในโปรเจกต์
async function detectFramework(projectPath: string): Promise<string> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json')
    if (await fs.access(packageJsonPath).then(() => true).catch(() => false)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      if (deps.next) return 'Next.js'
      if (deps.react) return 'React'
      if (deps.vue) return 'Vue.js'
      if (deps['@angular/core']) return 'Angular'
      if (deps.express) return 'Express'
      if (deps.vite) return 'Vite'
      if (deps.nuxt) return 'Nuxt.js'
      if (deps.svelte) return 'Svelte'
    }
  } catch (error) {
    // ไม่สำคัญถ้า detect ไม่ได้
  }
  
  return 'Unknown'
}

// ฟังก์ชันสำหรับ detect port จาก source code
async function detectProjectPort(tempDir: string): Promise<number> {
  try {
    console.log(`🔍 Starting port detection in directory: ${tempDir}`)
    
    // 1. ตรวจสอบใน package.json scripts
    const packageJsonPath = path.join(tempDir, 'package.json')
    if (await fs.access(packageJsonPath).then(() => true).catch(() => false)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
      
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
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`🔍 Reading file: ${mainFile}`)
        const content = await fs.readFile(filePath, 'utf-8')
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

    // 3. ตรวจสอบ .env files
    const envFiles = ['.env', '.env.local', '.env.production']
    for (const envFile of envFiles) {
      const filePath = path.join(tempDir, envFile)
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        const content = await fs.readFile(filePath, 'utf-8')
        const portMatch = content.match(/PORT\s*=\s*(\d+)/i)
        if (portMatch) {
          console.log(`📍 Port detected from ${envFile}: ${portMatch[1]}`)
          return parseInt(portMatch[1])
        }
      }
    }

    // 4. ตรวจสอบ config files
    const configFiles = ['next.config.js', 'vue.config.js', 'angular.json', 'nuxt.config.js']
    for (const configFile of configFiles) {
      const filePath = path.join(tempDir, configFile)
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        const content = await fs.readFile(filePath, 'utf-8')
        const portMatch = content.match(/port.*?(\d+)/gi)
        if (portMatch && portMatch.length > 0) {
          const port = parseInt(portMatch[0].match(/(\d+)/)![1])
          if (port > 1000 && port < 65536) {
            console.log(`📍 Port detected from ${configFile}: ${port}`)
            return port
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

// ฟังก์ชันสร้าง Dockerfile ที่รองรับพอร์ตต่างๆ
function generateSmartDockerfile(deployConfig: any, appPort: number): string {
  const nodeVersion = deployConfig.app.node_version || '18'
  
  return `FROM node:${nodeVersion}-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./

# Install dependencies with caching optimizations
RUN if [ -f yarn.lock ]; then \\
    yarn install --frozen-lockfile; \\
  elif [ -f pnpm-lock.yaml ]; then \\
    npm install -g pnpm && pnpm install --frozen-lockfile; \\
  elif [ -f package-lock.json ]; then \\
    npm ci; \\
  else \\
    npm install; \\
  fi

# Copy source code (this layer will be rebuilt when code changes)
COPY . .

# Build if build script exists
RUN if npm run | grep -q "build"; then npm run build; else echo "No build script found, skipping build..."; fi

# Remove dev dependencies after build to reduce image size
RUN if [ -f yarn.lock ]; then \\
    yarn install --production --frozen-lockfile; \\
  elif [ -f pnpm-lock.yaml ]; then \\
    pnpm prune --prod; \\
  elif [ -f package-lock.json ]; then \\
    npm ci --omit=dev; \\
  else \\
    npm install --omit=dev; \\
  fi

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nextjs -u 1001

# Change ownership of /app to nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the detected port
EXPOSE ${appPort}

# Set environment variable for port
ENV PORT=${appPort}
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]`
}

// ฟังก์ชันสร้าง Dockerfile แบบเก่า (สำหรับ backward compatibility)
function generateWebDockerfile(deployConfig: any): string {
  return generateSmartDockerfile(deployConfig, 3000)
}

// ฟังก์ชันสำหรับรันคำสั่งบน remote server
async function executeRemoteCommand(command: string, targetDockerHost?: any): Promise<string> {
  // ใช้ host ที่กำหนด หรือ fallback ไปยัง env variables
  const dockerHost = targetDockerHost?.host || process.env.DOCKER_HOST
  const dockerUser = targetDockerHost?.user || process.env.DOCKER_USER
  const dockerPassword = targetDockerHost?.password || process.env.DOCKER_PASSWORD
  
  if (!dockerHost || !dockerUser) {
    throw new Error('Docker server configuration not found. Please set DOCKER_HOST and DOCKER_USER in .env or select a Docker host')
  }

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
    sshCommand = `sshpass -p "${dockerPassword}" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${dockerUser}@${dockerHost} "${command}"`
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
    sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${dockerUser}@${dockerHost} "${command}"`
  }
  
  console.log(`🔗 Executing remote command on ${dockerUser}@${dockerHost}`)
  
  try {
    const { stdout, stderr } = await execAsync(sshCommand)
    if (stderr && !stderr.includes('Warning') && !stderr.includes('Pseudo-terminal')) {
      console.warn('SSH stderr:', stderr)
    }
    return stdout
  } catch (error: any) {
    console.error('SSH command failed:', error)
    // ให้ข้อมูล error ที่ชัดเจนขึ้น
    if (error.message.includes('Permission denied')) {
      throw new Error(`SSH Permission denied. Please check username/password or setup SSH key for ${dockerUser}@${dockerHost}`)
    } else if (error.message.includes('Connection refused')) {
      throw new Error(`Cannot connect to ${dockerHost}. Please check if SSH service is running on the remote server.`)
    }
    throw new Error(`Remote command failed: ${error.message}`)
  }
}

// ฟังก์ชันสำหรับ copy ไฟล์ไปยัง remote server
async function copyToRemoteServer(localPath: string, remotePath: string, targetDockerHost?: any): Promise<void> {
  const dockerHost = targetDockerHost?.host || process.env.DOCKER_HOST
  const dockerUser = targetDockerHost?.user || process.env.DOCKER_USER
  const dockerPassword = targetDockerHost?.password || process.env.DOCKER_PASSWORD
  
  let scpCommand
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
      scpCommand = `sshpass -p "${dockerPassword}" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r "${localPath}/." ${dockerUser}@${dockerHost}:"${remotePath}/"`
    } else {
      // ลองใช้ pscp (PuTTY)
      try {
        await execAsync('pscp -V')
        scpCommand = `echo y | pscp -scp -pw ${dockerPassword} -r "${localPath}\\*" ${dockerUser}@${dockerHost}:"${remotePath}/"`
      } catch (e) {
        throw new Error('File transfer tool not available. Please install PuTTY (pscp) or sshpass, or setup SSH key authentication.')
      }
    }
  } else {
    // ใช้ SSH key authentication
    scpCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r "${localPath}/." ${dockerUser}@${dockerHost}:"${remotePath}/"`
  }
  
  console.log(`📁 Copying to remote: ${dockerHost}:${remotePath}`)
  
  await execAsync(scpCommand)
}

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ก่อน
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gitUrl, hostId } = await request.json()

    if (!gitUrl) {
      return NextResponse.json({ error: 'Git URL is required' }, { status: 400 })
    }

    // หา user ในฐานข้อมูล
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // สร้างชื่อโปรเจกต์จาก Git URL
    const projectName = gitUrl.split('/').pop()?.replace('.git', '') || 'unknown-project'
    const tempDir = path.join(process.cwd(), 'temp', `${user.id}-${projectName}`)
    const remoteWorkDir = `/tmp/deploy/${user.username}/${projectName}`
    const timestamp = Date.now()

    // ตรวจสอบว่ามี deployment ของโปรเจคนี้อยู่แล้วหรือไม่
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        userId: user.id,
        projectName: projectName
      }
    })

    if (existingDeployment) {
      return NextResponse.json({
        error: 'โปรเจคนี้มีอยู่แล้ว',
        details: `โปรเจค "${projectName}" ถูก deploy แล้ว ใช้ปุ่ม Update แทน`,
        existingDeployment: {
          id: existingDeployment.id,
          projectName: existingDeployment.projectName,
          status: existingDeployment.status,
          port: existingDeployment.port,
          url: existingDeployment.deployUrl
        }
      }, { status: 409 }) // 409 Conflict
    }

    // ให้ admin เลือก Docker host หรือใช้ default
    let dockerHost = null
    if (user.role === 'admin' && hostId) {
      // Admin สามารถเลือก host ได้
      dockerHost = await prisma.dockerHost.findFirst({
        where: { 
          id: hostId,
          isActive: true 
        }
      })
      if (!dockerHost) {
        return NextResponse.json({
          error: 'Selected Docker host not found or inactive'
        }, { status: 400 })
      }
    } else {
      // User ธรรมดา ใช้ host แรกที่ active หรือ fallback ไป env
      const availableHost = await prisma.dockerHost.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' } // ใช้ host แรกสุด
      })
      if (availableHost) {
        dockerHost = availableHost
      }
      // ถ้าไม่มี Docker host ใน database ใช้ env variables
    }

    // หา port ว่าง
    const availablePort = await findAvailablePort(8000, dockerHost)

    // สร้าง deployment record ใหม่
    const deployment = await prisma.deployment.create({
      data: {
        projectName,
        gitUrl,
        status: 'building',
        port: availablePort,
        userId: user.id,
        hostId: dockerHost?.id || null  // เพิ่ม hostId
      }
    })

    console.log(`🚀 Starting deployment for user ${user.username}: ${projectName} on port ${availablePort}`)

    // ส่งการตอบกลับทันที และเริ่มทำ deployment ในเบื้องหลัง
    const responsePromise = new Promise<NextResponse>(async (resolve) => {
      // ดึง commit hash ล่าสุด
      const latestCommitHash = await getLatestCommitHash(gitUrl)
      
      resolve(NextResponse.json({
        success: true,
        message: 'Deployment started successfully',
        deployment: {
          id: deployment.id,
          projectName: deployment.projectName,
          status: 'building',
          port: deployment.port,
          url: `http://${dockerHost?.host || process.env.DOCKER_HOST}:${deployment.port}`
        }
      }))
      
      // เริ่ม deployment process ในเบื้องหลัง (ไม่รอ)
      deployInBackground(deployment.id, tempDir, remoteWorkDir, latestCommitHash, dockerHost)
    })

    return responsePromise

  } catch (error: any) {
    console.error('❌ Deployment initialization error:', error)
    
    return NextResponse.json({
      error: 'Failed to start deployment',
      details: error.message
    }, { status: 500 })
  }
}

// ฟังก์ชันสำหรับทำ deployment ในเบื้องหลัง
async function deployInBackground(
  deploymentId: string, 
  tempDir: string, 
  remoteWorkDir: string, 
  latestCommitHash: string, 
  dockerHost: any
) {
  try {
    console.log(`📦 Background deployment started for ${deploymentId}`)
    
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId }
    })
    
    if (!deployment) {
      throw new Error('Deployment not found')
    }

    const user = await prisma.user.findUnique({
      where: { id: deployment.userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const projectName = deployment.projectName
    const gitUrl = deployment.gitUrl

    // อัพเดทสถานะ: กำลังเตรียมการ
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { 
        status: 'building',
        errorMessage: 'กำลังเตรียมการ deployment...'
      }
    })

    // ลบโฟลเดอร์เก่าถ้ามี
    try {
      await execAsync(`rmdir /s /q "${tempDir}"`)
      await executeRemoteCommand(`rm -rf "${remoteWorkDir}"`, dockerHost)
    } catch (e) {
      // ไม่ต้องสนใจ error ถ้าไม่มีโฟลเดอร์
    }

    // อัพเดทสถานะ: กำลัง clone repository
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลังดาวน์โหลดโค้ดจาก Git repository...' }
    })

    // 1. Clone repository
    console.log(`📥 Cloning repository: ${gitUrl}`)
    await execAsync(`git clone "${gitUrl}" "${tempDir}"`)
    
    console.log(`📋 Latest commit: ${latestCommitHash}`)

    // อัพเดทสถานะ: กำลังอ่าน config
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลังอ่านการตั้งค่าโปรเจค...' }
    })

    // 2. อ่านไฟล์ deploy.yml (ถ้ามี)
    let deployConfig
    const deployConfigPath = path.join(tempDir, 'deploy.yml')
    
    try {
      const deployConfigContent = await fs.readFile(deployConfigPath, 'utf-8')
      deployConfig = yaml.load(deployConfigContent) as any
      console.log('📋 Deploy config loaded:', deployConfig)
    } catch (error) {
      // ถ้าไม่มี deploy.yml ใช้ค่า default สำหรับ web project
      console.log('📋 No deploy.yml found, using default web config')
      deployConfig = {
        app: {
          name: projectName,
          node_version: "18",
          build_command: "npm install && npm run build",
          start_command: "npm start",
          port: 3000
        }
      }
    }

    // ตรวจสอบว่าเป็น web project และ detect port
    const packageJsonPath = path.join(tempDir, 'package.json')
    let detectedPort = 3000
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
      if (!packageJson.scripts?.start && !packageJson.scripts?.dev) {
        throw new Error('This is not a valid web project (no start/dev script found in package.json)')
      }
      
      // Detect project port
      detectedPort = await detectProjectPort(tempDir)
      console.log(`📍 Detected project port: ${detectedPort}`)
      
      // Update deploy config with detected port
      deployConfig.app.port = detectedPort
      
    } catch (error) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: 'failed', 
          errorMessage: 'Invalid web project: ' + (error as Error).message 
        }
      })
      console.error(`❌ Invalid web project: ${(error as Error).message}`)
      return
    }

    // อัพเดทสถานะ: กำลังสร้าง Dockerfile
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลังสร้าง Docker configuration...' }
    })

    // 3. สร้าง Dockerfile อัตโนมัติที่รองรับพอร์ตที่ detect ได้
    const dockerfile = generateSmartDockerfile(deployConfig, detectedPort)
    const dockerfilePath = path.join(tempDir, 'Dockerfile')
    await fs.writeFile(dockerfilePath, dockerfile)
    console.log(`🐳 Dockerfile generated for web project (port: ${detectedPort})`)

    // อัพเดทสถานะ: กำลัง copy files
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลังส่งไฟล์ไปยัง server...' }
    })

    // 4. Copy โปรเจกต์ไปยัง remote server
    console.log(`📤 Copying project to remote server...`)
    await executeRemoteCommand(`mkdir -p "${remoteWorkDir}"`, dockerHost)
    await copyToRemoteServer(tempDir, remoteWorkDir, dockerHost)

    // อัพเดทสถานะ: กำลัง build image
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลัง build Docker image... (อาจใช้เวลา 2-5 นาที)' }
    })

    // 5. Build Docker Image บน remote server
    const timestamp = Date.now()
    const imageName = `${user.username}-${projectName}:${timestamp}`.toLowerCase()
    const containerName = `${user.username}-${projectName}-${timestamp}`.toLowerCase()
    
    console.log(`🔨 Building Docker image: ${imageName}`)
    await executeRemoteCommand(`cd "${remoteWorkDir}" && DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t "${imageName}" .`, dockerHost)

    // อัพเดทสถานะ: กำลังหยุด container เก่า
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลังหยุด container เก่า...' }
    })

    // 6. หยุด container เก่า (ถ้ามี)
    try {
      const oldContainerPrefix = `${user.username}-${projectName}`
      const containerList = await executeRemoteCommand(`docker ps -a --filter "name=${oldContainerPrefix}" --format "{{.Names}}"`, dockerHost)
      if (containerList.trim()) {
        const containers = containerList.split('\n').filter(name => name.trim())
        for (const oldContainer of containers) {
          if (oldContainer.trim() !== containerName) {
            await executeRemoteCommand(`docker stop "${oldContainer.trim()}" || true`, dockerHost)
            await executeRemoteCommand(`docker rm "${oldContainer.trim()}" || true`, dockerHost)
            console.log(`🛑 Stopped old container: ${oldContainer.trim()}`)
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Could not stop old containers:', e)
    }

    // อัพเดทสถานะ: กำลังเริ่ม container ใหม่
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'กำลังเริ่มต้น container...' }
    })

    // 7. รัน container ใหม่
    const appPort = detectedPort
    await executeRemoteCommand(`docker run -d --restart=unless-stopped --name "${containerName}" -p ${deployment.port}:${appPort} "${imageName}"`, dockerHost)
    console.log(`🚀 Container started: ${containerName} (internal port: ${appPort}, external port: ${deployment.port}) with auto-restart`)
    
    const hostAddress = dockerHost?.host || process.env.DOCKER_HOST
    const deployUrl = `http://${hostAddress}:${deployment.port}`

    // อัพเดทสถานะ: เสร็จสิ้นการ deployment
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { errorMessage: 'เสร็จสิ้นการ deployment! เว็บไซต์พร้อมใช้งาน' }
    })

    // รอสักครู่เพื่อให้ user เห็นข้อความสุดท้าย
    await new Promise(resolve => setTimeout(resolve, 2000))

    // อัพเดท deployment status เป็น running
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'running',
        containerName,
        imageName,
        lastCommitHash: latestCommitHash,
        deployUrl,
        internalPort: detectedPort, // เก็บ internal port ที่ detect ได้
        errorMessage: null  // เคลียร์ข้อความสถานะ
      }
    })

    console.log(`✅ Deployment completed! ${deployUrl}`)
    
  } catch (error: any) {
    console.error('❌ Background deployment failed:', error)
    
    // อัพเดต status เป็น failed
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'failed',
        errorMessage: `Deployment failed: ${error.message}`
      }
    })
  }
}

// GET endpoint สำหรับดู deployments ของ user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // หา user ในฐานข้อมูล
    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
      include: {
        deployments: {
          include: { dockerHost: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const checkStatus = url.searchParams.get('checkStatus') === 'true'

    let deploymentsWithStatus = user.deployments

    // ตรวจสอบสถานะ container จริงถ้าถูกร้องขอ
    if (checkStatus) {
      deploymentsWithStatus = await Promise.all(
        user.deployments.map(async (deployment) => {
          try {
            // ข้าม deployment ที่ยังอยู่ใน building status หรือ failed แล้ว
            if (deployment.status === 'building' || deployment.status === 'failed') {
              return deployment
            }

            // ตรวจสอบว่า container ยังรันอยู่หรือไม่
            let containerName = deployment.containerName
            
            // ถ้าไม่มี containerName ให้สร้างจาก pattern
            if (!containerName) {
              containerName = `${user.username}-${deployment.projectName}`.toLowerCase()
            }
            
            // ใช้ pattern matching สำหรับชื่อ container ที่มี timestamp
            const containerPattern = `${user.username}-${deployment.projectName}`.toLowerCase()
            
            // ใช้คำสั่งเดียวแทนที่จะเป็น 2 คำสั่งแยก - ค้นหาทุก container ที่ขึ้นต้นด้วย pattern
            const result = await executeRemoteCommand(
              `docker ps -a --filter "name=${containerPattern}" --format "{{.Names}},{{.Status}},{{.State}}" | head -1`, 
              deployment.dockerHost
            )
            
            let actualStatus = 'not_found'
            if (result.trim()) {
              const [containerNameFound, status, state] = result.split(',')
              
              // อัพเดต containerName ถ้าพบ container ใหม่
              if (containerNameFound && containerNameFound !== deployment.containerName) {
                await prisma.deployment.update({
                  where: { id: deployment.id },
                  data: { containerName: containerNameFound }
                })
              }
              
              if (status && status.includes('Up ')) {
                actualStatus = 'running'
              } else if (status && status.includes('Exited (0)')) {
                actualStatus = 'stopped'
              } else if (status && status.includes('Exited')) {
                actualStatus = 'error'
              } else if (state === 'dead' || state === 'paused') {
                actualStatus = 'error'
              } else if (state === 'created' || state === 'restarting') {
                actualStatus = 'building'
              } else {
                actualStatus = 'error'
              }
            }

            // อัพเดตสถานะถ้าไม่ตรงกับฐานข้อมูลและสำคัญ
            if (deployment.status !== actualStatus && 
                !(deployment.status === 'running' && actualStatus === 'running')) {
              await prisma.deployment.update({
                where: { id: deployment.id },
                data: { status: actualStatus }
              })
              return { ...deployment, status: actualStatus }
            }

            return deployment
          } catch (error) {
            console.error(`Error checking container ${deployment.containerName}:`, error)
            // ถ้าเช็คไม่ได้ให้ใช้สถานะจากฐานข้อมูล
            return deployment
          }
        })
      )
    }

    return NextResponse.json({
      deployments: deploymentsWithStatus,
      user: {
        username: user.username,
        totalDeployments: user.deployments.length
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get deployments',
      details: error.message
    }, { status: 500 })
  }
}