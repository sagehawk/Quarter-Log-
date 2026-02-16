import React, { useRef, useState } from 'react';
import { LogEntry, AppTheme } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface LogListProps {
  logs: LogEntry[];
  onDelete: (id: string) => void;
  onEdit: (log: LogEntry) => void;
  theme?: AppTheme;
}

const LogItem: React.FC<{
  log: LogEntry;
  index: number;
  onEdit: (log: LogEntry) => void;
  onDelete: (id: string) => void;
  theme: AppTheme;
}> = ({ log, index, onEdit, onDelete, theme }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const isDark = theme === 'dark';

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;

    // Capture start position
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    startPos.current = { x: clientX, y: clientY };

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
      onDelete(log.id);
    }, 600);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!timerRef.current || !startPos.current) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const diffX = Math.abs(clientX - startPos.current.x);
    const diffY = Math.abs(clientY - startPos.current.y);

    // If moved more than 10px, cancel long press
    if (diffX > 10 || diffY > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.stopPropagation();
      return;
    }
    // If movement was significant (scrolling), browser usually suppresses click, 
    // but just in case we could check isScrolling ref if we tracked it.
    // For now, assuming browser handles click suppression on scroll.
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
    onEdit(log);
  };

  return (
    <div
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onClick={handleClick}
      className={`group relative pl-8 py-6 transition-all duration-300 cursor-pointer select-none ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}`}
      style={{
        animation: `slideInLeft 0.4s ease-out ${index * 0.06}s both`,
      }}
    >
      {/* Timeline Node */}
      <div className={`absolute left-[-5px] top-8 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${log.type === 'WIN'
        ? `border-green-500 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] group-hover:scale-125`
        : log.type === 'DRAW'
          ? `border-amber-500 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)] group-hover:scale-125`
          : `border-red-500 bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]`
        }`} />

      <div className="flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono tracking-widest ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>
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
            ? (isDark ? 'text-white' : 'text-zinc-800')
            : log.type === 'DRAW'
              ? (isDark ? 'text-white/80' : 'text-zinc-700')
              : (isDark ? 'text-white/40 decoration-red-500/50' : 'text-zinc-400 decoration-red-500/30') + ' line-through'
            }`}>
            {log.text}
          </p>
        </div>
      </div>
    </div>
  );
};

const LogList: React.FC<LogListProps> = ({ logs, onDelete, onEdit, theme }) => {
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
            {groupedLogs[date].map((log, index) => (
              <LogItem
                key={log.id}
                log={log}
                index={index}
                onEdit={onEdit}
                onDelete={onDelete}
                theme={theme || 'dark'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogList;