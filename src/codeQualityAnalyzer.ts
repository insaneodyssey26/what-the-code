export interface CodeQualityMetrics {
    readonly typesCoverage: number;
    readonly functionComplexity: number;
    readonly duplicateCodeBlocks: number;
    readonly unusedParameters: number;
    readonly magicNumbers: number;
    readonly longFunctions: number;
}

export interface RefactoringRecommendation {
    readonly type: 'extract-function' | 'remove-duplicate' | 'simplify-condition' | 'add-types' | 'split-function';
    readonly filePath: string;
    readonly line: number;
    readonly severity: 'high' | 'medium' | 'low';
    readonly description: string;
    readonly estimatedImpact: 'performance' | 'maintainability' | 'readability';
    readonly autoFixAvailable: boolean;
}

export interface TypeSafetyIssue {
    readonly type: 'missing-type' | 'any-usage' | 'implicit-any' | 'loose-equality';
    readonly filePath: string;
    readonly line: number;
    readonly column: number;
    readonly message: string;
    readonly severity: 'error' | 'warning' | 'info';
    readonly suggestion?: string;
}

export class CodeQualityAnalyzer {
    private readonly complexityThreshold = 10;
    private readonly functionLengthThreshold = 50;
    private readonly duplicateThreshold = 5;

    analyzeCodeQuality(content: string, filePath: string): CodeQualityMetrics {
        return {
            typesCoverage: this.calculateTypesCoverage(content),
            functionComplexity: this.calculateAverageComplexity(content),
            duplicateCodeBlocks: this.findDuplicateBlocks(content),
            unusedParameters: this.findUnusedParameters(content),
            magicNumbers: this.findMagicNumbers(content),
            longFunctions: this.findLongFunctions(content)
        };
    }

    findTypeSafetyIssues(content: string, filePath: string): TypeSafetyIssue[] {
        const issues: TypeSafetyIssue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNum = index + 1;
            
            if (line.includes(': any') || line.includes('as any')) {
                issues.push({
                    type: 'any-usage',
                    filePath,
                    line: lineNum,
                    column: line.indexOf('any') + 1,
                    message: 'Avoid using "any" type',
                    severity: 'warning',
                    suggestion: 'Consider using specific types or generic constraints'
                });
            }

            if (line.includes('==') || line.includes('!=')) {
                const match = line.match(/(==|!=)/);
                if (match) {
                    issues.push({
                        type: 'loose-equality',
                        filePath,
                        line: lineNum,
                        column: match.index! + 1,
                        message: 'Use strict equality operators (=== or !==)',
                        severity: 'warning',
                        suggestion: `Replace ${match[1]} with ${match[1] === '==' ? '===' : '!=='}`
                    });
                }
            }

            const paramRegex = /\w+\s*\([^)]*\w+(?!\s*:)(?:\s*,|\s*\))/g;
            if (paramRegex.test(line)) {
                issues.push({
                    type: 'missing-type',
                    filePath,
                    line: lineNum,
                    column: 1,
                    message: 'Function parameter missing type annotation',
                    severity: 'info',
                    suggestion: 'Add explicit type annotations to parameters'
                });
            }
        });

        return issues;
    }

    generateRefactoringRecommendations(content: string, filePath: string): RefactoringRecommendation[] {
        const recommendations: RefactoringRecommendation[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            if (this.isComplexCondition(line)) {
                recommendations.push({
                    type: 'simplify-condition',
                    filePath,
                    line: lineNum,
                    severity: 'medium',
                    description: 'Complex conditional expression could be simplified',
                    estimatedImpact: 'readability',
                    autoFixAvailable: false
                });
            }

            if (this.containsMagicNumber(line)) {
                recommendations.push({
                    type: 'extract-function',
                    filePath,
                    line: lineNum,
                    severity: 'low',
                    description: 'Magic number detected, consider extracting to named constant',
                    estimatedImpact: 'maintainability',
                    autoFixAvailable: true
                });
            }
        });

        const duplicates = this.findDuplicateCodeBlocks(content, filePath);
        recommendations.push(...duplicates);

        return recommendations;
    }

    private calculateTypesCoverage(content: string): number {
        const totalDeclarations = (content.match(/(?:const|let|var|function|class)\s+\w+/g) || []).length;
        const typedDeclarations = (content.match(/(?:const|let|var|function|class)\s+\w+\s*:\s*\w+/g) || []).length;
        
        return totalDeclarations > 0 ? (typedDeclarations / totalDeclarations) * 100 : 100;
    }

    private calculateAverageComplexity(content: string): number {
        const functions = content.match(/function\s+\w+[^{]*\{[^}]*\}/g) || [];
        const totalComplexity = functions.reduce((sum, func) => {
            return sum + this.calculateFunctionComplexity(func);
        }, 0);
        
        return functions.length > 0 ? totalComplexity / functions.length : 0;
    }

    private calculateFunctionComplexity(func: string): number {
        const complexityPatterns = [
            /if\s*\(/g,
            /else\s*if\s*\(/g,
            /while\s*\(/g,
            /for\s*\(/g,
            /switch\s*\(/g,
            /catch\s*\(/g,
            /&&|\|\|/g,
            /\?.*:/g
        ];

        return complexityPatterns.reduce((complexity, pattern) => {
            const matches = func.match(pattern);
            return complexity + (matches ? matches.length : 0);
        }, 1);
    }

    private findDuplicateBlocks(content: string): number {
        const lines = content.split('\n');
        const blocks = new Map<string, number>();
        let duplicateCount = 0;

        for (let i = 0; i < lines.length - this.duplicateThreshold; i++) {
            const block = lines.slice(i, i + this.duplicateThreshold).join('\n').trim();
            if (block && !block.startsWith('//') && !block.startsWith('/*')) {
                blocks.set(block, (blocks.get(block) || 0) + 1);
            }
        }

        blocks.forEach((count) => {
            if (count > 1) {
                duplicateCount++;
            }
        });

        return duplicateCount;
    }

    private findDuplicateCodeBlocks(content: string, filePath: string): RefactoringRecommendation[] {
        const recommendations: RefactoringRecommendation[] = [];
        const lines = content.split('\n');
        const seenBlocks = new Map<string, number>();

        for (let i = 0; i < lines.length - this.duplicateThreshold; i++) {
            const block = lines.slice(i, i + this.duplicateThreshold).join('\n').trim();
            if (block && !this.isCommentBlock(block)) {
                if (seenBlocks.has(block)) {
                    recommendations.push({
                        type: 'remove-duplicate',
                        filePath,
                        line: i + 1,
                        severity: 'high',
                        description: `Duplicate code block detected (${this.duplicateThreshold} lines)`,
                        estimatedImpact: 'maintainability',
                        autoFixAvailable: false
                    });
                } else {
                    seenBlocks.set(block, i);
                }
            }
        }

        return recommendations;
    }

    private findUnusedParameters(content: string): number {
        const functionMatches = content.match(/function\s+\w+\s*\(([^)]*)\)/g) || [];
        let unusedCount = 0;

        functionMatches.forEach(funcDecl => {
            const paramMatch = funcDecl.match(/\(([^)]*)\)/);
            if (paramMatch && paramMatch[1].trim()) {
                const params = paramMatch[1].split(',').map(p => p.trim().split(':')[0].trim());
                const funcBody = this.extractFunctionBody(content, funcDecl);
                
                params.forEach(param => {
                    if (param && !new RegExp(`\\b${param}\\b`).test(funcBody)) {
                        unusedCount++;
                    }
                });
            }
        });

        return unusedCount;
    }

    private findMagicNumbers(content: string): number {
        const magicNumberRegex = /\b(?!0|1|100)\d+\b/g;
        const matches = content.match(magicNumberRegex) || [];
        return matches.filter(num => {
            const context = content.substring(content.indexOf(num) - 10, content.indexOf(num) + 10);
            return !context.includes('array') && !context.includes('length') && !context.includes('index');
        }).length;
    }

    private findLongFunctions(content: string): number {
        const functionRegex = /function\s+\w+[^{]*\{/g;
        let longFunctionCount = 0;
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            const funcStart = match.index;
            const funcEnd = this.findMatchingBrace(content, funcStart + match[0].length - 1);
            if (funcEnd !== -1) {
                const funcLines = content.substring(funcStart, funcEnd).split('\n').length;
                if (funcLines > this.functionLengthThreshold) {
                    longFunctionCount++;
                }
            }
        }

        return longFunctionCount;
    }

    private isComplexCondition(line: string): boolean {
        const andOrCount = (line.match(/&&|\|\|/g) || []).length;
        const parenthesesCount = (line.match(/\(/g) || []).length;
        return andOrCount > 2 || parenthesesCount > 3;
    }

    private containsMagicNumber(line: string): boolean {
        const magicNumberRegex = /\b(?!0|1|100)\d{2,}\b/;
        return magicNumberRegex.test(line) && !line.includes('//');
    }

    private isCommentBlock(block: string): boolean {
        const trimmed = block.trim();
        return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }

    private extractFunctionBody(content: string, funcDecl: string): string {
        const funcStart = content.indexOf(funcDecl);
        if (funcStart === -1) {
            return '';
        }
        
        const braceStart = content.indexOf('{', funcStart);
        if (braceStart === -1) {
            return '';
        }
        
        const braceEnd = this.findMatchingBrace(content, braceStart);
        if (braceEnd === -1) {
            return '';
        }
        
        return content.substring(braceStart + 1, braceEnd);
    }

    private findMatchingBrace(content: string, startIndex: number): number {
        let braceCount = 1;
        for (let i = startIndex + 1; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
            } else if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    return i;
                }
            }
        }
        return -1;
    }
}
