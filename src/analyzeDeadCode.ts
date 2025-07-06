import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface DeadCodeIssue {
    type: 'unused-function' | 'unused-variable' | 'unused-import' | 'unused-component' | 'unused-route';
    filePath: string;
    relativePath: string;
    line: number;
    column: number;
    name: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    category: 'dead-code' | 'rarely-used' | 'test-only';
}

export interface RuntimeStats {
    executedFunctions: Set<string>;
    executedLines: Set<string>;
    componentUsage: Map<string, number>;
    routeUsage: Map<string, number>;
    importUsage: Map<string, number>;
}

export class DeadCodeAnalyzer {
    private runtimeStats: RuntimeStats;
    private instrumentedFiles: Set<string> = new Set();
    private originalContent: Map<string, string> = new Map();

    constructor() {
        this.runtimeStats = {
            executedFunctions: new Set(),
            executedLines: new Set(),
            componentUsage: new Map(),
            routeUsage: new Map(),
            importUsage: new Map()
        };
    }

    async analyzeFile(filePath: string, rootPath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const relativePath = path.relative(rootPath, filePath);
            
            // Analyze based on file type
            
                issues.push(...await this.analyzeJavaScriptFile(content, filePath, relativePath));
            } else if (this.isReactFile(filePath)) {
                issues.push(...await this.analyzeReactFile(content, filePath, relativePath));
            } else if (this.isCSSFile(filePath)) {
                issues.push(...await this.analyzeCSSFile(content, filePath, relativePath));
            }
            
        } catch (error) {
            console.warn(`Error analyzing file ${filePath}:`, error);
        }

        return issues;
    }

    private async analyzeJavaScriptFile(content: string, filePath: string, relativePath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        const lines = content.split('\n');
        
        // Find unused imports
        
        
        // Find unused functions
        
        
        // Find unused variables
        
        
        return issues;
    }

    private async analyzeReactFile(content: string, filePath: string, relativePath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        const lines = content.split('\n');
        
        // Find unused React components
        
        
        // Include JavaScript analysis
        
        
        return issues;
    }

    private async analyzeCSSFile(content: string, filePath: string, relativePath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        const lines = content.split('\n');
        
        // Find unused CSS classes/selectors
        
        
        return issues;
    }

    private findUnusedImports(content: string, filePath: string, relativePath: string, lines: string[]): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        // Match import statements
        
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            const namedImports = match[1] || match[3];
            const defaultImport = match[2];
            const namespaceImport = match[4];
            const modulePath = match[5];
            
            // Check if imports are used in the content
            
                const imports = namedImports.split(',').map(imp => imp.trim());
                imports.forEach(importName => {
                    if (!this.isImportUsed(importName, content)) {
                        issues.push({
                            type: 'unused-import',
                            filePath,
                            relativePath,
                            line: lineNumber,
                            column: 1,
                            name: importName,
                            description: `Unused named import '${importName}' from '${modulePath}'`,
                            confidence: 'high',
                            category: 'dead-code'
                        });
                    }
                });
            }
            
            if (defaultImport && !this.isImportUsed(defaultImport, content)) {
                issues.push({
                    type: 'unused-import',
                    filePath,
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    name: defaultImport,
                    description: `Unused default import '${defaultImport}' from '${modulePath}'`,
                    confidence: 'high',
                    category: 'dead-code'
                });
            }
            
            if (namespaceImport && !this.isImportUsed(namespaceImport, content)) {
                issues.push({
                    type: 'unused-import',
                    filePath,
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    name: namespaceImport,
                    description: `Unused namespace import '${namespaceImport}' from '${modulePath}'`,
                    confidence: 'high',
                    category: 'dead-code'
                });
            }
        }
        
        return issues;
    }

    private findUnusedFunctions(content: string, filePath: string, relativePath: string, lines: string[]): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        // Match function declarations
        
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            if (!this.isFunctionUsed(functionName, content, filePath)) {
                issues.push({
                    type: 'unused-function',
                    filePath,
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    name: functionName,
                    description: `Function '${functionName}' appears to be unused`,
                    confidence: 'medium',
                    category: 'dead-code'
                });
            }
        }
        
        // Match arrow functions assigned to variables
        
        
        while ((match = arrowFunctionRegex.exec(content)) !== null) {
            const functionName = match[1];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            if (!this.isFunctionUsed(functionName, content, filePath)) {
                issues.push({
                    type: 'unused-function',
                    filePath,
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    name: functionName,
                    description: `Arrow function '${functionName}' appears to be unused`,
                    confidence: 'medium',
                    category: 'dead-code'
                });
            }
        }
        
        return issues;
    }

    private findUnusedVariables(content: string, filePath: string, relativePath: string, lines: string[]): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        // Match variable declarations (excluding functions)
        
        let match;
        
        while ((match = variableRegex.exec(content)) !== null) {
            const variableName = match[1];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            if (!this.isVariableUsed(variableName, content)) {
                issues.push({
                    type: 'unused-variable',
                    filePath,
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    name: variableName,
                    description: `Variable '${variableName}' appears to be unused`,
                    confidence: 'medium',
                    category: 'dead-code'
                });
            }
        }
        
        return issues;
    }

    private findUnusedComponents(content: string, filePath: string, relativePath: string, lines: string[]): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        // Match React component definitions
        
        let match;
        
        while ((match = componentRegex.exec(content)) !== null) {
            const componentName = match[1];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            if (!this.isComponentUsed(componentName, content)) {
                issues.push({
                    type: 'unused-component',
                    filePath,
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    name: componentName,
                    description: `React component '${componentName}' appears to be unused`,
                    confidence: 'medium',
                    category: 'dead-code'
                });
            }
        }
        
        return issues;
    }

    private findUnusedCSSSelectors(content: string, filePath: string, relativePath: string, lines: string[]): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        // This would require checking against HTML/JSX files to see which CSS classes are used
        
        return issues;
    }

    private isImportUsed(importName: string, content: string): boolean {
        // Remove the import line and check if the import is used elsewhere
        const withoutImports = content.replace(/^import.*$/gm, '');
        const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
        return usageRegex.test(withoutImports);
    }

    private isFunctionUsed(functionName: string, content: string, filePath: string): boolean {
        // Remove the function definition and check if it's called elsewhere
        const withoutDefinition = content.replace(new RegExp(`function\\s+${functionName}\\s*\\([^{]*{[^}]*}`, 'g'), '');
        const usageRegex = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
        
        // Also check if it's exported (might be used externally)
        const exportRegex = new RegExp(`export.*${functionName}`, 'g');
        
        return usageRegex.test(withoutDefinition) || exportRegex.test(content);
    }

    private isVariableUsed(variableName: string, content: string): boolean {
        // Remove the variable declaration and check if it's used elsewhere
        const withoutDeclaration = content.replace(new RegExp(`(?:const|let|var)\\s+${variableName}\\s*=.*?;`, 'g'), '');
        const usageRegex = new RegExp(`\\b${variableName}\\b`, 'g');
        return usageRegex.test(withoutDeclaration);
    }

    private isComponentUsed(componentName: string, content: string): boolean {
        // Check if component is used in JSX
        const jsxUsageRegex = new RegExp(`<${componentName}[\\s>]`, 'g');
        
        // Check if component is exported (might be used externally)
        const exportRegex = new RegExp(`export.*${componentName}`, 'g');
        
        return jsxUsageRegex.test(content) || exportRegex.test(content);
    }

    private isJavaScriptFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.js', '.ts', '.mjs'].includes(ext);
    }

    private isReactFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.jsx', '.tsx'].includes(ext);
    }

    private isCSSFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.css', '.scss', '.sass', '.less'].includes(ext);
    }

    // Runtime monitoring methods (for future enhancement)
    startRuntimeMonitoring(): void {
        
        console.log('Runtime monitoring started (not implemented yet)');
    }

    stopRuntimeMonitoring(): void {
        console.log('Runtime monitoring stopped');
    }

    getRuntimeStats(): RuntimeStats {
        return this.runtimeStats;
    }

    dispose(): void {
        // Clean up any resources
        this.instrumentedFiles.clear();
        this.originalContent.clear();
    }
}
