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
exports.FlyDefinitionProvider = void 0;
const vscode = __importStar(require("vscode"));
class FlyDefinitionProvider {
    provideDefinition(document, position, _token) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return null;
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
            const regex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${word}\\s*\\(`, "g");
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
    findFlyUtilsDefinition(document) {
        const text = document.getText();
        const match = text.match(/flyUtils\s*[:=]/);
        if (match && match.index !== undefined) {
            const pos = document.positionAt(match.index);
            return new vscode.Location(document.uri, pos);
        }
        return null;
    }
    findCacheDefinition(document) {
        const text = document.getText();
        const match = text.match(/\bcache\b\s*[:=]/);
        if (match && match.index !== undefined) {
            const pos = document.positionAt(match.index);
            return new vscode.Location(document.uri, pos);
        }
        return null;
    }
    findStateDefinition(document, _position) {
        const text = document.getText();
        const regex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            if (match.index !== undefined) {
                const pos = document.positionAt(match.index);
                return new vscode.Location(document.uri, pos);
            }
        }
        return null;
    }
}
exports.FlyDefinitionProvider = FlyDefinitionProvider;
//# sourceMappingURL=flyDefinition.js.map