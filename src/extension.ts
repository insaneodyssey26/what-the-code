
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {


	console.log('Congratulations, your extension "what-the-code" is now active!');


	const disposable = vscode.commands.registerCommand('what-the-code.helloWorld', () => {
		
		vscode.window.showInformationMessage('Hello World from What-The-Code!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
