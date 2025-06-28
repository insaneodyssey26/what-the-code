import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeSnapshot {
    id: string;
    timestamp: Date;
    filePath: string;
    fileName: string;
    content: string;
    language: string;
}

export class SnapshotProvider implements vscode.TreeDataProvider<CodeSnapshot | string> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeSnapshot | string | undefined | null | void> = new vscode.EventEmitter<CodeSnapshot | string | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeSnapshot | string | undefined | null | void> = this._onDidChangeTreeData.event;

    private snapshots: CodeSnapshot[] = [];
    private snapshotsDir: string = '';

    constructor(private context: vscode.ExtensionContext) {
        this.initializeSnapshotsDirectory();
        this.loadSnapshots();
    }

    private initializeSnapshotsDirectory() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            this.snapshotsDir = path.join(workspaceFolder.uri.fsPath, '.ai-snapshots');
            if (!fs.existsSync(this.snapshotsDir)) {
                fs.mkdirSync(this.snapshotsDir, { recursive: true });
            }
        }
    }

    private loadSnapshots() {
        try {
            if (fs.existsSync(this.snapshotsDir)) {
                const files = fs.readdirSync(this.snapshotsDir)
                    .filter(f => f.endsWith('.json'))
                    .sort((a, b) => {
                        const statA = fs.statSync(path.join(this.snapshotsDir, a));
                        const statB = fs.statSync(path.join(this.snapshotsDir, b));
                        return statB.mtime.getTime() - statA.mtime.getTime();
                    });

                this.snapshots = files.map(file => {
                    const content = fs.readFileSync(path.join(this.snapshotsDir, file), 'utf8');
                    const snapshot = JSON.parse(content);
                    snapshot.timestamp = new Date(snapshot.timestamp);
                    return snapshot;
                });
            }
        } catch (error) {
            console.error('Error loading snapshots:', error);
        }
    }

    async saveSnapshot(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('No active file to snapshot');
            return;
        }

        const document = activeEditor.document;
        const snapshot: CodeSnapshot = {
            id: this.generateId(),
            timestamp: new Date(),
            filePath: document.uri.fsPath,
            fileName: path.basename(document.uri.fsPath),
            content: document.getText(),
            language: document.languageId
        };

        try {
            // Save to file
            const snapshotFile = path.join(this.snapshotsDir, `${snapshot.id}.json`);
            fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));

            // Add to memory
            this.snapshots.unshift(snapshot);

            // Refresh tree view
            this._onDidChangeTreeData.fire();

            vscode.window.showInformationMessage(`Snapshot saved! (${snapshot.fileName})`);
        } catch (error) {
            console.error('Error saving snapshot:', error);
            vscode.window.showErrorMessage(`Failed to save snapshot: ${error}`);
        }
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getTreeItem(element: CodeSnapshot | string): vscode.TreeItem {
        if (typeof element === 'string') {
            // This is a header/section
            return {
                label: element,
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                contextValue: 'header'
            };
        }

        const item = new vscode.TreeItem(element.fileName, vscode.TreeItemCollapsibleState.None);
        item.description = this.formatTimestamp(element.timestamp);
        item.tooltip = `File: ${element.filePath}\nTime: ${element.timestamp.toLocaleString()}\nLanguage: ${element.language}`;
        item.command = {
            command: 'what-the-code.openSnapshot',
            title: 'Open Snapshot',
            arguments: [element]
        };
        item.contextValue = 'snapshot';
        item.iconPath = new vscode.ThemeIcon('file-code');

        return item;
    }

    getChildren(element?: CodeSnapshot | string): Thenable<(CodeSnapshot | string)[]> {
        if (!element) {
            // Root level - return snapshots grouped by date
            if (this.snapshots.length === 0) {
                return Promise.resolve([]);
            }
            return Promise.resolve(this.snapshots);
        }
        return Promise.resolve([]);
    }

    private formatTimestamp(timestamp: Date): string {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) { return 'just now'; }
        if (minutes < 60) { return `${minutes}m ago`; }
        if (hours < 24) { return `${hours}h ago`; }
        if (days === 1) { return 'yesterday'; }
        if (days < 7) { return `${days}d ago`; }
        return timestamp.toLocaleDateString();
    }

    async openSnapshot(snapshot: CodeSnapshot): Promise<void> {
        try {
            // Create a new untitled document with the snapshot content
            const document = await vscode.workspace.openTextDocument({
                content: snapshot.content,
                language: snapshot.language
            });

            await vscode.window.showTextDocument(document);
            
            // Show info about the snapshot
            vscode.window.showInformationMessage(
                `Opened snapshot from ${snapshot.timestamp.toLocaleString()} (${snapshot.fileName})`
            );
        } catch (error) {
            console.error('Error opening snapshot:', error);
            vscode.window.showErrorMessage(`Failed to open snapshot: ${error}`);
        }
    }

    async deleteSnapshot(snapshot: CodeSnapshot): Promise<void> {
        try {
            const snapshotFile = path.join(this.snapshotsDir, `${snapshot.id}.json`);
            if (fs.existsSync(snapshotFile)) {
                fs.unlinkSync(snapshotFile);
            }

            // Remove from memory
            const index = this.snapshots.findIndex(s => s.id === snapshot.id);
            if (index >= 0) {
                this.snapshots.splice(index, 1);
            }

            this._onDidChangeTreeData.fire();
            vscode.window.showInformationMessage('Snapshot deleted');
        } catch (error) {
            console.error('Error deleting snapshot:', error);
            vscode.window.showErrorMessage(`Failed to delete snapshot: ${error}`);
        }
    }

    clearAllSnapshots(): void {
        try {
            // Delete all snapshot files
            if (fs.existsSync(this.snapshotsDir)) {
                const files = fs.readdirSync(this.snapshotsDir).filter(f => f.endsWith('.json'));
                files.forEach(file => {
                    fs.unlinkSync(path.join(this.snapshotsDir, file));
                });
            }

            // Clear memory
            this.snapshots = [];
            this._onDidChangeTreeData.fire();
            vscode.window.showInformationMessage('All snapshots cleared');
        } catch (error) {
            console.error('Error clearing snapshots:', error);
            vscode.window.showErrorMessage(`Failed to clear snapshots: ${error}`);
        }
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
