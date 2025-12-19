"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function ClientHomePage() {
  const { data: session } = useSession();
  const [showProjectIntro, setShowProjectIntro] = useState(true);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Project Introduction Section */}
        {showProjectIntro && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-lg shadow-lg mb-8 border border-blue-200">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h1 className="text-3xl font-bold text-gray-800">ระบบ Auto Deploy ชั่วคราว</h1>
              </div>
              <button 
                onClick={() => setShowProjectIntro(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">🚀 เกี่ยวกับโปรเจคนี้</h2>
                <p className="text-gray-700 leading-relaxed">
                  ระบบ Auto Deploy นี้เป็นโปรเจคต้นแบบสำหรับการ Deploy เว็บไซต์อัตโนมัติ 
                  พัฒนาขึ้นเพื่อทดสอบและเรียนรู้เทคโนโลยี Docker, Next.js และการจัดการฐานข้อมูล
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                  <h3 className="text-lg font-semibold text-yellow-600 mb-3">⚠️ สถานะปัจจุบัน</h3>
                  <ul className="text-gray-700 space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                      โปรเจคในสถานะ Prototype
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                      การพัฒนายังไม่สมบูรณ์ 100%
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                      ต้องการการปรับปรุงและพัฒนาต่อ
                    </li>
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                    </svg>
                    <h3 className="text-lg font-semibold text-green-600">ฟีเจอร์หลัก</h3>
                  </div>
                  <ul className="text-gray-700 space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      Deploy จาก Git URL อัตโนมัติ
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      จัดการฐานข้อมูล MySQL/PostgreSQL
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      ระบบ Authentication และ Admin
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                  <h3 className="text-lg font-semibold text-purple-600">ต้องการผู้พัฒนาต่อ</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  โปรเจคนี้เป็นการทำงานเบื้องต้น ยังต้องการการพัฒนาและปรับปรุงในหลายด้าน หากท่านสนใจพัฒนาต่อ สามารถมีส่วนร่วมได้ในด้าน:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-gray-700 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                      </svg>
                      <h4 className="font-semibold text-gray-800">การพัฒนาเทคนิค</h4>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        ปรับปรุง Performance และ Security
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        เพิ่ม Load Balancing
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        พัฒนา Monitoring System
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-gray-700 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd"/>
                      </svg>
                      <h4 className="font-semibold text-gray-800">การพัฒนา UI/UX</h4>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        ปรับปรุงการออกแบบ Interface
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        เพิ่ม Responsive Design
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        พัฒนา Dashboard Analytics
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-blue-800 text-sm">
                    <strong>หมายเหตุ:</strong> ระบบนี้พัฒนาด้วยจุดประสงค์เพื่อการเรียนรู้และทดสอบ 
                    ยังไม่เหมาะสำหรับใช้งาน Production โดยตรง แนะนำให้ศึกษาและพัฒนาต่อก่อนใช้งานจริง
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Start Section */}
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
            สวัสดี {session?.user?.name || 'ผู้ใช้งาน'}! เริ่มต้นใช้งาน
          </h2>
          <p className="text-gray-600 mb-6">
            เลือกฟีเจอร์ที่ต้องการใช้งาน หรือเรียนรู้เพิ่มเติมเกี่ยวกับระบบนี้
          </p>
          
          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link 
              href="/auto-deploy"
              className="group p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 hover:border-green-400 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center mb-3">
                <svg className="w-8 h-8 text-green-600 mr-3 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12"/>
                  </svg>
                  <h3 className="text-xl font-semibold text-green-700">Auto Deploy</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-3">
                Deploy เว็บไซต์จาก Git Repository อัตโนมัติ
              </p>
              <div className="text-sm text-green-600 font-medium group-hover:text-green-700">
                เริ่มต้น Deploy เลย →
              </div>
            </Link>

            <Link 
              href="/database"
              className="group p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:border-blue-400 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center mb-3">
                <svg className="w-8 h-8 text-blue-600 mr-3 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
                </svg>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-700 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="text-xl font-semibold text-blue-700">จัดการฐานข้อมูล</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-3">
                สร้างและจัดการฐานข้อมูล MySQL และ PostgreSQL
              </p>
              <div className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                ไปที่ฐานข้อมูล →
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}