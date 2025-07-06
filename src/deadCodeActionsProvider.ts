import * as vscode from 'vscode';

export class DeadCodeActionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly commandId?: string,
        public readonly iconPath?: vscode.ThemeIcon,
        public readonly tooltip?: string,
        public readonly isInfo: boolean = false
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = description;
        this.tooltip = tooltip || description;
        if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
        this.iconPath = iconPath;
        this.contextValue = isInfo ? 'info-item' : 'action-item';
    }
}

export class DeadCodeActionsProvider implements vscode.TreeDataProvider<DeadCodeActionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeadCodeActionItem | undefined | null | void> = new vscode.EventEmitter<DeadCodeActionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeadCodeActionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private lastAnalysisTime: Date | null = null;
    private lastAnalysisResults: number = 0;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateAnalysisResults(issuesFound: number): void {
        this.lastAnalysisTime = new Date();
        this.lastAnalysisResults = issuesFound;
        this.refresh();
    }

    getTreeItem(element: DeadCodeActionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DeadCodeActionItem): Thenable<DeadCodeActionItem[]> {
        if (!element) {
            const items: DeadCodeActionItem[] = [
                new DeadCodeActionItem(
                    '🧹 Analyze Dead Code',
                    'Find unused code in project',
                    'what-the-code.findDeadCode',
                    new vscode.ThemeIcon('search-remove'),
                    'Analyze your codebase to find potentially unused imports, functions, variables, and components. This helps clean up your code and reduce bundle size.'
                )
            ];

            
            if (this.lastAnalysisTime && this.lastAnalysisResults > 0) {
                items.push(
                    new DeadCodeActionItem(
                        '✅ Remove (Safe)',
                        'High-confidence items only',
                        'what-the-code.removeDeadCodeSafe',
                        new vscode.ThemeIcon('trash'),
                        'Remove only high-confidence dead code items with automatic backups. This is the safest option.'
                    ),
                    new DeadCodeActionItem(
                        '🔍 Preview Removal',
                        'See what would be removed',
                        'what-the-code.removeDeadCodeDryRun',
                        new vscode.ThemeIcon('eye'),
                        'Preview what would be removed without making actual changes. Perfect for reviewing before cleanup.'
                    ),
                    new DeadCodeActionItem(
                        '🔧 Remove (Interactive)',
                        'Confirm each file',
                        'what-the-code.removeDeadCodeInteractive',
                        new vscode.ThemeIcon('edit'),
                        'Remove dead code with confirmation for each file. You can review and approve changes file by file.'
                    )
                );
            }

            // Add status information
            
            if (this.lastAnalysisTime) {
                const timeAgo = this.formatTimeAgo(this.lastAnalysisTime);
                items.push(
                    new DeadCodeActionItem(
                        '📊 Last Analysis',
                        `${timeAgo}`,
                        undefined,
                        new vscode.ThemeIcon('clock'),
                        `Last analysis completed ${timeAgo}`,
                        true
                    ),
                    new DeadCodeActionItem(
                        this.lastAnalysisResults === 0 ? '✅ No Issues Found' : `⚠️ ${this.lastAnalysisResults} Issues Found`,
                        this.lastAnalysisResults === 0 ? 'Code looks clean!' : 'Click to view report',
                        this.lastAnalysisResults > 0 ? 'what-the-code.findDeadCode' : undefined,
                        new vscode.ThemeIcon(this.lastAnalysisResults === 0 ? 'check' : 'warning'),
                        this.lastAnalysisResults === 0 
                            ? 'No obvious dead code detected in your last analysis'
                            : `Found ${this.lastAnalysisResults} potential issues. Click to run analysis again and view detailed report.`,
                        true
                    )
                );
            } else {
                items.push(
                    new DeadCodeActionItem(
                        '💡 Never Analyzed',
                        'Run your first analysis',
                        undefined,
                        new vscode.ThemeIcon('lightbulb'),
                        'You haven\'t run dead code analysis yet. Click the analyze button above to get started!',
                        true
                    )
                );
            }

            // Add helpful information
            
            items.push(
                new DeadCodeActionItem(
                    '📖 What is Dead Code?',
                    'Unused imports, functions, variables',
                    undefined,
                    new vscode.ThemeIcon('book'),
                    'Dead code refers to parts of your codebase that are no longer used or executed. This can include unused imports, functions that are never called, variables that are never referenced, or React components that are never rendered.',
                    true
                ),
                new DeadCodeActionItem(
                    '🎯 Benefits of Cleanup',
                    'Smaller bundles, better performance',
                    undefined,
                    new vscode.ThemeIcon('target'),
                    'Removing dead code reduces bundle size, improves build times, makes your codebase easier to maintain, and can improve runtime performance.',
                    true
                )
            );

            return Promise.resolve(items);
        }
        return Promise.resolve([]);
    }

    private formatTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'just now';
        }
        if (diffMins < 60) {
            return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        }
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        }
        if (diffDays === 1) {
            return 'yesterday';
        }
        if (diffDays < 7) {
            return `${diffDays} days ago`;
        }
        return date.toLocaleDateString();
    }

    getParent(element: DeadCodeActionItem): vscode.ProviderResult<DeadCodeActionItem> {
        return null;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
