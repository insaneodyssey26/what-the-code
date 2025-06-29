# What-The-Code 🔍

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://marketplace.visualstudio.com/items?itemName=saheli56.what-the-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-saheli56%2Fwhat--the--code-black)](https://github.com/saheli56/what-the-code)

**What-The-Code** is a powerful VS Code extension that brings AI-powered code analysis to your fingertips. Search your codebase with natural language, find dead code, and manage file snapshots with restore functionality - all in one intuitive interface!

## ✨ Features

### 🔍 **AI-Powered Code Search**

- Ask questions about your codebase in natural language
- Examples: "Where is user authentication handled?", "Show me all React components", "Find error handling code"
- Powered by **Google Gemini AI** for intelligent code understanding
- Get precise results with detailed explanations and file locations
- Support for 16+ programming languages

### 🧹 **Smart Dead Code Analysis**

- Find unused imports, functions, variables, and React components
- **Regex-based static analysis** - fast and lightweight (no heavy dependencies)
- Confidence levels (high/medium/low) to help you safely clean up code
- Supports JavaScript, TypeScript, JSX, TSX, and more
- Reduce bundle size and improve code maintainability

### 📸 **Code Snapshots with Restore**

- Save snapshots of your files before making changes
- **Restore functionality** - easily revert to any saved checkpoint
- Perfect for experimenting with code changes
- Built-in version control for individual files
- Organize snapshots with timestamps and descriptions

### 🚀 **Modern 4-Panel Interface**

- **Main Actions** - Quick access to core features
- **Search Results** - Interactive search results with file navigation
- **Code Snapshots** - Manage and restore file snapshots
- **Dead Code Analysis** - View analysis results and recommendations

## 🚀 Quick Start

1. **Install Extension**: Get it from VS Code Marketplace or install from VSIX
2. **Get Gemini API Key**: 
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key (free tier available)
3. **Configure Extension**:
   - Open VS Code Settings (`Ctrl+,`)
   - Search for "What-The-Code"
   - Add your Gemini API key
4. **Start Using**: 
   - Press `Ctrl+Shift+Alt+K` to search your code
   - Use the sidebar panels for snapshots and dead code analysis

## ⚙️ Configuration

### Google Gemini Setup (Required)

1. **Get API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Configure Extension**:
   - Open VS Code Settings (`Ctrl+,`)
   - Search for "What-The-Code"
   - Add your API key to `whatTheCode.geminiApiKey`
3. **Test Connection**: Use "🔌 Test Gemini Connection" command to verify setup

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `whatTheCode.geminiApiKey` | Your Gemini API key | `""` (required) |
| `whatTheCode.geminiModel` | AI model to use | `"gemini-1.5-flash"` |
| `whatTheCode.maxFileSize` | Max file size to analyze | `50000` characters |
| `whatTheCode.includedExtensions` | File types to search | JS, TS, Python, Java, etc. |

### Gemini Model Options

- **gemini-1.5-flash** - Fast and efficient (recommended)
- **gemini-1.5-pro** - Most capable, best accuracy
- **gemini-pro** - Legacy model (still supported)

## 💡 Usage Examples

### 🔍 AI Code Search

**Frontend/React Queries:**
- *"Where are React components defined?"* - Find component files and definitions
- *"Show me all useEffect hooks"* - Locate React hooks usage
- *"Find CSS animations"* - Discover animation and transition code
- *"Where is state management handled?"* - Find Redux, Zustand, or Context usage

**Backend/API Queries:**
- *"Where is user authentication handled?"* - Find login/auth related code
- *"Find database queries"* - Locate database operations and SQL
- *"Show me API endpoints"* - Find REST API route definitions
- *"Where do we handle file uploads?"* - Find file handling code

**General Code Queries:**
- *"Show me error handling code"* - Find try/catch blocks and error handlers
- *"Find all TypeScript interfaces"* - Locate type definitions
- *"Where are environment variables used?"* - Find configuration usage

### 📸 Snapshot Management

1. **Save Snapshot**: Click the 📌 button or use the save command
2. **View Snapshots**: Browse saved snapshots in the dedicated panel
3. **Restore Files**: Click the 🔄 restore button to revert changes
4. **Clean Up**: Delete individual snapshots or clear all at once

### 🧹 Dead Code Analysis

1. **Run Analysis**: Click the 🧹 button in the Dead Code panel
2. **Review Results**: Check confidence levels (high/medium/low)
3. **Safe Cleanup**: Focus on "high confidence" items first
4. **Verify Changes**: Use snapshots before removing code

## 🎮 Commands & Shortcuts

### Main Commands
- **🔍 Ask Your Code** (`Ctrl+Shift+Alt+K`) - Open AI search dialog
- **📌 Save Snapshot** - Save current file state
- **🔄 Restore Snapshot** - Revert to saved checkpoint  
- **🧹 Find Dead Code** - Analyze unused code
- **🔌 Test Gemini Connection** - Verify API setup
- **⚙️ Configure Settings** - Open extension settings

### Panel Navigation
Access all features through the **What-The-Code** sidebar:
- **🚀 Main Actions** - Core functionality buttons
- **🔍 Search Results** - AI search results with file links
- **📸 Code Snapshots** - Snapshot management and restore
- **🧹 Dead Code Analysis** - Analysis results and cleanup suggestions

## 📁 Supported Languages & Files

**Optimized for modern development:**

**Web Technologies:**
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Vue.js (`.vue`)
- Svelte (`.svelte`)

**Backend Languages:**
- Python (`.py`)
- Java (`.java`)
- C# (`.cs`)
- Go (`.go`)
- Rust (`.rs`)
- PHP (`.php`)
- Ruby (`.rb`)

**Systems Programming:**
- C/C++ (`.c`, `.cpp`, `.h`)

*Note: Dead code analysis is optimized for JavaScript/TypeScript projects*

## 🔧 Technical Details

**Architecture:**
- **TypeScript** - Type-safe development
- **VS Code Extension API** - Native IDE integration
- **Google Gemini AI** - Advanced code understanding
- **Regex-based Analysis** - Fast dead code detection (no AST parsing)
- **Local File System** - Secure snapshot management

**Performance:**
- **Lightweight** - No heavy dependencies (removed ts-morph)
- **Fast Analysis** - Regex patterns vs. slow AST parsing
- **Efficient UI** - 4-panel organized interface
- **Minimal Footprint** - Optimized for everyday use

## 💡 Tips for Better Results

**AI Search Tips:**
1. **Be Specific**: "Find async functions that make API calls" vs. "find functions"
2. **Use Domain Terms**: Include keywords like "authentication", "database", "component"
3. **Ask About Patterns**: "Show me all error handling" or "Find custom React hooks"
4. **Context Matters**: "Where is user data validated?" vs. "find validation"

**Dead Code Analysis:**
1. **Start with High Confidence**: Focus on "high" confidence items first
2. **Save Snapshots**: Always create snapshots before removing code
3. **Test After Cleanup**: Verify your app still works after removing dead code
4. **Review Medium/Low**: Manually verify before removing "medium" confidence items

**Snapshot Management:**
1. **Descriptive Names**: Use meaningful descriptions for snapshots
2. **Regular Cleanup**: Remove old snapshots you no longer need
3. **Before Major Changes**: Always snapshot before refactoring
4. **Quick Experiments**: Perfect for trying different approaches

## 🔒 Privacy & Security

- **API-based AI**: Uses Google Gemini API (requires internet connection)
- **No Code Storage**: Your code is only sent for analysis, not stored by Google
- **Local Snapshots**: File snapshots are stored locally on your machine
- **Configurable**: Control what files are analyzed via extension settings
- **Open Source**: Full source code available for review

## 🚨 Troubleshooting

### "API Key Invalid" or Connection Issues
- Verify your Gemini API key is correct in settings
- Check you have internet connection
- Ensure API key has proper permissions
- Try "🔌 Test Gemini Connection" command

### "No relevant code found"
- Try rephrasing your query with more specific terms  
- Check if target files are in included extensions list
- Verify files aren't too large (check `maxFileSize` setting)
- Ensure you're searching in the correct workspace

### Dead Code Analysis Issues
- Analysis works best with JavaScript/TypeScript projects
- May show false positives - always verify before deleting
- Check file extensions are included in settings
- Review confidence levels (focus on "high" confidence items)

### Snapshot Restore Problems
- Ensure the original file still exists in the same location
- Check file permissions (read/write access)
- Try restarting VS Code if issues persist

## 🛠️ Development & Contributing

**Built with:**
- TypeScript for type safety
- VS Code Extension API
- Google Gemini AI integration
- Axios for HTTP requests
- Modular architecture for maintainability

**Contributing:**
1. Fork the repository on GitHub
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Test thoroughly with various code patterns
5. Submit a pull request with detailed description

**Development Setup:**
```bash
git clone https://github.com/saheli56/what-the-code.git
cd what-the-code
npm install
npm run watch    # Start TypeScript compiler in watch mode
# Press F5 in VS Code to launch Extension Development Host
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📋 Changelog

### v1.0.0 (Latest)
- ✅ AI-powered code search with Google Gemini
- ✅ Smart dead code analysis (regex-based, lightweight)  
- ✅ File snapshots with restore functionality
- ✅ Modern 4-panel interface design
- ✅ Support for 16+ programming languages
- ✅ Comprehensive error handling and user feedback
- ✅ Optimized performance (removed heavy dependencies)

---

**Happy coding!** 🚀 Ask your code anything and let AI help you navigate and clean up your codebase faster than ever.
