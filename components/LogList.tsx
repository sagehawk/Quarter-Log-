import React, { useState } from 'react';
import { LogEntry } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface LogListProps {
  logs: LogEntry[];
  onDelete: (id: string) => void;
}

const LogList: React.FC<LogListProps> = ({ logs, onDelete }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-12 pb-32 text-center">
        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </div>
        <p className="text-slate-400 font-bold text-lg uppercase tracking-wide">No activity logged yet.</p>
        <p className="text-sm text-slate-500 mt-1 font-medium">Your timeline will appear here.</p>
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
    <div className="space-y-8 pb-48">
      {Object.keys(groupedLogs).map(date => (
        <div key={date} className="relative">
          <div className="mb-4 flex items-center">
             <div className="h-0.5 bg-slate-800 flex-1"></div>
             <span className="bg-slate-900 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-400 border border-slate-800">
              {date}
             </span>
             <div className="h-0.5 bg-slate-800 flex-1"></div>
          </div>
          
          <div className="space-y-3 pl-2 border-l-2 border-slate-800 ml-4 md:ml-0 md:border-0 md:pl-0">
            {groupedLogs[date].map((log) => (
              <div 
                key={log.id} 
                onClick={() => handleCopy(log.text, log.id)}
                className={`group relative border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer select-none
                  ${copiedId === log.id 
                    ? 'bg-emerald-900/10 border-emerald-500/30' 
                    : 'bg-slate-900 hover:bg-slate-800 border-transparent hover:border-slate-700 active:scale-[0.99]'}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[12px] font-black tracking-wide text-brand-300 bg-brand-900/30 px-1.5 py-0.5 rounded">
                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                       </span>
                       {copiedId === log.id && (
                         <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 animate-fade-in flex items-center gap-1">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                           Copied
                         </span>
                       )}
                    </div>
                    <p className={`text-lg font-bold leading-snug transition-colors ${copiedId === log.id ? 'text-emerald-100' : 'text-white'}`}>{log.text}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(log.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                    aria-label="Delete log"
                    title="Delete entry"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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