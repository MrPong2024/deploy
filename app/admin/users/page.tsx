"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  _count: {
    deployments: number;
  };
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  // ตรวจสอบสิทธิ์ Admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action }),
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดท');
    } finally {
      setActionLoading(null);
      setConfirmModal({ isOpen: false, title: '', message: '', action: () => {} });
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(userId);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setActionLoading(null);
      setConfirmModal({ isOpen: false, title: '', message: '', action: () => {} });
    }
  };

  const showConfirmModal = (title: string, message: string, action: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      action
    });
  };

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

  // แยกผู้ใช้ที่รอการอนุมัติและที่อนุมัติแล้ว
  const pendingUsers = users.filter(user => !user.isApproved);
  const approvedUsers = users.filter(user => user.isApproved);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">จัดการผู้ใช้</h1>
          <p className="text-gray-600">อนุมัติผู้ใช้ใหม่ และจัดการสิทธิ์ผู้ใช้ในระบบ</p>
          
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

        {/* ผู้ใช้ที่รอการอนุมัติ */}
        {pendingUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              ผู้ใช้ที่รอการอนุมัติ ({pendingUsers.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">อีเมล</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่สมัคร</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-800">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{user.username}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => showConfirmModal(
                              'อนุมัติผู้ใช้',
                              `ต้องการอนุมัติให้ ${user.firstName} ${user.lastName} เข้าใช้งานระบบหรือไม่?`,
                              () => handleAction(user.id, 'approve')
                            )}
                            disabled={actionLoading === user.id}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded-md text-sm transition-colors"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={() => showConfirmModal(
                              'ลบผู้ใช้',
                              `ต้องการลบผู้ใช้ ${user.firstName} ${user.lastName} หรือไม่?`,
                              () => handleDelete(user.id)
                            )}
                            disabled={actionLoading === user.id}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded-md text-sm transition-colors"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ผู้ใช้ที่อนุมัติแล้ว */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            ผู้ใช้ในระบบ ({approvedUsers.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">อีเมล</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">สิทธิ์</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Deployments</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {approvedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-800">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.username}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">
                      {user._count.deployments}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex space-x-2 justify-center">
                        {user.id !== session?.user?.id && (
                          <>
                            <button
                              onClick={() => showConfirmModal(
                                user.role === 'admin' ? 'ยกเลิกสิทธิ์ Admin' : 'ให้สิทธิ์ Admin',
                                `ต้องการ${user.role === 'admin' ? 'ยกเลิกสิทธิ์ Admin' : 'ให้สิทธิ์ Admin'} ของ ${user.firstName} ${user.lastName} หรือไม่?`,
                                () => handleAction(user.id, 'toggle_admin')
                              )}
                              disabled={actionLoading === user.id}
                              className={`${
                                user.role === 'admin' 
                                  ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400' 
                                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400'
                              } text-white px-3 py-1 rounded-md text-sm transition-colors`}
                            >
                              {user.role === 'admin' ? 'ยกเลิก Admin' : 'ให้สิทธิ์ Admin'}
                            </button>
                            <button
                              onClick={() => showConfirmModal(
                                'ลบผู้ใช้',
                                `ต้องการลบผู้ใช้ ${user.firstName} ${user.lastName} หรือไม่?\n(โปรเจคทั้งหมดจะถูกลบด้วย)`,
                                () => handleDelete(user.id)
                              )}
                              disabled={actionLoading === user.id}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded-md text-sm transition-colors"
                            >
                              ลบ
                            </button>
                          </>
                        )}
                        {user.id === session?.user?.id && (
                          <span className="text-gray-400 text-sm italic">คุณเอง</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirm Modal */}
        <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmModal.action}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}