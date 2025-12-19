// app/admin/docker-hosts/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface DockerHost {
  id: string
  name: string
  host: string
  user: string
  isActive: boolean
  description?: string
  deploymentCount: number
  createdAt: string
  updatedAt: string
}

export default function DockerHostsPage() {
  const { data: session, status } = useSession()
  const [dockerHosts, setDockerHosts] = useState<DockerHost[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingHost, setEditingHost] = useState<DockerHost | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    user: '',
    password: '',
    description: '',
    isActive: true
  })
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    loadDockerHosts()
  }, [])

  const loadDockerHosts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/docker-hosts')
      const result = await response.json()
      
      if (response.ok) {
        setDockerHosts(result.dockerHosts)
      } else {
        showAlert('error', result.error || 'Failed to load Docker hosts')
      }
    } catch (error) {
      showAlert('error', 'Failed to load Docker hosts')
    } finally {
      setLoading(false)
    }
  }

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingHost 
        ? `/api/admin/docker-hosts/${editingHost.id}`
        : '/api/admin/docker-hosts'
      
      const method = editingHost ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          testConnection: true // ทดสอบการเชื่อมต่อเสมอ
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', editingHost ? 'Docker host updated successfully' : 'Docker host created successfully')
        setShowForm(false)
        setEditingHost(null)
        resetForm()
        await loadDockerHosts()
      } else {
        showAlert('error', result.error || result.details || 'Failed to save Docker host')
      }
    } catch (error) {
      showAlert('error', 'Failed to save Docker host')
    }
  }

  const testConnection = async () => {
    if (!formData.host || !formData.user) {
      showAlert('error', 'Please enter host and user before testing')
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch('/api/admin/docker-hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || 'Test',
          host: formData.host,
          user: formData.user,
          password: formData.password,
          testConnection: true,
          dryRun: true // เพิ่ม flag นี้เพื่อไม่บันทึกลง database
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', 'Connection test successful! ✅')
      } else {
        showAlert('error', result.details || 'Connection test failed')
      }
    } catch (error) {
      showAlert('error', 'Connection test failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleEdit = (host: DockerHost) => {
    setEditingHost(host)
    setFormData({
      name: host.name,
      host: host.host,
      user: host.user,
      password: '', // ไม่แสดง password เก่า
      description: host.description || '',
      isActive: host.isActive
    })
    setShowForm(true)
  }

  const handleDelete = async (host: DockerHost) => {
    if (!confirm(`Are you sure you want to delete "${host.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/docker-hosts/${host.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', 'Docker host deleted successfully')
        await loadDockerHosts()
      } else {
        showAlert('error', result.details || 'Failed to delete Docker host')
      }
    } catch (error) {
      showAlert('error', 'Failed to delete Docker host')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      user: '',
      password: '',
      description: '',
      isActive: true
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingHost(null)
    resetForm()
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Docker Host Management</h1>
          <p className="text-gray-600">จัดการเซิร์ฟเวอร์ที่ใช้สำหรับ deploy containers</p>
          
          {/* Admin Navigation */}
          <div className="mt-4 flex gap-4">
            <a
              href="/admin/users"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              👤 User Management
            </a>
            <a
              href="/admin/docker-hosts"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              🖥️ Docker Hosts
            </a>
            <a
              href="/admin/deploy-settings"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              ⚙️ Deploy Settings
            </a>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`mb-6 p-4 rounded-lg ${
            alert.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            alert.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {alert.message}
          </div>
        )}

        {/* Add New Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Docker Host
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingHost ? 'Edit Docker Host' : 'Add New Docker Host'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Server-1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Host (IP/Hostname) *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({...formData, host: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="192.168.1.41"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">SSH Username *</label>
                  <input
                    type="text"
                    value={formData.user}
                    onChange={(e) => setFormData({...formData, user: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="pong"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">SSH Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Leave empty to use SSH key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm">Active</label>
                </div>

                {/* Test Connection Button */}
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                  >
                    {editingHost ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Docker Hosts List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Docker Hosts</h2>
            
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : dockerHosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No Docker hosts configured yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Host</th>
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Deployments</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dockerHosts.map((host) => (
                      <tr key={host.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">{host.name}</div>
                            {host.description && (
                              <div className="text-sm text-gray-500">{host.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-sm">{host.host}</td>
                        <td className="py-3 font-mono text-sm">{host.user}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            host.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {host.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3">{host.deploymentCount}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(host)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(host)}
                              disabled={host.deploymentCount > 0}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}