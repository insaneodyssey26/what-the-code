import * as vscode from 'vscode';
import { SearchResult } from './types';

export class ResultsDisplay {
	private static webviewPanel: vscode.WebviewPanel | undefined;

	static async displayResults(query: string, results: SearchResult[]) {
		if (results.length === 0) {
			vscode.window.showInformationMessage('No relevant code found for your query.');
			return;
		}

		// Try webview first, fallback to markdown document
		try {
			await this.showWebviewResults(query, results);
		} catch (error) {
			await this.showMarkdownResults(query, results);
		}
	}

	private static async showWebviewResults(query: string, results: SearchResult[]) {
		// Create or reveal webview panel
		if (this.webviewPanel) {
			this.webviewPanel.reveal(vscode.ViewColumn.Beside);
		} else {
			this.webviewPanel = vscode.window.createWebviewPanel(
				'codeSearchResults',
				'Code Search Results',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);

			this.webviewPanel.onDidDispose(() => {
				this.webviewPanel = undefined;
			});
		}

		// Set webview content
		this.webviewPanel.webview.html = this.generateWebviewContent(query, results);
	}

	private static generateWebviewContent(query: string, results: SearchResult[]): string {
		const resultsHtml = results.map((result, index) => `
			<div class="result-item" data-file="${result.file}" data-line="${result.line}">
				<div class="result-header">
					<div class="result-title">
						<span class="result-number">${index + 1}</span>
						<h3 class="file-name">${result.file}</h3>
						<span class="confidence-badge ${this.getConfidenceBadgeClass(result.confidence || 0.8)}">
							${Math.round((result.confidence || 0.8) * 100)}% match
						</span>
					</div>
					<div class="line-info">
						<span class="line-number">📍 Line ~${result.line}</span>
						<button class="copy-btn" onclick="copyCode('${this.escapeForJs(result.content)}')" title="Copy code">
							📋
						</button>
					</div>
				</div>
				
				<div class="explanation-section">
					<div class="explanation-label">💡 Why this matches:</div>
					<div class="explanation">${result.explanation}</div>
				</div>
				
				<div class="code-section">
					<div class="code-header">
						<span class="code-label">📝 Code:</span>
						<div class="code-actions">
							<button onclick="openFile('${result.file}', ${result.line})" class="action-btn primary">
								📂 Open File
							</button>
							<button onclick="goToLine('${result.file}', ${result.line})" class="action-btn">
								🔗 Go to Line
							</button>
						</div>
					</div>
					<pre class="code-block"><code class="language-javascript">${this.escapeHtml(result.content)}</code></pre>
				</div>
			</div>
		`).join('');

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Code Search Results</title>
	<style>
		:root {
			--primary-color: #007acc;
			--success-color: #4caf50;
			--warning-color: #ff9800;
			--error-color: #f44336;
			--background: var(--vscode-editor-background);
			--foreground: var(--vscode-editor-foreground);
			--border: var(--vscode-panel-border);
			--hover: var(--vscode-list-hoverBackground);
			--secondary-bg: var(--vscode-sideBar-background);
			--badge-bg: var(--vscode-badge-background);
			--badge-fg: var(--vscode-badge-foreground);
		}
		
		* {
			box-sizing: border-box;
		}
		
		body {
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			line-height: 1.6;
			margin: 0;
			padding: 20px;
			background-color: var(--background);
			color: var(--foreground);
			font-size: 14px;
		}
		
		.header {
			background: linear-gradient(135deg, var(--primary-color)20, var(--secondary-bg));
			border-radius: 12px;
			padding: 20px;
			margin-bottom: 24px;
			border: 1px solid var(--border);
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		
		.query {
			font-size: 20px;
			font-weight: 600;
			color: var(--primary-color);
			margin-bottom: 8px;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		
		.query::before {
			content: '🔍';
			font-size: 18px;
		}
		
		.results-count {
			color: var(--vscode-descriptionForeground);
			font-size: 14px;
			opacity: 0.9;
		}
		
		.results-count::before {
			content: '📊 ';
		}
		
		.result-item {
			background-color: var(--secondary-bg);
			border: 1px solid var(--border);
			border-radius: 12px;
			margin-bottom: 24px;
			padding: 0;
			overflow: hidden;
			transition: all 0.3s ease;
			box-shadow: 0 2px 4px rgba(0,0,0,0.05);
		}
		
		.result-item:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			border-color: var(--primary-color);
		}
		
		.result-header {
			padding: 16px 20px;
			background: linear-gradient(135deg, var(--background), var(--secondary-bg));
			border-bottom: 1px solid var(--border);
		}
		
		.result-title {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 8px;
		}
		
		.result-number {
			background: var(--primary-color);
			color: white;
			width: 28px;
			height: 28px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: bold;
			font-size: 12px;
		}
		
		.file-name {
			margin: 0;
			flex: 1;
			color: var(--vscode-textLink-foreground);
			font-size: 16px;
			font-weight: 500;
		}
		
		.confidence-badge {
			padding: 4px 12px;
			border-radius: 20px;
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		
		.confidence-high { background: var(--success-color); color: white; }
		.confidence-medium { background: var(--warning-color); color: white; }
		.confidence-low { background: var(--error-color); color: white; }
		
		.line-info {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		
		.line-number {
			background-color: var(--badge-bg);
			color: var(--badge-fg);
			padding: 4px 10px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 500;
		}
		
		.copy-btn {
			background: none;
			border: 1px solid var(--border);
			color: var(--foreground);
			padding: 6px 8px;
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
			transition: all 0.2s ease;
		}
		
		.copy-btn:hover {
			background: var(--hover);
			border-color: var(--primary-color);
		}
		
		.explanation-section {
			padding: 16px 20px;
			background: var(--vscode-textBlockQuote-background);
			border-left: 4px solid var(--primary-color);
		}
		
		.explanation-label {
			font-weight: 600;
			color: var(--primary-color);
			margin-bottom: 6px;
			font-size: 13px;
		}
		
		.explanation {
			font-style: italic;
			line-height: 1.5;
			color: var(--vscode-descriptionForeground);
		}
		
		.code-section {
			padding: 20px;
		}
		
		.code-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 12px;
		}
		
		.code-label {
			font-weight: 600;
			color: var(--primary-color);
			font-size: 13px;
		}
		
		.code-actions {
			display: flex;
			gap: 8px;
		}
		
		.action-btn {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 8px 16px;
			border-radius: 6px;
			cursor: pointer;
			font-size: 12px;
			font-weight: 500;
			transition: all 0.2s ease;
			display: flex;
			align-items: center;
			gap: 4px;
		}
		
		.action-btn:hover {
			background-color: var(--vscode-button-hoverBackground);
			transform: translateY(-1px);
		}
		
		.action-btn.primary {
			background-color: var(--primary-color);
			color: white;
		}
		
		.action-btn.primary:hover {
			background-color: #005a9e;
		}
		
		.code-block {
			background-color: var(--background);
			border: 1px solid var(--border);
			border-radius: 8px;
			padding: 16px;
			overflow-x: auto;
			margin: 0;
			position: relative;
		}
		
		.code-block::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 3px;
			background: linear-gradient(90deg, var(--primary-color), var(--success-color));
			border-radius: 8px 8px 0 0;
		}
		
		.code-block code {
			font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
			font-size: 13px;
			line-height: 1.4;
			white-space: pre;
			color: var(--foreground);
		}
		
		.empty-state {
			text-align: center;
			padding: 60px 20px;
			color: var(--vscode-descriptionForeground);
		}
		
		.empty-state-icon {
			font-size: 48px;
			margin-bottom: 16px;
		}
		
		@media (max-width: 768px) {
			body { padding: 12px; }
			.result-header { padding: 12px 16px; }
			.code-section { padding: 16px; }
			.code-actions { flex-direction: column; }
		}
		
		/* Scrollbar styling */
		::-webkit-scrollbar {
			width: 8px;
			height: 8px;
		}
		
		::-webkit-scrollbar-track {
			background: var(--secondary-bg);
		}
		
		::-webkit-scrollbar-thumb {
			background: var(--border);
			border-radius: 4px;
		}
		
		::-webkit-scrollbar-thumb:hover {
			background: var(--primary-color);
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="query">${this.escapeHtml(query)}</div>
		<div class="results-count">Found ${results.length} relevant code sections</div>
	</div>
	
	<div class="results">
		${results.length > 0 ? resultsHtml : `
			<div class="empty-state">
				<div class="empty-state-icon">🔍</div>
				<h3>No results found</h3>
				<p>Try rephrasing your query or being more specific</p>
			</div>
		`}
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		
		function openFile(filePath, lineNumber) {
			vscode.postMessage({
				command: 'openFile',
				file: filePath,
				line: lineNumber
			});
		}
		
		function goToLine(filePath, lineNumber) {
			vscode.postMessage({
				command: 'goToLine',
				file: filePath,
				line: lineNumber
			});
		}
		
		function copyCode(code) {
			navigator.clipboard.writeText(code).then(() => {
				// Show visual feedback
				const btn = event.target;
				const originalText = btn.innerHTML;
				btn.innerHTML = '✅';
				btn.style.background = 'var(--success-color)';
				
				setTimeout(() => {
					btn.innerHTML = originalText;
					btn.style.background = '';
				}, 1000);
				
				vscode.postMessage({
					command: 'showMessage',
					text: 'Code copied to clipboard!'
				});
			}).catch(() => {
				vscode.postMessage({
					command: 'showMessage',
					text: 'Failed to copy code',
					type: 'error'
				});
			});
		}
		
		// Add keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey || e.metaKey) {
				switch(e.key) {
					case 'f':
						e.preventDefault();
						// Focus search would go here
						break;
					case 'Enter':
						e.preventDefault();
						// Open first result
						const firstResult = document.querySelector('.result-item');
						if (firstResult) {
							const file = firstResult.dataset.file;
							const line = firstResult.dataset.line;
							openFile(file, parseInt(line));
						}
						break;
				}
			}
		});
	</script>
</body>
</html>`;
	}

	private static getConfidenceBadgeClass(confidence: number): string {
		if (confidence >= 0.8) return 'confidence-high';
		if (confidence >= 0.6) return 'confidence-medium';
		return 'confidence-low';
	}

	private static escapeForJs(text: string): string {
		return text
			.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(/"/g, '\\"')
			.replace(/\n/g, '\\n')
			.replace(/\r/g, '\\r')
			.replace(/\t/g, '\\t');
	}

	private static async showMarkdownResults(query: string, results: SearchResult[]) {
		const content = this.generateMarkdownContent(query, results);
		const doc = await vscode.workspace.openTextDocument({
			content: content,
			language: 'markdown'
		});
		await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
	}

	private static generateMarkdownContent(query: string, results: SearchResult[]): string {
		let content = `# 🔍 Code Search Results\n\n`;
		content += `**Query:** "${query}"\n\n`;
		content += `**Found ${results.length} relevant sections:**\n\n`;

		results.forEach((result, index) => {
			content += `## ${index + 1}. \`${result.file}\`\n\n`;
			content += `**Line ~${result.line}**\n\n`;
			content += `**Explanation:** ${result.explanation}\n\n`;
			content += `**Code:**\n\`\`\`javascript\n${result.content}\n\`\`\`\n\n`;
			
			// Add clickable links
			const fileUri = vscode.Uri.file(result.file);
			content += `[📂 Open File](command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri]))}) | `;
			content += `[🔗 Go to Line](command:workbench.action.gotoLine)\n\n`;
			content += `---\n\n`;
		});

		content += `\n\n*Generated by What-The-Code AI search*`;
		return content;
	}

	private static escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	static async showQuickPick(results: SearchResult[]): Promise<SearchResult | undefined> {
		const items = results.map((result, index) => ({
			label: `${index + 1}. ${result.file}`,
			description: `Line ~${result.line}`,
			detail: result.explanation,
			result: result
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a code section to open',
			matchOnDescription: true,
			matchOnDetail: true
		});

		return selected?.result;
	}
}
