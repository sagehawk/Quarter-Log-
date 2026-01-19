import React from 'react';
import { LogEntry } from '../types';

interface LogListProps {
  logs: LogEntry[];
  onDelete: (id: string) => void;
}

const LogList: React.FC<LogListProps> = ({ logs, onDelete }) => {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </div>
        <p className="text-slate-400 font-medium">No activity logged yet.</p>
        <p className="text-xs text-slate-500 mt-1">Your timeline will appear here.</p>
      </div>
    );
  }

  // Group by date
  const groupedLogs: Record<string, LogEntry[]> = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!groupedLogs[date]) {
      groupedLogs[date] = [];
    }
    groupedLogs[date].push(log);
  });

  return (
    <div className="space-y-8 pb-32">
      {Object.keys(groupedLogs).map(date => (
        <div key={date} className="relative">
          <div className="sticky top-[72px] z-10 mb-4 flex items-center">
             <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1 opacity-50"></div>
             <span className="bg-[#0f172a]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-800 shadow-sm">
              {date}
             </span>
             <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1 opacity-50"></div>
          </div>
          
          <div className="space-y-3 pl-2 border-l-2 border-slate-800/50 ml-4 md:ml-0 md:border-0 md:pl-0">
            {groupedLogs[date].map((log) => (
              <div 
                key={log.id} 
                className="group relative bg-slate-800/40 hover:bg-slate-800/60 backdrop-blur-sm border border-white/5 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                       <span className="text-[11px] font-mono font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    <p className="text-slate-200 text-[15px] leading-relaxed font-light">{log.text}</p>
                  </div>
                  
                  <button 
                    onClick={() => onDelete(log.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    aria-label="Delete log"
                    title="Delete entry"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogList;