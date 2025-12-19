// app/admin/fix-deployments/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Deployment {
  id: string
  projectName: string
  status: string
  containerName?: string
  deployUrl?: string
  port?: number
  errorMessage?: string
}

export default function FixDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)
  const router = useRouter()

  const loadDeployments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/deploy')
      if (response.ok) {
        const data = await response.json()
        setDeployments(data.deployments)
      } else if (response.status === 401) {
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Error loading deployments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fixDeployment = async (deploymentId: string, deployment: Deployment) => {
    setFixing(deploymentId)
    try {
      const response = await fetch('/api/admin/fix-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deploymentId,
          newStatus: 'running',
          containerName: `admin-${deployment.projectName}-${Date.now()}`,
          deployUrl: `http://192.168.1.39:${deployment.port}`
        }),
      })

      if (response.ok) {
        alert('Deployment status updated successfully!')
        loadDeployments()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error fixing deployment:', error)
      alert('Failed to fix deployment')
    } finally {
      setFixing(null)
    }
  }

  useEffect(() => {
    loadDeployments()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Fix Failed Deployments</h1>
            <button
              onClick={loadDeployments}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>

          <div className="p-6">
            {deployments.length === 0 ? (
              <p className="text-gray-500 text-center">No deployments found</p>
            ) : (
              <div className="space-y-4">
                {deployments.filter(d => d.status === 'failed').map((deployment) => (
                  <div key={deployment.id} className="border rounded-lg p-4 bg-red-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{deployment.projectName}</h3>
                        <p className="text-sm text-gray-600">Status: <span className="text-red-600">{deployment.status}</span></p>
                        <p className="text-sm text-gray-600">Port: {deployment.port}</p>
                        {deployment.errorMessage && (
                          <p className="text-sm text-red-600 mt-2 bg-red-100 p-2 rounded">
                            {deployment.errorMessage}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => fixDeployment(deployment.id, deployment)}
                        disabled={fixing === deployment.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {fixing === deployment.id ? "Fixing..." : "Mark as Running"}
                      </button>
                    </div>
                  </div>
                ))}
                
                {deployments.filter(d => d.status === 'failed').length === 0 && (
                  <p className="text-green-600 text-center">No failed deployments found!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}