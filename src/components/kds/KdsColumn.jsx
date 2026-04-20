import React from 'react';

const KdsColumn = ({ title, count, color, children }) => {
  return (
    <div className="flex flex-col h-full min-w-[350px] max-w-[450px] bg-gray-50/50 rounded-[2rem] border border-gray-100/50 overflow-hidden shadow-sm">
      <div className={`shrink-0 p-5 border-b-2 flex items-center justify-between bg-white ${color}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${color.replace('border-', 'bg-')}`} />
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">
            {title}
          </h2>
        </div>
        <div className="bg-gray-100 px-3 py-1 rounded-full">
          <span className="text-xs font-black text-gray-500 tabular-nums">
            {count}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

export default KdsColumn;
