import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CodeFile, SearchOptions } from './types';

export class CodeCollector {
	private config: vscode.WorkspaceConfiguration;

	constructor() {
		this.config = vscode.workspace.getConfiguration('whatTheCode');
	}

	async collectCodeFiles(options?: SearchOptions): Promise<CodeFile[]> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			return [];
		}

		const includedExtensions = options?.includedExtensions || 
			this.config.get<string[]>('includedExtensions', []);
		const maxFileSize = options?.maxFileSize || 
			this.config.get<number>('maxFileSize', 10000); // Reduced from 50000 to 10000
		const excludePatterns = options?.excludePatterns || [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/*.min.js',
			'**/*.bundle.js',
			'**/coverage/**',
			'**/.git/**'
		];

		const codeFiles: CodeFile[] = [];

		for (const folder of workspaceFolders) {
			const files = await vscode.workspace.findFiles(
				new vscode.RelativePattern(folder, `**/*{${includedExtensions.join(',')}}`),
				`{${excludePatterns.join(',')}}`
			);

			for (const file of files) {
				try {
					const content = fs.readFileSync(file.fsPath, 'utf8');
					if (content.length <= maxFileSize) {
						codeFiles.push({
							path: vscode.workspace.asRelativePath(file),
							content: content,
							language: this.getLanguageFromExtension(path.extname(file.fsPath)),
							size: content.length
						});
					}
				} catch (error) {
					// Skip files that can't be read
					continue;
				}
			}
		}

		return codeFiles;
	}

	private getLanguageFromExtension(ext: string): string {
		const languageMap: { [key: string]: string } = {
			'.js': 'javascript',
			'.ts': 'typescript',
			'.jsx': 'javascript',
			'.tsx': 'typescript',
			'.py': 'python',
			'.java': 'java',
			'.cs': 'csharp',
			'.cpp': 'cpp',
			'.c': 'c',
			'.h': 'c',
			'.go': 'go',
			'.rs': 'rust',
			'.php': 'php',
			'.rb': 'ruby',
			'.vue': 'vue',
			'.svelte': 'svelte',
			'.html': 'html',
			'.css': 'css',
			'.scss': 'scss',
			'.sass': 'sass',
			'.less': 'less'
		};
		return languageMap[ext] || 'plaintext';
	}

	/**
	 * Filter and prioritize files based on query relevance
	 */
	prioritizeFiles(files: CodeFile[], query: string): CodeFile[] {
		const queryTerms = query.toLowerCase().split(' ')
			.filter(term => term.length > 2); // Ignore short words

		return files
			.map(file => ({
				...file,
				relevanceScore: this.calculateRelevanceScore(file, queryTerms)
			}))
			.sort((a, b) => b.relevanceScore - a.relevanceScore)
			.slice(0, 5); // Limit to top 5 most relevant files for faster processing
	}

	private calculateRelevanceScore(file: CodeFile, queryTerms: string[]): number {
		let score = 0;
		const content = file.content.toLowerCase();
		const fileName = file.path.toLowerCase();

		// Score based on query terms in content
		queryTerms.forEach(term => {
			const contentMatches = (content.match(new RegExp(term, 'g')) || []).length;
			const fileNameMatches = (fileName.match(new RegExp(term, 'g')) || []).length;
			
			score += contentMatches * 1;
			score += fileNameMatches * 5; // File name matches are more important
		});

		// Boost score for certain file types/patterns
		if (fileName.includes('auth') || fileName.includes('login')) {
			score += 2;
		}
		if (fileName.includes('component') || fileName.includes('hook')) {
			score += 1;
		}
		if (fileName.includes('test') || fileName.includes('spec')) {
			score -= 1; // Slightly deprioritize test files
		}

		return score;
	}

	/**
	 * Extract important code sections (functions, classes, etc.)
	 */
	extractCodeSections(file: CodeFile): string[] {
		const lines = file.content.split('\n');
		const sections: string[] = [];
		const sectionPatterns = [
			/^\s*(function|const|let|var)\s+(\w+)/,
			/^\s*(class|interface|type)\s+(\w+)/,
			/^\s*(export\s+)?(function|const|class|interface)\s+(\w+)/,
			/^\s*(async\s+function|function\*)\s+(\w+)/,
			/^\s*(\w+)\s*[:=]\s*(async\s+)?\(/,
		];

		let currentSection = '';
		let bracketCount = 0;
		let inSection = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			
			// Check if this line starts a new section
			const isNewSection = sectionPatterns.some(pattern => pattern.test(line));
			
			if (isNewSection && !inSection) {
				currentSection = line;
				bracketCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
				inSection = bracketCount > 0;
				
				if (bracketCount === 0) {
					// Single line function/declaration
					sections.push(currentSection);
					currentSection = '';
				}
			} else if (inSection) {
				currentSection += '\n' + line;
				bracketCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
				
				if (bracketCount <= 0) {
					sections.push(currentSection);
					currentSection = '';
					inSection = false;
				}
			}
		}

		return sections.filter(section => section.trim().length > 0);
	}
}
