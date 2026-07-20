import React, { useState } from 'react';

export function Tooltip({ children, text }: { children: React.ReactNode, text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg pointer-events-none leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
