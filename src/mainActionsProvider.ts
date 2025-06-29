import * as vscode from 'vscode';

export class ActionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly commandId: string,
        public readonly iconPath: vscode.ThemeIcon,
        public readonly tooltip?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = description;
        this.tooltip = tooltip || description;
        this.command = {
            command: commandId,
            title: label
        };
        this.iconPath = iconPath;
        this.contextValue = 'action-item';
    }
}

export class MainActionsProvider implements vscode.TreeDataProvider<ActionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ActionItem | undefined | null | void> = new vscode.EventEmitter<ActionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ActionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ActionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ActionItem): Thenable<ActionItem[]> {
        if (!element) {
            // Root level - return main actions
            const actions: ActionItem[] = [
                new ActionItem(
                    '🔍 Ask Your Code',
                    'Search codebase with AI',
                    'what-the-code.searchCode',
                    new vscode.ThemeIcon('search'),
                    'Use AI to search and understand your codebase - ask questions like "Where is user authentication handled?" or "Show me all React components"'
                ),
                new ActionItem(
                    '📸 Save Snapshot',
                    'Save current file state',
                    'what-the-code.saveSnapshot',
                    new vscode.ThemeIcon('save'),
                    'Create a snapshot of the current file that you can restore later - perfect for checkpointing before major changes'
                ),
                new ActionItem(
                    '🧪 Test Gemini API',
                    'Test AI connection',
                    'what-the-code.testGemini',
                    new vscode.ThemeIcon('plug'),
                    'Test your Gemini API connection to ensure the AI features are working properly'
                ),
                new ActionItem(
                    '⚙️ Configure Settings',
                    'Open extension settings',
                    'what-the-code.openSettings',
                    new vscode.ThemeIcon('settings-gear'),
                    'Configure your API key, model preferences, and other extension settings'
                )
            ];
            return Promise.resolve(actions);
        }
        return Promise.resolve([]);
    }

    getParent(element: ActionItem): vscode.ProviderResult<ActionItem> {
        return null;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
