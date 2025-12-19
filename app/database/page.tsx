// app/database/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DatabaseInstance {
  id: string
  databaseName: string
  dbUser: string
  dbPassword: string
  status: string
  connectionString?: string
  createdAt: string
  server: {
    name: string
    host: string
    port: number
    dbType: string
  }
}

interface AvailableDbType {
  dbType: string
  count: number
  servers: {
    id: string
    name: string
  }[]
}

export default function DatabasePage() {
  const [databases, setDatabases] = useState<DatabaseInstance[]>([])
  const [availableDbTypes, setAvailableDbTypes] = useState<AvailableDbType[]>([])
  const [loading, setLoading] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success')
  const [formData, setFormData] = useState({
    dbType: '',
    databaseName: '',
    dbUser: '',
    dbPassword: ''
  })
  const router = useRouter()

  const loadDatabases = async () => {
    setLoading(true)
    try {
      // Load user's databases
      const myDbResponse = await fetch('/api/database/my-databases')
      if (myDbResponse.ok) {
        const myDbData = await myDbResponse.json()
        setDatabases(myDbData.databaseInstances)
      } else if (myDbResponse.status === 401) {
        router.push('/auth/signin')
        return
      }

      // Load available database types for new requests
      const dbTypesResponse = await fetch('/api/database/request')
      if (dbTypesResponse.ok) {
        const dbTypesData = await dbTypesResponse.json()
        setAvailableDbTypes(dbTypesData.availableDbTypes)
      }
    } catch (error) {
      console.error('Error loading databases:', error)
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

  const handleDelete = async (databaseId: string, databaseName: string) => {
    setDeleteTarget({id: databaseId, name: databaseName})
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    setDeleteLoading(deleteTarget.id)
    setShowDeleteModal(false)
    try {
      const response = await fetch(`/api/database/${deleteTarget.id}/delete`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        showNotification('สำเร็จ', 'ลบฐานข้อมูลเรียบร้อยแล้ว!')
        loadDatabases() // Refresh list
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/database/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        showNotification(
          'สร้างฐานข้อมูลสำเร็จ!',
          `ชื่อฐานข้อมูล: ${data.database.databaseName}\nชื่อผู้ใช้: ${data.database.dbUser}\nรหัสผ่าน: ${data.database.dbPassword}\nConnection String: ${data.database.connectionString}`
        )
        setShowRequestModal(false)
        setFormData({
          dbType: '',
          databaseName: '',
          dbUser: '',
          dbPassword: ''
        })
        loadDatabases()
      } else {
        showNotification('เกิดข้อผิดพลาด', `${data.error}\n${data.details || ''}`, 'error')
      }
    } catch (error) {
      console.error('Request database error:', error)
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถขอฐานข้อมูลได้', 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showNotification('สำเร็จ', 'คัดลอกไปยัง clipboard แล้ว!')
  }

  useEffect(() => {
    loadDatabases()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">My Databases</h1>
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Request Database</span>
            </button>
          </div>

          <div className="p-6">
            {loading && !showRequestModal ? (
              <div className="text-center py-8">Loading...</div>
            ) : databases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No databases found. Request a database to get started.
              </div>
            ) : (
              <div className="grid gap-6">
                {databases.map((db) => (
                  <div key={db.id} className="border rounded-lg p-6 hover:border-gray-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{db.databaseName}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div>Server: {db.server.name} ({db.server.host}:{db.server.port})</div>
                          <div>Type: {db.server.dbType.toUpperCase()}</div>
                          <div>Username: {db.dbUser}</div>
                          <div>Created: {new Date(db.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          db.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : db.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {db.status}
                        </span>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(db.id, db.databaseName)}
                          disabled={deleteLoading === db.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 text-sm"
                          title="Delete database"
                        >
                          {deleteLoading === db.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {db.status === 'active' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Database Password
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="password"
                              value={db.dbPassword}
                              readOnly
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            />
                            <button
                              onClick={() => copyToClipboard(db.dbPassword)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-800"
                              title="Copy password"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {db.connectionString && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Connection String
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={db.connectionString}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                              />
                              <button
                                onClick={() => copyToClipboard(db.connectionString!)}
                                className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                title="Copy connection string"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Request Database</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทฐานข้อมูล *
                </label>
                <select
                  required
                  value={formData.dbType}
                  onChange={(e) => setFormData({...formData, dbType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">เลือกประเภทฐานข้อมูล</option>
                  {availableDbTypes.map((dbTypeInfo) => (
                    <option key={dbTypeInfo.dbType} value={dbTypeInfo.dbType}>
                      {dbTypeInfo.dbType.toUpperCase()} (มี {dbTypeInfo.count} เซิร์ฟเวอร์)
                    </option>
                  ))}
                </select>
                {formData.dbType && (
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>ระบบจะเลือกเซิร์ฟเวอร์ {formData.dbType.toUpperCase()} ที่เหมาะสมให้อัตโนมัติ</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.databaseName}
                  onChange={(e) => setFormData({...formData, databaseName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="my_app_db"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.dbUser}
                  onChange={(e) => setFormData({...formData, dbUser: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="my_app_user"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.dbPassword}
                  onChange={(e) => setFormData({...formData, dbPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p><strong>Note:</strong> You will only have access to this specific database. The username and database name must be unique on the selected server.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Request Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-lg max-w-md w-full">
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
                    คุณแน่ใจหรือไม่ที่ต้องการลบฐานข้อมูล <strong className="text-red-600">"{deleteTarget.name}"</strong>?
                  </div>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-800">
                      <strong>⚠️ คำเตือน:</strong> การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดในฐานข้อมูลนี้จะหายไปอย่างถาวร
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