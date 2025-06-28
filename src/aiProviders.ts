import axios from 'axios';
import { AIProvider } from './types';

export class OllamaProvider implements AIProvider {
	name = 'Ollama';
	private endpoint: string;
	private model: string;

	constructor(endpoint: string, model: string) {
		this.endpoint = endpoint;
		this.model = model;
	}

	async query(prompt: string): Promise<string> {
		try {
			// For CodeLlama, we need to format the prompt properly
			const formattedPrompt = this.model.includes('codellama') ? 
				this.formatCodeLlamaPrompt(prompt) : prompt;

			const response = await axios.post(
				`${this.endpoint}/api/generate`,
				{
					model: this.model,
					prompt: formattedPrompt,
					stream: false,
					options: {
						temperature: 0.1, // Lower for more focused responses
						top_p: 0.9,
						top_k: 20,
						num_predict: 1024,
						stop: ["</INST>", "<INST>"]
					}
				},
				{
					headers: {
						'Content-Type': 'application/json'
					},
					timeout: 90000 // CodeLlama can be slower
				}
			);

			return response.data.response;
		} catch (error: any) {
			if (error.code === 'ECONNREFUSED') {
				throw new Error('Cannot connect to Ollama server. Make sure Ollama is running with: ollama serve');
			} else if (error.code === 'ECONNABORTED') {
				throw new Error(`Model "${this.model}" not found. Pull it with: ollama pull ${this.model}`);
			}
			throw new Error(`Ollama error: ${error.message}`);
		}
	}

	private formatCodeLlamaPrompt(prompt: string): string {
		// CodeLlama expects <INST> format for better instruction following
		if (prompt.includes('<INST>')) {
			return prompt; // Already formatted
		}
		return `<INST>${prompt}</INST>`;
	}
}

export class PromptBuilder {
	static buildCodeSearchPrompt(query: string, context: string): string {
		return `<INST>You are an expert code analyst. Analyze the provided codebase and find sections relevant to the user's query.

## Codebase Context:
${context}

## User Query: "${query}"

## Instructions:
1. Find code sections that directly relate to the query
2. Focus on functions, classes, methods, and configuration code
3. Include relevant imports, exports, and comments
4. Provide exact line numbers and file paths
5. Explain why each section matches the query

## Response Format:
Return ONLY valid JSON in this exact format:
{
  "results": [
    {
      "file": "relative/path/to/file.ext",
      "line": 25,
      "content": "relevant code snippet (max 15 lines)",
      "explanation": "brief explanation of relevance"
    }
  ]
}

If no relevant code found, return: {"results": []}
</INST>`;
	}

	static buildContextSection(files: any[], maxChars: number = 40000): string {
		let context = '';
		let totalChars = 0;

		for (const file of files) {
			const fileSection = `
### File: ${file.path} (${file.language})
\`\`\`${file.language}
${file.content}
\`\`\`
`;
			
			if (totalChars + fileSection.length < maxChars) {
				context += fileSection;
				totalChars += fileSection.length;
			} else {
				// Try to fit a truncated version
				const remainingChars = maxChars - totalChars - 200; // Leave some buffer
				if (remainingChars > 500) {
					const truncatedContent = file.content.substring(0, remainingChars) + '\n... (truncated)';
					context += `
### File: ${file.path} (${file.language})
\`\`\`${file.language}
${truncatedContent}
\`\`\`
`;
				}
				break;
			}
		}

		return context;
	}
}
