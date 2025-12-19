"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DeployForm from '../deploy-form';
import MyDeployments from '../containers-list';

export default function AutoDeployPage() {
  const { data: session } = useSession();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDeploySuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
    
        {/* Deploy Form Section */}
        <div className="bg-white p-8 rounded-lg shadow-lg mb-8 border border-gray-200">
          <div className="flex items-center mb-6">
            <svg className="w-8 h-8 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-2xl font-bold text-gray-800">Deploy เว็บไซต์ใหม่</h2>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h2a1 1 0 100-2H7z" clipRule="evenodd"/>
              </svg>
              <h3 className="font-semibold text-blue-800 text-lg">วิธีการใช้งาน</h3>
            </div>
            <div className="grid gap-3">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                <span className="text-blue-700 text-sm">วาง URL ของ Git Repository ที่ต้องการ Deploy</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                </svg>
                <span className="text-blue-700 text-sm">ระบบจะหา Port ว่างให้อัตโนมัติ</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-blue-700 text-sm">รอจนกระทั่งระบบ Build และ Deploy เสร็จสิ้น</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-blue-700 text-sm">ตรวจสอบสถานะและเข้าถึงเว็บไซต์ได้จากรายการด้านล่าง</span>
              </div>
            </div>
          </div>

          <DeployForm onDeploySuccess={handleDeploySuccess} />
        </div>

        {/* Deployments List Section */}
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
          <div className="flex items-center mb-6">
            <svg className="w-8 h-8 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45.5a2.5 2.5 0 10-3.9 0 .5.5 0 00-.05.5V14a1 1 0 001 1h3a1 1 0 001-1v-.5a.5.5 0 00-.05-.5z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-2xl font-bold text-gray-800">รายการ Deployments ของคุณ</h2>
          </div>
          
          <MyDeployments refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}