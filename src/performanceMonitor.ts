import * as vscode from 'vscode';

export interface PerformanceMetrics {
    analysisTime: number;
    filesProcessed: number;
    issuesFound: number;
    memoryUsage: NodeJS.MemoryUsage;
    regexExecutions: number;
    averageFileProcessingTime: number;
}

export interface AnalysisSession {
    id: string;
    startTime: number;
    endTime?: number;
    metrics: PerformanceMetrics;
    workspaceSize: number;
}

export class PerformanceMonitor {
    private sessions: Map<string, AnalysisSession> = new Map();
    private currentSession: AnalysisSession | null = null;
    private regexExecutionCount = 0;
    private fileProcessingTimes: number[] = [];

    startAnalysisSession(workspaceSize: number): string {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.currentSession = {
            id: sessionId,
            startTime: performance.now(),
            workspaceSize,
            metrics: {
                analysisTime: 0,
                filesProcessed: 0,
                issuesFound: 0,
                memoryUsage: process.memoryUsage(),
                regexExecutions: 0,
                averageFileProcessingTime: 0
            }
        };
        
        this.sessions.set(sessionId, this.currentSession);
        this.regexExecutionCount = 0;
        this.fileProcessingTimes = [];
        
        return sessionId;
    }

    recordFileProcessing(processingTimeMs: number): void {
        if (!this.currentSession) {
            return;
        }
        
        this.currentSession.metrics.filesProcessed++;
        this.fileProcessingTimes.push(processingTimeMs);
        this.currentSession.metrics.averageFileProcessingTime = 
            this.fileProcessingTimes.reduce((a, b) => a + b, 0) / this.fileProcessingTimes.length;
    }

    recordRegexExecution(): void {
        this.regexExecutionCount++;
        if (this.currentSession) {
            this.currentSession.metrics.regexExecutions = this.regexExecutionCount;
        }
    }

    recordIssuesFound(count: number): void {
        if (!this.currentSession) {
            return;
        }
        this.currentSession.metrics.issuesFound += count;
    }

    endAnalysisSession(sessionId: string): AnalysisSession | null {
        const session = this.sessions.get(sessionId);
        if (!session || session !== this.currentSession) {
            return null;
        }

        session.endTime = performance.now();
        session.metrics.analysisTime = session.endTime - session.startTime;
        session.metrics.memoryUsage = process.memoryUsage();
        
        this.currentSession = null;
        return session;
    }

    getSessionMetrics(sessionId: string): PerformanceMetrics | null {
        const session = this.sessions.get(sessionId);
        return session ? session.metrics : null;
    }

    generatePerformanceReport(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return 'Session not found';
        }

        const metrics = session.metrics;
        const duration = session.endTime ? session.endTime - session.startTime : 0;
        
        return `
🚀 PERFORMANCE ANALYSIS REPORT
Session ID: ${sessionId}
================================

⏱️ Timing Metrics:
   • Total Analysis Time: ${(duration / 1000).toFixed(2)}s
   • Files Processed: ${metrics.filesProcessed}
   • Average File Processing: ${metrics.averageFileProcessingTime.toFixed(2)}ms
   • Processing Rate: ${(metrics.filesProcessed / (duration / 1000)).toFixed(1)} files/sec

🎯 Analysis Metrics:
   • Issues Found: ${metrics.issuesFound}
   • Regex Executions: ${metrics.regexExecutions}
   • Issues per File: ${(metrics.issuesFound / Math.max(metrics.filesProcessed, 1)).toFixed(2)}
   • Workspace Size: ${session.workspaceSize} files

💾 Memory Usage:
   • Heap Used: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
   • Heap Total: ${(metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
   • RSS: ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB

📈 Performance Insights:
   • Regex Efficiency: ${(metrics.regexExecutions / metrics.filesProcessed).toFixed(1)} executions/file
   • Memory Efficiency: ${(metrics.memoryUsage.heapUsed / session.workspaceSize / 1024).toFixed(2)} KB/file
   • Overall Performance: ${this.getPerformanceRating(metrics, duration)}
`;
    }

    private getPerformanceRating(metrics: PerformanceMetrics, duration: number): string {
        const filesPerSecond = metrics.filesProcessed / (duration / 1000);
        const memoryPerFile = metrics.memoryUsage.heapUsed / metrics.filesProcessed;
        
        if (filesPerSecond > 50 && memoryPerFile < 1024 * 1024) {
            return '🌟 Excellent';
        } else if (filesPerSecond > 20 && memoryPerFile < 2 * 1024 * 1024) {
            return '✅ Good';
        } else if (filesPerSecond > 10) {
            return '⚡ Fair';
        } else {
            return '🐌 Needs Optimization';
        }
    }

    getHistoricalMetrics(): AnalysisSession[] {
        return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
    }

    compareWithPrevious(currentSessionId: string): string | null {
        const sessions = this.getHistoricalMetrics();
        const currentIndex = sessions.findIndex(s => s.id === currentSessionId);
        
        if (currentIndex === -1 || currentIndex >= sessions.length - 1) {
            return null;
        }

        const current = sessions[currentIndex];
        const previous = sessions[currentIndex + 1];
        
        const timeDiff = ((current.metrics.analysisTime - previous.metrics.analysisTime) / previous.metrics.analysisTime * 100);
        const memoryDiff = ((current.metrics.memoryUsage.heapUsed - previous.metrics.memoryUsage.heapUsed) / previous.metrics.memoryUsage.heapUsed * 100);
        
        return `
📊 PERFORMANCE COMPARISON
========================

⏱️ Analysis Time: ${timeDiff > 0 ? '+' : ''}${timeDiff.toFixed(1)}% ${timeDiff > 0 ? '(slower)' : '(faster)'}
💾 Memory Usage: ${memoryDiff > 0 ? '+' : ''}${memoryDiff.toFixed(1)}% ${memoryDiff > 0 ? '(more)' : '(less)'}
📁 Files Processed: ${current.metrics.filesProcessed} vs ${previous.metrics.filesProcessed}
🎯 Issues Found: ${current.metrics.issuesFound} vs ${previous.metrics.issuesFound}

${timeDiff < -10 ? '🚀 Performance improved!' : timeDiff > 10 ? '⚠️ Performance decreased' : '✅ Performance stable'}
`;
    }

    clearOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
        const cutoff = Date.now() - maxAge;
        for (const [id, session] of this.sessions.entries()) {
            if (session.startTime < cutoff) {
                this.sessions.delete(id);
            }
        }
    }

    dispose(): void {
        this.sessions.clear();
        this.currentSession = null;
    }
}
