import * as vscode from 'vscode';
import * as fs from 'fs';
import { DeadCodeIssue } from './analyzeDeadCode';

export interface RemovalResult {
    success: boolean;
    removedCount: number;
    errors: string[];
    modifiedFiles: string[];
}

export interface RemovalOptions {
    createBackup: boolean;
    confirmEach: boolean;
    onlyHighConfidence: boolean;
    dryRun: boolean;
}

export class DeadCodeRemover {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Dead Code Remover');
    }

    async removeDeadCode(issues: DeadCodeIssue[], options: RemovalOptions): Promise<RemovalResult> {
        const result: RemovalResult = {
            success: true,
            removedCount: 0,
            errors: [],
            modifiedFiles: []
        };

        try {
            this.outputChannel.clear();
            this.outputChannel.show(true);
            this.log('🧹 Dead Code Remover - Starting cleanup...\n');

            let filteredIssues = issues;
            if (options.onlyHighConfidence) {
                filteredIssues = issues.filter(issue => issue.confidence === 'high');
                this.log(`🎯 Filtering to high confidence issues only: ${filteredIssues.length}/${issues.length}`);
            }

            if (filteredIssues.length === 0) {
                this.log('❌ No issues to remove after filtering.');
                vscode.window.showInformationMessage('No issues match the removal criteria.');
                return result;
            }

            const issuesByFile = this.groupIssuesByFile(filteredIssues);
            this.log(`📁 Will process ${Object.keys(issuesByFile).length} files`);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: options.dryRun ? 'Dry run: Analyzing removals...' : 'Removing dead code...',
                cancellable: true
            }, async (progress, token) => {
                const totalFiles = Object.keys(issuesByFile).length;
                let processedFiles = 0;

                for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
                    if (token.isCancellationRequested) {
                        result.success = false;
                        break;
                    }

                    processedFiles++;
                    const progressPercent = Math.floor((processedFiles / totalFiles) * 100);
                    progress.report({ 
                        increment: progressPercent / totalFiles, 
                        message: `Processing ${vscode.workspace.asRelativePath(filePath)}...` 
                    });

                    try {
                        if (options.confirmEach) {
                            const shouldProcess = await this.confirmFileRemoval(filePath, fileIssues);
                            if (!shouldProcess) {
                                this.log(`⏭️  Skipped ${vscode.workspace.asRelativePath(filePath)} (user declined)`);
                                continue;
                            }
                        }

                        const fileResult = await this.processFile(filePath, fileIssues, options);
                        result.removedCount += fileResult.removedCount;
                        
                        if (fileResult.modified) {
                            result.modifiedFiles.push(filePath);
                        }

                        if (fileResult.errors.length > 0) {
                            result.errors.push(...fileResult.errors);
                        }

                    } catch (error: any) {
                        const errorMsg = `Error processing ${vscode.workspace.asRelativePath(filePath)}: ${error.message}`;
                        result.errors.push(errorMsg);
                        this.log(`❌ ${errorMsg}`);
                    }
                }
            });

            this.showRemovalSummary(result, options);

        } catch (error: any) {
            result.success = false;
            result.errors.push(`General error: ${error.message}`);
            this.log(`❌ Fatal error: ${error.message}`);
        }

        return result;
    }

    private async processFile(filePath: string, issues: DeadCodeIssue[], options: RemovalOptions): Promise<{
        removedCount: number;
        modified: boolean;
        errors: string[];
    }> {
        const fileResult = {
            removedCount: 0,
            modified: false,
            errors: [] as string[]
        };

        try {
            const originalContent = await fs.promises.readFile(filePath, 'utf8');
            let modifiedContent = originalContent;

            if (options.createBackup && !options.dryRun) {
                await this.createBackup(filePath, originalContent);
            }

            const sortedIssues = issues.sort((a, b) => b.line - a.line);

            this.log(`\n📄 Processing ${vscode.workspace.asRelativePath(filePath)}:`);

            for (const issue of sortedIssues) {
                try {
                    const removalResult = await this.removeIssue(modifiedContent, issue, options);
                    
                    if (removalResult.success) {
                        modifiedContent = removalResult.content;
                        fileResult.removedCount++;
                        fileResult.modified = true;
                        
                        this.log(`  ✅ ${issue.type}: ${issue.name} (line ${issue.line}) ${options.dryRun ? '[DRY RUN]' : ''}`);
                    } else {
                        this.log(`  ⚠️  Failed to remove ${issue.type}: ${issue.name} - ${removalResult.reason}`);
                        fileResult.errors.push(`${issue.name}: ${removalResult.reason}`);
                    }
                } catch (error: any) {
                    const errorMsg = `Failed to remove ${issue.name}: ${error.message}`;
                    fileResult.errors.push(errorMsg);
                    this.log(`  ❌ ${errorMsg}`);
                }
            }

            if (fileResult.modified && !options.dryRun) {
                await fs.promises.writeFile(filePath, modifiedContent, 'utf8');
                this.log(`  💾 File saved with ${fileResult.removedCount} removals`);
            } else if (options.dryRun && fileResult.removedCount > 0) {
                this.log(`  📝 [DRY RUN] Would remove ${fileResult.removedCount} items`);
            }

        } catch (error: any) {
            fileResult.errors.push(`File processing error: ${error.message}`);
        }

        return fileResult;
    }

    private async removeIssue(content: string, issue: DeadCodeIssue, options: RemovalOptions): Promise<{
        success: boolean;
        content: string;
        reason?: string;
    }> {
        const lines = content.split('\n');
        
        try {
            switch (issue.type) {
                case 'unused-import':
                    return this.removeUnusedImport(lines, issue);
                case 'unused-variable':
                    return this.removeUnusedVariable(lines, issue);
                case 'unused-function':
                    return this.removeUnusedFunction(lines, issue);
                case 'unused-component':
                    return this.removeUnusedComponent(lines, issue);
                default:
                    return {
                        success: false,
                        content,
                        reason: `Unsupported issue type: ${issue.type}`
                    };
            }
        } catch (error: any) {
            return {
                success: false,
                content,
                reason: error.message
            };
        }
    }

    private removeUnusedImport(lines: string[], issue: DeadCodeIssue): { success: boolean; content: string; reason?: string } {
        const lineIndex = issue.line - 1;
        
        if (lineIndex < 0 || lineIndex >= lines.length) {
            return { success: false, content: lines.join('\n'), reason: 'Invalid line number' };
        }

        const line = lines[lineIndex];
        
        if (!line.trim().startsWith('import')) {
            return { success: false, content: lines.join('\n'), reason: 'Line is not an import statement' };
        }

        lines.splice(lineIndex, 1);
        
        return { success: true, content: lines.join('\n') };
    }

    private removeUnusedVariable(lines: string[], issue: DeadCodeIssue): { success: boolean; content: string; reason?: string } {
        const lineIndex = issue.line - 1;
        
        if (lineIndex < 0 || lineIndex >= lines.length) {
            return { success: false, content: lines.join('\n'), reason: 'Invalid line number' };
        }

        const line = lines[lineIndex];
        
        if (line.includes(`const ${issue.name}`) || line.includes(`let ${issue.name}`) || line.includes(`var ${issue.name}`)) {
            if (line.trim().endsWith(';') || line.trim().endsWith(',')) {
                lines.splice(lineIndex, 1);
                return { success: true, content: lines.join('\n') };
            }
        }

        return { success: false, content: lines.join('\n'), reason: 'Could not safely remove variable' };
    }

    private removeUnusedFunction(lines: string[], issue: DeadCodeIssue): { success: boolean; content: string; reason?: string } {
        const lineIndex = issue.line - 1;
        
        if (lineIndex < 0 || lineIndex >= lines.length) {
            return { success: false, content: lines.join('\n'), reason: 'Invalid line number' };
        }

        const functionEnd = this.findFunctionEnd(lines, lineIndex);
        
        if (functionEnd === -1) {
            return { success: false, content: lines.join('\n'), reason: 'Could not determine function boundaries' };
        }

        lines.splice(lineIndex, functionEnd - lineIndex + 1);
        
        return { success: true, content: lines.join('\n') };
    }

    private removeUnusedComponent(lines: string[], issue: DeadCodeIssue): { success: boolean; content: string; reason?: string } {
        return this.removeUnusedFunction(lines, issue);
    }

    private findFunctionEnd(lines: string[], startIndex: number): number {
        let braceCount = 0;
        let foundOpenBrace = false;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpenBrace = true;
                } else if (char === '}') {
                    braceCount--;
                    
                    if (foundOpenBrace && braceCount === 0) {
                        return i;
                    }
                }
            }
        }
        
        return -1;
    }

    private async createBackup(filePath: string, content: string): Promise<void> {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.promises.writeFile(backupPath, content, 'utf8');
        this.log(`💾 Created backup: ${vscode.workspace.asRelativePath(backupPath)}`);
    }

    private groupIssuesByFile(issues: DeadCodeIssue[]): { [filePath: string]: DeadCodeIssue[] } {
        const grouped: { [filePath: string]: DeadCodeIssue[] } = {};
        
        for (const issue of issues) {
            if (!grouped[issue.filePath]) {
                grouped[issue.filePath] = [];
            }
            grouped[issue.filePath].push(issue);
        }
        
        return grouped;
    }

    private async confirmFileRemoval(filePath: string, issues: DeadCodeIssue[]): Promise<boolean> {
        const relativePath = vscode.workspace.asRelativePath(filePath);
        const issuesList = issues.map(i => `• ${i.type}: ${i.name} (line ${i.line})`).join('\n');
        
        const choice = await vscode.window.showWarningMessage(
            `Remove ${issues.length} dead code item(s) from ${relativePath}?\n\n${issuesList}`,
            { modal: true },
            'Yes, Remove',
            'Skip File'
        );
        
        return choice === 'Yes, Remove';
    }

    private showRemovalSummary(result: RemovalResult, options: RemovalOptions): void {
        this.log(`\n📊 Removal Summary:`);
        this.log(`   Items removed: ${result.removedCount}`);
        this.log(`   Files modified: ${result.modifiedFiles.length}`);
        this.log(`   Errors: ${result.errors.length}`);
        
        if (options.dryRun) {
            this.log(`\n🔍 This was a DRY RUN - no actual changes were made.`);
        }

        if (result.errors.length > 0) {
            this.log(`\n❌ Errors encountered:`);
            result.errors.forEach(error => this.log(`   • ${error}`));
        }

        if (options.dryRun) {
            vscode.window.showInformationMessage(
                `🔍 Dry Run Complete: Would remove ${result.removedCount} items from ${result.modifiedFiles.length} files`
            );
        } else if (result.removedCount > 0) {
            vscode.window.showInformationMessage(
                `✅ Removed ${result.removedCount} dead code items from ${result.modifiedFiles.length} files!`
            );
        } else {
            vscode.window.showInformationMessage('No items were removed.');
        }
    }

    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
