const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Create sample users
  const users = [
    {
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin'
    },
    {
      username: 'user1',
      password: await bcrypt.hash('user123', 10),
      role: 'user'
    },
    {
      username: 'user2',
      password: await bcrypt.hash('user456', 10),
      role: 'user'
    }
  ]

  console.log('🌱 Seeding database...')

  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user
    })
    console.log(`Created user: ${createdUser.username} (${createdUser.role})`)
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })