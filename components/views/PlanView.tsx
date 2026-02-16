import React from 'react';
import DayPlanner from '../DayPlanner';
import { ScheduleConfig, LogEntry, DayPlan, AppTheme } from '../../types';

interface PlanViewProps {
    schedule: ScheduleConfig;
    logs: LogEntry[];
    dayPlan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
    theme: AppTheme;
}

const PlanView: React.FC<PlanViewProps> = ({ schedule, logs, dayPlan, onPlanUpdate, theme }) => {
    return (
        <div className="h-full overflow-hidden animate-fade-in relative">
            <DayPlanner schedule={schedule} logs={logs} plan={dayPlan} onPlanUpdate={onPlanUpdate} theme={theme} />
        </div>
    );
};

export default PlanView;
