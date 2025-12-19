// app/admin/deploy-settings/page.tsx
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
}

interface DeploymentWithHost {
  id: string
  projectName: string
  status: string
  port?: number
  deployUrl?: string
  dockerHost?: {
    id: string
    name: string
    host: string
  }
  createdAt: string
}

export default function DeploySettingsPage() {
  const { data: session, status } = useSession()
  const [dockerHosts, setDockerHosts] = useState<DockerHost[]>([])
  const [deployments, setDeployments] = useState<DeploymentWithHost[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
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
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load Docker hosts
      const hostsResponse = await fetch('/api/admin/docker-hosts')
      const hostsResult = await hostsResponse.json()
      
      if (hostsResponse.ok) {
        setDockerHosts(hostsResult.dockerHosts)
      } else {
        showAlert('error', hostsResult.error || 'Failed to load Docker hosts')
      }

      // Load all deployments with host info
      const deploymentsResponse = await fetch('/api/admin/deployments')
      const deploymentsResult = await deploymentsResponse.json()
      
      if (deploymentsResponse.ok) {
        setDeployments(deploymentsResult.deployments)
      } else {
        showAlert('error', deploymentsResult.error || 'Failed to load deployments')
      }
    } catch (error) {
      showAlert('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

  const moveDeployment = async (deploymentId: string, newHostId: string) => {
    setUpdating(deploymentId)
    try {
      const response = await fetch(`/api/admin/deployments/${deploymentId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newHostId })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showAlert('success', 'Deployment moved successfully')
        await loadData()
      } else {
        showAlert('error', result.error || 'Failed to move deployment')
      }
    } catch (error) {
      showAlert('error', 'Failed to move deployment')
    } finally {
      setUpdating(null)
    }
  }

  const getHostById = (hostId: string) => {
    return dockerHosts.find(h => h.id === hostId)
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Deployment Management</h1>
          <p className="text-gray-600">จัดการการ deploy และย้าย containers ระหว่าง Docker hosts</p>
          
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

        {/* Docker Hosts Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {dockerHosts.filter(host => host.isActive).map((host) => (
            <div key={host.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <h3 className="font-semibold">{host.name}</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Host: {host.host}</p>
                <p>User: {host.user}</p>
                <p>Deployments: {host.deploymentCount}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Deployments List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Deployments</h2>
            
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No deployments found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Project</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Port</th>
                      <th className="text-left py-2">Current Host</th>
                      <th className="text-left py-2">Move to Host</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deployments.map((deployment) => (
                      <tr key={deployment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{deployment.projectName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            deployment.status === 'running' ? 'bg-green-100 text-green-800' :
                            deployment.status === 'failed' ? 'bg-red-100 text-red-800' :
                            deployment.status === 'building' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {deployment.status}
                          </span>
                        </td>
                        <td className="py-3">{deployment.port || 'N/A'}</td>
                        <td className="py-3">
                          {deployment.dockerHost ? (
                            <span className="text-sm">
                              {deployment.dockerHost.name} ({deployment.dockerHost.host})
                            </span>
                          ) : (
                            <span className="text-gray-500">Default (ENV)</span>
                          )}
                        </td>
                        <td className="py-3">
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                moveDeployment(deployment.id, e.target.value)
                                e.target.value = '' // Reset selection
                              }
                            }}
                            disabled={updating === deployment.id}
                          >
                            <option value="">Select host...</option>
                            {dockerHosts.filter(h => h.isActive && h.id !== deployment.dockerHost?.id).map((host) => (
                              <option key={host.id} value={host.id}>
                                {host.name} ({host.host})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3">
                          {deployment.deployUrl && (
                            <a
                              href={deployment.deployUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Visit →
                            </a>
                          )}
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