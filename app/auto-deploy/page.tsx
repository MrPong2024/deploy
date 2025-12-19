// app/auto-deploy/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import AutoDeployPage from "./AutoDeployPage"

export default async function AutoDeployServerPage() {
  // ดึงข้อมูลคน Login (ทำงานฝั่ง Server)
  const session = await getServerSession(authOptions)

  // ถ้ายังไม่ล็อกอิน ให้ดีดไปหน้า login
  if (!session) {
    redirect("/login")
  }

  return (
    <AutoDeployPage />
  )
}