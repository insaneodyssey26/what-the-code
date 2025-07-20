import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileAnalysisReport } from './htmlReportGenerator';

export interface ContributorStats {
    name: string;
    email: string;
    qualityScoreImprovement: number;
    issuesFixed: number;
    issuesCreated: number;
    filesAnalyzed: number;
    lastActivity: Date;
    totalScore: number;
    rank: number;
    avatar?: string;
    commits: number;
    reportsGenerated: number;
}

export interface TeamLeaderboardData {
    contributors: ContributorStats[];
    lastUpdated: Date;
    teamAverageScore: number;
    totalIssuesFixed: number;
    totalReportsGenerated: number;
}

export class TeamLeaderboard {
    private outputChannel: vscode.OutputChannel;
    private leaderboardPath: string;
    private readonly LEADERBOARD_FILE = 'team-leaderboard.json';

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('What-The-Code Team');
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const reportsBasePath = workspaceFolder 
            ? path.join(workspaceFolder.uri.fsPath)
            : path.join(require('os').homedir());
            
        this.leaderboardPath = path.join(reportsBasePath, '.what-the-code-reports', this.LEADERBOARD_FILE);
        this.ensureLeaderboardDirectory();
    }

    private ensureLeaderboardDirectory(): void {
        const dir = path.dirname(this.leaderboardPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private async getCurrentGitUser(): Promise<{ name: string; email: string } | null> {
        try {
            const terminal = vscode.window.createTerminal({ name: 'Git User Info', hideFromUser: true });
            
            // Get git user name and email using VS Code's built-in git
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (gitExtension) {
                const git = gitExtension.getAPI(1);
                const repo = git.repositories[0];
                if (repo) {
                    // Try to get user info from git config
                    const config = repo.repository.config;
                    const userName = await this.getGitConfig('user.name');
                    const userEmail = await this.getGitConfig('user.email');
                    
                    if (userName && userEmail) {
                        return { name: userName, email: userEmail };
                    }
                }
            }
            
            // Fallback to environment or default
            return {
                name: process.env.USERNAME || process.env.USER || 'Unknown User',
                email: 'unknown@example.com'
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error getting git user: ${error}`);
            return {
                name: 'Unknown User',
                email: 'unknown@example.com'
            };
        }
    }

    private async getGitConfig(key: string): Promise<string | null> {
        try {
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec(`git config --get ${key}`, (error: any, stdout: string) => {
                    if (error) {
                        resolve(null);
                    } else {
                        resolve(stdout.trim());
                    }
                });
            });
        } catch {
            return null;
        }
    }

    private loadLeaderboardData(): TeamLeaderboardData {
        try {
            if (fs.existsSync(this.leaderboardPath)) {
                const data = JSON.parse(fs.readFileSync(this.leaderboardPath, 'utf8'));
                // Convert date strings back to Date objects
                data.lastUpdated = new Date(data.lastUpdated);
                data.contributors.forEach((contributor: ContributorStats) => {
                    contributor.lastActivity = new Date(contributor.lastActivity);
                });
                return data;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error loading leaderboard data: ${error}`);
        }

        // Return default data structure
        return {
            contributors: [],
            lastUpdated: new Date(),
            teamAverageScore: 0,
            totalIssuesFixed: 0,
            totalReportsGenerated: 0
        };
    }

    private saveLeaderboardData(data: TeamLeaderboardData): void {
        try {
            fs.writeFileSync(this.leaderboardPath, JSON.stringify(data, null, 2), 'utf8');
            this.outputChannel.appendLine(`📊 Leaderboard data saved`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error saving leaderboard data: ${error}`);
        }
    }

    async updateContributorStats(report: FileAnalysisReport, previousScore?: number): Promise<void> {
        const user = await this.getCurrentGitUser();
        if (!user) {
            return;
        }

        const data = this.loadLeaderboardData();
        const currentScore = this.calculateQualityScore(report);
        
        let contributor = data.contributors.find(c => c.email === user.email);
        
        if (!contributor) {
            contributor = {
                name: user.name,
                email: user.email,
                qualityScoreImprovement: 0,
                issuesFixed: 0,
                issuesCreated: 0,
                filesAnalyzed: 0,
                lastActivity: new Date(),
                totalScore: 0,
                rank: 0,
                commits: 0,
                reportsGenerated: 0
            };
            data.contributors.push(contributor);
        }

        // Update stats
        contributor.name = user.name; // Update name in case it changed
        contributor.filesAnalyzed++;
        contributor.reportsGenerated++;
        contributor.lastActivity = new Date();
        
        const issueCount = report.typeSafetyIssues.length + 
                          report.refactoringRecommendations.length + 
                          report.deadCodeIssues.length;
        
        if (previousScore !== undefined) {
            const improvement = currentScore - previousScore;
            contributor.qualityScoreImprovement += improvement;
            
            // If score improved, count as issues fixed
            if (improvement > 0) {
                contributor.issuesFixed += Math.floor(improvement / 5); // Approximate issues fixed
            }
        }
        
        contributor.issuesCreated += issueCount;
        contributor.totalScore = contributor.qualityScoreImprovement + 
                                (contributor.issuesFixed * 10) - 
                                (contributor.issuesCreated * 2) + 
                                (contributor.filesAnalyzed * 5) +
                                (contributor.reportsGenerated * 3);

        // Update team stats
        data.lastUpdated = new Date();
        data.totalReportsGenerated = data.contributors.reduce((sum, c) => sum + c.reportsGenerated, 0);
        data.totalIssuesFixed = data.contributors.reduce((sum, c) => sum + c.issuesFixed, 0);
        data.teamAverageScore = data.contributors.length > 0 
            ? data.contributors.reduce((sum, c) => sum + c.totalScore, 0) / data.contributors.length 
            : 0;

        // Calculate ranks
        this.calculateRanks(data);
        
        this.saveLeaderboardData(data);
        this.outputChannel.appendLine(`📈 Updated stats for ${user.name}`);
    }

    private calculateRanks(data: TeamLeaderboardData): void {
        // Sort contributors by total score (descending)
        data.contributors.sort((a, b) => b.totalScore - a.totalScore);
        
        // Assign ranks
        data.contributors.forEach((contributor, index) => {
            contributor.rank = index + 1;
        });
    }

    private calculateQualityScore(report: FileAnalysisReport): number {
        const metrics = report.metrics;
        let score = 100;
        
        // Reduce score based on issues
        score -= (report.typeSafetyIssues.length * 5);
        score -= (report.refactoringRecommendations.length * 3);
        score -= (report.deadCodeIssues.length * 2);
        
        // Adjust based on metrics
        score -= Math.max(0, (10 - metrics.typesCoverage) * 2);
        score -= Math.max(0, (metrics.functionComplexity - 5) * 5);
        score -= (metrics.duplicateCodeBlocks * 3);
        score -= (metrics.magicNumbers * 2);
        score -= (metrics.longFunctions * 4);
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    async generateLeaderboardHTML(): Promise<string> {
        const data = this.loadLeaderboardData();
        
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Leaderboard - What-The-Code</title>
    ${this.getLeaderboardStyles()}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body>
    <div class="container">
        ${this.generateLeaderboardHeader(data)}
        ${this.generateTeamStats(data)}
        ${this.generateLeaderboardTable(data)}
        ${this.generateChartsSection(data)}
        ${this.generateFooter()}
    </div>
    
    ${this.getChartsScript(data)}
</body>
</html>`;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const reportsBasePath = workspaceFolder 
            ? path.join(workspaceFolder.uri.fsPath)
            : path.join(require('os').homedir());
            
        const reportPath = path.join(reportsBasePath, '.what-the-code-reports', 'team-leaderboard.html');
        
        fs.writeFileSync(reportPath, htmlContent, 'utf8');
        this.outputChannel.appendLine(`🏆 Team leaderboard generated: ${reportPath}`);
        
        return reportPath;
    }

    private generateLeaderboardHeader(data: TeamLeaderboardData): string {
        return `
        <header class="leaderboard-header">
            <div class="header-content">
                <h1>🏆 Team Leaderboard</h1>
                <h2>Code Quality Champions</h2>
                <p class="timestamp">Last Updated: ${data.lastUpdated.toLocaleString()}</p>
                <div class="team-summary">
                    <span>👥 ${data.contributors.length} Contributors</span>
                    <span>📊 Avg Score: ${data.teamAverageScore.toFixed(1)}</span>
                    <span>🔧 ${data.totalIssuesFixed} Issues Fixed</span>
                </div>
            </div>
        </header>`;
    }

    private generateTeamStats(data: TeamLeaderboardData): string {
        const topPerformer = data.contributors[0];
        const mostActive = data.contributors.reduce((prev, current) => 
            (prev.filesAnalyzed > current.filesAnalyzed) ? prev : current, data.contributors[0]);
        const mostImproved = data.contributors.reduce((prev, current) => 
            (prev.qualityScoreImprovement > current.qualityScoreImprovement) ? prev : current, data.contributors[0]);

        return `
        <section class="team-stats">
            <h2>🎯 Team Highlights</h2>
            <div class="stats-grid">
                <div class="stat-card highlight">
                    <h3>🥇 Top Performer</h3>
                    <div class="contributor-info">
                        <div class="name">${topPerformer?.name || 'No data'}</div>
                        <div class="score">${topPerformer?.totalScore || 0} points</div>
                    </div>
                </div>
                <div class="stat-card">
                    <h3>⚡ Most Active</h3>
                    <div class="contributor-info">
                        <div class="name">${mostActive?.name || 'No data'}</div>
                        <div class="score">${mostActive?.filesAnalyzed || 0} files analyzed</div>
                    </div>
                </div>
                <div class="stat-card">
                    <h3>📈 Most Improved</h3>
                    <div class="contributor-info">
                        <div class="name">${mostImproved?.name || 'No data'}</div>
                        <div class="score">+${mostImproved?.qualityScoreImprovement?.toFixed(1) || 0} quality boost</div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    private generateLeaderboardTable(data: TeamLeaderboardData): string {
        if (data.contributors.length === 0) {
            return `
            <section class="leaderboard-section">
                <h2>📋 Leaderboard</h2>
                <div class="no-data">No contributors data available yet. Start analyzing code to see team statistics!</div>
            </section>`;
        }

        const contributorRows = data.contributors.map(contributor => {
            const rankIcon = this.getRankIcon(contributor.rank);
            const scoreClass = this.getScoreClass(contributor.totalScore);
            
            return `
            <tr class="contributor-row">
                <td class="rank-cell">
                    <div class="rank">
                        <span class="rank-icon">${rankIcon}</span>
                        <span class="rank-number">#${contributor.rank}</span>
                    </div>
                </td>
                <td class="contributor-cell">
                    <div class="contributor-info">
                        <div class="name">${contributor.name}</div>
                        <div class="email">${contributor.email}</div>
                        <div class="last-activity">Last active: ${this.formatTimeAgo(contributor.lastActivity)}</div>
                    </div>
                </td>
                <td class="score-cell">
                    <div class="total-score ${scoreClass}">${contributor.totalScore}</div>
                </td>
                <td class="stats-cell">
                    <div class="stat-item">
                        <span class="stat-label">Quality Boost:</span>
                        <span class="stat-value ${contributor.qualityScoreImprovement >= 0 ? 'positive' : 'negative'}">
                            ${contributor.qualityScoreImprovement >= 0 ? '+' : ''}${contributor.qualityScoreImprovement.toFixed(1)}
                        </span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Issues Fixed:</span>
                        <span class="stat-value">${contributor.issuesFixed}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Files Analyzed:</span>
                        <span class="stat-value">${contributor.filesAnalyzed}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Reports Generated:</span>
                        <span class="stat-value">${contributor.reportsGenerated}</span>
                    </div>
                </td>
            </tr>`;
        }).join('');

        return `
        <section class="leaderboard-section">
            <h2>📋 Leaderboard</h2>
            <div class="leaderboard-table-container">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Contributor</th>
                            <th>Total Score</th>
                            <th>Statistics</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${contributorRows}
                    </tbody>
                </table>
            </div>
        </section>`;
    }

    private generateChartsSection(data: TeamLeaderboardData): string {
        return `
        <section class="charts-section">
            <h2>📊 Team Analytics</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Contributor Scores</h3>
                    <canvas id="scoresChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Activity Distribution</h3>
                    <canvas id="activityChart" width="400" height="200"></canvas>
                </div>
            </div>
        </section>`;
    }

    private generateFooter(): string {
        return `
        <footer class="leaderboard-footer">
            <p>Generated by <strong>What-The-Code</strong> Team Leaderboard</p>
            <p class="scoring-info">
                Scoring: Quality Improvement (+1 per point) | Issues Fixed (+10 each) | 
                Files Analyzed (+5 each) | Reports Generated (+3 each) | Issues Created (-2 each)
            </p>
        </footer>`;
    }

    private getRankIcon(rank: number): string {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '🏅';
        }
    }

    private getScoreClass(score: number): string {
        if (score >= 100) {
            return 'excellent';
        }
        if (score >= 50) {
            return 'good';
        }
        if (score >= 0) {
            return 'fair';
        }
        return 'poor';
    }

    private formatTimeAgo(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    }

    private getLeaderboardStyles(): string {
        return `
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .leaderboard-header {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                color: #333;
                padding: 40px;
                border-radius: 15px;
                margin-bottom: 30px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            
            .leaderboard-header h1 {
                font-size: 3rem;
                margin-bottom: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .leaderboard-header h2 {
                font-size: 1.2rem;
                opacity: 0.8;
                margin-bottom: 20px;
            }
            
            .timestamp {
                opacity: 0.7;
                margin-bottom: 20px;
            }
            
            .team-summary {
                display: flex;
                justify-content: center;
                gap: 30px;
                flex-wrap: wrap;
                font-weight: 500;
            }
            
            .team-summary span {
                background: rgba(102, 126, 234, 0.1);
                padding: 8px 16px;
                border-radius: 20px;
                border: 1px solid rgba(102, 126, 234, 0.2);
            }
            
            .team-stats {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            
            .team-stats h2 {
                margin-bottom: 25px;
                color: #333;
                text-align: center;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }
            
            .stat-card {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 25px;
                border-radius: 12px;
                text-align: center;
                border: 2px solid transparent;
                transition: all 0.3s ease;
            }
            
            .stat-card.highlight {
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border-color: #f39c12;
            }
            
            .stat-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            }
            
            .stat-card h3 {
                margin-bottom: 15px;
                color: #555;
            }
            
            .contributor-info .name {
                font-size: 1.2rem;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            
            .contributor-info .score {
                font-size: 1.1rem;
                color: #666;
            }
            
            .leaderboard-section {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            
            .leaderboard-section h2 {
                margin-bottom: 25px;
                color: #333;
                text-align: center;
            }
            
            .no-data {
                text-align: center;
                color: #666;
                font-size: 1.1rem;
                padding: 40px;
                background: rgba(240, 240, 240, 0.5);
                border-radius: 10px;
            }
            
            .leaderboard-table-container {
                overflow-x: auto;
            }
            
            .leaderboard-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .leaderboard-table th {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                text-align: left;
                font-weight: 600;
            }
            
            .contributor-row {
                border-bottom: 1px solid #eee;
                transition: background-color 0.3s ease;
            }
            
            .contributor-row:hover {
                background-color: rgba(102, 126, 234, 0.05);
            }
            
            .contributor-row:nth-child(odd) {
                background-color: rgba(248, 249, 250, 0.5);
            }
            
            .leaderboard-table td {
                padding: 20px 15px;
                vertical-align: top;
            }
            
            .rank-cell .rank {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .rank-icon {
                font-size: 1.5rem;
            }
            
            .rank-number {
                font-weight: bold;
                color: #666;
            }
            
            .contributor-cell .contributor-info .name {
                font-size: 1.1rem;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            
            .contributor-cell .contributor-info .email {
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 5px;
            }
            
            .contributor-cell .contributor-info .last-activity {
                color: #999;
                font-size: 0.8rem;
            }
            
            .total-score {
                font-size: 1.5rem;
                font-weight: bold;
                text-align: center;
                padding: 10px;
                border-radius: 8px;
            }
            
            .total-score.excellent { background: #d4edda; color: #155724; }
            .total-score.good { background: #d1ecf1; color: #0c5460; }
            .total-score.fair { background: #fff3cd; color: #856404; }
            .total-score.poor { background: #f8d7da; color: #721c24; }
            
            .stat-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 5px 0;
                border-bottom: 1px solid #eee;
            }
            
            .stat-item:last-child {
                border-bottom: none;
            }
            
            .stat-label {
                color: #666;
                font-size: 0.9rem;
            }
            
            .stat-value {
                font-weight: bold;
                color: #333;
            }
            
            .stat-value.positive {
                color: #28a745;
            }
            
            .stat-value.negative {
                color: #dc3545;
            }
            
            .charts-section {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            
            .charts-section h2 {
                margin-bottom: 25px;
                color: #333;
                text-align: center;
            }
            
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 30px;
            }
            
            .chart-container {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }
            
            .chart-container h3 {
                margin-bottom: 15px;
                color: #555;
            }
            
            .leaderboard-footer {
                text-align: center;
                padding: 20px;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 10px;
            }
            
            .scoring-info {
                font-size: 0.9rem;
                margin-top: 10px;
                opacity: 0.8;
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 10px;
                }
                
                .leaderboard-header h1 {
                    font-size: 2rem;
                }
                
                .team-summary {
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .charts-grid {
                    grid-template-columns: 1fr;
                }
                
                .leaderboard-table th,
                .leaderboard-table td {
                    padding: 10px 8px;
                    font-size: 0.9rem;
                }
            }
        </style>`;
    }

    private getChartsScript(data: TeamLeaderboardData): string {
        const contributorNames = data.contributors.map(c => c.name);
        const contributorScores = data.contributors.map(c => c.totalScore);
        const contributorActivity = data.contributors.map(c => c.filesAnalyzed);

        return `
        <script>
            // Contributor Scores Chart
            const scoresCtx = document.getElementById('scoresChart').getContext('2d');
            new Chart(scoresCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(contributorNames)},
                    datasets: [{
                        label: 'Total Score',
                        data: ${JSON.stringify(contributorScores)},
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            
            // Activity Distribution Chart
            const activityCtx = document.getElementById('activityChart').getContext('2d');
            new Chart(activityCtx, {
                type: 'doughnut',
                data: {
                    labels: ${JSON.stringify(contributorNames)},
                    datasets: [{
                        label: 'Files Analyzed',
                        data: ${JSON.stringify(contributorActivity)},
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                        ],
                        borderWidth: 3,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        </script>`;
    }

    async openLeaderboard(): Promise<void> {
        try {
            const reportPath = await this.generateLeaderboardHTML();
            const uri = vscode.Uri.file(reportPath);
            await vscode.env.openExternal(uri);
            this.outputChannel.appendLine(`🏆 Opened team leaderboard: ${reportPath}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to open leaderboard: ${error}`);
            vscode.window.showErrorMessage(`Failed to open team leaderboard: ${error}`);
        }
    }

    getLeaderboardData(): TeamLeaderboardData {
        return this.loadLeaderboardData();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
