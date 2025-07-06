import * as vscode from 'vscode';

export class UIPresets {
    static readonly FRONTEND_EXTENSIONS = [
        '.js', '.jsx', '.ts', '.tsx', 
        '.vue', '.svelte', 
        '.css', '.scss', '.sass', '.less',
        '.html', '.htm'
    ];

    static readonly REACT_QUERIES = [
        "React components that handle forms",
        "Custom hooks using useState and useEffect", 
        "Event handlers for user interactions",
        "State management and Redux code",
        "API calls and data fetching",
        "Error boundaries and error handling",
        "Loading states and spinners",
        "React Router navigation code"
    ];

    static readonly CSS_QUERIES = [
        "Button and form styling",
        "Responsive design media queries",
        "CSS animations and transitions",
        "Grid and flexbox layouts",
        "Theme and color variables",
        "Mobile-first breakpoints"
    ];

    static readonly COMMON_PATTERNS = [
        "Authentication and login flows",
        "Form validation logic", 
        "Modal and popup components",
        "Navigation and routing",
        "Data visualization components",
        "Accessibility ARIA attributes"
    ];

    static async applyFrontendPreset(): Promise<void> {
        const config = vscode.workspace.getConfiguration('whatTheCode');
        
        await config.update('includedExtensions', this.FRONTEND_EXTENSIONS, vscode.ConfigurationTarget.Workspace);
        await config.update('maxFileSize', 30000, vscode.ConfigurationTarget.Workspace);
        await config.update('aiProvider', 'ollama', vscode.ConfigurationTarget.Workspace);
        await config.update('ollamaModel', 'codellama:7b-instruct', vscode.ConfigurationTarget.Workspace);
        
        vscode.window.showInformationMessage('✅ Frontend preset applied! Optimized for React, Vue, CSS, and UI code.');
    }

    static getQuerySuggestions(category: string): string[] {
        switch (category) {
            case 'react': return this.REACT_QUERIES;
            case 'css': return this.CSS_QUERIES;
            case 'patterns': return this.COMMON_PATTERNS;
            default: return [...this.REACT_QUERIES, ...this.CSS_QUERIES, ...this.COMMON_PATTERNS];
        }
    }
}
