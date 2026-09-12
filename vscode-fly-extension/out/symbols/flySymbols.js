"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlyDocumentSymbolProvider = void 0;
const vscode = __importStar(require("vscode"));
class FlyDocumentSymbolProvider {
    provideDocumentSymbols(document, _token) {
        const symbols = [];
        const text = document.getText();
        this.extractScriptSymbols(text, document, symbols);
        this.extractTemplateSymbols(text, document, symbols);
        return symbols;
    }
    extractScriptSymbols(text, document, symbols) {
        const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/);
        if (!scriptMatch)
            return;
        const scriptContent = scriptMatch[1];
        const scriptOffset = text.indexOf(scriptMatch[0]) + "<script>".length;
        const stateRegex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
        let match;
        while ((match = stateRegex.exec(scriptContent))) {
            const start = document.positionAt(scriptOffset + match.index);
            const end = document.positionAt(scriptOffset + match.index + match[0].length);
            const range = new vscode.Range(start, end);
            const symbol = new vscode.DocumentSymbol(match[1], "Reactive State", vscode.SymbolKind.Variable, range, range);
            symbols.push(symbol);
        }
        const fnRegex = /export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
        while ((match = fnRegex.exec(scriptContent))) {
            const start = document.positionAt(scriptOffset + match.index);
            const fnName = match[2];
            let kind;
            let detail;
            if (fnName === "loader") {
                kind = vscode.SymbolKind.Function;
                detail = "Server Data Loader";
            }
            else if (fnName === "meta") {
                kind = vscode.SymbolKind.Function;
                detail = "SEO Metadata";
            }
            else if (fnName === "middleware") {
                kind = vscode.SymbolKind.Function;
                detail = "Request Middleware";
            }
            else if (fnName === "generateStaticParams") {
                kind = vscode.SymbolKind.Function;
                detail = "Static Route Generator";
            }
            else if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(fnName)) {
                kind = vscode.SymbolKind.Method;
                detail = `API Handler (${fnName})`;
            }
            else {
                kind = vscode.SymbolKind.Function;
                detail = "Exported Function";
            }
            const endLine = this.findFunctionEnd(scriptContent, match.index);
            const end = document.positionAt(scriptOffset + endLine);
            const range = new vscode.Range(start, end);
            const symbol = new vscode.DocumentSymbol(fnName, detail, kind, range, range);
            symbols.push(symbol);
        }
        const configRegexes = [
            {
                pattern: /export\s+const\s+render\s*=\s*["'][^"']+["']/,
                name: "render",
                detail: "Rendering Mode",
            },
            {
                pattern: /export\s+const\s+revalidate\s*=\s*\d+/,
                name: "revalidate",
                detail: "ISR Revalidation",
            },
            {
                pattern: /export\s+const\s+prerender\s*=\s*true/,
                name: "prerender",
                detail: "Static Generation",
            },
        ];
        for (const { pattern, name, detail } of configRegexes) {
            const match = scriptContent.match(pattern);
            if (match && match.index !== undefined) {
                const start = document.positionAt(scriptOffset + match.index);
                const end = document.positionAt(scriptOffset + match.index + match[0].length);
                const range = new vscode.Range(start, end);
                const symbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Constant, range, range);
                symbols.push(symbol);
            }
        }
    }
    extractTemplateSymbols(text, _document, symbols) {
        const lines = text.split("\n");
        let inScript = false;
        let inStyle = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("<script"))
                inScript = true;
            if (lines[i].includes("</script>"))
                inScript = false;
            if (lines[i].includes("<style"))
                inStyle = true;
            if (lines[i].includes("</style>"))
                inStyle = false;
            if (!inScript && !inStyle) {
                const tagMatch = lines[i].match(/<(div|section|main|header|footer|nav|article|aside|slot)(?:\s[^>]*)?>/i);
                if (tagMatch) {
                    const tag = tagMatch[1];
                    const start = new vscode.Position(i, lines[i].indexOf("<" + tag));
                    const end = new vscode.Position(i, lines[i].indexOf(">") + 1);
                    const range = new vscode.Range(start, end);
                    const isSlot = tag.toLowerCase() === "slot";
                    const symbol = new vscode.DocumentSymbol(`<${tag}${isSlot ? " />" : ">"}`, isSlot ? "Content Slot" : "HTML Element", isSlot ? vscode.SymbolKind.Interface : vscode.SymbolKind.Enum, range, range);
                    symbols.push(symbol);
                }
            }
        }
    }
    findFunctionEnd(text, startIndex) {
        const openBrace = text.indexOf("{", startIndex);
        if (openBrace === -1)
            return startIndex + 100;
        let depth = 0;
        for (let i = openBrace; i < text.length; i++) {
            if (text[i] === "{")
                depth++;
            else if (text[i] === "}") {
                depth--;
                if (depth === 0)
                    return i + 1;
            }
        }
        return openBrace + 100;
    }
}
exports.FlyDocumentSymbolProvider = FlyDocumentSymbolProvider;
//# sourceMappingURL=flySymbols.js.map