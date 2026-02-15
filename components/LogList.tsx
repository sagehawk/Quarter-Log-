import React from 'react';
import { LogEntry } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface LogListProps {
  logs: LogEntry[];
  onDelete: (id: string) => void;
  onEdit: (log: LogEntry) => void;
}

const LogList: React.FC<LogListProps> = ({ logs, onDelete, onEdit }) => {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 pb-32 text-center opacity-50">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/20 border border-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
        </div>
        <p className="text-white/40 font-mono text-xs uppercase tracking-[0.2em]">No entries yet</p>
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
    <div className="space-y-12 pb-48 pl-2">
      {Object.keys(groupedLogs).map(date => (
        <div key={date} className="relative">
          {/* Date Header */}
          <div className="sticky top-[160px] z-20 mb-8 pl-8 flex items-center gap-4">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-green-500/80">
              {date}
            </span>
            <div className="h-px bg-gradient-to-r from-green-500/20 to-transparent flex-1"></div>
          </div>

          <div className="space-y-0 relative border-l border-white/5 ml-3">
            {groupedLogs[date].map((log, index) => {
              const isWin = log.type === 'WIN';
              return (
                <div
                  key={log.id}
                  onClick={() => {
                    try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                    onEdit(log);
                  }}
                  className="group relative pl-8 py-6 transition-all duration-300 cursor-pointer hover:bg-white/5"
                >
                  {/* Timeline Node */}
                  <div className={`absolute left-[-5px] top-8 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${log.type === 'WIN'
                      ? 'border-zinc-800 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] group-hover:scale-125'
                      : log.type === 'DRAW'
                        ? 'border-zinc-800 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)] group-hover:scale-125'
                        : 'border-zinc-800 bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                    }`} />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/30 tracking-widest">
                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[9px] font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm ${log.type === 'WIN'
                          ? 'bg-green-500/10 text-green-500'
                          : log.type === 'DRAW'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                        {log.type}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <p className={`text-lg font-bold font-mono tracking-tight leading-snug uppercase ${log.type === 'WIN'
                          ? 'text-white'
                          : log.type === 'DRAW'
                            ? 'text-white/80'
                            : 'text-white/40 line-through decoration-red-500/50'
                        }`}>
                        {log.text}
                      </p>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(log.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogList;