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
exports.FlyConfigCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const FLY_CONFIG_ITEMS = [
    {
        label: "defineConfig",
        kind: vscode.CompletionItemKind.Function,
        detail: "defineConfig(config: FlyConfig)",
        documentation: "Type-safe configuration helper for fly.config.ts",
        insertText: new vscode.SnippetString('defineConfig({\n  appDir: "${1:./app}",\n  siteUrl: "${2:https://mysite.com}",\n  adapter: "${3|node,edge,serverless}",\n  build: {\n    minify: ${4:true},\n    sourcemap: ${5:false}\n  }\n})'),
    },
    {
        label: "appDir",
        kind: vscode.CompletionItemKind.Property,
        detail: "appDir: string",
        documentation: "Path to the application directory containing .fly files.",
        insertText: new vscode.SnippetString('appDir: "${1:./app}"'),
    },
    {
        label: "siteUrl",
        kind: vscode.CompletionItemKind.Property,
        detail: "siteUrl: string",
        documentation: "The base URL of the site. Used for sitemap, SEO, and canonical URLs.",
        insertText: new vscode.SnippetString('siteUrl: "${1:https://mysite.com}"'),
    },
    {
        label: "adapter",
        kind: vscode.CompletionItemKind.Property,
        detail: 'adapter: "node" | "edge" | "serverless"',
        documentation: "The deployment adapter. Determines how the app is served.\n\n- node: traditional Node.js server\n- edge: edge runtime (Cloudflare, Vercel Edge)\n- serverless: serverless functions (AWS Lambda, Vercel)",
        insertText: new vscode.SnippetString('adapter: "${1|node,edge,serverless}"'),
    },
    {
        label: "build",
        kind: vscode.CompletionItemKind.Property,
        detail: "build: { minify?: boolean; sourcemap?: boolean }",
        documentation: "Build configuration options.",
        insertText: new vscode.SnippetString("build: {\n  minify: ${1:true},\n  sourcemap: ${2:false}\n}"),
    },
    {
        label: "minify",
        kind: vscode.CompletionItemKind.Property,
        detail: "minify: boolean",
        documentation: "Whether to minify the production build output.",
        insertText: new vscode.SnippetString("minify: ${1:true}"),
    },
    {
        label: "sourcemap",
        kind: vscode.CompletionItemKind.Property,
        detail: "sourcemap: boolean",
        documentation: "Whether to generate source maps for debugging.",
        insertText: new vscode.SnippetString("sourcemap: ${1:false}"),
    },
    {
        label: "import { defineConfig }",
        kind: vscode.CompletionItemKind.Snippet,
        detail: 'import { defineConfig } from "fly-framework/src/core/config"',
        documentation: "Import the defineConfig helper for type-safe configuration.",
        insertText: new vscode.SnippetString('import { defineConfig } from "fly-framework/src/core/config";'),
    },
];
class FlyConfigCompletionProvider {
    provideCompletionItems(document, _position, _token, _context) {
        const text = document.getText();
        const isFlyConfig = document.fileName.includes("fly.config.") ||
            text.includes("defineConfig") ||
            text.includes("fly-framework/src/core/config");
        if (!isFlyConfig)
            return [];
        const items = [];
        for (const configItem of FLY_CONFIG_ITEMS) {
            const item = new vscode.CompletionItem(configItem.label, configItem.kind);
            item.detail = configItem.detail;
            item.documentation = new vscode.MarkdownString(configItem.documentation);
            item.insertText = configItem.insertText;
            items.push(item);
        }
        return items;
    }
}
exports.FlyConfigCompletionProvider = FlyConfigCompletionProvider;
//# sourceMappingURL=configCompletion.js.map