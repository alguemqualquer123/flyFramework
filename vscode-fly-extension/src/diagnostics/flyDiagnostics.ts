import * as vscode from "vscode";

interface FlyDiagnostic {
  range: vscode.Range;
  message: string;
  severity: vscode.DiagnosticSeverity;
  code?: string;
  source: string;
}

export class FlyDiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];
  private readonly source = "FlyFramework";

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("fly");
  }

  register(context: vscode.ExtensionContext): void {
    this.disposables.push(this.diagnosticCollection);

    const documentSelector: vscode.DocumentSelector = { language: "fly" };

    vscode.workspace.onDidOpenTextDocument(
      (doc) => this.validateDocument(doc),
      null,
      this.disposables
    );

    vscode.workspace.onDidChangeTextDocument(
      (e) => this.validateDocument(e.document),
      null,
      this.disposables
    );

    vscode.workspace.onDidCloseTextDocument(
      (doc) => this.diagnosticCollection.delete(doc.uri),
      null,
      this.disposables
    );

    for (const doc of vscode.workspace.textDocuments) {
      if (vscode.languages.match(documentSelector, doc)) {
        this.validateDocument(doc);
      }
    }

    context.subscriptions.push(...this.disposables);
  }

  private validateDocument(document: vscode.TextDocument): void {
    if (document.languageId !== "fly") return;

    const diagnostics: FlyDiagnostic[] = [];
    const text = document.getText();

    this.checkUseServerConflicts(text, document, diagnostics);
    this.checkMissingLoader(text, document, diagnostics);
    this.checkActionWithoutUseServer(text, document, diagnostics);
    this.checkForWithoutOf(text, document, diagnostics);
    this.checkSlotOutsideLayout(text, document, diagnostics);
    this.checkApiRouteNoHandler(text, document, diagnostics);
    this.checkConfigExportInScript(text, document, diagnostics);
    this.checkDuplicateExports(text, document, diagnostics);
    this.checkNestedScriptTags(text, document, diagnostics);
    this.checkEmptyTemplate(text, document, diagnostics);
    this.checkConsoleLog(text, document, diagnostics);
    this.checkEmptyEventHandlers(text, document, diagnostics);
    this.checkUnusedStateVars(text, document, diagnostics);
    this.checkTemplateUndefinedVars(text, document, diagnostics);
    this.checkMissingStyleBlock(text, document, diagnostics);
    this.checkMissingMetaExport(text, document, diagnostics);
    this.checkEventHandlerSyntax(text, document, diagnostics);
    this.checkLoaderParams(text, document, diagnostics);
    this.checkNestedStyleTags(text, document, diagnostics);
    this.checkStyleInsideScript(text, document, diagnostics);

    const vsDiags = diagnostics.map(
      (d) =>
        new vscode.Diagnostic(
          d.range,
          d.message,
          d.severity
        )
    );

    for (const d of vsDiags) {
      d.source = this.source;
    }

    this.diagnosticCollection.set(document.uri, vsDiags);
  }

  private checkUseServerConflicts(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const hasUseServer = /["']use\s+server["']/.test(text);
    const hasUseClient = /["']use\s+client["']/.test(text);

    if (hasUseServer && hasUseClient) {
      const serverMatch = text.match(/["']use\s+server["']/);
      const clientMatch = text.match(/["']use\s+client["']/);

      if (serverMatch && clientMatch) {
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (/["']use\s+server["']/.test(lines[i])) {
            diagnostics.push({
              range: new vscode.Range(i, 0, i, lines[i].length),
              message: 'Cannot use both "use server" and "use client" in the same file.',
              severity: vscode.DiagnosticSeverity.Error,
              code: "fly-invalid-directive",
              source: this.source,
            });
          }
        }
      }
    }
  }

  private checkMissingLoader(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const hasLoader = /export\s+(async\s+)?function\s+loader/.test(text);
    const hasGet = /export\s+(async\s+)?function\s+GET/.test(text);
    const hasMiddleware = /export\s+default\s+(async\s+)?function\s+middleware/.test(text);
    const isAction = /["']use\s+server["']/.test(text);

    if (!hasLoader && !hasGet && !hasMiddleware && !isAction) {
      const lines = text.split("\n");
      let inScriptBlock = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("<script")) {
          inScriptBlock = true;
        }
        if (lines[i].includes("</script>")) {
          inScriptBlock = false;
        }
        if (inScriptBlock && /export\s+(async\s+)?function/.test(lines[i])) {
          return;
        }
      }

      if (text.includes("<div") || text.includes("<section") || text.includes("<main")) {
        const scriptEnd = text.indexOf("</script>");
        if (scriptEnd > 0) {
          const line = text.substring(0, scriptEnd).split("\n").length;
          diagnostics.push({
            range: new vscode.Range(line - 1, 0, line - 1, 0),
            message: "Page may be missing a `loader` function. Add `export async function loader()` to fetch data server-side.",
            severity: vscode.DiagnosticSeverity.Information,
            code: "fly-missing-loader",
            source: this.source,
          });
        }
      }
    }
  }

  private checkActionWithoutUseServer(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const hasUseServer = /["']use\s+server["']/.test(text);
    if (!hasUseServer) return;

    const actionRegex = /export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
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

    let match: RegExpExecArray | null;
    while ((match = actionRegex.exec(text))) {
      const fnName = match[2];
      if (!excludedNames.includes(fnName)) {
        const lines = text.substring(0, match.index).split("\n");
        const line = lines.length - 1;
        const col = lines[line].length;
        diagnostics.push({
          range: new vscode.Range(line, col, line, col + fnName.length),
          message: `Action function "${fnName}" should be exported with "use server" directive.`,
          severity: vscode.DiagnosticSeverity.Warning,
          code: "fly-action-missing-use-server",
          source: this.source,
        });
      }
    }
  }

  private checkForWithoutOf(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const forMatch = lines[i].match(/\bfor\s*=\s*["']\{([^}]*)\}["']/);
      if (forMatch) {
        const expr = forMatch[1].trim();
        if (!expr.includes(" of ")) {
          diagnostics.push({
            range: new vscode.Range(i, 0, i, lines[i].length),
            message: 'For loop expression missing "of" keyword. Use: for="{item of items}".',
            severity: vscode.DiagnosticSeverity.Error,
            code: "fly-for-missing-of",
            source: this.source,
          });
        }
      }
    }
  }

  private checkSlotOutsideLayout(
    text: string,
    document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const hasSlot = /<slot\s*\/?>/.test(text);
    const fileName = document.fileName.toLowerCase();

    if (hasSlot && !fileName.includes("layout")) {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/<slot\s*\/?>/.test(lines[i])) {
          diagnostics.push({
            range: new vscode.Range(i, 0, i, lines[i].length),
            message: "<slot /> is typically used in layout files. Ensure this is intentional.",
            severity: vscode.DiagnosticSeverity.Information,
            code: "fly-slot-outside-layout",
            source: this.source,
          });
        }
      }
    }
  }

  private checkApiRouteNoHandler(
    text: string,
    document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const fileName = document.fileName.toLowerCase();
    if (!fileName.includes("/api/") && !fileName.includes("\\api\\")) return;

    const hasAnyHandler =
      /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/.test(text);

    if (!hasAnyHandler) {
      diagnostics.push({
        range: new vscode.Range(0, 0, 0, 0),
        message: "API route has no HTTP method handler (GET, POST, PUT, PATCH, DELETE).",
        severity: vscode.DiagnosticSeverity.Error,
        code: "fly-api-no-handler",
        source: this.source,
      });
    }
  }

  private checkConfigExportInScript(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const configExports = [
      /export\s+const\s+render\s*=/,
      /export\s+const\s+revalidate\s*=/,
      /export\s+const\s+prerender\s*=/,
      /export\s+(async\s+)?function\s+generateStaticParams/,
    ];

    for (const pattern of configExports) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        const lines = text.substring(0, match.index).split("\n");
        const line = lines.length - 1;
        const isInScriptBlock = this.isInsideScriptBlock(text, match.index);
        if (!isInScriptBlock) {
          diagnostics.push({
            range: new vscode.Range(line, 0, line, lines[line].length),
            message: `Config export must be inside a <script> block.`,
            severity: vscode.DiagnosticSeverity.Error,
            code: "fly-config-outside-script",
            source: this.source,
          });
        }
      }
    }
  }

  private checkDuplicateExports(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const exportFns = [
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

    for (const fnName of exportFns) {
      const regex = new RegExp(
        `export\\s+(?:async\\s+)?function\\s+${fnName}\\s*\\(`,
        "g"
      );
      const matches = text.match(regex);
      if (matches && matches.length > 1) {
        let lastIndex = -1;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text))) {
          if (lastIndex !== -1) {
            const lines = text.substring(0, match.index).split("\n");
            const line = lines.length - 1;
            diagnostics.push({
              range: new vscode.Range(line, 0, line, lines[line].length),
              message: `Duplicate export: "${fnName}" is defined multiple times. Only the last definition will be used.`,
              severity: vscode.DiagnosticSeverity.Warning,
              code: "fly-duplicate-export",
              source: this.source,
            });
          }
          lastIndex = match.index;
        }
      }
    }
  }

  private checkNestedScriptTags(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const scriptOpenCount = (text.match(/<script/g) || []).length;
    const scriptCloseCount = (text.match(/<\/script>/g) || []).length;

    if (scriptOpenCount !== scriptCloseCount) {
      diagnostics.push({
        range: new vscode.Range(0, 0, 0, 0),
        message: `Mismatched <script> tags: ${scriptOpenCount} opening, ${scriptCloseCount} closing.`,
        severity: vscode.DiagnosticSeverity.Error,
        code: "fly-nested-script",
        source: this.source,
      });
    }
  }

  private checkEmptyTemplate(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      const afterScript = text.substring(text.indexOf("</script>") + 9).trim();
      const cleaned = afterScript.replace(/<style>[\s\S]*?<\/style>/, "").trim();

      if (cleaned.length === 0) {
        const lines = text.split("\n");
        let lastScriptLine = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("</script>")) {
            lastScriptLine = i;
          }
        }
        diagnostics.push({
          range: new vscode.Range(lastScriptLine + 1, 0, lastScriptLine + 1, 0),
          message: "Template is empty. Add HTML content outside the <script> block.",
          severity: vscode.DiagnosticSeverity.Information,
          code: "fly-empty-template",
          source: this.source,
        });
      }
    }
  }

  private checkConsoleLog(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const lines = text.split("\n");
    let inScript = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("<script")) inScript = true;
      if (lines[i].includes("</script>")) inScript = false;
      if (inScript && /console\.(log|debug|info|warn|error)\s*\(/.test(lines[i])) {
        const match = lines[i].match(/console\.\w+\s*\(/);
        if (match) {
          const col = lines[i].indexOf(match[0]);
          diagnostics.push({
            range: new vscode.Range(i, col, i, col + match[0].length),
            message: "Remove console.log/debug before production.",
            severity: vscode.DiagnosticSeverity.Warning,
            code: "fly-console-log",
            source: this.source,
          });
        }
      }
    }
  }

  private checkEmptyEventHandlers(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/on:\w+\s*=\s*"\s*\{\s*(\w+)\s*\}\s*"/);
      if (match) {
        const handlerName = match[1];
        const scriptContent = text.match(/<script>([\s\S]*?)<\/script>/)?.[1] || "";
        if (!scriptContent.includes(handlerName)) {
          diagnostics.push({
            range: new vscode.Range(i, 0, i, lines[i].length),
            message: `Event handler "${handlerName}" is not defined in <script>.`,
            severity: vscode.DiagnosticSeverity.Warning,
            code: "fly-undefined-handler",
            source: this.source,
          });
        }
      }
    }
  }

  private checkUnusedStateVars(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/);
    if (!scriptMatch) return;
    const scriptContent = scriptMatch[1];
    const templateContent = text.replace(/<script>[\s\S]*?<\/script>/, "").replace(/<style>[\s\S]*?<\/style>/, "");

    const stateRegex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = stateRegex.exec(scriptContent))) {
      const varName = match[1];
      const scriptWithoutDecl = scriptContent.replace(match[0], "");
      const usedInScript = new RegExp("\\b" + varName + "\\b").test(scriptWithoutDecl);
      const usedInTemplate = new RegExp("\\{\\s*" + varName + "\\b").test(templateContent);
      const usedInFor = new RegExp('for\\s*=\\s*"[^"]*\\b' + varName + "\\b").test(templateContent);
      const usedInIf = new RegExp('if\\s*=\\s*"[^"]*\\b' + varName + "\\b").test(templateContent);

      if (!usedInScript && !usedInTemplate && !usedInFor && !usedInIf) {
        const lines = text.split("\n");
        const lineIdx = text.substring(0, match.index).split("\n").length - 1;
        diagnostics.push({
          range: new vscode.Range(lineIdx, 0, lineIdx, lines[lineIdx]?.length || 0),
          message: `State variable "${varName}" is declared but never used.`,
          severity: vscode.DiagnosticSeverity.Information,
          code: "fly-unused-state",
          source: this.source,
        });
      }
    }
  }

  private checkTemplateUndefinedVars(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/);
    if (!scriptMatch) return;
    const scriptContent = scriptMatch[1];

    const definedVars = new Set<string>();
    const constRegex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g;
    let m: RegExpExecArray | null;
    while ((m = constRegex.exec(scriptContent))) {
      definedVars.add(m[1]);
    }

    const fnRegex = /function\s+([A-Za-z_$][\w$]*)/g;
    while ((m = fnRegex.exec(scriptContent))) {
      definedVars.add(m[1]);
    }

    const templateContent = text.replace(/<script>[\s\S]*?<\/script>/, "").replace(/<style>[\s\S]*?<\/style>/, "");
    const interpRegex = /\{\s*([A-Za-z_$][\w$]*)\s*(?:\.([\w$]+))?\s*\}/g;
    const keywords = new Set(["true", "false", "null", "undefined", "NaN", "Infinity", "data", "params", "request", "url", "cache", "flyUtils", "this", "window", "document", "console", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean", "Date", "RegExp", "Error", "Promise", "Map", "Set", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURI", "decodeURI", "fetch", "Response", "Request", "URL", "Headers", "FormData", "AbortController", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "alert", "confirm", "prompt"]);

    while ((m = interpRegex.exec(templateContent))) {
      const varName = m[1];
      if (!definedVars.has(varName) && !keywords.has(varName) && !/^\d+$/.test(varName)) {
        const lines = text.split("\n");
        let lineIdx = 0;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1;
          if (charCount > m.index) {
            lineIdx = i;
            break;
          }
        }
        const line = lines[lineIdx] || "";
        if (!line.includes("for=") && !line.includes("if=")) {
          diagnostics.push({
            range: new vscode.Range(lineIdx, 0, lineIdx, line.length),
            message: `Variable "${varName}" is used in template but not defined in <script>.`,
            severity: vscode.DiagnosticSeverity.Warning,
            code: "fly-undefined-var",
            source: this.source,
          });
        }
      }
    }
  }

  private checkMissingStyleBlock(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    if (text.includes("<style>")) return;
    const hasTemplate = text.includes("<div") || text.includes("<section") || text.includes("<main") || text.includes("<header") || text.includes("<button") || text.includes("<p>") || text.includes("<h1") || text.includes("<h2") || text.includes("<h3") || text.includes("<ul") || text.includes("<table") || text.includes("<form");
    const hasScript = text.includes("<script>");

    if (hasTemplate && hasScript && !text.includes("<style>")) {
      diagnostics.push({
        range: new vscode.Range(0, 0, 0, 0),
        message: "Consider adding a <style> block for component styles.",
        severity: vscode.DiagnosticSeverity.Hint,
        code: "fly-missing-style",
        source: this.source,
      });
    }
  }

  private checkMissingMetaExport(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    if (!text.includes("<script>")) return;
    const hasMeta = /export\s+function\s+meta\s*\(/.test(text);
    const hasLoader = /export\s+(?:async\s+)?function\s+loader\s*\(/.test(text);
    const hasApi = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/.test(text);
    const isAction = /["']use\s+server["']/.test(text);
    const isMiddleware = /export\s+default\s+(?:async\s+)?function\s+middleware/.test(text);

    if (hasLoader && !hasMeta && !hasApi && !isAction && !isMiddleware) {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("</script>")) {
          diagnostics.push({
            range: new vscode.Range(i, 0, i, 0),
            message: "Page has loader() but no meta(). Add `export function meta()` for SEO.",
            severity: vscode.DiagnosticSeverity.Information,
            code: "fly-missing-meta",
            source: this.source,
          });
          break;
        }
      }
    }
  }

  private checkEventHandlerSyntax(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const wrongSyntax = lines[i].match(/on:(\w+)\s*=\s*"(?!{)[^"]+"/);
      if (wrongSyntax) {
        diagnostics.push({
          range: new vscode.Range(i, 0, i, lines[i].length),
          message: `Event handler should use curly braces: on:${wrongSyntax[1]}="{handler}"`,
          severity: vscode.DiagnosticSeverity.Warning,
          code: "fly-event-syntax",
          source: this.source,
        });
      }

      const missingBraces = lines[i].match(/on:(\w+)\s*=\s*"\{(\w+)\}(?!")/);
      if (missingBraces) {
        const col = lines[i].indexOf(missingBraces[0]);
        diagnostics.push({
          range: new vscode.Range(i, col, i, col + missingBraces[0].length),
          message: `Missing closing quote. Use: on:${missingBraces[1]}="{${missingBraces[2]}}"`,
          severity: vscode.DiagnosticSeverity.Error,
          code: "fly-event-syntax",
          source: this.source,
        });
      }
    }
  }

  private checkLoaderParams(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const loaderMatch = text.match(/export\s+(?:async\s+)?function\s+loader\s*\(\s*\{([^}]*)\}/);
    if (loaderMatch) {
      const params = loaderMatch[1].split(",").map((p: string) => p.trim()).filter(Boolean);
      const validParams = ["request", "params", "cache", "url", "flyUtils"];
      for (const param of params) {
        const name = param.split(":")[0].split("=")[0].trim();
        if (!validParams.includes(name)) {
          const lines = text.split("\n");
          const lineIdx = text.substring(0, loaderMatch.index).split("\n").length - 1;
          diagnostics.push({
            range: new vscode.Range(lineIdx, 0, lineIdx, lines[lineIdx]?.length || 0),
            message: `Unknown loader parameter "${name}". Valid: ${validParams.join(", ")}`,
            severity: vscode.DiagnosticSeverity.Warning,
            code: "fly-invalid-loader-param",
            source: this.source,
          });
        }
      }
    }
  }

  private checkNestedStyleTags(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const styleOpenCount = (text.match(/<style/g) || []).length;
    const styleCloseCount = (text.match(/<\/style>/g) || []).length;

    if (styleOpenCount !== styleCloseCount) {
      diagnostics.push({
        range: new vscode.Range(0, 0, 0, 0),
        message: `Mismatched <style> tags: ${styleOpenCount} opening, ${styleCloseCount} closing.`,
        severity: vscode.DiagnosticSeverity.Error,
        code: "fly-nested-style",
        source: this.source,
      });
    }
  }

  private checkStyleInsideScript(
    text: string,
    _document: vscode.TextDocument,
    diagnostics: FlyDiagnostic[]
  ): void {
    const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch && scriptMatch[1].includes("<style")) {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("<style")) {
          diagnostics.push({
            range: new vscode.Range(i, 0, i, lines[i].length),
            message: "<style> tag found inside <script> block. Move it outside.",
            severity: vscode.DiagnosticSeverity.Error,
            code: "fly-style-in-script",
            source: this.source,
          });
        }
      }
    }
  }

  private isInsideScriptBlock(text: string, index: number): boolean {
    const before = text.substring(0, index);
    const lastOpen = before.lastIndexOf("<script");
    if (lastOpen === -1) return false;
    const lastClose = before.lastIndexOf("</script>");
    return lastOpen > lastClose;
  }
}
