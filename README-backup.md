# What-The-Code 🔍

An AI-powered VSCode extension that lets you search your codebase using natural language queries instead of traditional grep or file searches.

## Features

- **Natural Language Search**: Ask questions like "Where do we handle user authentication?" or "Show me all React hooks using useEffect"
- **AI-Powered Analysis**: Uses Gemini API or local Ollama models to understand your code
- **Smart File Prioritization**: Automatically focuses on the most relevant files for your query
- **Beautiful Results Display**: Shows results in an interactive webview with syntax highlighting
- **Multiple AI Providers**: Supports both Google Gemini API and local Ollama models

## Quick Start

1. **Install the Extension**: Install from VS Code marketplace or package locally
2. **Configure AI Provider**: 
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "What-The-Code: Configure AI Settings"
   - Choose your preferred AI provider and add credentials
3. **Start Searching**: Press `Ctrl+Shift+Alt+K` or click the "Ask Code" button in the status bar

## Configuration

### Using Gemini API (Recommended)
1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open settings (`Ctrl+,`) and search for "What-The-Code"
3. Set `What The Code: Ai Provider` to "gemini"
4. Enter your API key in `What The Code: Gemini Api Key`

### Using Ollama (Local)
1. Install [Ollama](https://ollama.ai/) on your machine
2. Pull a code model: `ollama pull codellama:7b-instruct`
3. Start Ollama server: `ollama serve`
4. In settings, set `What The Code: Ai Provider` to "ollama"
5. Configure endpoint (default: `http://localhost:11434`) and model

## Usage Examples

- **"Where is user authentication handled?"** - Find login/auth related code
- **"Show me all React hooks"** - Find useState, useEffect, custom hooks
- **"Find database queries"** - Locate SQL queries or database operations  
- **"Where do we handle file uploads?"** - Find file handling code
- **"Show me error handling code"** - Find try/catch blocks and error handlers
- **"Find API endpoints"** - Locate REST API route definitions

## Commands

- **Ask Your Code** (`Ctrl+Shift+Alt+K`): Open the search dialog
- **Configure AI Settings**: Open settings page for AI configuration

## Supported File Types

- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Python (`.py`)
- Java (`.java`)  
- C/C++ (`.c`, `.cpp`, `.h`)
- C# (`.cs`)
- Go (`.go`)
- Rust (`.rs`)
- PHP (`.php`)
- Ruby (`.rb`)
- Vue (`.vue`)
- Svelte (`.svelte`)

## Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `whatTheCode.aiProvider` | AI provider to use (gemini/ollama) | `"gemini"` |
| `whatTheCode.geminiApiKey` | Your Gemini API key | `""` |
| `whatTheCode.ollamaEndpoint` | Ollama server endpoint | `"http://localhost:11434"` |
| `whatTheCode.ollamaModel` | Ollama model to use | `"codellama:7b-instruct"` |
| `whatTheCode.maxFileSize` | Max file size to analyze (chars) | `50000` |
| `whatTheCode.includedExtensions` | File extensions to include | `[".js", ".ts", ...]` |

## Tips for Better Results

1. **Be Specific**: Instead of "find functions", try "find async functions that make API calls"
2. **Use Domain Terms**: Include relevant keywords like "authentication", "database", "API", etc.
3. **Ask About Patterns**: "Show me all error handling" or "Find dependency injection code"
4. **File Structure Queries**: "Where are React components defined?" or "Find utility functions"

## Privacy & Security

- **Gemini API**: Your code is sent to Google's servers for analysis
- **Ollama**: Everything runs locally on your machine
- **No Storage**: We don't store your code or queries
- **Configurable**: You can exclude sensitive files via settings

## Troubleshooting

### "No relevant code found"
- Try rephrasing your query with more specific terms
- Check if your target files are in the included extensions list
- Verify files aren't too large (check maxFileSize setting)

### "Gemini API key not configured"
- Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Add it in VS Code settings under "What The Code: Gemini Api Key"

### "Cannot connect to Ollama server"
- Make sure Ollama is installed and running (`ollama serve`)
- Check the endpoint URL in settings
- Verify the model is pulled (`ollama pull codellama:7b-instruct`)

## Development

This extension is built with:
- TypeScript
- VS Code Extension API
- Axios for HTTP requests
- Modular architecture for easy maintenance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### 0.0.1
- Initial release
- Gemini API and Ollama support
- Natural language code search
- Interactive results display
- Configurable file filtering

---

**Happy coding!** 🚀 Ask your code anything and let AI help you navigate your codebase faster than ever.
