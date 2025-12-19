// app/containers-list.tsx
'use client'
import { useState, useEffect } from "react"
import { ConfirmModal, AlertModal } from './components/Modal'

interface Deployment {
  id: string
  projectName: string
  gitUrl: string
  status: string
  port?: number
  internalPort?: number
  deployUrl?: string
  errorMessage?: string
  lastCommitHash?: string
  lastUpdated?: string
  createdAt: string
  framework?: string
}

interface MyDeploymentsProps {
  refreshTrigger?: number
}

export default function MyDeployments({ refreshTrigger }: MyDeploymentsProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'start' | 'stop' | 'delete' | null
    deploymentId: string
    projectName: string
  }>({
    isOpen: false,
    type: null,
    deploymentId: '',
    projectName: ''
  })
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

  const loadDeployments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/deploy?checkStatus=true')
      const result = await response.json()
      
      if (response.ok) {
        setDeployments(result.deployments)
      } else {
        console.error('Failed to load deployments:', result.error)
      }
    } catch (error) {
      console.error('Error loading deployments:', error)
    } finally {
      setLoading(false)
    }
  }

  const startDeployment = async (deploymentId: string, projectName: string) => {
    setUpdating(deploymentId)
    try {
      const response = await fetch(`/api/deploy/${deploymentId}/start`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', 'เริ่มต้นสำเร็จ!', `เริ่มต้น ${projectName} สำเร็จแล้ว!`)
        await loadDeployments()
      } else {
        showAlert('error', 'เริ่มต้นล้มเหลว', `เริ่มต้นล้มเหลว: ${result.error}`)
      }
    } catch (error) {
      console.error('Start deployment error:', error)
      showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเริ่มต้น deployment')
    } finally {
      setUpdating(null)
    }
  }

  const stopDeployment = async (deploymentId: string, projectName: string) => {
    setUpdating(deploymentId)
    try {
      const response = await fetch(`/api/deploy/${deploymentId}/stop`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', 'หยุดสำเร็จ!', `หยุด ${projectName} สำเร็จแล้ว!`)
        await loadDeployments()
      } else {
        showAlert('error', 'หยุดล้มเหลว', `หยุดล้มเหลว: ${result.error}`)
      }
    } catch (error) {
      console.error('Stop deployment error:', error)
      showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการหยุด deployment')
    } finally {
      setUpdating(null)
    }
  }

  const deleteDeployment = async (deploymentId: string, projectName: string) => {
    setUpdating(deploymentId)
    try {
      const response = await fetch(`/api/deploy/${deploymentId}/delete`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', 'ลบสำเร็จ!', `ลบ ${projectName} สำเร็จแล้ว!`)
        await loadDeployments()
      } else {
        showAlert('error', 'ลบล้มเหลว', `ลบล้มเหลว: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete deployment error:', error)
      showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ deployment')
    } finally {
      setUpdating(null)
    }
  }

  const updateDeployment = async (deploymentId: string, projectName: string) => {
    setUpdating(deploymentId)
    try {
      const response = await fetch(`/api/deploy/${deploymentId}/update`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        if (result.message === 'No updates available') {
          showAlert('info', 'ไม่มีการอัพเดท', 'โปรเจกต์ใหม่แล้ว! ไม่มีอัพเดทใหม่')
        } else {
          showAlert('success', 'อัพเดทสำเร็จ!', `อัพเดทสำเร็จ! โปรเจกต์ได้รับการอัพเดทแล้ว`)
        }
        await loadDeployments()
      } else {
        showAlert('error', 'อัพเดทล้มเหลว', `อัพเดทล้มเหลว: ${result.error}`)
      }
    } catch (error) {
      console.error('Update deployment error:', error)
      showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอัพเดท')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusIcon = (status: string, deployment?: Deployment) => {
    switch (status) {
      case 'running':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Running</span>
          </div>
        )
      case 'building':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-blue-600">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Building...</span>
            </div>
            {deployment?.errorMessage && (
              <div className="text-xs text-blue-600 ml-6 font-medium">
                {deployment.errorMessage}
              </div>
            )}
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Failed</span>
          </div>
        )
      case 'stopped':
        return (
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Stopped</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Error</span>
          </div>
        )
      case 'not_found':
        return (
          <div className="flex items-center gap-2 text-orange-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Container Not Found</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Unknown</span>
          </div>
        )
    }
  }

  const handleAction = (action: 'start' | 'stop' | 'delete', deploymentId: string, projectName: string) => {
    setConfirmModal({
      isOpen: true,
      type: action,
      deploymentId,
      projectName
    })
  }

  // ฟังก์ชันดึง internal port จาก errorMessage
  const getInternalPort = (deployment: Deployment) => {
    if (deployment.internalPort) return deployment.internalPort
    
    // ถ้าไม่มี internalPort ให้ดูใน errorMessage
    if (deployment.errorMessage && deployment.errorMessage.startsWith('internalPort:')) {
      const port = deployment.errorMessage.split(':')[1]
      return parseInt(port) || null
    }
    
    return null
  }

  const executeAction = () => {
    const { type, deploymentId, projectName } = confirmModal
    
    switch (type) {
      case 'start':
        startDeployment(deploymentId, projectName)
        break
      case 'stop':
        stopDeployment(deploymentId, projectName)
        break
      case 'delete':
        deleteDeployment(deploymentId, projectName)
        break
    }
  }

  useEffect(() => {
    loadDeployments()
  }, [refreshTrigger])

  // แยก useEffect สำหรับ auto-refresh
  useEffect(() => {
    // Auto-refresh ทุก 10 วินาทีถ้ามี deployment ที่อยู่ใน building status
    const interval = setInterval(() => {
      const hasBuilding = deployments.some(d => d.status === 'building')
      if (hasBuilding) {
        console.log('Auto-refreshing deployments (has building status)')
        loadDeployments()
      }
    }, 10000) // เปลี่ยนจาก 5000 เป็น 10000 (10 วินาที)
    
    return () => clearInterval(interval)
  }, [deployments]) // dependency เป็น deployments เท่านั้น

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            My Deployments
          </h2>
          <button
            onClick={loadDeployments}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {deployments.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-lg text-gray-500 mb-2">ไม่มี Deployment ยัง</p>
            <p className="text-sm text-gray-400">เริ่มต้นโดยการเพิ่มโปรเจกต์ใหม่</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{deployment.projectName}</h3>
                      <div className="flex flex-col">
                        {getStatusIcon(deployment.status, deployment)}
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Live status checked
                        </div>
                      </div>
                      {deployment.framework && deployment.framework !== 'Unknown' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {deployment.framework}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <a href={deployment.gitUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                          {deployment.gitUrl}
                        </a>
                      </div>
                      
                      {deployment.lastUpdated && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Updated: {new Date(deployment.lastUpdated).toLocaleString('th-TH')}</span>
                        </div>
                      )}

                      {deployment.port && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                          <span>External Port: {deployment.port}</span>
                          {(() => {
                            const internalPort = getInternalPort(deployment)
                            return internalPort && internalPort !== deployment.port && (
                              <span className="text-gray-500">→ Internal: {internalPort}</span>
                            )
                          })()}
                        </div>
                      )}

                      {deployment.deployUrl && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <a 
                            href={deployment.deployUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {deployment.deployUrl}
                          </a>
                        </div>
                      )}

                      {deployment.errorMessage && !deployment.errorMessage.startsWith('internalPort:') && (
                        <div className="flex items-center gap-2 text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span>{deployment.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Update Button */}
                  <button
                    onClick={() => updateDeployment(deployment.id, deployment.projectName)}
                    disabled={updating === deployment.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {updating === deployment.id ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Update</span>
                      </>
                    )}
                  </button>

                  {/* Start/Stop Button */}
                  {(deployment.status === 'stopped' || deployment.status === 'not_found' || deployment.status === 'error') ? (
                    <button
                      onClick={() => handleAction('start', deployment.id, deployment.projectName)}
                      disabled={updating === deployment.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                      <span>Start</span>
                    </button>
                  ) : deployment.status === 'running' ? (
                    <button
                      onClick={() => handleAction('stop', deployment.id, deployment.projectName)}
                      disabled={updating === deployment.id}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span>Stop</span>
                    </button>
                  ) : null}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleAction('delete', deployment.id, deployment.projectName)}
                    disabled={updating === deployment.id}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeAction}
        title={`ยืนยัน${confirmModal.type === 'start' ? 'เริ่มต้น' : confirmModal.type === 'stop' ? 'หยุด' : 'ลบ'} ${confirmModal.projectName}`}
        message={`คุณต้องการ${confirmModal.type === 'start' ? 'เริ่มต้น' : confirmModal.type === 'stop' ? 'หยุด' : 'ลบ'} deployment "${confirmModal.projectName}" หรือไม่?${confirmModal.type === 'delete' ? '\n\nการลบจะไม่สามารถย้อนกลับได้' : ''}`}
        confirmText={confirmModal.type === 'start' ? 'เริ่มต้น' : confirmModal.type === 'stop' ? 'หยุด' : 'ลบ'}
        confirmColor={confirmModal.type === 'delete' ? 'red' : confirmModal.type === 'stop' ? 'red' : 'green'}
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