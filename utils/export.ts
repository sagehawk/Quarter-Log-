import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LogEntry } from '../types';

const getFormattedDate = () => {
    const d = new Date();
    return d.toISOString().split('T')[0].replace(/-/g, '');
};

const formatLogsForText = (logs: LogEntry[]): string => {
    let text = `LOG EXPORT - ${new Date().toLocaleDateString()}\n`;
    text += `Total Entries: ${logs.length}\n\n`;
    
    logs.forEach(log => {
        const d = new Date(log.timestamp);
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const typeStr = log.type === 'WIN' ? '[WIN]' : '[LOSS]';
        text += `${dateStr} ${timeStr} ${typeStr} - ${log.text}\n`;
    });
    return text;
};

const formatLogsForCSV = (logs: LogEntry[]): string => {
    let csv = 'ID,Date,Time,Type,Duration_Minutes,Description\n';
    
    logs.forEach(log => {
        const d = new Date(log.timestamp);
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const durationMin = log.duration ? Math.round(log.duration / 60000) : 0;
        
        // Escape quotes in text
        const cleanText = log.text.replace(/"/g, '""');
        
        csv += `"${log.id}","${dateStr}","${timeStr}","${log.type}","${durationMin}","${cleanText}"\n`;
    });
    return csv;
};

export const exportToClipboard = async (logs: LogEntry[]): Promise<void> => {
    const text = formatLogsForText(logs);
    await navigator.clipboard.writeText(text);
};

export const exportToTXT = async (logs: LogEntry[]): Promise<void> => {
    const text = formatLogsForText(logs);
    const fileName = `quarter_log_${getFormattedDate()}.txt`;
    
    try {
        const result = await Filesystem.writeFile({
            path: fileName,
            data: text,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        await Share.share({
            title: 'Export Logs (TXT)',
            text: 'Here are my logs.',
            url: result.uri,
            dialogTitle: 'Share Logs'
        });
    } catch (e) {
        console.error("Export TXT failed", e);
        throw e;
    }
};

export const exportToCSV = async (logs: LogEntry[]): Promise<void> => {
    const csv = formatLogsForCSV(logs);
    const fileName = `quarter_log_${getFormattedDate()}.csv`;

    try {
        const result = await Filesystem.writeFile({
            path: fileName,
            data: csv,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        await Share.share({
            title: 'Export Logs (CSV)',
            text: 'Here are my logs in CSV format.',
            url: result.uri,
            dialogTitle: 'Share CSV'
        });
    } catch (e) {
        console.error("Export CSV failed", e);
        throw e;
    }
};
