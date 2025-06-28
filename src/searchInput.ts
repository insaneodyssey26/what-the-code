import * as vscode from 'vscode';

export class SearchInput {
	private static quickPick: vscode.QuickPick<vscode.QuickPickItem> | undefined;

	static async showSearchDialog(): Promise<string | undefined> {
		return new Promise((resolve) => {
			const quickPick = vscode.window.createQuickPick();
			this.quickPick = quickPick;

			quickPick.title = '🔍 Ask Your Code';
			quickPick.placeholder = 'Type your question about the codebase...';
			quickPick.ignoreFocusOut = false;
			quickPick.canSelectMany = false;
			
			const examples = [
				{
					label: '$(react) React components that handle forms',
					description: 'Find form components, input handling, validation',
					detail: 'React/UI query'
				},
				{
					label: '$(symbol-event) Event handlers for user interactions',
					description: 'Find onClick, onSubmit, onHover handlers',
					detail: 'Interaction query'
				},
				{
					label: '$(database) API calls and data fetching',
					description: 'Find fetch, axios, useEffect with API calls',
					detail: 'Data query'
				},
				{
					label: '$(paintcan) CSS styles for buttons and layouts',
					description: 'Find styled components, CSS modules, SCSS',
					detail: 'Styling query'
				},
				{
					label: '$(pulse) Loading states and error handling',
					description: 'Find spinners, error boundaries, try/catch',
					detail: 'State query'
				},
				{
					label: '$(location) Navigation and routing code',
					description: 'Find React Router, navigation components',
					detail: 'Navigation query'
				},
				{
					label: '$(shield) Authentication and login flows',
					description: 'Find login forms, auth guards, user sessions',
					detail: 'Auth query'
				},
				{
					label: '$(device-mobile) Responsive design patterns',
					description: 'Find media queries, mobile-first CSS',
					detail: 'Mobile query'
				}
			];

			quickPick.items = examples;

			quickPick.onDidChangeValue((value) => {
				if (value.trim().length > 0) {
					quickPick.items = [];
				} else {
					quickPick.items = examples;
				}
			});

			quickPick.onDidAccept(() => {
				const value = quickPick.value.trim();
				const selected = quickPick.selectedItems[0];
				
				if (value) {
					resolve(value);
				} else if (selected && (selected.detail === 'Example query' || selected.detail?.includes('query'))) {
					const query = selected.label.replace(/^\$\([^)]+\)\s*/, '');
					resolve(query);
				}
				
				quickPick.dispose();
			});

			quickPick.onDidHide(() => {
				resolve(undefined);
				quickPick.dispose();
			});

			quickPick.items = [
				...examples,
				{
					label: '',
					kind: vscode.QuickPickItemKind.Separator
				},
				{
					label: '💡 Tips for UI/UX developers:',
					description: 'Be specific about components, use React/CSS terms, ask about user interactions',
					detail: 'Tip'
				},
				{
					label: '⚡ Quick setup:',
					description: 'Run "Apply Frontend/UI Preset" command for optimized settings',
					detail: 'Setup tip'
				}
			];

			quickPick.show();
		});
	}

	static async showQuickSearchOptions(): Promise<string | undefined> {
		const options = [
			{
				label: '$(search) New Search',
				description: 'Ask a new question about your code',
				action: 'search'
			},
			{
				label: '$(settings-gear) Configure AI Settings',
				description: 'Set up Ollama or Gemini API',
				action: 'settings'
			},
			{
				label: '$(pulse) Test Ollama Connection',
				description: 'Check if Ollama is running and model is loaded',
				action: 'test'
			}
		];

		const selected = await vscode.window.showQuickPick(options, {
			placeHolder: 'What would you like to do?',
			ignoreFocusOut: false
		});

		return selected?.action;
	}

	static dispose() {
		if (this.quickPick) {
			this.quickPick.dispose();
			this.quickPick = undefined;
		}
	}
}
