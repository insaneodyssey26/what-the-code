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
			const formattedPrompt = this.model.includes('codellama') ? 
				this.formatCodeLlamaPrompt(prompt) : prompt;

			const response = await axios.post(
				`${this.endpoint}/api/generate`,
				{
					model: this.model,
					prompt: formattedPrompt,
					stream: false,
					options: {
						temperature: 0.1, 
						top_p: 0.9,
						top_k: 20,
						num_predict: 512, // Reduced from 2048 to 512 for faster responses
						stop: ["</INST>", "<INST>"],
						num_ctx: 2048 // Reduced from 4096 to 2048
					}
				},
				{
					headers: {
						'Content-Type': 'application/json'
					},
					timeout: 120000 // Increased to 2 minutes
				}
			);

			return response.data.response;
		} catch (error: any) {
			console.error('Ollama API Error:', error);
			
			if (error.code === 'ECONNREFUSED') {
				throw new Error('Cannot connect to Ollama server. Make sure Ollama is running with: ollama serve');
			} else if (error.code === 'ECONNABORTED') {
				throw new Error(`Request timed out after 90 seconds. The model might be too slow or the query too complex.`);
			} else if (error.response?.status === 404) {
				throw new Error(`Model "${this.model}" not found. Pull it with: ollama pull ${this.model}`);
			} else if (error.response?.data?.error) {
				throw new Error(`Ollama API error: ${error.response.data.error}`);
			}
			
			throw new Error(`Ollama error: ${error.message}`);
		}
	}

	private formatCodeLlamaPrompt(prompt: string): string {
		if (prompt.includes('<INST>')) {
			return prompt; 
		}
		return `<INST>${prompt}</INST>`;
	}
}

export class GeminiProvider implements AIProvider {
	name = 'Gemini';
	private apiKey: string;
	private endpoint: string;
	private model: string;

	constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
		this.apiKey = apiKey;
		this.model = model;
		this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
	}

	async query(prompt: string): Promise<string> {
		try {
			const response = await axios.post(
				`${this.endpoint}?key=${this.apiKey}`,
				{
					contents: [{
						parts: [{
							text: prompt
						}]
					}],
					generationConfig: {
						temperature: 0.1,
						topK: 20,
						topP: 0.9,
						maxOutputTokens: 1024,
					},
					safetySettings: [
						{
							category: "HARM_CATEGORY_HARASSMENT",
							threshold: "BLOCK_MEDIUM_AND_ABOVE"
						},
						{
							category: "HARM_CATEGORY_HATE_SPEECH",
							threshold: "BLOCK_MEDIUM_AND_ABOVE"
						},
						{
							category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
							threshold: "BLOCK_MEDIUM_AND_ABOVE"
						},
						{
							category: "HARM_CATEGORY_DANGEROUS_CONTENT",
							threshold: "BLOCK_MEDIUM_AND_ABOVE"
						}
					]
				},
				{
					headers: {
						'Content-Type': 'application/json'
					},
					timeout: 30000 // 30 seconds should be enough for Gemini
				}
			);

			if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
				return response.data.candidates[0].content.parts[0].text;
			} else {
				throw new Error('Invalid response format from Gemini API');
			}
		} catch (error: any) {
			console.error('Gemini API Error:', error);
			
			if (error.code === 'ECONNREFUSED') {
				throw new Error('Cannot connect to Gemini API. Check your internet connection.');
			} else if (error.code === 'ECONNABORTED') {
				throw new Error('Request timed out. Please try again.');
			} else if (error.response?.status === 401) {
				throw new Error('Invalid Gemini API key. Please check your configuration.');
			} else if (error.response?.status === 403) {
				throw new Error('Gemini API access forbidden. Check your API key permissions.');
			} else if (error.response?.status === 429) {
				throw new Error('Gemini API rate limit exceeded. Please try again later.');
			} else if (error.response?.data?.error) {
				throw new Error(`Gemini API error: ${error.response.data.error.message || error.response.data.error}`);
			}
			
			throw new Error(`Gemini error: ${error.message}`);
		}
	}
}

export class PromptBuilder {
	static buildCodeSearchPrompt(query: string, context: string): string {
		return `You are a code analysis expert. Find code sections relevant to this query: "${query}"

Here are the code files to search through:
${context}

Instructions:
1. Find code that directly relates to the user's query
2. Look for functions, classes, methods, imports, and configurations
3. Include the exact file path and approximate line number
4. Provide a brief explanation of why each section is relevant

Return your response as valid JSON in exactly this format:
{
  "results": [
    {
      "file": "path/to/file.ext",
      "line": 25,
      "content": "relevant code snippet",
      "explanation": "brief explanation of relevance"
    }
  ]
}

If no relevant code is found, return: {"results": []}`;
	}

	static buildContextSection(files: any[], maxChars: number = 5000): string {
		let context = '';
		let totalChars = 0;

		for (const file of files) {
			// Truncate file content to make it smaller
			const truncatedContent = file.content.length > 1000 
				? file.content.substring(0, 1000) + '\n... (truncated)'
				: file.content;

			const fileSection = `File: ${file.path}
${truncatedContent}
---
`;
			
			if (totalChars + fileSection.length < maxChars) {
				context += fileSection;
				totalChars += fileSection.length;
			} else {
				break; // Stop if we're reaching the limit
			}
		}

		return context;
	}
}
