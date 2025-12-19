// app/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import ClientHomePage from "./ClientHomePage"

export default async function Home() {
  // ดึงข้อมูลคน Login (ทำงานฝั่ง Server)
  const session = await getServerSession(authOptions)

  // ถ้ายังไม่ล็อกอิน ให้ดีดไปหน้า login
  if (!session) {
    redirect("/login")
  }

  return (
    <ClientHomePage />
  )
}
