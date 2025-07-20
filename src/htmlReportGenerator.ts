import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CodeQualityMetrics, TypeSafetyIssue, RefactoringRecommendation } from './codeQualityAnalyzer';
import { DeadCodeIssue } from './analyzeDeadCode';
import { SearchResult } from './types';
import { TeamLeaderboard } from './teamLeaderboard';

export interface FileAnalysisReport {
    filePath: string;
    relativePath: string;
    timestamp: Date;
    metrics: CodeQualityMetrics;
    typeSafetyIssues: TypeSafetyIssue[];
    refactoringRecommendations: RefactoringRecommendation[];
    deadCodeIssues: DeadCodeIssue[];
    searchResults?: SearchResult[];
    fileSize: number;
    lineCount: number;
}

export interface ProjectReport {
    projectName: string;
    timestamp: Date;
    files: FileAnalysisReport[];
    summary: {
        totalFiles: number;
        totalIssues: number;
        averageQualityScore: number;
        riskLevel: 'low' | 'medium' | 'high';
    };
}

export class HTMLReportGenerator {
    private outputChannel: vscode.OutputChannel;
    private reportsPath: string;
    private teamLeaderboard: TeamLeaderboard;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('What-The-Code Reports');
        this.teamLeaderboard = new TeamLeaderboard();
        
        // Create reports directory in workspace, but use file name for file reports
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        let reportsBasePath = workspaceFolder 
            ? path.join(workspaceFolder.uri.fsPath)
            : path.join(require('os').homedir());

        // Default folder name
        let reportsFolderName = '.what-the-code-reports';

        // If generating a file report, use the file name as the folder name
        // Otherwise, fallback to project name for project reports
        this.reportsPath = path.join(reportsBasePath, reportsFolderName);
        this.ensureReportsDirectory();
    }

    private ensureReportsDirectory(): void {
        if (!fs.existsSync(this.reportsPath)) {
            fs.mkdirSync(this.reportsPath, { recursive: true });
        }
    }

    async generateFileReport(
        filePath: string,
        metrics: CodeQualityMetrics,
        typeSafetyIssues: TypeSafetyIssue[],
        refactoringRecommendations: RefactoringRecommendation[],
        deadCodeIssues: DeadCodeIssue[] = [],
        searchResults?: SearchResult[]
    ): Promise<string> {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const relativePath = vscode.workspace.asRelativePath(filePath);
        
        const report: FileAnalysisReport = {
            filePath,
            relativePath,
            timestamp: new Date(),
            metrics,
            typeSafetyIssues,
            refactoringRecommendations,
            deadCodeIssues,
            searchResults,
            fileSize: Buffer.byteLength(fileContent, 'utf8'),
            lineCount: fileContent.split('\n').length
        };

        const htmlContent = this.generateFileHTML(report);
        const fileName = this.generateFileReportName(relativePath);
        const reportPath = path.join(this.reportsPath, fileName);
        
        fs.writeFileSync(reportPath, htmlContent, 'utf8');
        
        // Update team leaderboard with this report
        await this.teamLeaderboard.updateContributorStats(report);
        
        this.outputChannel.appendLine(`📄 Report generated: ${reportPath}`);
        return reportPath;
    }

    async generateProjectReport(reports: FileAnalysisReport[]): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const projectName = workspaceFolder?.name || 'Unknown Project';
        
        const totalIssues = reports.reduce((sum, report) => 
            sum + report.typeSafetyIssues.length + 
            report.refactoringRecommendations.length + 
            report.deadCodeIssues.length, 0
        );

        const averageQualityScore = this.calculateProjectQualityScore(reports);
        const riskLevel = this.determineRiskLevel(averageQualityScore, totalIssues);

        const projectReport: ProjectReport = {
            projectName,
            timestamp: new Date(),
            files: reports,
            summary: {
                totalFiles: reports.length,
                totalIssues,
                averageQualityScore,
                riskLevel
            }
        };

        const htmlContent = this.generateProjectHTML(projectReport);
        const fileName = this.generateProjectReportName(projectName);
        const reportPath = path.join(this.reportsPath, fileName);
        
        fs.writeFileSync(reportPath, htmlContent, 'utf8');
        
        this.outputChannel.appendLine(`📊 Project report generated: ${reportPath}`);
        return reportPath;
    }

    private generateFileHTML(report: FileAnalysisReport): string {
        const qualityScore = this.calculateQualityScore(report);
        const issueCount = report.typeSafetyIssues.length + 
                         report.refactoringRecommendations.length + 
                         report.deadCodeIssues.length;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Quality Report - ${report.relativePath}</title>
    ${this.getCommonStyles()}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
    <div class="container">
        ${this.generateHeader(report.relativePath, 'File Analysis Report')}
        
        ${this.generatePDFButton()}
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>📊 Quality Score</h3>
                <div class="score ${this.getScoreClass(qualityScore)}">${qualityScore}/100</div>
            </div>
            <div class="summary-card">
                <h3>🔍 Total Issues</h3>
                <div class="count">${issueCount}</div>
            </div>
            <div class="summary-card">
                <h3>📏 File Size</h3>
                <div class="size">${this.formatFileSize(report.fileSize)}</div>
            </div>
            <div class="summary-card">
                <h3>📝 Lines</h3>
                <div class="lines">${report.lineCount}</div>
            </div>
        </div>

        ${this.generateMetricsSection(report.metrics)}
        ${this.generateTypeSafetySection(report.typeSafetyIssues)}
        ${this.generateRefactoringSection(report.refactoringRecommendations)}
        ${this.generateDeadCodeSection(report.deadCodeIssues)}
        ${report.searchResults ? this.generateSearchResultsSection(report.searchResults) : ''}
        
        ${this.generateFooter()}
    </div>
    
    ${this.getPDFScript()}
</body>
</html>`;
    }

    private generateProjectHTML(report: ProjectReport): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Quality Report - ${report.projectName}</title>
    ${this.getCommonStyles()}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body>
    <div class="container">
        ${this.generateHeader(report.projectName, 'Project Analysis Report')}
        
        ${this.generatePDFButton()}
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>📊 Overall Score</h3>
                <div class="score ${this.getScoreClass(report.summary.averageQualityScore)}">${report.summary.averageQualityScore}/100</div>
            </div>
            <div class="summary-card">
                <h3>📁 Files Analyzed</h3>
                <div class="count">${report.summary.totalFiles}</div>
            </div>
            <div class="summary-card">
                <h3>⚠️ Total Issues</h3>
                <div class="issues">${report.summary.totalIssues}</div>
            </div>
            <div class="summary-card">
                <h3>🎯 Risk Level</h3>
                <div class="risk ${report.summary.riskLevel}">${report.summary.riskLevel.toUpperCase()}</div>
            </div>
        </div>

        ${this.generateProjectChartsSection(report)}
        ${this.generateFileListSection(report.files)}
        
        ${this.generateFooter()}
    </div>
    
    ${this.getPDFScript()}
    ${this.getChartsScript(report)}
</body>
</html>`;
    }

    private generateHeader(title: string, subtitle: string): string {
        return `
        <header class="report-header">
            <div class="header-content">
                <h1>🚀 What-The-Code</h1>
                <h2>${subtitle}</h2>
                <h3>${title}</h3>
                <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
            </div>
        </header>`;
    }

    private generatePDFButton(): string {
        return `
        <div class="pdf-section">
            <button id="generatePDF" class="pdf-button">
                📄 Generate PDF Report
            </button>
            <p class="pdf-note">Click to convert this report to PDF format</p>
        </div>`;
    }

    private generateMetricsSection(metrics: CodeQualityMetrics): string {
        return `
        <section class="report-section">
            <h2>📈 Code Quality Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Type Coverage</h4>
                    <div class="metric-value">${metrics.typesCoverage.toFixed(1)}%</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${metrics.typesCoverage}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <h4>Function Complexity</h4>
                    <div class="metric-value">${metrics.functionComplexity.toFixed(1)}</div>
                    <div class="complexity-indicator ${this.getComplexityClass(metrics.functionComplexity)}"></div>
                </div>
                <div class="metric-card">
                    <h4>Duplicate Blocks</h4>
                    <div class="metric-value">${metrics.duplicateCodeBlocks}</div>
                </div>
                <div class="metric-card">
                    <h4>Magic Numbers</h4>
                    <div class="metric-value">${metrics.magicNumbers}</div>
                </div>
                <div class="metric-card">
                    <h4>Long Functions</h4>
                    <div class="metric-value">${metrics.longFunctions}</div>
                </div>
                <div class="metric-card">
                    <h4>Unused Parameters</h4>
                    <div class="metric-value">${metrics.unusedParameters}</div>
                </div>
            </div>
        </section>`;
    }

    private generateTypeSafetySection(issues: TypeSafetyIssue[]): string {
        if (issues.length === 0) {
            return `
            <section class="report-section">
                <h2>✅ Type Safety Issues</h2>
                <div class="no-issues">No type safety issues found!</div>
            </section>`;
        }

        const issuesList = issues.map(issue => `
            <div class="issue-item ${issue.severity}">
                <div class="issue-header">
                    <span class="issue-type">${issue.type}</span>
                    <span class="issue-location">Line ${issue.line}:${issue.column}</span>
                    <span class="severity-badge ${issue.severity}">${issue.severity}</span>
                </div>
                <div class="issue-message">${issue.message}</div>
                ${issue.suggestion ? `<div class="issue-suggestion">💡 ${issue.suggestion}</div>` : ''}
            </div>
        `).join('');

        return `
        <section class="report-section">
            <h2>🔍 Type Safety Issues (${issues.length})</h2>
            <div class="issues-list">
                ${issuesList}
            </div>
        </section>`;
    }

    private generateRefactoringSection(recommendations: RefactoringRecommendation[]): string {
        if (recommendations.length === 0) {
            return `
            <section class="report-section">
                <h2>✅ Refactoring Recommendations</h2>
                <div class="no-issues">No refactoring recommendations!</div>
            </section>`;
        }

        const recommendationsList = recommendations.map(rec => `
            <div class="recommendation-item ${rec.severity}">
                <div class="recommendation-header">
                    <span class="recommendation-type">${rec.type}</span>
                    <span class="recommendation-location">Line ${rec.line}</span>
                    <span class="severity-badge ${rec.severity}">${rec.severity}</span>
                    <span class="impact-badge">${rec.estimatedImpact}</span>
                    ${rec.autoFixAvailable ? '<span class="autofix-badge">🔧 Auto-fix</span>' : ''}
                </div>
                <div class="recommendation-description">${rec.description}</div>
            </div>
        `).join('');

        return `
        <section class="report-section">
            <h2>🔧 Refactoring Recommendations (${recommendations.length})</h2>
            <div class="recommendations-list">
                ${recommendationsList}
            </div>
        </section>`;
    }

    private generateDeadCodeSection(issues: DeadCodeIssue[]): string {
        if (issues.length === 0) {
            return `
            <section class="report-section">
                <h2>✅ Dead Code Analysis</h2>
                <div class="no-issues">No dead code detected!</div>
            </section>`;
        }

        const issuesList = issues.map(issue => `
            <div class="dead-code-item ${issue.confidence}">
                <div class="dead-code-header">
                    <span class="dead-code-type">${issue.type}</span>
                    <span class="dead-code-name">${issue.name}</span>
                    <span class="dead-code-location">Line ${issue.line}</span>
                    <span class="confidence-badge ${issue.confidence}">${issue.confidence}</span>
                </div>
                <div class="dead-code-description">${issue.description}</div>
            </div>
        `).join('');

        return `
        <section class="report-section">
            <h2>🧹 Dead Code Analysis (${issues.length})</h2>
            <div class="dead-code-list">
                ${issuesList}
            </div>
        </section>`;
    }

    private generateSearchResultsSection(results: SearchResult[]): string {
        if (results.length === 0) return '';

        const resultsList = results.map((result, index) => `
            <div class="search-result-item">
                <div class="search-result-header">
                    <span class="result-number">${index + 1}</span>
                    <span class="result-location">Line ${result.line}</span>
                    <span class="confidence-badge">${Math.round((result.confidence || 0.8) * 100)}%</span>
                </div>
                <div class="search-result-explanation">${result.explanation}</div>
                <pre class="search-result-code"><code>${this.escapeHtml(result.content)}</code></pre>
            </div>
        `).join('');

        return `
        <section class="report-section">
            <h2>🔍 Search Results (${results.length})</h2>
            <div class="search-results-list">
                ${resultsList}
            </div>
        </section>`;
    }

    private generateProjectChartsSection(report: ProjectReport): string {
        return `
        <section class="report-section">
            <h2>📊 Project Overview</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Quality Score Distribution</h3>
                    <canvas id="qualityChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Issues by Type</h3>
                    <canvas id="issuesChart" width="400" height="200"></canvas>
                </div>
            </div>
        </section>`;
    }

    private generateFileListSection(files: FileAnalysisReport[]): string {
        const filesList = files.map(file => {
            const qualityScore = this.calculateQualityScore(file);
            const issueCount = file.typeSafetyIssues.length + 
                             file.refactoringRecommendations.length + 
                             file.deadCodeIssues.length;
            
            return `
            <div class="file-item">
                <div class="file-header">
                    <h4>${file.relativePath}</h4>
                    <div class="file-stats">
                        <span class="quality-score ${this.getScoreClass(qualityScore)}">${qualityScore}/100</span>
                        <span class="issue-count">${issueCount} issues</span>
                    </div>
                </div>
                <div class="file-details">
                    <span>📏 ${this.formatFileSize(file.fileSize)}</span>
                    <span>📝 ${file.lineCount} lines</span>
                    <span>⚠️ ${file.typeSafetyIssues.length} type issues</span>
                    <span>🔧 ${file.refactoringRecommendations.length} recommendations</span>
                    <span>🧹 ${file.deadCodeIssues.length} dead code</span>
                </div>
            </div>`;
        }).join('');

        return `
        <section class="report-section">
            <h2>📁 Files Analysis</h2>
            <div class="files-list">
                ${filesList}
            </div>
        </section>`;
    }

    private generateFooter(): string {
        return `
        <footer class="report-footer">
            <p>Generated by <strong>What-The-Code</strong> VS Code Extension</p>
            <p class="disclaimer">
                This report is based on static analysis and may contain false positives. 
                Always review recommendations before making changes.
            </p>
        </footer>`;
    }

    private getCommonStyles(): string {
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
                background-color: #f5f5f5;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .report-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .report-header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
            }
            
            .report-header h2 {
                font-size: 1.5rem;
                margin-bottom: 5px;
                opacity: 0.9;
            }
            
            .report-header h3 {
                font-size: 1.2rem;
                opacity: 0.8;
            }
            
            .timestamp {
                opacity: 0.7;
                margin-top: 10px;
            }
            
            .pdf-section {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .pdf-button {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 12px 24px;
                font-size: 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .pdf-button:hover {
                background: #45a049;
            }
            
            .pdf-note {
                margin-top: 8px;
                color: #666;
                font-size: 14px;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .summary-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
            }
            
            .summary-card h3 {
                margin-bottom: 15px;
                color: #555;
            }
            
            .score, .count, .size, .lines, .issues {
                font-size: 2rem;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .score.excellent { color: #4CAF50; }
            .score.good { color: #8BC34A; }
            .score.fair { color: #FFC107; }
            .score.poor { color: #FF9800; }
            .score.critical { color: #F44336; }
            
            .risk.low { color: #4CAF50; }
            .risk.medium { color: #FF9800; }
            .risk.high { color: #F44336; }
            
            .report-section {
                background: white;
                margin-bottom: 30px;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .report-section h2 {
                margin-bottom: 20px;
                color: #333;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            }
            
            .no-issues {
                text-align: center;
                color: #4CAF50;
                font-size: 1.2rem;
                padding: 40px;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
            }
            
            .metric-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                border-left: 4px solid #007acc;
            }
            
            .metric-card h4 {
                margin-bottom: 10px;
                color: #555;
            }
            
            .metric-value {
                font-size: 1.5rem;
                font-weight: bold;
                color: #333;
                margin-bottom: 10px;
            }
            
            .metric-bar {
                width: 100%;
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .metric-fill {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                transition: width 0.3s ease;
            }
            
            .complexity-indicator {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                margin-top: 10px;
            }
            
            .complexity-indicator.low { background: #4CAF50; }
            .complexity-indicator.medium { background: #FF9800; }
            .complexity-indicator.high { background: #F44336; }
            
            .issues-list, .recommendations-list, .dead-code-list, .search-results-list, .files-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .issue-item, .recommendation-item, .dead-code-item, .search-result-item, .file-item {
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 15px;
                background: #fafafa;
            }
            
            .issue-header, .recommendation-header, .dead-code-header, .search-result-header, .file-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            
            .severity-badge, .confidence-badge, .impact-badge, .autofix-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .severity-badge.error, .confidence-badge.high { background: #ffebee; color: #c62828; }
            .severity-badge.warning, .confidence-badge.medium { background: #fff3e0; color: #ef6c00; }
            .severity-badge.info, .confidence-badge.low { background: #e3f2fd; color: #1565c0; }
            
            .impact-badge { background: #e8f5e8; color: #2e7d32; }
            .autofix-badge { background: #e3f2fd; color: #1976d2; }
            
            .issue-message, .recommendation-description, .dead-code-description, .search-result-explanation {
                margin-bottom: 8px;
                color: #555;
            }
            
            .issue-suggestion {
                color: #4CAF50;
                font-style: italic;
            }
            
            .search-result-code {
                background: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 13px;
                border-left: 3px solid #007acc;
            }
            
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 30px;
                margin-bottom: 30px;
            }
            
            .chart-container {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                text-align: center;
            }
            
            .chart-container h3 {
                margin-bottom: 15px;
                color: #555;
            }
            
            .file-stats {
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .file-details {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                font-size: 14px;
                color: #666;
            }
            
            .quality-score {
                font-weight: bold;
                padding: 4px 8px;
                border-radius: 4px;
                background: #f0f0f0;
            }
            
            .issue-count {
                color: #666;
            }
            
            .report-footer {
                text-align: center;
                margin-top: 40px;
                padding: 20px;
                border-top: 1px solid #eee;
                color: #666;
            }
            
            .disclaimer {
                font-size: 14px;
                margin-top: 10px;
                font-style: italic;
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 10px;
                }
                
                .summary-grid {
                    grid-template-columns: 1fr;
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
                
                .charts-grid {
                    grid-template-columns: 1fr;
                }
                
                .file-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .file-stats {
                    margin-top: 10px;
                }
            }
            
            @media print {
                body {
                    background: white;
                }
                
                .pdf-section {
                    display: none;
                }
                
                .report-section {
                    break-inside: avoid;
                    box-shadow: none;
                    border: 1px solid #ddd;
                }
            }
        </style>`;
    }

    private getPDFScript(): string {
        return `
        <script>
            document.getElementById('generatePDF').addEventListener('click', function() {
                // Hide PDF button before generating
                const pdfSection = document.querySelector('.pdf-section');
                pdfSection.style.display = 'none';
                
                window.print();
                
                // Show PDF button again after a delay
                setTimeout(() => {
                    pdfSection.style.display = 'block';
                }, 1000);
            });
        </script>`;
    }

    private getChartsScript(report: ProjectReport): string {
        const qualityScores = report.files.map(f => this.calculateQualityScore(f));
        const issuesByType = this.aggregateIssuesByType(report.files);

        return `
        <script>
            // Quality Score Distribution Chart
            const qualityCtx = document.getElementById('qualityChart').getContext('2d');
            const qualityScores = ${JSON.stringify(qualityScores)};
            const qualityBins = [0, 0, 0, 0, 0]; // excellent, good, fair, poor, critical
            
            qualityScores.forEach(score => {
                if (score >= 90) qualityBins[0]++;
                else if (score >= 75) qualityBins[1]++;
                else if (score >= 60) qualityBins[2]++;
                else if (score >= 40) qualityBins[3]++;
                else qualityBins[4]++;
            });
            
            new Chart(qualityCtx, {
                type: 'bar',
                data: {
                    labels: ['Excellent (90-100)', 'Good (75-89)', 'Fair (60-74)', 'Poor (40-59)', 'Critical (0-39)'],
                    datasets: [{
                        label: 'Number of Files',
                        data: qualityBins,
                        backgroundColor: ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']
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
            
            // Issues by Type Chart
            const issuesCtx = document.getElementById('issuesChart').getContext('2d');
            const issuesData = ${JSON.stringify(issuesByType)};
            
            new Chart(issuesCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(issuesData),
                    datasets: [{
                        data: Object.values(issuesData),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
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

    private calculateProjectQualityScore(reports: FileAnalysisReport[]): number {
        if (reports.length === 0) return 0;
        
        const scores = reports.map(r => this.calculateQualityScore(r));
        return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    }

    private determineRiskLevel(qualityScore: number, totalIssues: number): 'low' | 'medium' | 'high' {
        if (qualityScore >= 80 && totalIssues < 10) return 'low';
        if (qualityScore >= 60 && totalIssues < 50) return 'medium';
        return 'high';
    }

    private aggregateIssuesByType(files: FileAnalysisReport[]): Record<string, number> {
        const aggregated: Record<string, number> = {
            'Type Safety': 0,
            'Refactoring': 0,
            'Dead Code': 0
        };
        
        files.forEach(file => {
            aggregated['Type Safety'] += file.typeSafetyIssues.length;
            aggregated['Refactoring'] += file.refactoringRecommendations.length;
            aggregated['Dead Code'] += file.deadCodeIssues.length;
        });
        
        return aggregated;
    }

    private getScoreClass(score: number): string {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        if (score >= 40) return 'poor';
        return 'critical';
    }

    private getComplexityClass(complexity: number): string {
        if (complexity <= 5) return 'low';
        if (complexity <= 10) return 'medium';
        return 'high';
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private generateFileReportName(relativePath: string): string {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-'); // HH-MM
        
        // Extract just the file name without path and extension
        const fileName = path.basename(relativePath, path.extname(relativePath));
        
        // Create a shorter, cleaner name (avoid long repetitive names)
        let cleanFileName = fileName;
        if (fileName.includes('-')) {
            // If filename has dashes, take the last meaningful part
            const parts = fileName.split('-');
            cleanFileName = parts[parts.length - 1] || parts[0];
        }
        
        // Limit to 15 chars and remove any remaining special characters
        cleanFileName = cleanFileName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
        
        // Fallback if name becomes empty
        if (!cleanFileName) {
            cleanFileName = 'file';
        }
        
        return `${cleanFileName}_${dateStr}_${timeStr}.html`;
    }

    private generateProjectReportName(projectName: string): string {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-'); // HH-MM
        
        // Clean up project name - take last meaningful part if it has dashes
        let cleanProjectName = projectName;
        if (projectName.includes('-')) {
            const parts = projectName.split('-');
            // Take the last part or 'frontend'/'backend' if present
            const lastPart = parts[parts.length - 1];
            const frontendPart = parts.find(p => p.includes('frontend') || p.includes('backend'));
            cleanProjectName = frontendPart || lastPart || parts[0];
        }
        
        // Limit length and clean
        cleanProjectName = cleanProjectName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        
        // Fallback if name becomes empty
        if (!cleanProjectName) {
            cleanProjectName = 'project';
        }
        
        return `Project_${cleanProjectName}_${dateStr}_${timeStr}.html`;
    }

    private sanitizeFileName(fileName: string): string {
        return fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async openReport(reportPath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(reportPath);
            await vscode.env.openExternal(uri);
            this.outputChannel.appendLine(`📖 Opened report: ${reportPath}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to open report: ${error}`);
            vscode.window.showErrorMessage(`Failed to open report: ${error}`);
        }
    }

    async openTeamLeaderboard(): Promise<void> {
        try {
            await this.teamLeaderboard.openLeaderboard();
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to open team leaderboard: ${error}`);
            vscode.window.showErrorMessage(`Failed to open team leaderboard: ${error}`);
        }
    }

    async deleteReport(reportPath: string): Promise<boolean> {
        try {
            this.outputChannel.appendLine(`🔍 Attempting to delete report: ${reportPath}`);
            
            if (!reportPath) {
                this.outputChannel.appendLine(`❌ No report path provided`);
                vscode.window.showWarningMessage('No report path provided.');
                return false;
            }
            
            if (!fs.existsSync(reportPath)) {
                this.outputChannel.appendLine(`❌ Report file does not exist at: ${reportPath}`);
                this.outputChannel.appendLine(`📁 Reports directory: ${this.reportsPath}`);
                
                // List files in reports directory for debugging
                try {
                    const files = fs.readdirSync(this.reportsPath);
                    this.outputChannel.appendLine(`📋 Files in reports directory: ${files.join(', ')}`);
                } catch (err) {
                    this.outputChannel.appendLine(`❌ Could not read reports directory: ${err}`);
                }
                
                vscode.window.showWarningMessage('Report file does not exist.');
                return false;
            }

            const fileName = path.basename(reportPath);
            const result = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the report "${fileName}"?`,
                'Delete',
                'Cancel'
            );

            if (result === 'Delete') {
                fs.unlinkSync(reportPath);
                this.outputChannel.appendLine(`🗑️ Deleted report: ${reportPath}`);
                vscode.window.showInformationMessage(`Report "${fileName}" has been deleted.`);
                return true;
            }
            return false;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to delete report: ${error}`);
            vscode.window.showErrorMessage(`Failed to delete report: ${error}`);
            return false;
        }
    }

    getReportsPath(): string {
        return this.reportsPath;
    }

    dispose(): void {
        this.outputChannel.dispose();
        this.teamLeaderboard.dispose();
    }
}
