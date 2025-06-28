import * as vscode from 'vscode';
import { CodeCollector } from './codeCollector';
import { OllamaProvider, PromptBuilder } from './aiProviders';
import { SearchResult, AIProvider } from './types';

async function displayResults(query: string, results: SearchResult[]) {
	const items = results.map(result => ({
		label: `$(file-code) ${vscode.workspace.asRelativePath(result.file)}:${result.line}`,
		description: result.explanation,
		detail: result.content.trim(),
		result: result
	}));

	const selected = await vscode.window.showQuickPick(items, {
		matchOnDescription: true,
		matchOnDetail: true,
		placeHolder: `Results for "${query}"`
	});

	if (selected) {
		const { file, line } = selected.result;
		const document = await vscode.workspace.openTextDocument(file);
		const editor = await vscode.window.showTextDocument(document);
		
		const range = new vscode.Range(line - 1, 0, line - 1, 0);
		editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
		
		const decorationType = vscode.window.createTextEditorDecorationType({
			backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
			isWholeLine: true
		});
		editor.setDecorations(decorationType, [range]);
		
		setTimeout(() => decorationType.dispose(), 3000);
	}
}

class CodeSearchProvider {
	private config: vscode.WorkspaceConfiguration;
	private outputChannel: vscode.OutputChannel;
	private codeCollector: CodeCollector;

	constructor() {
		this.config = vscode.workspace.getConfiguration('whatTheCode');
		this.outputChannel = vscode.window.createOutputChannel('What-The-Code');
		this.codeCollector = new CodeCollector();
	}

	async searchCode(query: string): Promise<SearchResult[]> {
		try {
			this.outputChannel.appendLine(`🔍 Searching for: "${query}"`);
			this.outputChannel.show(true);

			const allFiles = await this.codeCollector.collectCodeFiles();
			this.outputChannel.appendLine(`📁 Found ${allFiles.length} code files`);

			if (allFiles.length === 0) {
				vscode.window.showWarningMessage('No code files found in the workspace.');
				return [];
			}

			const relevantFiles = this.codeCollector.prioritizeFiles(allFiles, query);
			this.outputChannel.appendLine(`🎯 Selected ${relevantFiles.length} most relevant files`);

			const context = PromptBuilder.buildContextSection(relevantFiles);
			
			const prompt = PromptBuilder.buildCodeSearchPrompt(query, context);
				
			this.outputChannel.appendLine(`📝 Prepared prompt (${prompt.length} characters)`);

			const aiProvider = this.getAIProvider();
			this.outputChannel.appendLine(`🤖 Using ${aiProvider.name} provider`);

			const response = await aiProvider.query(prompt);
			this.outputChannel.appendLine(`✅ Received AI response (${response.length} characters)`);

			const results = this.parseResults(response);
			this.outputChannel.appendLine(`🎯 Parsed ${results.length} relevant code sections`);

			return results;
		} catch (error: any) {
			this.outputChannel.appendLine(`❌ Error: ${error.message}`);
			vscode.window.showErrorMessage(`Search failed: ${error.message}`);
			return [];
		}
	}

	private getAIProvider(): AIProvider {
		const endpoint = this.config.get<string>('ollamaEndpoint', 'http://localhost:11434');
		const model = this.config.get<string>('ollamaModel', 'codellama:7b-instruct');
		return new OllamaProvider(endpoint, model);
	}

	private parseResults(response: string): SearchResult[] {
		try {
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in response');
			}

			const parsed = JSON.parse(jsonMatch[0]);
			if (!parsed.results || !Array.isArray(parsed.results)) {
				throw new Error('Invalid response format');
			}

			return parsed.results.map((result: any) => ({
				file: result.file || '',
				line: result.line || 1,
				content: result.content || '',
				explanation: result.explanation || '',
				confidence: result.confidence || 0.8
			}));
		} catch (error) {
			this.outputChannel.appendLine(`Warning: Could not parse JSON response, using fallback`);
			return [{
				file: 'Response',
				line: 1,
				content: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
				explanation: 'Raw AI response (parsing failed)',
				confidence: 0.5
			}];
		}
	}

	dispose() {
		this.outputChannel.dispose();
	}
}

async function showWelcomeMessage(context: vscode.ExtensionContext) {
	const result = await vscode.window.showInformationMessage(
		'🎉 Welcome to What-The-Code! Ready to search your code with AI?',
		'✨ Try It Now',
		'⚙️ Configure Settings'
	);

	switch (result) {
		case '✨ Try It Now':
			vscode.commands.executeCommand('what-the-code.searchCode');
			break;
		case '⚙️ Configure Settings':
			vscode.commands.executeCommand('what-the-code.openSettings');
			break;
	}

	context.globalState.update('whatTheCode.hasShownWelcome', true);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('🚀 What-The-Code extension is now activating!');
	
	const isFirstTime = !context.globalState.get('whatTheCode.hasShownWelcome', false);
	if (isFirstTime) {
		console.log('First time activation - showing welcome');
		showWelcomeMessage(context);
	}

	console.log('Creating search provider...');
	const searchProvider = new CodeSearchProvider();

	const searchCommand = vscode.commands.registerCommand('what-the-code.searchCode', async () => {
		console.log('🔍 Search command triggered!');
		
		try {
			const config = vscode.workspace.getConfiguration('whatTheCode');
			const endpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');
			const model = config.get<string>('ollamaModel', 'codellama:7b-instruct');
			console.log(`Ollama config: ${endpoint}, model: ${model}`);
			
			console.log('Checking Ollama availability...');

			console.log('Opening search dialog...');
			const query = await vscode.window.showInputBox({
				placeHolder: 'e.g., "Where is user authentication handled?"',
				prompt: 'Ask a question about your code',
				title: 'What-The-Code: Ask Your Code'
			});
			console.log(`User query: ${query}`);

			if (!query || query.trim().length === 0) {
				console.log('No query provided, exiting');
				return;
			}

			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Searching your code...',
				cancellable: false
			}, async (progress) => {
				console.log('Starting search with progress...');
				progress.report({ increment: 10, message: 'Collecting code files...' });
				
				const results = await searchProvider.searchCode(query.trim());
				console.log(`Search completed with ${results.length} results`);
				
				progress.report({ increment: 100, message: 'Complete!' });

				if (results.length > 0) {
					console.log('Displaying results...');
					await displayResults(query, results);
				} else {
					console.log('No results found');
					vscode.window.showInformationMessage('No relevant code found for your query. Try rephrasing or being more specific.');
				}
			});
		} catch (error) {
			console.error('Search command error:', error);
			vscode.window.showErrorMessage(`Search failed: ${error}`);
		}
	});

	const testCommand = vscode.commands.registerCommand('what-the-code.testExtension', () => {
		console.log('🧪 Test command executed!');
		vscode.window.showInformationMessage('✅ What-The-Code extension is working! Press Ctrl+Shift+Alt+K to search.');
	});

	const presetCommand = vscode.commands.registerCommand('what-the-code.applyFrontendPreset', async () => {
		vscode.window.showWarningMessage("This command is deprecated and will be removed.");
	});

	const testOllamaCommand = vscode.commands.registerCommand('what-the-code.testOllama', async () => {
		const config = vscode.workspace.getConfiguration('whatTheCode');
		const endpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');
		const model = config.get<string>('ollamaModel', 'codellama:7b-instruct');
		
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Testing Ollama connection...',
			cancellable: false
		}, async (progress) => {
			try {
				progress.report({ increment: 30, message: 'Connecting to Ollama...' });
				
				const testProvider = new OllamaProvider(endpoint, model);
				const testPrompt = '<INST>Say "Hello from CodeLlama!" and nothing else.</INST>';
				
				progress.report({ increment: 60, message: 'Testing model response...' });
				const response = await testProvider.query(testPrompt);
				
				progress.report({ increment: 100, message: 'Success!' });
				
				vscode.window.showInformationMessage(
					`✅ Ollama connection successful!\n\nEndpoint: ${endpoint}\nModel: ${model}\nResponse: ${response.substring(0, 100)}...`
				);
			} catch (error: any) {
				vscode.window.showErrorMessage(
					`❌ Ollama connection failed: ${error.message}\n\nMake sure:\n1. Ollama is running (ollama serve)\n2. Model is pulled (ollama pull ${model})`
				);
			}
		});
	});

	const settingsCommand = vscode.commands.registerCommand('what-the-code.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'whatTheCode');
	});

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(search) Ask Code';
	statusBarItem.command = 'what-the-code.searchCode';
	statusBarItem.tooltip = 'Search your code with AI (Ctrl+Shift+Alt+K)';
	statusBarItem.show();

	console.log('Registering commands and UI elements...');
	context.subscriptions.push(searchCommand, testCommand, presetCommand, testOllamaCommand, settingsCommand, searchProvider, statusBarItem);
	
	console.log('✅ What-The-Code extension fully activated!');
}

export function deactivate() {}
