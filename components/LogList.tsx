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
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white/20 border border-white/5 shadow-inner">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </div>
        <p className="text-white font-black text-lg uppercase tracking-widest italic">The Leaderboard is Empty.</p>
        <p className="text-[10px] text-white/30 mt-2 font-black uppercase tracking-[0.2em]">Start stacking wins to build momentum.</p>
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
          <div className="mb-6 flex items-center gap-4">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/40 italic">
              {date}
             </span>
             <div className="h-px bg-white/5 flex-1"></div>
          </div>
          
          <div className="space-y-4">
            {groupedLogs[date].map((log) => (
              <div 
                key={log.id} 
                onClick={() => handleCopy(log.text, log.id)}
                className={`group relative border rounded-2xl p-5 transition-all duration-300 cursor-pointer select-none overflow-hidden
                  ${copiedId === log.id 
                    ? 'bg-yellow-500/10 border-yellow-500/30' 
                    : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 active:scale-[0.98]'}
                `}
              >
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${log.type === 'LOSS' ? 'bg-red-600' : 'bg-yellow-500'}`} />

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2.5">
                       <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${log.type === 'LOSS' ? 'text-red-500 bg-red-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>
                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                       </span>
                       <span className={`text-[10px] font-black tracking-[0.2em] uppercase italic ${log.type === 'LOSS' ? 'text-red-500/60' : 'text-yellow-500/60'}`}>
                         {log.type || 'WIN'}
                       </span>
                       {copiedId === log.id && (
                         <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 animate-fade-in flex items-center gap-1">
                           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                           Copied
                         </span>
                       )}
                    </div>
                    <p className={`text-lg font-black tracking-tight leading-tight transition-colors italic uppercase ${copiedId === log.id ? 'text-yellow-100' : 'text-white'}`}>{log.text}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(log.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
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