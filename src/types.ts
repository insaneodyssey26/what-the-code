export interface CodeFile {
	path: string;
	content: string;
	language: string;
	size: number;
}

export interface SearchResult {
	file: string;
	line: number;
	content: string;
	explanation: string;
	confidence?: number;
}

export interface AIProvider {
	name: string;
	query(prompt: string): Promise<string>;
}

export interface SearchOptions {
	maxFiles?: number;
	maxFileSize?: number;
	includedExtensions?: string[];
	excludePatterns?: string[];
}

export interface LLMResponse {
	results: SearchResult[];
}
