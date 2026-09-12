import * as vscode from "vscode";

export class FlyCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    this.addLoaderCodeLens(text, document, codeLenses);
    this.addMetaCodeLens(text, document, codeLenses);
    this.addApiCodeLens(text, document, codeLenses);
    this.addActionCodeLens(text, document, codeLenses);
    this.addMiddlewareCodeLens(text, document, codeLenses);
    this.addGenerateStaticParamsCodeLens(text, document, codeLenses);
    this.addConfigCodeLens(text, document, codeLenses);

    return codeLenses;
  }

  private addLoaderCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const regex = /export\s+(async\s+)?function\s+loader\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "$(database) Loader",
          tooltip: "Server-side data loader. Data is passed to template and meta.",
          command: "editor.action.showHover",
          arguments: [],
        })
      );
    }
  }

  private addMetaCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const regex = /export\s+function\s+meta\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "$(gear) SEO Meta",
          tooltip: "SEO metadata: title, description, openGraph, twitter, jsonLd",
          command: "editor.action.showHover",
          arguments: [],
        })
      );
    }
  }

  private addApiCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    for (const method of methods) {
      const regex = new RegExp(
        `export\\s+(async\\s+)?function\\s+${method}\\s*\\(`,
        "g"
      );
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text))) {
        const line = document.positionAt(match.index).line;
        const range = new vscode.Range(line, 0, line, 0);

        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `$(globe) ${method}`,
            tooltip: `API handler for ${method} requests`,
            command: "editor.action.showHover",
            arguments: [],
          })
        );
      }
    }
  }

  private addActionCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const hasUseServer = /["']use\s+server["']/.test(text);
    if (!hasUseServer) return;

    const excludedNames = [
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

    const regex =
      /export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const fnName = match[2];
      if (excludedNames.includes(fnName)) continue;

      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "$(zap) Server Action",
          tooltip: `Server action "${fnName}": callable from client-side code`,
          command: "editor.action.showHover",
          arguments: [],
        })
      );
    }
  }

  private addMiddlewareCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const regex =
      /export\s+default\s+(async\s+)?function\s+middleware\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "$(shield) Middleware",
          tooltip: "Request middleware. Runs before route handling.",
          command: "editor.action.showHover",
          arguments: [],
        })
      );
    }
  }

  private addGenerateStaticParamsCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const regex =
      /export\s+(async\s+)?function\s+generateStaticParams\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "$(list-ordered) SSG Params",
          tooltip: "Static route parameters for build-time generation",
          command: "editor.action.showHover",
          arguments: [],
        })
      );
    }
  }

  private addConfigCodeLens(
    text: string,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[]
  ): void {
    const configs: { pattern: RegExp; label: string; tooltip: string }[] = [
      {
        pattern: /export\s+const\s+render\s*=/,
        label: "$(play) Render Mode",
        tooltip: "Controls rendering strategy: client, stream, or pipe",
      },
      {
        pattern: /export\s+const\s+revalidate\s*=/,
        label: "$(sync) ISR",
        tooltip: "Incremental Static Regeneration interval in seconds",
      },
      {
        pattern: /export\s+const\s+prerender\s*=\s*true/,
        label: "$(package) SSG",
        tooltip: "Static Site Generation is enabled for this page",
      },
    ];

    for (const config of configs) {
      const match = text.match(config.pattern);
      if (match && match.index !== undefined) {
        const line = document.positionAt(match.index).line;
        const range = new vscode.Range(line, 0, line, 0);

        codeLenses.push(
          new vscode.CodeLens(range, {
            title: config.label,
            tooltip: config.tooltip,
            command: "editor.action.showHover",
            arguments: [],
          })
        );
      }
    }
  }
}
