import { defineConfig } from '@prisma/client/runtime/library'

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
})