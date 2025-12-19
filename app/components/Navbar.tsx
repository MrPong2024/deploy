"use client";

import { Session } from 'next-auth';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import { useState } from 'react';

interface NavbarProps {
  session: Session;
}

export default function Navbar({ session }: NavbarProps) {
  const isAdmin = (session.user as any)?.role === 'admin';
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <h1 className="ml-3 text-2xl font-bold text-gray-800">Auto Deploy</h1>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            {/* User Navigation */}
            <Link 
              href="/" 
              className="flex items-center text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              หน้าหลัก
            </Link>
            
            <Link 
              href="/auto-deploy" 
              className="flex items-center text-gray-700 hover:text-green-600 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              Auto Deploy
            </Link>

            <Link 
              href="/database" 
              className="flex items-center text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
              </svg>
              ฐานข้อมูล
            </Link>

            {/* Admin Dropdown */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                  className="flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors bg-purple-50 px-4 py-2 rounded-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  จัดการระบบ
                  <svg className={`w-4 h-4 ml-1 transform transition-transform ${showAdminDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {showAdminDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* User Management */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2">จัดการผู้ใช้</h3>
                      <Link 
                        href="/admin/users"
                        onClick={() => setShowAdminDropdown(false)}
                        className="flex items-center text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                        จัดการผู้ใช้งาน
                      </Link>
                    </div>

                    {/* Infrastructure Management */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2">โครงสร้างระบบ</h3>
                      <Link 
                        href="/admin/deployments"
                        onClick={() => setShowAdminDropdown(false)}
                        className="flex items-center text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                        ดูการ Deploy ทั้งหมด
                      </Link>
                      <Link 
                        href="/admin/docker-hosts"
                        onClick={() => setShowAdminDropdown(false)}
                        className="flex items-center text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v-2zm2-3a1 1 0 011-1h1a1 1 0 011 1v1H6V4zm6 0a1 1 0 011-1h1a1 1 0 011 1v1h-3V4zm6 0a1 1 0 011-1h1a1 1 0 011 1v1h-3V4z"/>
                        </svg>
                        จัดการ Docker Hosts
                      </Link>
                    </div>

                    {/* Database Management */}
                    <div className="px-4 py-2">
                      <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2">จัดการฐานข้อมูล</h3>
                      <Link 
                        href="/admin/database-servers"
                        onClick={() => setShowAdminDropdown(false)}
                        className="flex items-center text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                          <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                          <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
                        </svg>
                        เซิร์ฟเวอร์ฐานข้อมูล
                      </Link>
                      <Link 
                        href="/admin/database-instances"
                        onClick={() => setShowAdminDropdown(false)}
                        className="flex items-center text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                        </svg>
                        อินสแตนซ์ฐานข้อมูล
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-600">สวัสดี, </span>
              <span className="font-semibold text-gray-800">{session.user?.name}</span>
              {isAdmin && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Admin
                </span>
              )}
            </div>
            <LogoutButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}