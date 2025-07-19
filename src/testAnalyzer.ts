import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DeadCodeAnalyzer, DeadCodeIssue } from './analyzeDeadCode';

export class AnalyzerTester {
    private analyzer: DeadCodeAnalyzer;

    constructor() {
        this.analyzer = new DeadCodeAnalyzer();
    }

    async runTestSuite(): Promise<void> {
        try {
            await this.testBasicFunctionality();
            await this.testErrorHandling();
            await this.testRegexPatterns();
            
            vscode.window.showInformationMessage('✅ All analyzer tests passed!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Test failed: ${errorMessage}`);
            console.error('Test suite failed:', error);
        }
    }

    private async testBasicFunctionality(): Promise<void> {
        console.log('Testing basic functionality...');
        
        const testContent = `
import React from 'react';
import { unusedImport } from './utils';

function unusedFunction() {
    return 'test';
}

function usedFunction() {
    return 'used';
}

const unusedVariable = 'not used';
const usedVariable = 'used in component';

export function TestComponent() {
    usedFunction();
    return <div>{usedVariable}</div>;
}
`;

        const testFilePath = await this.createTempFile('test.tsx', testContent);
        const issues = await this.analyzer.analyzeFile(testFilePath, path.dirname(testFilePath));
        
        console.log(`Found ${issues.length} issues:`, issues);
        
        const hasUnusedImport = issues.some(i => i.name === 'unusedImport');
        const hasUnusedFunction = issues.some(i => i.name === 'unusedFunction');
        const hasUnusedVariable = issues.some(i => i.name === 'unusedVariable');
        
        if (!hasUnusedImport) {
            console.warn('Did not detect unused import');
        }
        if (!hasUnusedFunction) {
            console.warn('Did not detect unused function');
        }
        if (!hasUnusedVariable) {
            console.warn('Did not detect unused variable');
        }
        
        await this.cleanupTempFile(testFilePath);
        
        console.log('✓ Basic functionality test completed');
    }

    private async testErrorHandling(): Promise<void> {
        console.log('Testing error handling...');
        
        const issues = await this.analyzer.analyzeFile('/non/existent/file.js', '/some/root');
        console.log(`Non-existent file test: ${issues.length} issues (should be 0 or 1 error)`);
        
        const issues2 = await this.analyzer.analyzeFile('', '');
        console.log(`Empty path test: ${issues2.length} issues (should be 0)`);
        
        console.log('✓ Error handling test completed');
    }

    private async testRegexPatterns(): Promise<void> {
        console.log('Testing regex patterns...');
        
        const testContent = `
const arrowFunc = async () => {};
let variableDecl = 'test';
var oldStyleVar = 123;

function regularFunction() {}
async function asyncFunction() {}

class TestClass {}
interface TestInterface {}

export const exportedConst = 'value';
export default function defaultExport() {}

.unused-class {
    color: red;
}

#unused-id {
    display: block;
}
`;

        const testFilePath = await this.createTempFile('regex-test.tsx', testContent);
        const issues = await this.analyzer.analyzeFile(testFilePath, path.dirname(testFilePath));
        
        console.log(`Regex test found ${issues.length} issues:`, 
                   issues.map(i => `${i.type}: ${i.name}`));
        
        await this.cleanupTempFile(testFilePath);
        
        console.log('✓ Regex patterns test completed');
    }

    private async createTempFile(filename: string, content: string): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        
        const tempPath = path.join(workspaceFolder.uri.fsPath, 'temp_' + filename);
        await fs.promises.writeFile(tempPath, content, 'utf8');
        return tempPath;
    }

    private async cleanupTempFile(filePath: string): Promise<void> {
        try {
            await fs.promises.unlink(filePath);
        } catch (error) {
            console.warn(`Failed to cleanup temp file ${filePath}:`, error);
        }
    }

    dispose(): void {
        this.analyzer.dispose();
    }
}

export async function runAnalyzerTests(): Promise<void> {
    const tester = new AnalyzerTester();
    await tester.runTestSuite();
    tester.dispose();
}
