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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const scriptCompletion_1 = require("./completions/scriptCompletion");
const templateCompletion_1 = require("./completions/templateCompletion");
const configCompletion_1 = require("./completions/configCompletion");
const flyHover_1 = require("./hover/flyHover");
const flyDiagnostics_1 = require("./diagnostics/flyDiagnostics");
const flyDefinition_1 = require("./go-to-definition/flyDefinition");
const flySymbols_1 = require("./symbols/flySymbols");
const flyCodeLens_1 = require("./codelens/flyCodeLens");
function activate(context) {
    console.log("FlyFramework Support extension is now active!");
    registerCompletionProviders(context);
    registerHoverProviders(context);
    registerDiagnosticsProviders(context);
    registerDefinitionProviders(context);
    registerDocumentSymbolProviders(context);
    registerCodeLensProviders(context);
    registerCommands(context);
}
function registerCompletionProviders(context) {
    const scriptProvider = new scriptCompletion_1.FlyScriptCompletionProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider("fly", scriptProvider, ".", "$", "(", "{"));
    const templateProvider = new templateCompletion_1.FlyTemplateCompletionProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider("fly", templateProvider, "<", '"', "'"));
    const configProvider = new configCompletion_1.FlyConfigCompletionProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(["typescript", "javascript"], configProvider, ".", "(", '"'));
}
function registerHoverProviders(context) {
    const hoverProvider = new flyHover_1.FlyHoverProvider();
    context.subscriptions.push(vscode.languages.registerHoverProvider("fly", hoverProvider));
}
function registerDiagnosticsProviders(context) {
    const diagnosticsManager = new flyDiagnostics_1.FlyDiagnosticsManager();
    diagnosticsManager.register(context);
}
function registerDefinitionProviders(context) {
    const definitionProvider = new flyDefinition_1.FlyDefinitionProvider();
    context.subscriptions.push(vscode.languages.registerDefinitionProvider("fly", definitionProvider));
}
function registerDocumentSymbolProviders(context) {
    const symbolProvider = new flySymbols_1.FlyDocumentSymbolProvider();
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("fly", symbolProvider));
}
function registerCodeLensProviders(context) {
    const codeLensProvider = new flyCodeLens_1.FlyCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider("fly", codeLensProvider));
}
function registerCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand("fly.newPage", async () => {
        const name = await vscode.window.showInputBox({
            prompt: "Page name",
            placeHolder: "my-page",
            validateInput: (value) => {
                if (!value)
                    return "Name is required";
                if (!/^[a-z0-9-]+$/.test(value))
                    return "Only lowercase letters, numbers and hyphens";
                return null;
            },
        });
        if (name) {
            const template = `<script>
  export async function loader({ request, params }) {
    return { data: {} };
  }

  export function meta({ data }) {
    return { title: "${name}" };
  }
</script>

<div>
  <h1>${name}</h1>
</div>

<style>
  /* styles */
</style>`;
            const doc = await vscode.workspace.openTextDocument({
                content: template,
                language: "fly",
            });
            await vscode.window.showTextDocument(doc);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newApi", async () => {
        const name = await vscode.window.showInputBox({
            prompt: "API route name",
            placeHolder: "users",
            validateInput: (value) => {
                if (!value)
                    return "Name is required";
                return null;
            },
        });
        if (name) {
            const template = `<script>
  export async function GET({ request, params }) {
    return Response.json({ ok: true });
  }

  export async function POST({ request, params }) {
    const body = await request.json();
    return Response.json({ created: true, ...body });
  }
</script>`;
            const doc = await vscode.workspace.openTextDocument({
                content: template,
                language: "fly",
            });
            await vscode.window.showTextDocument(doc);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newAction", async () => {
        const name = await vscode.window.showInputBox({
            prompt: "Action name",
            placeHolder: "submitForm",
            validateInput: (value) => {
                if (!value)
                    return "Name is required";
                return null;
            },
        });
        if (name) {
            const template = `"use server";

export async function ${name}(formData) {
  // server-side logic
  return { result: true };
}`;
            const doc = await vscode.workspace.openTextDocument({
                content: template,
                language: "fly",
            });
            await vscode.window.showTextDocument(doc);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newConfig", async () => {
        const template = `import { defineConfig } from "fly-framework/src/core/config";

export default defineConfig({
  appDir: "./app",
  siteUrl: "https://mysite.com",
  adapter: "node",
  build: {
    minify: true,
    sourcemap: false
  }
});`;
        const doc = await vscode.workspace.openTextDocument({
            content: template,
            language: "typescript",
        });
        await vscode.window.showTextDocument(doc);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newMiddleware", async () => {
        const template = `<script>
  export default async function middleware({ request, next }) {
    const url = new URL(request.url);

    // check auth, redirect, etc.

    return next();
  }
</script>`;
        const doc = await vscode.workspace.openTextDocument({
            content: template,
            language: "fly",
        });
        await vscode.window.showTextDocument(doc);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newLayout", async () => {
        const template = `<script>
  export async function loader() {
    return { data: {} };
  }
</script>

<div class="layout">
  <header>
    <nav>Nav</nav>
  </header>
  <main>
    <slot />
  </main>
  <footer>
    <p>Footer</p>
  </footer>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  main { flex: 1; }
</style>`;
        const doc = await vscode.workspace.openTextDocument({
            content: template,
            language: "fly",
        });
        await vscode.window.showTextDocument(doc);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newLoading", async () => {
        const template = `<div class="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #30363D;
    border-top-color: #FFD700;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>`;
        const doc = await vscode.workspace.openTextDocument({
            content: template,
            language: "fly",
        });
        await vscode.window.showTextDocument(doc);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.newError", async () => {
        const template = `<script>
  export async function loader({ data }) {
    return { data: { message: data?.message ?? "Something went wrong" } };
  }
</script>

<div class="error-page">
  <h1>Oops!</h1>
  <p>{data.message}</p>
  <a href="/">Go home</a>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }
</style>`;
        const doc = await vscode.workspace.openTextDocument({
            content: template,
            language: "fly",
        });
        await vscode.window.showTextDocument(doc);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("fly.refresh", () => {
        vscode.window.showInformationMessage("FlyFramework: Refreshed!");
    }));
}
function deactivate() {
    console.log("FlyFramework Support extension deactivated.");
}
//# sourceMappingURL=extension.js.map