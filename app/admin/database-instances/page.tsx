// app/admin/database-instances/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface DatabaseInstance {
  id: string
  databaseName: string
  dbUser: string
  status: string
  createdAt: string
  user: {
    username: string
    firstName: string
    lastName: string
  }
  server: {
    name: string
    host: string
    port: number
    dbType: string
  }
  connectionString?: string
}

export default function DatabaseInstancesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [instances, setInstances] = useState<DatabaseInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string, user: string} | null>(null)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    fetchInstances()
  }, [session, status, router])

  const fetchInstances = async () => {
    try {
      const response = await fetch('/api/admin/database-instances')
      if (response.ok) {
        const data = await response.json()
        setInstances(data.databaseInstances)
      }
    } catch (error) {
      console.error('Error fetching database instances:', error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotificationTitle(title)
    setNotificationMessage(message)
    setNotificationType(type)
    setShowNotificationModal(true)
  }

  const handleDelete = async (instanceId: string, databaseName: string, username: string) => {
    setDeleteTarget({id: instanceId, name: databaseName, user: username})
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    setDeleteLoading(deleteTarget.id)
    setShowDeleteModal(false)

    try {
      const response = await fetch('/api/admin/database-instances', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ databaseId: deleteTarget.id })
      })

      const data = await response.json()

      if (response.ok) {
        showNotification('สำเร็จ', 'ลบฐานข้อมูลเรียบร้อยแล้ว')
        fetchInstances() // Refresh list
      } else {
        showNotification('เกิดข้อผิดพลาด', data.error || 'ไม่สามารถลบฐานข้อมูลได้', 'error')
      }
    } catch (error) {
      console.error('Error deleting database:', error)
      showNotification('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบฐานข้อมูล', 'error')
    } finally {
      setDeleteLoading(null)
      setDeleteTarget(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Database Instances Management</h1>
          <p className="text-gray-600 mt-2">Manage all database instances in the system</p>
        </div>

        {instances.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">No database instances found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Database
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Server
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instances.map((instance) => (
                  <tr key={instance.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {instance.databaseName}
                        </div>
                        <div className="text-sm text-gray-500">
                          User: {instance.dbUser}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {instance.user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {instance.user.firstName} {instance.user.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {instance.server.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {instance.server.dbType.toUpperCase()} - {instance.server.host}:{instance.server.port}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(instance.status)}`}>
                        {instance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(instance.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(instance.id, instance.databaseName, instance.user.username)}
                        disabled={deleteLoading === instance.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleteLoading === instance.id ? 'กำลังลบ...' : 'ลบ'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => router.push('/admin/database-servers')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Manage Database Servers
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3">
                {notificationType === 'success' ? (
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{notificationTitle}</h3>
                  <div className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                    {notificationMessage}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">ลบฐานข้อมูล</h3>
                  <div className="mt-2 text-sm text-gray-600">
                    คุณแน่ใจหรือไม่ที่ต้องการลบฐานข้อมูล <strong className="text-red-600">"{deleteTarget.name}"</strong> 
                    ของผู้ใช้ <strong className="text-blue-600">{deleteTarget.user}</strong>?
                  </div>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-800">
                      <strong>⚠️ คำเตือนสำหรับ Admin:</strong> การกระทำนี้จะลบฐานข้อมูลและ user account ออกจากเซิร์ฟเวอร์อย่างถาวร ข้อมูลทั้งหมดจะหายไปและไม่สามารถกู้คืนได้
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteTarget(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading === deleteTarget.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleteLoading === deleteTarget.id ? 'กำลังลบ...' : 'ลบฐานข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}