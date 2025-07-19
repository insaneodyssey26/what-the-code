import * as vscode from 'vscode';
import { SearchResult } from './types';

export class SearchResultItem extends vscode.TreeItem {
	constructor(
		public readonly result: SearchResult,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly isGroup: boolean = false
	) {
		super(
			isGroup ? `${vscode.workspace.asRelativePath(result.file)}` : `📍 Line ${result.line}: ${result.explanation}`,
			collapsibleState
		);

		if (!isGroup) {
			this.tooltip = `${result.explanation}\n\nFile: ${vscode.workspace.asRelativePath(result.file)}\nLine: ${result.line}\nContent: ${result.content.substring(0, 100)}...\n\nClick to open file at line ${result.line}`;
			this.description = `Line ${result.line}`;
			this.command = {
				command: 'what-the-code.openResult',
				title: 'Open Result',
				arguments: [result]
			};
			this.iconPath = new vscode.ThemeIcon('symbol-snippet');
		} else {
			this.tooltip = `File: ${vscode.workspace.asRelativePath(result.file)}`;
			this.iconPath = new vscode.ThemeIcon('file-code');
			this.contextValue = 'searchResultFile';
		}
	}
}

export class SearchResultsProvider implements vscode.TreeDataProvider<SearchResultItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<SearchResultItem | undefined | null | void> = new vscode.EventEmitter<SearchResultItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<SearchResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private results: SearchResult[] = [];
	private query: string = '';

	constructor() {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	updateResults(query: string, results: SearchResult[]): void {
		this.query = query;
		this.results = results;
		this.refresh();
	}

	clearResults(): void {
		this.results = [];
		this.query = '';
		this.refresh();
	}

	getTreeItem(element: SearchResultItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: SearchResultItem): Thenable<SearchResultItem[]> {
		if (!element) {
			
			if (this.results.length === 0) {
				return Promise.resolve([]);
			}

			
			const fileGroups = new Map<string, SearchResult[]>();
			this.results.forEach(result => {
				const filePath = result.file;
				if (!fileGroups.has(filePath)) {
					fileGroups.set(filePath, []);
				}
				fileGroups.get(filePath)!.push(result);
			});

			
			const fileItems: SearchResultItem[] = [];
			fileGroups.forEach((results, filePath) => {
				const lines = results.map(r => r.line).sort((a, b) => a - b);
				const lineRange = lines.length > 1 ? `Lines ${lines[0]}-${lines[lines.length - 1]}` : `Line ${lines[0]}`;
				
				const fileResult: SearchResult = {
					file: filePath,
					line: results[0].line,
					content: `${results.length} result(s) found`,
					explanation: `${results.length} matches found (${lineRange})`,
					confidence: results[0].confidence
				};

				const fileItem = new SearchResultItem(
					fileResult,
					vscode.TreeItemCollapsibleState.Expanded,
					true
				);
				
			
				(fileItem as any).childResults = results;
				fileItems.push(fileItem);
			});

			return Promise.resolve(fileItems);
		} else if (element.isGroup) {
		
			const childResults = (element as any).childResults as SearchResult[];
			const childItems = childResults.map((result, index) => 
				new SearchResultItem(
					{
						...result,
						explanation: `${result.explanation}`
					},
					vscode.TreeItemCollapsibleState.None,
					false
				)
			);
			return Promise.resolve(childItems);
		}

		return Promise.resolve([]);
	}

	getParent(element: SearchResultItem): vscode.ProviderResult<SearchResultItem> {
		return null;
	}

	dispose(): void {
		this._onDidChangeTreeData.dispose();
	}
}
