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
            if (this.isJavaScriptFile(filePath)) {
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

    private importRegex = /import\s+(?:\{([^}]*)\}|([^,{}\s]+)|\*\s+as\s+([^\s]+))?\s*from\s*['"]([^'"]+)['"]/gm;
    private functionRegex = /(?:^|\s)function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;
    private arrowFunctionRegex = /(?:^|\s)(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm;
    private variableRegex = /(?:^|\s)(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm;
    private componentRegex = /(?:^|\s)(?:function\s+|const\s+)([A-Z][a-zA-Z0-9_$]*)\s*(?:\(|=)/gm;
    private exportRegex = /export\s+(?:default\s+)?(?:function\s+|const\s+|class\s+|interface\s+|type\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/gm;

    private async analyzeJavaScriptFile(content: string, filePath: string, relativePath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        const lines = content.split('\n');
        issues.push(...this.findUnusedImports(content, filePath, relativePath, lines));
        issues.push(...this.findUnusedFunctions(content, filePath, relativePath, lines));
        issues.push(...this.findUnusedVariables(content, filePath, relativePath, lines));
        return issues;
    }

    private async analyzeReactFile(content: string, filePath: string, relativePath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        const lines = content.split('\n');
        issues.push(...this.findUnusedComponents(content, filePath, relativePath, lines));
        issues.push(...await this.analyzeJavaScriptFile(content, filePath, relativePath));
        return issues;
    }

    private async analyzeCSSFile(content: string, filePath: string, relativePath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        const lines = content.split('\n');
        issues.push(...this.findUnusedCSSSelectors(content, filePath, relativePath, lines));
        return issues;
    }

    private findUnusedImports(content: string, filePath: string, relativePath: string, lines: string[]): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        let match;
        while ((match = this.importRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            const namedImports = match[1] || '';
            const defaultImport = match[2];
            const namespaceImport = match[3];
            const modulePath = match[4];
            if (namedImports) {
                const imports = namedImports.split(',').map(imp => imp.trim()).filter(Boolean);
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
        let match;
        while ((match = this.functionRegex.exec(content)) !== null) {
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
        while ((match = this.arrowFunctionRegex.exec(content)) !== null) {
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
        let match;
        while ((match = this.variableRegex.exec(content)) !== null) {
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
        let match;
        while ((match = this.componentRegex.exec(content)) !== null) {
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
        return issues;
    }

    private isImportUsed(importName: string, content: string): boolean {
        const cleanName = importName.trim();
        if (!cleanName) {
            return true;
        }
        
        const withoutImports = content.replace(/^import.*$/gm, '');
        const usageRegex = new RegExp(`\\b${this.escapeRegex(cleanName)}\\b`, 'g');
        return usageRegex.test(withoutImports);
    }

    private isFunctionUsed(functionName: string, content: string, filePath: string): boolean {
        const cleanName = functionName.trim();
        if (!cleanName) {
            return true;
        }
        
        this.exportRegex.lastIndex = 0;
        const isExported = this.exportRegex.test(content) && content.includes(cleanName);
        if (isExported) {
            return true;
        }
        
        const withoutDefinition = content.replace(
            new RegExp(`(?:^|\\s)function\\s+${this.escapeRegex(cleanName)}\\s*\\([^{]*\\{`, 'gm'), 
            ''
        ).replace(
            new RegExp(`(?:^|\\s)(?:const|let|var)\\s+${this.escapeRegex(cleanName)}\\s*=`, 'gm'), 
            ''
        );
        
        const usageRegex = new RegExp(`\\b${this.escapeRegex(cleanName)}\\s*\\(`, 'g');
        return usageRegex.test(withoutDefinition);
    }

    private isVariableUsed(variableName: string, content: string): boolean {
        const cleanName = variableName.trim();
        if (!cleanName) {
            return true;
        }
        
        const withoutDeclaration = content.replace(
            new RegExp(`(?:^|\\s)(?:const|let|var)\\s+${this.escapeRegex(cleanName)}\\s*=.*?[;\\n]`, 'gm'), 
            ''
        );
        const usageRegex = new RegExp(`\\b${this.escapeRegex(cleanName)}\\b`, 'g');
        return usageRegex.test(withoutDeclaration);
    }

    private isComponentUsed(componentName: string, content: string): boolean {
        const cleanName = componentName.trim();
        if (!cleanName) {
            return true;
        }
        
        this.exportRegex.lastIndex = 0;
        const isExported = this.exportRegex.test(content) && content.includes(cleanName);
        if (isExported) {
            return true;
        }
        
        const jsxUsageRegex = new RegExp(`<${this.escapeRegex(cleanName)}[\\s>/<]`, 'g');
        const refUsageRegex = new RegExp(`\\b${this.escapeRegex(cleanName)}\\b`, 'g');
        
        return jsxUsageRegex.test(content) || refUsageRegex.test(content.replace(
            new RegExp(`(?:^|\\s)(?:function\\s+|const\\s+)${this.escapeRegex(cleanName)}\\s*`, 'gm'), 
            ''
        ));
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        this.instrumentedFiles.clear();
        this.originalContent.clear();
    }
}
