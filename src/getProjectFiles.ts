import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectFile {
    filePath: string;
    relativePath: string;
    extension: string;
}

export class ProjectFileCollector {
    private readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx'];
    private readonly ignoredDirectories = [
        'node_modules',
        '.git',
        'dist',
        'build',
        'out',
        '.vscode',
        'coverage',
        '.nyc_output',
        'lib',
        'types'
    ];

    async collectProjectFiles(): Promise<ProjectFile[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const files: ProjectFile[] = [];
        await this.walkDirectory(workspaceFolder.uri.fsPath, workspaceFolder.uri.fsPath, files);
        
        return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    }

    private async walkDirectory(dirPath: string, rootPath: string, files: ProjectFile[]): Promise<void> {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    
                    if (this.ignoredDirectories.includes(entry.name)) {
                        continue;
                    }

                    
                    await this.walkDirectory(fullPath, rootPath, files);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    
                    
                    if (this.supportedExtensions.includes(ext)) {
                        files.push({
                            filePath: fullPath,
                            relativePath: path.relative(rootPath, fullPath),
                            extension: ext
                        });
                    }
                }
            }
        } catch (error) {
            console.warn(`Error reading directory ${dirPath}:`, error);
        }
    }

    getFileCount(files: ProjectFile[]): { total: number; byExtension: Record<string, number> } {
        const byExtension: Record<string, number> = {};
        
        files.forEach(file => {
            byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
        });

        return {
            total: files.length,
            byExtension
        };
    }
}
