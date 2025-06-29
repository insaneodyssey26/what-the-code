import { Project, SourceFile, Node, ImportDeclaration, FunctionDeclaration, VariableDeclaration, SyntaxKind } from 'ts-morph';
import * as path from 'path';

export interface DeadCodeIssue {
    type: 'unused-import' | 'unused-function' | 'unused-variable';
    filePath: string;
    relativePath: string;
    line: number;
    column: number;
    name: string;
    description: string;
}

export class DeadCodeAnalyzer {
    private project: Project;

    constructor() {
        this.project = new Project({
            useInMemoryFileSystem: true,
            compilerOptions: {
                allowJs: true,
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                jsx: 1, // React JSX
                target: 99, // ESNext
                module: 99, // ESNext
                moduleResolution: 2, // Node
                skipLibCheck: true,
                noEmit: true
            }
        });
    }

    async analyzeFile(filePath: string, rootPath: string): Promise<DeadCodeIssue[]> {
        const issues: DeadCodeIssue[] = [];
        
        try {
            // Add file to project
            const sourceFile = this.project.addSourceFileAtPath(filePath);
            
            // Analyze unused imports
            issues.push(...this.analyzeUnusedImports(sourceFile, rootPath));
            
            // Analyze unused functions
            issues.push(...this.analyzeUnusedFunctions(sourceFile, rootPath));
            
            // Analyze unused variables
            issues.push(...this.analyzeUnusedVariables(sourceFile, rootPath));
            
        } catch (error) {
            console.warn(`Error analyzing file ${filePath}:`, error);
        }

        return issues;
    }

    private analyzeUnusedImports(sourceFile: SourceFile, rootPath: string): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        sourceFile.getImportDeclarations().forEach(importDecl => {
            try {
                // Check default import
                const defaultImport = importDecl.getDefaultImport();
                if (defaultImport && this.isNodeUnused(defaultImport)) {
                    issues.push(this.createIssue(
                        'unused-import',
                        sourceFile,
                        rootPath,
                        defaultImport,
                        defaultImport.getText(),
                        `Unused default import '${defaultImport.getText()}'`
                    ));
                }

                // Check namespace import
                const namespaceImport = importDecl.getNamespaceImport();
                if (namespaceImport && this.isNodeUnused(namespaceImport)) {
                    issues.push(this.createIssue(
                        'unused-import',
                        sourceFile,
                        rootPath,
                        namespaceImport,
                        namespaceImport.getText(),
                        `Unused namespace import '${namespaceImport.getText()}'`
                    ));
                }

                // Check named imports
                const namedImports = importDecl.getNamedImports();
                namedImports.forEach(namedImport => {
                    if (this.isNodeUnused(namedImport)) {
                        issues.push(this.createIssue(
                            'unused-import',
                            sourceFile,
                            rootPath,
                            namedImport,
                            namedImport.getName(),
                            `Unused named import '${namedImport.getName()}'`
                        ));
                    }
                });
            } catch (error) {
                // Ignore errors for individual imports
            }
        });

        return issues;
    }

    private analyzeUnusedFunctions(sourceFile: SourceFile, rootPath: string): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        // Get function declarations
        sourceFile.getFunctions().forEach(func => {
            try {
                if (this.isPossiblyUnusedFunction(func)) {
                    const name = func.getName() || '<anonymous>';
                    issues.push(this.createIssue(
                        'unused-function',
                        sourceFile,
                        rootPath,
                        func,
                        name,
                        `Possibly unused function '${name}'`
                    ));
                }
            } catch (error) {
                // Ignore errors for individual functions
            }
        });

        // Get function expressions and arrow functions in variable declarations
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            try {
                const initializer = varDecl.getInitializer();
                if (initializer && (
                    Node.isFunctionExpression(initializer) || 
                    Node.isArrowFunction(initializer)
                )) {
                    if (this.isPossiblyUnusedVariable(varDecl)) {
                        const name = varDecl.getName();
                        issues.push(this.createIssue(
                            'unused-function',
                            sourceFile,
                            rootPath,
                            varDecl,
                            name,
                            `Possibly unused function variable '${name}'`
                        ));
                    }
                }
            } catch (error) {
                // Ignore errors for individual variables
            }
        });

        return issues;
    }

    private analyzeUnusedVariables(sourceFile: SourceFile, rootPath: string): DeadCodeIssue[] {
        const issues: DeadCodeIssue[] = [];
        
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            try {
                // Skip function variables (handled in analyzeUnusedFunctions)
                const initializer = varDecl.getInitializer();
                if (initializer && (
                    Node.isFunctionExpression(initializer) || 
                    Node.isArrowFunction(initializer)
                )) {
                    return;
                }

                if (this.isPossiblyUnusedVariable(varDecl)) {
                    const name = varDecl.getName();
                    issues.push(this.createIssue(
                        'unused-variable',
                        sourceFile,
                        rootPath,
                        varDecl,
                        name,
                        `Possibly unused variable '${name}'`
                    ));
                }
            } catch (error) {
                // Ignore errors for individual variables
            }
        });

        return issues;
    }

    private isNodeUnused(node: Node): boolean {
        try {
            // Try to use ts-morph's built-in unused detection
            if ('findReferences' in node && typeof node.findReferences === 'function') {
                const references = (node as any).findReferences();
                return references.length <= 1; // Only the declaration itself
            }
            
            // For import specifiers, check if they're referenced
            if (Node.isImportSpecifier(node)) {
                const nameNode = node.getNameNode();
                return this.isNodeUnused(nameNode);
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    private isPossiblyUnusedFunction(func: FunctionDeclaration): boolean {
        try {
            // Skip exported functions
            if (func.isExported() || func.hasExportKeyword()) {
                return false;
            }

            // Check references
            const references = func.findReferences();
            return references.length <= 1; // Only the declaration itself
        } catch (error) {
            return false;
        }
    }

    private isPossiblyUnusedVariable(varDecl: VariableDeclaration): boolean {
        try {
            // Skip if it's part of an exported declaration
            const statement = varDecl.getVariableStatement();
            if (statement?.isExported() || statement?.hasExportKeyword()) {
                return false;
            }

            // Check references
            const references = varDecl.findReferences();
            return references.length <= 1; // Only the declaration itself
        } catch (error) {
            return false;
        }
    }

    private createIssue(
        type: DeadCodeIssue['type'],
        sourceFile: SourceFile,
        rootPath: string,
        node: Node,
        name: string,
        description: string
    ): DeadCodeIssue {
        const filePath = sourceFile.getFilePath();
        const startPos = node.getStart();
        const lineAndColumn = sourceFile.getLineAndColumnAtPos(startPos);

        return {
            type,
            filePath,
            relativePath: path.relative(rootPath, filePath),
            line: lineAndColumn.line,
            column: lineAndColumn.column,
            name,
            description
        };
    }

    dispose(): void {
        // Clean up ts-morph project
        this.project.getSourceFiles().forEach(sourceFile => {
            try {
                sourceFile.delete();
            } catch (error) {
                // Ignore cleanup errors
            }
        });
    }
}
