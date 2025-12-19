// app/components/DeployModal.tsx
'use client'
import { useState } from 'react'
import Modal from './Modal'

interface DockerHost {
  id: string
  name: string
  host: string
  user: string
  isActive: boolean
}

interface DeployModalProps {
  isOpen: boolean
  onClose: () => void
  onDeploy: (gitUrl: string, projectName: string) => void
  loading: boolean
  dockerHosts?: DockerHost[]
  selectedHostId?: string
  onHostChange?: (hostId: string) => void
  isAdmin?: boolean
}

export default function DeployModal({ 
  isOpen, 
  onClose, 
  onDeploy, 
  loading, 
  dockerHosts = [],
  selectedHostId = '',
  onHostChange,
  isAdmin = false
}: DeployModalProps) {
  const [gitUrl, setGitUrl] = useState("")
  const [projectName, setProjectName] = useState("")

  const handleSubmit = () => {
    if (!gitUrl.trim()) {
      alert("กรุณากรอก Git URL")
      return
    }
    
    // ถ้าไม่ใส่ชื่อโปรเจกต์ ให้ดึงจาก Git URL
    let finalProjectName = projectName.trim()
    if (!finalProjectName) {
      finalProjectName = gitUrl.split('/').pop()?.replace('.git', '') || 'unknown-project'
    }

    onDeploy(gitUrl.trim(), finalProjectName)
    
    // Clear form
    setGitUrl("")
    setProjectName("")
  }

  const handleClose = () => {
    setGitUrl("")
    setProjectName("")
    onClose()
  }

  // Auto fill project name from Git URL
  const handleGitUrlChange = (url: string) => {
    setGitUrl(url)
    
    // Auto extract project name if not manually set
    if (!projectName.trim()) {
      const extractedName = url.split('/').pop()?.replace('.git', '') || ''
      setProjectName(extractedName)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Deploy โปรเจกต์ใหม่">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Git Repository URL *
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://github.com/username/repo.git"
            value={gitUrl}
            onChange={(e) => handleGitUrlChange(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ชื่อโปรเจกต์
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ชื่อโปรเจกต์ (จะดึงจาก Git URL ถ้าไม่ใส่)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            หากไม่ระบุ จะใช้ชื่อจาก Git Repository
          </p>
        </div>

        {/* Docker Host Selection สำหรับ Admin เท่านั้น - ซ่อนจาก user ธรรมดา */}
        {false && isAdmin && dockerHosts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🖥️ เลือก Docker Host
            </label>
            <select
              value={selectedHostId}
              onChange={(e) => onHostChange?.(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {dockerHosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.name} ({host.user}@{host.host})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              เลือกเซิร์ฟเวอร์ที่จะ deploy container
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            วิธีใช้งาน
          </h4>
          <ul className="text-sm text-blue-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>ใส่ URL ของ Git Repository (GitHub, GitLab, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>ระบบจะ Clone โปรเจกต์และ Deploy อัตโนมัติ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Port จะถูกกำหนดอัตโนมัติ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>รองรับ Node.js และ Static websites</span>
            </li>
          </ul>
        </div>

        <div className="flex space-x-3 justify-end pt-6">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !gitUrl.trim()}
            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>กำลัง Deploy...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>เริ่ม Deploy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}