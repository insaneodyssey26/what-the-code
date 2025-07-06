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
            
            const document = await vscode.workspace.openTextDocument({
                content: snapshot.content,
                language: snapshot.language
            });

            await vscode.window.showTextDocument(document);
            
            
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
            
            if (fs.existsSync(this.snapshotsDir)) {
                const files = fs.readdirSync(this.snapshotsDir).filter(f => f.endsWith('.json'));
                files.forEach(file => {
                    fs.unlinkSync(path.join(this.snapshotsDir, file));
                });
            }

            
            this.snapshots = [];
            this._onDidChangeTreeData.fire();
            vscode.window.showInformationMessage('All snapshots cleared');
        } catch (error) {
            console.error('Error clearing snapshots:', error);
            vscode.window.showErrorMessage(`Failed to clear snapshots: ${error}`);
        }
    }

    async restoreSnapshot(snapshot: CodeSnapshot): Promise<void> {
        try {
            
            const fileUri = vscode.Uri.file(snapshot.filePath);
            
            
            const choice = await vscode.window.showWarningMessage(
                `Are you sure you want to restore "${snapshot.fileName}" to the snapshot from ${snapshot.timestamp.toLocaleString()}?\n\nThis will overwrite the current content and cannot be undone.`,
                { modal: true },
                'Yes, Restore',
                'Cancel'
            );

            if (choice !== 'Yes, Restore') {
                return;
            }

            
            let document: vscode.TextDocument;
            try {
                document = await vscode.workspace.openTextDocument(fileUri);
            } catch (error) {
                
                document = await vscode.workspace.openTextDocument({
                    content: '',
                    language: snapshot.language
                });
                
                
                await vscode.window.showTextDocument(document);
            }

            
            const editor = await vscode.window.showTextDocument(document);

            
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            
            edit.replace(fileUri, fullRange, snapshot.content);
            
            
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                
                await document.save();
                
                vscode.window.showInformationMessage(
                    `✅ Successfully restored "${snapshot.fileName}" from snapshot (${snapshot.timestamp.toLocaleString()})`
                );
            } else {
                vscode.window.showErrorMessage('Failed to apply content changes');
            }

        } catch (error) {
            console.error('Error restoring snapshot:', error);
            vscode.window.showErrorMessage(`Failed to restore snapshot: ${error}`);
        }
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
