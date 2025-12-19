import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Navbar from "./Navbar"
import Footer from "./Footer"

interface LayoutProps {
  children: React.ReactNode
}

export default async function RootLayout({ children }: LayoutProps) {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-gray-50 text-black flex flex-col">
      {session && <Navbar session={session} />}
      
      <main className="flex-1">
        {children}
      </main>

      {session && <Footer />}
    </div>
  )
}