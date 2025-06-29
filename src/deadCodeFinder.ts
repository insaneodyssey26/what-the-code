import * as vscode from 'vscode';
import { ProjectFileCollector, ProjectFile } from './getProjectFiles';
import { DeadCodeAnalyzer, DeadCodeIssue } from './analyzeDeadCode';

export class DeadCodeFinder {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Dead Code Finder');
    }

    async findDeadCode(): Promise<void> {
        try {
            this.outputChannel.clear();
            this.outputChannel.show(true);
            this.log('🧹 Dead Code Finder - Starting analysis...\n');

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Finding dead code...',
                cancellable: true
            }, async (progress, token) => {
                // Step 1: Collect project files
                progress.report({ increment: 10, message: 'Collecting project files...' });
                const collector = new ProjectFileCollector();
                const files = await collector.collectProjectFiles();
                
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

                // Step 2: Analyze files
                progress.report({ increment: 20, message: 'Initializing analyzer...' });
                const analyzer = new DeadCodeAnalyzer();
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
                        analyzer.dispose();
                        return;
                    }

                    processedFiles++;
                    const progressPercent = Math.floor((processedFiles / totalFiles) * 60); // 60% of progress for analysis
                    progress.report({ 
                        increment: 0, 
                        message: `Analyzing ${file.relativePath} (${processedFiles}/${totalFiles})` 
                    });

                    try {
                        const issues = await analyzer.analyzeFile(file.filePath, rootPath);
                        allIssues.push(...issues);
                        
                        if (issues.length > 0) {
                            this.log(`🔍 ${file.relativePath}: ${issues.length} issue(s) found`);
                        }
                    } catch (error) {
                        this.log(`⚠️  Error analyzing ${file.relativePath}: ${error}`);
                    }
                }

                analyzer.dispose();

                // Step 3: Generate report
                progress.report({ increment: 80, message: 'Generating report...' });
                await this.generateReport(allIssues);
                
                progress.report({ increment: 100, message: 'Complete!' });
                
                // Show completion message
                if (allIssues.length === 0) {
                    vscode.window.showInformationMessage('No dead code found ✅');
                } else {
                    const choice = await vscode.window.showInformationMessage(
                        `Found ${allIssues.length} potential dead code issue(s)`,
                        'View Report'
                    );
                    
                    if (choice === 'View Report') {
                        this.outputChannel.show();
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
            this.log('\n✅ No dead code found! Your codebase looks clean.');
            return;
        }

        // Summary
        const summary = this.generateSummary(issues);
        this.log(`\n📈 SUMMARY:`);
        this.log(`   Total Issues: ${issues.length}`);
        this.log(`   Unused Imports: ${summary.unusedImports}`);
        this.log(`   Unused Functions: ${summary.unusedFunctions}`);
        this.log(`   Unused Variables: ${summary.unusedVariables}`);
        this.log(`   Files Affected: ${summary.affectedFiles.size}`);

        // Group by file
        const issuesByFile = this.groupIssuesByFile(issues);

        this.log(`\n🔍 DETAILED FINDINGS:`);
        for (const [filePath, fileIssues] of issuesByFile) {
            this.log(`\n📄 ${filePath} (${fileIssues.length} issue(s)):`);
            
            fileIssues.forEach((issue, index) => {
                const icon = this.getIssueIcon(issue.type);
                this.log(`   ${index + 1}. ${icon} Line ${issue.line}:${issue.column} - ${issue.description}`);
            });
        }

        // Recommendations
        this.log(`\n💡 RECOMMENDATIONS:`);
        this.log(`   • Review and remove unused imports to reduce bundle size`);
        this.log(`   • Consider removing unused functions and variables`);
        this.log(`   • Use ESLint with @typescript-eslint/no-unused-vars for ongoing monitoring`);
        this.log(`   • Be cautious with functions that might be called dynamically`);
        
        this.log(`\n⚠️  NOTE: This analysis may include false positives. Always review`);
        this.log(`   suggestions carefully before making changes.`);
    }

    private generateSummary(issues: DeadCodeIssue[]) {
        const summary = {
            unusedImports: 0,
            unusedFunctions: 0,
            unusedVariables: 0,
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

        // Sort by file path
        return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }

    private getIssueIcon(type: DeadCodeIssue['type']): string {
        switch (type) {
            case 'unused-import': return '📦';
            case 'unused-function': return '🔧';
            case 'unused-variable': return '📝';
            default: return '❓';
        }
    }

    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
