import React from 'react';
import { LogEntry } from '../types';

interface LogListProps {
  logs: LogEntry[];
  onDelete: (id: string) => void;
}

const LogList: React.FC<LogListProps> = ({ logs, onDelete }) => {
  if (logs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p>No activity logged yet.</p>
        <p className="text-sm mt-1">Start the timer to track your first block.</p>
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
    <div className="space-y-6 pb-20">
      {Object.keys(groupedLogs).map(date => (
        <div key={date}>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 px-1 sticky top-0 bg-[#0f172a]/95 backdrop-blur py-2 z-10">
            {date}
          </h3>
          <div className="space-y-3">
            {groupedLogs[date].map((log) => (
              <div 
                key={log.id} 
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start justify-between group hover:border-slate-600 transition-colors"
              >
                <div>
                  <div className="text-indigo-400 text-xs font-mono mb-1">
                    {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <p className="text-slate-200 text-base leading-snug">{log.text}</p>
                </div>
                <button 
                  onClick={() => onDelete(log.id)}
                  className="text-slate-600 hover:text-red-400 p-2 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete log"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogList;