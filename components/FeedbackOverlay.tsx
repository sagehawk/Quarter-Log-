import React, { useMemo } from 'react';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

interface FeedbackOverlayProps {
    isVisible: boolean;
    totalWins: number;
    type: 'WIN' | 'LOSS' | 'DRAW';
    customTitle?: string;
    customSub?: string;
    aiMessage?: string | null;
    isFrozen?: boolean;
    period?: string;
    onDismiss?: () => void;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
    isVisible,
    type,
    aiMessage,
    onDismiss
}) => {

    // Determine Coach Mood & Clean Message
    const { cleanMessage, mood } = useMemo((): { cleanMessage: string, mood: CoachMood } => {
        if (!isVisible) return { cleanMessage: "", mood: 'IDLE' };

        // Initial "Processing" state usually set by parent
        if (!aiMessage || aiMessage.includes("Analyzing") || aiMessage === "Processing...") {
            return { cleanMessage: "Analyzing tactical data...", mood: 'PROCESSING' };
        }

        // Parse Tag
        const match = aiMessage.match(/^\[MOOD:\s*(\w+)\]/);
        if (match) {
            const tag = match[1].toUpperCase();
            let parsedMood: CoachMood = 'IDLE';
            if (['IDLE', 'ASKING', 'PROCESSING', 'WIN', 'LOSS', 'SAVAGE', 'STOIC'].includes(tag)) {
                parsedMood = tag as CoachMood;
            }
            return {
                cleanMessage: aiMessage.replace(match[0], '').trim(),
                mood: parsedMood
            };
        }

        // Fallback if no tag
        return {
            cleanMessage: aiMessage,
            mood: type === 'WIN' ? 'WIN' : type === 'DRAW' ? 'DRAW' : 'LOSS'
        };
    }, [aiMessage, type, isVisible]);


    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100]" onClick={onDismiss}>
            <TacticalCoachView mood={mood} message={cleanMessage}>
                <div className="text-center mt-6 w-full">
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">
                        Tap screen to dismiss
                    </p>
                </div>
            </TacticalCoachView>
        </div>
    );
};

export default FeedbackOverlay;