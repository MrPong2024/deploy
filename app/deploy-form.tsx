// app/deploy-form.tsx
'use client'
import { useState, useEffect } from "react"
import { useSession } from 'next-auth/react'
import DeployModal from './components/DeployModal'
import { AlertModal } from './components/Modal'

interface DockerHost {
  id: string
  name: string
  host: string
  user: string
  isActive: boolean
}

interface DeployFormProps {
  onDeploySuccess?: () => void
}

export default function DeployForm({ onDeploySuccess }: DeployFormProps) {
  const { data: session } = useSession()
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dockerHosts, setDockerHosts] = useState<DockerHost[]>([])
  const [selectedHostId, setSelectedHostId] = useState<string>('')
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'info'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    })
  }

  // โหลด Docker hosts สำหรับ admin - ยกเลิก user ธรรมดาไม่ต้องเลือก
  useEffect(() => {
    // ยกเลิกการโหลด hosts สำหรับ user ธรรมดา
    // if (session?.user && isAdmin()) {
    //   loadDockerHosts()
    // }
  }, [session])

  const isAdmin = () => {
    // ตรวจสอบว่าเป็น admin (ต้องเพิ่ม role ใน session หรือเรียก API)
    return session?.user?.name === 'admin' // หรือใช้วิธีอื่นในการตรวจสอบ
  }

  const loadDockerHosts = async () => {
    try {
      const response = await fetch('/api/admin/docker-hosts')
      const result = await response.json()
      
      if (response.ok) {
        setDockerHosts(result.dockerHosts.filter((host: DockerHost) => host.isActive))
        // ตั้งค่า default host
        if (result.dockerHosts.length > 0) {
          setSelectedHostId(result.dockerHosts[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load Docker hosts:', error)
    }
  }

  const handleDeploy = async (gitUrl: string, projectName: string) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          gitUrl,
          projectName
          // ไม่ส่ง hostId - ให้ admin จัดการ
        })
      })

      const result = await response.json()

      if (response.ok) {
        showAlert('success', 'Deploy เริ่มต้นแล้ว!', 
          `กำลังเริ่มต้นการ Deploy โปรเจกต์\n\n` +
          `โปรเจกต์: ${result.deployment.projectName}\n` +
          `Port: ${result.deployment.port}\n\n` +
          `คุณสามารถติดตามสถานะได้ในหน้ารายการ Container`)
        setShowDeployModal(false)
        
        // Refresh deployments list
        if (onDeploySuccess) {
          onDeploySuccess()
        }
      } else {
        showAlert('error', 'Deploy ล้มเหลว', 
          `เกิดข้อผิดพลาด: ${result.error}\n\n` +
          `รายละเอียด: ${result.details || 'ไม่ทราบสาเหตุ'}`)
      }
    } catch (error) {
      console.error('Deploy error:', error)
      showAlert('error', 'ข้อผิดพลาด', 
        'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์\n\nกรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto Deploy
          </h1>
          <p className="text-gray-600 mt-2">Deploy เว็บไซต์จาก Git Repository อัตโนมัติ</p>
        </div>
        
        {/* Add Project Button */}
        <button
          onClick={() => setShowDeployModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="font-semibold">เพิ่มโปรเจกต์</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">ใช้งานง่าย</h3>
              <p className="text-gray-600 text-sm">แค่ใส่ Git URL</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Auto Update</h3>
              <p className="text-gray-600 text-sm">อัพเดทจาก Git อัตโนมัติ</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Deploy ทันที</h3>
              <p className="text-gray-600 text-sm">เข้าใช้งานได้ทันที</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Modal */}
      <DeployModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        onDeploy={handleDeploy}
        loading={loading}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  )
}