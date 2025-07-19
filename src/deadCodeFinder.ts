import * as vscode from 'vscode';
import { ProjectFileCollector, ProjectFile } from './getProjectFiles';
import { DeadCodeAnalyzer, DeadCodeIssue } from './analyzeDeadCode';
import { CodeQualityAnalyzer, CodeQualityMetrics } from './codeQualityAnalyzer';

export class DeadCodeFinder {
    private outputChannel: vscode.OutputChannel;
    private analyzer: DeadCodeAnalyzer;
    private codeQualityAnalyzer: CodeQualityAnalyzer;
    private lastAnalysisResults: DeadCodeIssue[] = [];

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Dead Code Finder');
        this.analyzer = new DeadCodeAnalyzer();
        this.codeQualityAnalyzer = new CodeQualityAnalyzer();
    }

    getLastAnalysisResults(): DeadCodeIssue[] {
        return this.lastAnalysisResults;
    }

    async findDeadCode(): Promise<void> {
        try {
            this.outputChannel.clear();
            this.outputChannel.show(true);
            this.log('🧹 Dead Code Finder - Starting analysis...\n');
            this.log('🎯 This tool analyzes your codebase to find potentially unused code.\n');

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Finding dead code...',
                cancellable: true
            }, async (progress, token) => {
                const performanceMonitor = this.analyzer.getPerformanceMonitor();
                
                progress.report({ increment: 10, message: 'Collecting project files...' });
                const collector = new ProjectFileCollector();
                const files = await collector.collectProjectFiles();
                
                const sessionId = performanceMonitor.startAnalysisSession(files.length);
                
                if (token.isCancellationRequested) {
                    return;
                }

                const fileStats = collector.getFileCount(files);
                this.log(`📁 Found ${fileStats.total} source files:`);
                Object.entries(fileStats.byExtension).forEach(([ext, count]) => {
                    this.log(`   ${ext}: ${count} files`);
                });
                this.log('');

                if (files.length === 0) {
                    this.log('❌ No supported source files found in workspace.');
                    vscode.window.showInformationMessage('No source files found to analyze.');
                    return;
                }

                
                progress.report({ increment: 20, message: 'Analyzing files for unused code...' });
                const allIssues: DeadCodeIssue[] = [];
                
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error('No workspace folder found');
                }

                const rootPath = workspaceFolder.uri.fsPath;
                const totalFiles = files.length;
                let processedFiles = 0;

                for (const file of files) {
                    if (token.isCancellationRequested) {
                        return;
                    }

                    processedFiles++;
                    const progressPercent = Math.floor((processedFiles / totalFiles) * 60);
                    progress.report({ 
                        increment: 0, 
                        message: `Analyzing ${file.relativePath} (${processedFiles}/${totalFiles})` 
                    });

                    try {
                        const issues = await this.analyzer.analyzeFile(file.filePath, rootPath);
                        allIssues.push(...issues);
                        
                        if (issues.length > 0) {
                            this.log(`🔍 ${file.relativePath}: ${issues.length} potential issue(s) found`);
                        }
                    } catch (error) {
                        this.log(`⚠️  Error analyzing ${file.relativePath}: ${error}`);
                    }
                }

                    
                progress.report({ increment: 80, message: 'Generating report...' });
                this.lastAnalysisResults = allIssues;
                
                const session = performanceMonitor.endAnalysisSession(sessionId);
                if (session) {
                    const performanceReport = performanceMonitor.generatePerformanceReport(sessionId);
                    this.log(performanceReport);
                    
                    const comparison = performanceMonitor.compareWithPrevious(sessionId);
                    if (comparison) {
                        this.log(comparison);
                    }
                }
                
                await this.generateReport(allIssues);
                
                progress.report({ increment: 100, message: 'Complete!' });
                
                if (allIssues.length === 0) {
                    vscode.window.showInformationMessage('No obviously unused code found ✅');
                } else {
                    const choice = await vscode.window.showInformationMessage(
                        `Found ${allIssues.length} potential dead code issue(s)`,
                        'View Report',
                        'Learn More'
                    );
                    
                    if (choice === 'View Report') {
                        this.outputChannel.show();
                    } else if (choice === 'Learn More') {
                        this.showHelpDialog();
                    }
                }
            });

        } catch (error) {
            this.log(`❌ Error during analysis: ${error}`);
            vscode.window.showErrorMessage(`Dead code analysis failed: ${error}`);
        }
    }

    private async generateReport(issues: DeadCodeIssue[]): Promise<void> {
        this.log('\n' + '='.repeat(80));
        this.log('📊 DEAD CODE ANALYSIS REPORT');
        this.log('='.repeat(80));

        if (issues.length === 0) {
            this.log('\n✅ No obviously unused code found!');
            this.log('\nThis doesn\'t guarantee your codebase has zero dead code, but the most');
            this.log('common patterns of unused imports, functions, and variables were not detected.');
            return;
        }

        const summary = this.generateSummary(issues);
        this.log(`\n📈 SUMMARY:`);
        this.log(`   Total Issues: ${issues.length}`);
        this.log(`   Unused Imports: ${summary.unusedImports}`);
        this.log(`   Unused Functions: ${summary.unusedFunctions}`);
        this.log(`   Unused Variables: ${summary.unusedVariables}`);
        this.log(`   Unused Components: ${summary.unusedComponents}`);
        this.log(`   Files Affected: ${summary.affectedFiles.size}`);

        const highConfidence = issues.filter(i => i.confidence === 'high').length;
        const mediumConfidence = issues.filter(i => i.confidence === 'medium').length;
        const lowConfidence = issues.filter(i => i.confidence === 'low').length;
        
        this.log(`\n🎯 CONFIDENCE LEVELS:`);
        this.log(`   High Confidence: ${highConfidence} (likely safe to remove)`);
        this.log(`   Medium Confidence: ${mediumConfidence} (review carefully)`);
        this.log(`   Low Confidence: ${lowConfidence} (might be false positives)`);

        const issuesByFile = this.groupIssuesByFile(issues);

        this.log(`\n🔍 DETAILED FINDINGS:`);
        for (const [filePath, fileIssues] of issuesByFile) {
            this.log(`\n📄 ${filePath} (${fileIssues.length} issue(s)):`);
            
            fileIssues.forEach((issue, index) => {
                const icon = this.getIssueIcon(issue.type);
                const confidenceIcon = this.getConfidenceIcon(issue.confidence);
                this.log(`   ${index + 1}. ${icon} ${confidenceIcon} Line ${issue.line} - ${issue.description}`);
            });
        }

        this.log(`\n💡 ACTIONABLE RECOMMENDATIONS:`);
        
        if (summary.unusedImports > 0) {
            this.log(`\n🎯 UNUSED IMPORTS (${summary.unusedImports}):`);
            this.log(`   • These can usually be safely removed to reduce bundle size`);
            this.log(`   • Clean up imports to improve code maintainability`);
            this.log(`   • Consider using ESLint's no-unused-vars rule`);
        }
        
        if (summary.unusedFunctions > 0) {
            this.log(`\n🎯 UNUSED FUNCTIONS (${summary.unusedFunctions}):`);
            this.log(`   • Review each function carefully before removing`);
            this.log(`   • Check if they might be called dynamically or from tests`);
            this.log(`   • Consider if they're part of a public API`);
        }
        
        if (summary.unusedVariables > 0) {
            this.log(`\n🎯 UNUSED VARIABLES (${summary.unusedVariables}):`);
            this.log(`   • These can usually be safely removed`);
            this.log(`   • Clean up to improve code readability`);
        }
        
        if (summary.unusedComponents > 0) {
            this.log(`\n🎯 UNUSED COMPONENTS (${summary.unusedComponents}):`);
            this.log(`   • Check if components are used in routing or dynamic imports`);
            this.log(`   • Verify they're not referenced in JSX files not analyzed`);
        }

        this.log(`\n⚠️  IMPORTANT NOTES:`);
        this.log(`   • This analysis uses static code analysis and may have false positives`);
        this.log(`   • Always review suggestions carefully before making changes`);
        this.log(`   • Consider running tests after removing any code`);
        this.log(`   • Some code might be used dynamically or in ways not easily detected`);
        this.log(`   • For runtime analysis, consider using browser dev tools or coverage reports`);
        
        this.log(`\n🚀 NEXT STEPS:`);
        this.log(`   1. Start with high-confidence unused imports (safest to remove)`);
        this.log(`   2. Review medium-confidence issues carefully`);
        this.log(`   3. Run your tests after each cleanup`);
        this.log(`   4. Consider setting up ESLint rules to prevent future dead code`);
    }

    private generateSummary(issues: DeadCodeIssue[]) {
        const summary = {
            unusedImports: 0,
            unusedFunctions: 0,
            unusedVariables: 0,
            unusedComponents: 0,
            affectedFiles: new Set<string>()
        };

        issues.forEach(issue => {
            summary.affectedFiles.add(issue.relativePath);
            
            switch (issue.type) {
                case 'unused-import':
                    summary.unusedImports++;
                    break;
                case 'unused-function':
                    summary.unusedFunctions++;
                    break;
                case 'unused-variable':
                    summary.unusedVariables++;
                    break;
                case 'unused-component':
                    summary.unusedComponents++;
                    break;
            }
        });

        return summary;
    }

    private groupIssuesByFile(issues: DeadCodeIssue[]): Map<string, DeadCodeIssue[]> {
        const grouped = new Map<string, DeadCodeIssue[]>();
        
        issues.forEach(issue => {
            if (!grouped.has(issue.relativePath)) {
                grouped.set(issue.relativePath, []);
            }
            grouped.get(issue.relativePath)!.push(issue);
        });

        return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }

    private getIssueIcon(type: DeadCodeIssue['type']): string {
        switch (type) {
            case 'unused-import': return '📦';
            case 'unused-function': return '🔧';
            case 'unused-variable': return '📝';
            case 'unused-component': return '⚛️';
            case 'unused-route': return '🛣️';
            default: return '❓';
        }
    }

    private getConfidenceIcon(confidence: 'high' | 'medium' | 'low'): string {
        switch (confidence) {
            case 'high': return '🎯';
            case 'medium': return '⚠️';
            case 'low': return '❓';
            default: return '❓';
        }
    }

    private showHelpDialog(): void {
        const message = `
Dead Code Analysis Help

🎯 What this tool does:
• Finds potentially unused imports, functions, variables, and components
• Provides confidence levels for each finding
• Helps you clean up your codebase

⚠️ Important limitations:
• Uses static analysis (doesn't run your code)
• May not detect dynamic usage patterns
• Can have false positives

🚀 Best practices:
• Start with high-confidence unused imports
• Always test after removing code
• Use version control to back up changes
• Consider using ESLint for ongoing monitoring

💡 For runtime analysis:
• Use browser dev tools' Coverage tab
• Run your app and see what code actually executes
• Consider webpack-bundle-analyzer for bundle analysis
        `;

        vscode.window.showInformationMessage(message, { modal: true });
    }

    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    dispose(): void {
        this.analyzer.dispose();
        this.outputChannel.dispose();
    }
}
