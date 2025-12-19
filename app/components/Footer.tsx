"use client";

import { useState, useEffect } from 'react';

export default function Footer() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('th-TH', options);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Left side - Company info */}
          <div className="text-center md:text-left">
            <p className="text-gray-300 text-sm">
              © 2025 Auto Deploy System. สร้างด้วย Next.js & Docker
            </p>
          </div>

          {/* Center - Clock */}
          <div className="text-center">
            <div className="flex flex-col items-center space-y-1">
              <div className="text-lg font-mono font-semibold text-blue-300">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-300">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>

          {/* Right side - Links or additional info */}
          <div className="text-center md:text-right">
            <div className="flex items-center space-x-4 text-sm text-gray-300">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                System Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}