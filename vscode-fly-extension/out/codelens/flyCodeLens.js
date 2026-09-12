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
exports.FlyCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
class FlyCodeLensProvider {
    provideCodeLenses(document, _token) {
        const codeLenses = [];
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
    addLoaderCodeLens(text, document, codeLenses) {
        const regex = /export\s+(async\s+)?function\s+loader\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(database) Loader",
                tooltip: "Server-side data loader. Data is passed to template and meta.",
                command: "editor.action.showHover",
                arguments: [],
            }));
        }
    }
    addMetaCodeLens(text, document, codeLenses) {
        const regex = /export\s+function\s+meta\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(gear) SEO Meta",
                tooltip: "SEO metadata: title, description, openGraph, twitter, jsonLd",
                command: "editor.action.showHover",
                arguments: [],
            }));
        }
    }
    addApiCodeLens(text, document, codeLenses) {
        const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
        for (const method of methods) {
            const regex = new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\s*\\(`, "g");
            let match;
            while ((match = regex.exec(text))) {
                const line = document.positionAt(match.index).line;
                const range = new vscode.Range(line, 0, line, 0);
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `$(globe) ${method}`,
                    tooltip: `API handler for ${method} requests`,
                    command: "editor.action.showHover",
                    arguments: [],
                }));
            }
        }
    }
    addActionCodeLens(text, document, codeLenses) {
        const hasUseServer = /["']use\s+server["']/.test(text);
        if (!hasUseServer)
            return;
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
        const regex = /export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            const fnName = match[2];
            if (excludedNames.includes(fnName))
                continue;
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(zap) Server Action",
                tooltip: `Server action "${fnName}": callable from client-side code`,
                command: "editor.action.showHover",
                arguments: [],
            }));
        }
    }
    addMiddlewareCodeLens(text, document, codeLenses) {
        const regex = /export\s+default\s+(async\s+)?function\s+middleware\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(shield) Middleware",
                tooltip: "Request middleware. Runs before route handling.",
                command: "editor.action.showHover",
                arguments: [],
            }));
        }
    }
    addGenerateStaticParamsCodeLens(text, document, codeLenses) {
        const regex = /export\s+(async\s+)?function\s+generateStaticParams\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(list-ordered) SSG Params",
                tooltip: "Static route parameters for build-time generation",
                command: "editor.action.showHover",
                arguments: [],
            }));
        }
    }
    addConfigCodeLens(text, document, codeLenses) {
        const configs = [
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
                codeLenses.push(new vscode.CodeLens(range, {
                    title: config.label,
                    tooltip: config.tooltip,
                    command: "editor.action.showHover",
                    arguments: [],
                }));
            }
        }
    }
}
exports.FlyCodeLensProvider = FlyCodeLensProvider;
//# sourceMappingURL=flyCodeLens.js.map