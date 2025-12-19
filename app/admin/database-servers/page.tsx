// app/admin/database-servers/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DatabaseServer {
  id: string
  name: string
  host: string
  port: number
  dbType: string
  isActive: boolean
  description?: string
  createdAt: string
  _count: {
    databaseInstances: number
  }
}

export default function DatabaseServersPage() {
  const [servers, setServers] = useState<DatabaseServer[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingServer, setEditingServer] = useState<DatabaseServer | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingServer, setDeletingServer] = useState<DatabaseServer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 3306,
    dbType: 'mysql',
    rootUser: '',
    rootPass: '',
    description: ''
  })
  const router = useRouter()

  const loadServers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/database-servers')
      if (response.ok) {
        const data = await response.json()
        setServers(data.databaseServers)
      } else if (response.status === 401) {
        router.push('/auth/signin')
      } else if (response.status === 403) {
        alert('Access denied. Admin only.')
        router.push('/')
      }
    } catch (error) {
      console.error('Error loading servers:', error)
      alert('Failed to load database servers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingServer 
        ? `/api/admin/database-servers/${editingServer.id}`
        : '/api/admin/database-servers'
      
      const response = await fetch(url, {
        method: editingServer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Database server ${editingServer ? 'updated' : 'added'} successfully!`)
        setShowAddModal(false)
        setShowEditModal(false)
        setEditingServer(null)
        resetForm()
        loadServers()
      } else {
        alert(`Error: ${data.error}\n${data.details || ''}`)
      }
    } catch (error) {
      console.error('Server operation error:', error)
      alert(`Failed to ${editingServer ? 'update' : 'add'} database server`)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (server: DatabaseServer) => {
    setEditingServer(server)
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port,
      dbType: server.dbType,
      rootUser: '', // Don't pre-fill for security
      rootPass: '', // Don't pre-fill for security
      description: server.description || ''
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (server: DatabaseServer) => {
    setDeletingServer(server)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deletingServer) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/database-servers/${deletingServer.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        alert('Database server deleted successfully!')
        setShowDeleteModal(false)
        setDeletingServer(null)
        loadServers()
      } else {
        alert(`Error: ${data.error}\n${data.details || ''}`)
      }
    } catch (error) {
      console.error('Delete server error:', error)
      alert('Failed to delete database server')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 3306,
      dbType: 'mysql',
      rootUser: '',
      rootPass: '',
      description: ''
    })
  }

  useEffect(() => {
    loadServers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Database Servers</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Database Server</span>
            </button>
          </div>

          <div className="p-6">
            {loading && !showAddModal ? (
              <div className="text-center py-8">Loading...</div>
            ) : servers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No database servers found. Add one to get started.
              </div>
            ) : (
              <div className="grid gap-6">
                {servers.map((server) => (
                  <div key={server.id} className="border rounded-lg p-6 hover:border-gray-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold">{server.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div>Host: {server.host}:{server.port}</div>
                          <div>Type: {server.dbType.toUpperCase()}</div>
                          <div>Active Databases: {server._count.databaseInstances}</div>
                          {server.description && <div>Description: {server.description}</div>}
                          <div>Created: {new Date(server.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          server.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {server.isActive ? 'Active' : 'Inactive'}
                        </span>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(server)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไข server"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(server)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ server"
                            disabled={server._count.databaseInstances > 0}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        {server._count.databaseInstances > 0 && (
                          <p className="text-xs text-gray-500 text-right">
                            ไม่สามารถลบได้<br/>มีฐานข้อมูลที่ใช้งานอยู่
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Database Server</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Main Database Server"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({...formData, host: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                    placeholder={formData.dbType === 'postgresql' ? '5432' : '3306'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Type
                </label>
                <select
                  value={formData.dbType}
                  onChange={(e) => {
                    const newDbType = e.target.value
                    setFormData({
                      ...formData, 
                      dbType: newDbType,
                      port: newDbType === 'postgresql' ? 5432 : 3306
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rootUser}
                    onChange={(e) => setFormData({...formData, rootUser: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.rootPass}
                    onChange={(e) => setFormData({...formData, rootPass: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Add Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">แก้ไข Database Server</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Main Database Server"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({...formData, host: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                    placeholder={formData.dbType === 'postgresql' ? '5432' : '3306'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Type
                </label>
                <select
                  value={formData.dbType}
                  onChange={(e) => {
                    const newDbType = e.target.value
                    setFormData({
                      ...formData, 
                      dbType: newDbType,
                      port: newDbType === 'postgresql' ? 5432 : 3306
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.232 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">อัปเดต Credentials</h3>
                    <p className="text-xs text-yellow-700 mt-1">
                      ใส่ username และ password ใหม่หากต้องการเปลี่ยนแปลง หรือเว้นว่างไว้หากไม่ต้องการเปลี่ยน
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Username
                  </label>
                  <input
                    type="text"
                    value={formData.rootUser}
                    onChange={(e) => setFormData({...formData, rootUser: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ไม่เปลี่ยนแปลงหากเว้นว่าง"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Password
                  </label>
                  <input
                    type="password"
                    value={formData.rootPass}
                    onChange={(e) => setFormData({...formData, rootPass: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ไม่เปลี่ยนแปลงหากเว้นว่าง"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingServer(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'กำลังอัปเดต...' : 'อัปเดต Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-red-600">ยืนยันการลบ Database Server</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <svg className="w-12 h-12 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.232 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    คุณแน่ใจหรือไม่?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    การลบ Database Server <strong>"{deletingServer.name}"</strong> จะไม่สามารถยกเลิกได้
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      <strong>คำเตือน:</strong> การลบ server นี้จะส่งผลต่อระบบอื่นที่เชื่อมต่อกับ server นี้
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingServer(null)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'กำลังลบ...' : 'ลบ Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}