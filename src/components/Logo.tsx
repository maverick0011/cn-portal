import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        
        {/* The Cloud (Core) */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          <defs>
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>
          <path 
            d="M25,65 C10,65 5,50 15,40 C15,25 35,20 45,30 C55,15 80,20 85,40 C95,45 95,65 80,65 L25,65 Z" 
            fill="url(#cloudGradient)"
          />
          
          {/* Infinity Symbol (Bottom) */}
          <path 
            d="M35,58 C35,53 40,50 45,58 C50,66 55,66 60,58 C65,50 70,53 70,58 C70,63 65,66 60,58 C55,50 50,50 45,58 C40,66 35,63 35,58" 
            fill="none" 
            stroke="#60a5fa" 
            strokeWidth="3" 
            strokeLinecap="round"
          />

          {/* Graduation Cap (Top Left) */}
          <g transform="translate(10, 25) scale(0.35)" fill="#1e293b">
             <path d="M0,25 L50,0 L100,25 L50,50 Z" />
             <path d="M20,35 L20,55 C20,55 35,65 50,65 C65,65 80,55 80,55 L80,35" />
             <path d="M85,25 L85,45" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
             <circle cx="85" cy="48" r="4" fill="#f59e0b" />
          </g>

          {/* Gear (Top Right) */}
          <g transform="translate(68, 32) scale(0.18)" fill="#cbd5e1" className="animate-[spin_8s_linear_infinite]">
            <path d="M100,60 L115,50 L110,35 L95,40 C90,30 85,25 75,20 L75,5 L60,0 L50,15 C40,15 30,20 20,25 L10,15 L0,25 L5,40 C0,50 0,60 5,70 L0,85 L10,95 L25,90 C30,95 40,100 50,100 L60,115 L75,110 L75,95 C85,90 90,85 95,75 L110,80 L115,65 L100,60 Z M57,75 A18,18 0 1,1 57,39 A18,18 0 0,1 57,75 Z" />
          </g>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-black tracking-tight leading-none bg-gradient-to-r from-blue-700 via-blue-600 to-green-600 bg-clip-text text-transparent">
          CloudNative
        </span>
        <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-text-muted">
          Master the Future
        </span>
      </div>
    </div>
  );
};
