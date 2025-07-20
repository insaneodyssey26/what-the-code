import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportInfo {
    filePath: string;
    fileName: string;
    timestamp: Date;
    size: number;
    isProjectReport: boolean;
}

export class ReportsProvider implements vscode.TreeDataProvider<ReportInfo> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReportInfo | undefined | null | void> = new vscode.EventEmitter<ReportInfo | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ReportInfo | undefined | null | void> = this._onDidChangeTreeData.event;

    private reportsPath: string;

    constructor(reportsPath: string) {
        this.reportsPath = reportsPath;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ReportInfo): vscode.TreeItem {
        const label = element.isProjectReport ? `📊 ${element.fileName}` : `📄 ${element.fileName}`;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        
        item.description = `${this.formatDate(element.timestamp)} • ${this.formatFileSize(element.size)}`;
        item.tooltip = `File: ${element.filePath}\nCreated: ${element.timestamp.toLocaleString()}\nSize: ${this.formatFileSize(element.size)}`;
        item.command = {
            command: 'what-the-code.openReport',
            title: 'Open Report',
            arguments: [element.filePath]
        };
        item.contextValue = 'report';
        
        if (element.isProjectReport) {
            item.iconPath = new vscode.ThemeIcon('graph');
        } else {
            item.iconPath = new vscode.ThemeIcon('file-text');
        }

        return item;
    }

    getChildren(element?: ReportInfo): Promise<ReportInfo[]> {
        if (!element) {
            return this.getReportFiles();
        }
        return Promise.resolve([]);
    }

    private async getReportFiles(): Promise<ReportInfo[]> {
        if (!fs.existsSync(this.reportsPath)) {
            return [];
        }

        const files = fs.readdirSync(this.reportsPath)
            .filter((file: string) => file.endsWith('.html'))
            .sort((a: string, b: string) => {
                const statA = fs.statSync(path.join(this.reportsPath, a));
                const statB = fs.statSync(path.join(this.reportsPath, b));
                return statB.mtime.getTime() - statA.mtime.getTime(); // Sort by modified time, newest first
            });

        return files.map((file: string) => {
            const filePath = path.join(this.reportsPath, file);
            const stats = fs.statSync(filePath);
            const isProjectReport = file.startsWith('Project_');
            
            // Extract a cleaner display name from the new naming format
            let fileName = file.replace(/\.(html)$/, ''); // Remove .html
            
            if (isProjectReport) {
                // For project reports: Project_name_YYYY-MM-DD_HH-MM.html -> "name (YYYY-MM-DD HH:MM)"
                const parts = fileName.split('_');
                if (parts.length >= 4) {
                    const name = parts[1];
                    const date = parts[2];
                    const time = parts[3].replace('-', ':');
                    fileName = `${name} (${date} ${time})`;
                }
            } else {
                // For file reports: filename_YYYY-MM-DD_HH-MM.html -> "filename (YYYY-MM-DD HH:MM)"
                const parts = fileName.split('_');
                if (parts.length >= 3) {
                    const name = parts[0];
                    const date = parts[1];
                    const time = parts[2].replace('-', ':');
                    fileName = `${name} (${date} ${time})`;
                }
            }

            return {
                filePath,
                fileName,
                timestamp: stats.mtime,
                size: stats.size,
                isProjectReport
            };
        });
    }

    private formatDate(date: Date): string {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    dispose(): void {
        // Cleanup if needed
    }
}
