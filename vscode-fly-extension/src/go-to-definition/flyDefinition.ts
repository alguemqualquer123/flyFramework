import * as vscode from "vscode";

export class FlyDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const functionNames = [
      "loader",
      "meta",
      "middleware",
      "generateStaticParams",
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ];

    if (functionNames.includes(word)) {
      const text = document.getText();
      const regex = new RegExp(
        `export\\s+(?:async\\s+)?function\\s+${word}\\s*\\(`,
        "g"
      );
      const match = regex.exec(text);
      if (match) {
        const offset = document.offsetAt(position);
        const matchStart = text.indexOf(match[0]);
        if (matchStart !== offset - (offset - document.getText().indexOf(match[0]))) {
          const defPosition = document.positionAt(matchStart);
          return new vscode.Location(document.uri, defPosition);
        }
      }
    }

    if (word === "flyUtils") {
      return this.findFlyUtilsDefinition(document);
    }

    if (word === "cache") {
      return this.findCacheDefinition(document);
    }

    if (word === "$state") {
      return this.findStateDefinition(document, position);
    }

    return null;
  }

  private findFlyUtilsDefinition(
    document: vscode.TextDocument
  ): vscode.Location | null {
    const text = document.getText();
    const match = text.match(/flyUtils\s*[:=]/);
    if (match && match.index !== undefined) {
      const pos = document.positionAt(match.index);
      return new vscode.Location(document.uri, pos);
    }
    return null;
  }

  private findCacheDefinition(
    document: vscode.TextDocument
  ): vscode.Location | null {
    const text = document.getText();
    const match = text.match(/\bcache\b\s*[:=]/);
    if (match && match.index !== undefined) {
      const pos = document.positionAt(match.index);
      return new vscode.Location(document.uri, pos);
    }
    return null;
  }

  private findStateDefinition(
    document: vscode.TextDocument,
    _position: vscode.Position
  ): vscode.Location | null {
    const text = document.getText();
    const regex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      if (match.index !== undefined) {
        const pos = document.positionAt(match.index);
        return new vscode.Location(document.uri, pos);
      }
    }

    return null;
  }
}
