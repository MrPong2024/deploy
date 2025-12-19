"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Deployment {
  id: string;
  projectName: string;
  gitUrl: string;
  port: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminDeploymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ตรวจสอบสิทธิ์ Admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchDeployments();
  }, [session, status, router]);

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/admin/deployments');
      if (response.ok) {
        const data = await response.json();
        setDeployments(data.deployments);
      }
    } catch (error) {
      console.error('Error fetching deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { color: 'bg-green-100 text-green-800', text: 'Running' },
      stopped: { color: 'bg-red-100 text-red-800', text: 'Stopped' },
      error: { color: 'bg-red-100 text-red-800', text: 'Error' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = 
      deployment.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.gitUrl.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ดู Deployments ทั้งหมด</h1>
          <p className="text-gray-600">รายการ Deployments ของผู้ใช้ทุกคนในระบบ</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค้นหา
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาโปรเจค, ผู้ใช้, หรือ Git URL..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                กรองตามสถานะ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทั้งหมด</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            แสดง {filteredDeployments.length} จาก {deployments.length} deployments
          </div>
        </div>

        {/* Deployments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">โปรเจค</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ผู้ใช้</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Git URL</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Port</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">วันที่สร้าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDeployments.map((deployment) => (
                  <tr key={deployment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {deployment.projectName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {deployment.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {deployment.user.firstName} {deployment.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{deployment.user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {deployment.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        <a 
                          href={deployment.gitUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {deployment.gitUrl}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-mono text-gray-900">
                        {deployment.port}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(deployment.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(deployment.createdAt).toLocaleDateString('th-TH')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(deployment.createdAt).toLocaleTimeString('th-TH')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDeployments.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293L12 15.586l-2.707-2.707a1 1 0 00-.707-.293H6" />
              </svg>
              <p className="text-gray-600">ไม่พบ Deployments ที่ตรงกับเงื่อนไข</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {['running', 'stopped', 'error', 'pending'].map(status => {
            const count = deployments.filter(d => d.status === status).length;
            const total = deployments.length;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
            
            return (
              <div key={status} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 capitalize">{status}</p>
                    <p className="text-2xl font-semibold">{count}</p>
                    <p className="text-sm text-gray-500">{percentage}%</p>
                  </div>
                  {getStatusBadge(status)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}