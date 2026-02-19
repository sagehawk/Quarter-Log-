import React from 'react';
import DayPlanner from '../DayPlanner';
import { ScheduleConfig, LogEntry, DayPlan, AppTheme } from '../../types';

interface PlanViewProps {
    schedule: ScheduleConfig;
    logs: LogEntry[];
    dayPlan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
    theme: AppTheme;
    cycleDuration: number;
    loggingMode?: boolean;
    onLogAdd: (log: LogEntry) => void;
    strategicPriority?: string;
    onShowFeedback?: (message: string) => void;
    onPlanVerify?: (text: string, type: 'WIN', duration: number, category: string) => void;
    onSlotClick?: (slotId: string) => void;
}

const PlanView: React.FC<PlanViewProps> = ({ schedule, logs, dayPlan, onPlanUpdate, theme, cycleDuration, onSlotClick, loggingMode, onLogAdd, strategicPriority, onShowFeedback, onPlanVerify }) => {
    return (
        <div className="h-full flex flex-col">
            <DayPlanner
                schedule={schedule}
                logs={logs}
                plan={dayPlan}
                onPlanUpdate={onPlanUpdate}
                theme={theme}
                cycleDuration={cycleDuration}
                onSlotClick={onSlotClick}
                loggingMode={loggingMode}
                onLogAdd={onLogAdd}
                strategicPriority={strategicPriority}
                onShowFeedback={onShowFeedback}
                onPlanVerify={onPlanVerify}
            />
        </div>
    );
};

export default PlanView;
