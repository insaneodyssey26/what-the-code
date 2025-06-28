# What-The-Code 🔍

An AI-powered VSCode extension that lets you search your codebase using natural language queries powered by local Ollama models (CodeLlama). Perfect for frontend developers who want fast, private code search without cloud dependencies.

## Features

- **Natural Language Search**: Ask questions like "Where do we handle user authentication?" or "Show me all React hooks using useEffect"
- **Local AI Analysis**: Uses local Ollama models (CodeLlama) to understand your code - no cloud, no API keys required
- **Smart File Prioritization**: Automatically focuses on the most relevant files for your query
- **Beautiful Results Display**: Shows results in an interactive webview with syntax highlighting
- **Frontend-Focused**: Optimized for modern web development workflows (React, Vue, TypeScript, etc.)
- **Privacy-First**: Everything runs locally on your machine

## Quick Start

1. **Install Ollama**: Download and install [Ollama](https://ollama.ai/) on your machine
2. **Pull CodeLlama**: Run `ollama pull codellama:7b-instruct` in your terminal
3. **Start Ollama**: Run `ollama serve` to start the server
4. **Install Extension**: Install from VS Code marketplace or package locally
5. **Start Searching**: Press `Ctrl+Shift+Alt+K` or click the "Ask Code" button in the status bar

## Configuration

### Setup Ollama (Required)
1. Install [Ollama](https://ollama.ai/) on your machine
2. Pull a code model: `ollama pull codellama:7b-instruct`
3. Start Ollama server: `ollama serve`
4. Verify connection with "Test Ollama Connection" command

### Optional Settings
- Open settings (`Ctrl+,`) and search for "What-The-Code"
- Configure endpoint (default: `http://localhost:11434`)
- Choose your preferred CodeLlama model size
- Adjust file size limits and included extensions

## Usage Examples

### Frontend/UI Queries
- **"Where are React components defined?"** - Find component files and definitions
- **"Show me all useEffect hooks"** - Find React hooks usage
- **"Find CSS animations"** - Locate animation and transition code
- **"Where is state management handled?"** - Find Redux, Zustand, or Context usage
- **"Show me form validation logic"** - Find input validation code

### General Code Queries
- **"Where is user authentication handled?"** - Find login/auth related code
- **"Find database queries"** - Locate database operations
- **"Where do we handle file uploads?"** - Find file handling code
- **"Show me error handling code"** - Find try/catch blocks and error handlers
- **"Find API endpoints"** - Locate REST API route definitions

## Commands

- **Ask Your Code** (`Ctrl+Shift+Alt+K`): Open the search dialog
- **Test Ollama Connection**: Verify your Ollama setup
- **Apply Frontend/UI Preset**: Configure settings for frontend development
- **Configure Ollama Settings**: Open settings page

## Supported File Types

Optimized for modern web development:
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Vue (`.vue`)
- Svelte (`.svelte`)
- Python (`.py`)
- Plus: Java, C/C++, C#, Go, Rust, PHP, Ruby

## Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `whatTheCode.ollamaEndpoint` | Ollama server endpoint | `"http://localhost:11434"` |
| `whatTheCode.ollamaModel` | Ollama model to use | `"codellama:7b-instruct"` |
| `whatTheCode.maxFileSize` | Max file size to analyze (chars) | `50000` |
| `whatTheCode.includedExtensions` | File extensions to include | `[".js", ".ts", ".jsx", ".tsx", ...]` |

## Available Models

Choose based on your hardware:
- **codellama:7b-instruct** - Fast, good for most queries (recommended)
- **codellama:13b-instruct** - Better accuracy, requires more RAM
- **codellama:34b-instruct** - Best accuracy, requires 16GB+ RAM

## Tips for Better Results

1. **Be Specific**: Instead of "find functions", try "find async functions that make API calls"
2. **Use Domain Terms**: Include relevant keywords like "authentication", "database", "API", "component"
3. **Ask About Patterns**: "Show me all error handling" or "Find React custom hooks"
4. **Frontend Specific**: "Where are styled components defined?" or "Find TypeScript interfaces"

## Privacy & Security

- **100% Local**: Everything runs on your machine with Ollama
- **No Cloud**: No API keys, no external services required
- **No Storage**: We don't store your code or queries
- **Open Source**: Built on open-source Ollama and CodeLlama models

## Troubleshooting

### "No relevant code found"
- Try rephrasing your query with more specific terms
- Check if your target files are in the included extensions list
- Verify files aren't too large (check maxFileSize setting)

### "Cannot connect to Ollama server"
- Make sure Ollama is installed and running (`ollama serve`)
- Check the endpoint URL in settings (default: http://localhost:11434)
- Verify the model is pulled (`ollama pull codellama:7b-instruct`)

### "Model not found"
- Run `ollama list` to see available models
- Pull the model: `ollama pull codellama:7b-instruct`
- Restart Ollama server: `ollama serve`

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
- Local Ollama (CodeLlama) support
- Natural language code search
- Interactive results display
- Frontend-focused presets
- Privacy-first local AI

---

**Happy coding!** 🚀 Ask your code anything and let AI help you navigate your codebase faster than ever.
