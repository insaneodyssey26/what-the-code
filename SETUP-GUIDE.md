# Quick Setup Guide for Local Development

## 🚀 Get Started in 3 Steps

### 1. Install & Setup Ollama
```bash
# Download Ollama from https://ollama.ai/
# Or use package manager:
winget install Ollama.Ollama

# Pull CodeLlama model
ollama pull codellama:7b-instruct

# Start Ollama server
ollama serve
```

### 2. Test Your Setup
- Press `Ctrl+Shift+P` in VS Code
- Run: **"What-The-Code: Test Ollama Connection"**
- Should see: ✅ Connection successful!

### 3. Start Searching!
- Press `Ctrl+Shift+Alt+K` (or click "Ask Code" in status bar)
- Try example queries:
  - "Where is user authentication handled?"
  - "Show me all React hooks"
  - "Find database queries"

## 🎨 UI/UX Features

### Enhanced Search Interface
- **Smart Input Dialog**: Example queries with icons
- **Visual Results**: Modern cards with syntax highlighting
- **Interactive Actions**: Click to open files, copy code
- **Confidence Badges**: See how well results match your query

### Keyboard Shortcuts
- `Ctrl+Shift+Alt+K` - Open search dialog
- `Ctrl+Enter` - Open first result
- `Ctrl+C` - Copy code from results

### Status Indicators
- 🔍 Search in progress
- ✅ Results found
- ❌ Connection issues
- 📊 Result count

## 🛠️ Development Tips

### For Better Results
1. **Be Specific**: "async functions that make API calls" vs "functions"
2. **Use Domain Terms**: "authentication", "database", "routing"
3. **Ask About Patterns**: "error handling", "state management"

### Ollama Models Comparison
- **codellama:7b-instruct** (recommended) - Fast, good for code
- **codellama:13b-instruct** - Better accuracy, slower
- **codellama:34b-instruct** - Best accuracy, needs powerful hardware

### Performance Tuning
```json
// In VS Code settings.json
{
  "whatTheCode.maxFileSize": 30000,  // Smaller for faster processing
  "whatTheCode.includedExtensions": [".js", ".jsx", ".ts", ".tsx"] // Focus on your stack
}
```

## 🎯 UI/UX Focused Workflow

Perfect for frontend developers who want to:
- ✅ Find React components and hooks quickly
- ✅ Locate styling and CSS-in-JS code
- ✅ Discover API integration patterns
- ✅ Search for UI state management
- ✅ Find event handlers and user interactions

## 🔧 Troubleshooting

### Ollama Not Connecting?
```bash
# Check if running
ollama list

# Restart server
ollama serve

# Test model
ollama run codellama:7b-instruct "Hello"
```

### Slow Responses?
- Use smaller model: `codellama:7b-instruct`
- Reduce file size limit in settings
- Close other resource-intensive apps

### Poor Results?
- Try rephrasing your query
- Be more specific about what you're looking for
- Check if relevant files are included in extensions list

## 📝 Example Queries for UI/UX Development

```
"React components that handle user input"
"CSS styles for buttons and forms" 
"Event handlers for click and hover"
"State management with useState or Redux"
"API calls in useEffect hooks"
"Form validation logic"
"Responsive design media queries"
"Animation and transition code"
"Error handling in UI components"
"Loading states and spinners"
```

Happy coding! 🎉
