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
exports.FlyTemplateCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const FLY_TAGS = [
    // Structural
    { tag: "div", snippet: "<div${1}>${2}</div>", doc: "Block container", kind: vscode.CompletionItemKind.Property },
    { tag: "span", snippet: "<span${1}>${2}</span>", doc: "Inline container", kind: vscode.CompletionItemKind.Property },
    { tag: "section", snippet: "<section${1}>${2}</section>", doc: "Thematic section", kind: vscode.CompletionItemKind.Property },
    { tag: "article", snippet: "<article${1}>${2}</article>", doc: "Self-contained content", kind: vscode.CompletionItemKind.Property },
    { tag: "aside", snippet: "<aside${1}>${2}</aside>", doc: "Sidebar / tangential content", kind: vscode.CompletionItemKind.Property },
    { tag: "header", snippet: "<header${1}>${2}</header>", doc: "Header section", kind: vscode.CompletionItemKind.Property },
    { tag: "footer", snippet: "<footer${1}>${2}</footer>", doc: "Footer section", kind: vscode.CompletionItemKind.Property },
    { tag: "main", snippet: "<main${1}>${2}</main>", doc: "Main content (one per page)", kind: vscode.CompletionItemKind.Property },
    { tag: "nav", snippet: "<nav${1}>${2}</nav>", doc: "Navigation links", kind: vscode.CompletionItemKind.Property },
    // Text
    { tag: "h1", snippet: "<h1${1}>${2}</h1>", doc: "Heading 1 (one per page)", kind: vscode.CompletionItemKind.Property },
    { tag: "h2", snippet: "<h2${1}>${2}</h2>", doc: "Heading 2", kind: vscode.CompletionItemKind.Property },
    { tag: "h3", snippet: "<h3${1}>${2}</h3>", doc: "Heading 3", kind: vscode.CompletionItemKind.Property },
    { tag: "h4", snippet: "<h4${1}>${2}</h4>", doc: "Heading 4", kind: vscode.CompletionItemKind.Property },
    { tag: "h5", snippet: "<h5${1}>${2}</h5>", doc: "Heading 5", kind: vscode.CompletionItemKind.Property },
    { tag: "h6", snippet: "<h6${1}>${2}</h6>", doc: "Heading 6", kind: vscode.CompletionItemKind.Property },
    { tag: "p", snippet: "<p${1}>${2}</p>", doc: "Paragraph", kind: vscode.CompletionItemKind.Property },
    { tag: "blockquote", snippet: "<blockquote${1}>${2}</blockquote>", doc: "Block quote", kind: vscode.CompletionItemKind.Property },
    { tag: "pre", snippet: "<pre${1}>${2}</pre>", doc: "Preformatted text", kind: vscode.CompletionItemKind.Property },
    { tag: "code", snippet: "<code${1}>${2}</code>", doc: "Inline code", kind: vscode.CompletionItemKind.Property },
    { tag: "strong", snippet: "<strong${1}>${2}</strong>", doc: "Strong emphasis (bold)", kind: vscode.CompletionItemKind.Property },
    { tag: "em", snippet: "<em${1}>${2}</em>", doc: "Emphasis (italic)", kind: vscode.CompletionItemKind.Property },
    { tag: "small", snippet: "<small${1}>${2}</small>", doc: "Small text", kind: vscode.CompletionItemKind.Property },
    { tag: "br", snippet: "<br />", doc: "Line break", kind: vscode.CompletionItemKind.Property },
    { tag: "hr", snippet: "<hr />", doc: "Horizontal rule", kind: vscode.CompletionItemKind.Property },
    // Lists
    { tag: "ul", snippet: "<ul${1}>${2}</ul>", doc: "Unordered list", kind: vscode.CompletionItemKind.Property },
    { tag: "ol", snippet: "<ol${1}>${2}</ol>", doc: "Ordered list", kind: vscode.CompletionItemKind.Property },
    { tag: "li", snippet: "<li${1}>${2}</li>", doc: "List item", kind: vscode.CompletionItemKind.Property },
    { tag: "dl", snippet: "<dl${1}>${2}</dl>", doc: "Description list", kind: vscode.CompletionItemKind.Property },
    { tag: "dt", snippet: "<dt${1}>${2}</dt>", doc: "Description term", kind: vscode.CompletionItemKind.Property },
    { tag: "dd", snippet: "<dd${1}>${2}</dd>", doc: "Description definition", kind: vscode.CompletionItemKind.Property },
    // Interactive
    { tag: "a", snippet: '<a href="${1:url}"${2}>${3}</a>', doc: "Hyperlink / client navigation", kind: vscode.CompletionItemKind.Property },
    { tag: "button", snippet: "<button${1}>${2}</button>", doc: "Clickable button", kind: vscode.CompletionItemKind.Property },
    { tag: "input", snippet: '<input type="${1|text,number,email,password,checkbox,radio,search,url,tel,date,file,hidden,color,range}"${2} />', doc: "Input field (self-closing)", kind: vscode.CompletionItemKind.Property },
    { tag: "textarea", snippet: "<textarea${1}>${2}</textarea>", doc: "Multi-line text input", kind: vscode.CompletionItemKind.Property },
    { tag: "select", snippet: "<select${1}>${2}</select>", doc: "Dropdown select", kind: vscode.CompletionItemKind.Property },
    { tag: "option", snippet: '<option value="${1}">${2}</option>', doc: "Select option", kind: vscode.CompletionItemKind.Property },
    { tag: "optgroup", snippet: '<optgroup label="${1}">${2}</optgroup>', doc: "Option group", kind: vscode.CompletionItemKind.Property },
    { tag: "label", snippet: '<label for="${1}">${2}</label>', doc: "Form label", kind: vscode.CompletionItemKind.Property },
    { tag: "form", snippet: '<form on:submit="${1:handleSubmit}">${2}</form>', doc: "Form container", kind: vscode.CompletionItemKind.Property },
    { tag: "fieldset", snippet: "<fieldset${1}>${2}</fieldset>", doc: "Form field group", kind: vscode.CompletionItemKind.Property },
    { tag: "legend", snippet: "<legend${1}>${2}</legend>", doc: "Fieldset caption", kind: vscode.CompletionItemKind.Property },
    // Media
    { tag: "img", snippet: '<img src="${1}" alt="${2}" />', doc: "Image (self-closing)", kind: vscode.CompletionItemKind.Property },
    { tag: "video", snippet: '<video src="${1}" controls${2}></video>', doc: "Video player", kind: vscode.CompletionItemKind.Property },
    { tag: "audio", snippet: '<audio src="${1}" controls${2}></audio>', doc: "Audio player", kind: vscode.CompletionItemKind.Property },
    { tag: "source", snippet: '<source src="${1}" type="${2}" />', doc: "Media source", kind: vscode.CompletionItemKind.Property },
    { tag: "picture", snippet: "<picture${1}>${2}</picture>", doc: "Responsive image container", kind: vscode.CompletionItemKind.Property },
    { tag: "figure", snippet: "<figure${1}>${2}</figure>", doc: "Figure with optional caption", kind: vscode.CompletionItemKind.Property },
    { tag: "figcaption", snippet: "<figcaption${1}>${2}</figcaption>", doc: "Figure caption", kind: vscode.CompletionItemKind.Property },
    // Table
    { tag: "table", snippet: "<table${1}>${2}</table>", doc: "Data table", kind: vscode.CompletionItemKind.Property },
    { tag: "thead", snippet: "<thead${1}>${2}</thead>", doc: "Table head", kind: vscode.CompletionItemKind.Property },
    { tag: "tbody", snippet: "<tbody${1}>${2}</tbody>", doc: "Table body", kind: vscode.CompletionItemKind.Property },
    { tag: "tfoot", snippet: "<tfoot${1}>${2}</tfoot>", doc: "Table footer", kind: vscode.CompletionItemKind.Property },
    { tag: "tr", snippet: "<tr${1}>${2}</tr>", doc: "Table row", kind: vscode.CompletionItemKind.Property },
    { tag: "td", snippet: "<td${1}>${2}</td>", doc: "Table cell", kind: vscode.CompletionItemKind.Property },
    { tag: "th", snippet: "<th${1}>${2}</th>", doc: "Table header cell", kind: vscode.CompletionItemKind.Property },
    { tag: "caption", snippet: "<caption${1}>${2}</caption>", doc: "Table caption", kind: vscode.CompletionItemKind.Property },
    // Semantic
    { tag: "slot", snippet: "<slot />", doc: "Content insertion point (layouts only)", kind: vscode.CompletionItemKind.Property },
    { tag: "template", snippet: "<template${1}>${2}</template>", doc: "Template fragment (not rendered)", kind: vscode.CompletionItemKind.Property },
    { tag: "details", snippet: "<details${1}>${2}</details>", doc: "Disclosure widget", kind: vscode.CompletionItemKind.Property },
    { tag: "summary", snippet: "<summary${1}>${2}</summary>", doc: "Summary for details", kind: vscode.CompletionItemKind.Property },
    { tag: "dialog", snippet: "<dialog${1}>${2}</dialog>", doc: "Modal dialog", kind: vscode.CompletionItemKind.Property },
    { tag: "progress", snippet: '<progress value="${1}" max="${2:100}"></progress>', doc: "Progress bar", kind: vscode.CompletionItemKind.Property },
    { tag: "meter", snippet: '<meter value="${1}" min="${2:0}" max="${3:100}"></meter>', doc: "Scalar measurement", kind: vscode.CompletionItemKind.Property },
    { tag: "output", snippet: "<output${1}>${2}</output>", doc: "Calculation result", kind: vscode.CompletionItemKind.Property },
    { tag: "time", snippet: '<time datetime="${1}">${2}</time>', doc: "Machine-readable time", kind: vscode.CompletionItemKind.Property },
    { tag: "mark", snippet: "<mark${1}>${2}</mark>", doc: "Highlighted text", kind: vscode.CompletionItemKind.Property },
    { tag: "ins", snippet: "<ins${1}>${2}</ins>", doc: "Inserted text", kind: vscode.CompletionItemKind.Property },
    { tag: "del", snippet: "<del${1}>${2}</del>", doc: "Deleted text", kind: vscode.CompletionItemKind.Property },
    { tag: "sub", snippet: "<sub${1}>${2}</sub>", doc: "Subscript", kind: vscode.CompletionItemKind.Property },
    { tag: "sup", snippet: "<sup${1}>${2}</sup>", doc: "Superscript", kind: vscode.CompletionItemKind.Property },
    { tag: "u", snippet: "<u${1}>${2}</u>", doc: "Unarticulated annotation (underline)", kind: vscode.CompletionItemKind.Property },
    { tag: "s", snippet: "<s${1}>${2}</s>", doc: "Strikethrough", kind: vscode.CompletionItemKind.Property },
    { tag: "kbd", snippet: "<kbd${1}>${2}</kbd>", doc: "Keyboard input", kind: vscode.CompletionItemKind.Property },
    { tag: "samp", snippet: "<samp${1}>${2}</samp>", doc: "Sample output", kind: vscode.CompletionItemKind.Property },
    { tag: "var", snippet: "<var${1}>${2}</var>", doc: "Variable", kind: vscode.CompletionItemKind.Property },
    { tag: "abbr", snippet: '<abbr title="${1}">${2}</abbr>', doc: "Abbreviation", kind: vscode.CompletionItemKind.Property },
    { tag: "address", snippet: "<address${1}>${2}</address>", doc: "Contact information", kind: vscode.CompletionItemKind.Property },
];
const FLY_DIRECTIVES = [
    {
        label: "if",
        snippet: 'if="${1:condition}"',
        doc: "Conditional rendering. Element renders only if expression is truthy.\n\n```html\n<div if=\"{isLoggedIn}\">Welcome!</div>\n<div if=\"{count > 0}\">Count: {count}</div>\n```",
    },
    {
        label: "for",
        snippet: 'for="{${1:item} of ${2:items}}"',
        doc: "List rendering. Iterates over collection.\n\n```html\n<div for=\"{item of items}\">{item.name}</div>\n<div for=\"{(item, i) of items}\">{i}: {item.name}</div>\n```",
    },
    {
        label: "else",
        snippet: "else",
        doc: "Alternative when preceding `if` is falsy.\n\n```html\n<div if=\"{x}\">Yes</div>\n<div else>No</div>\n```",
    },
    {
        label: "draggable",
        snippet: 'draggable="true"',
        doc: "Enable drag and drop.",
    },
];
const FLY_EVENTS = [
    {
        label: "on:click",
        snippet: 'on:click="${1:handler}"',
        doc: "Click event. **Event:** `MouseEvent`\n\n```html\n<button on:click=\"{handleClick}\">Click</button>\n```\n\n**Props:** clientX, clientY, button, ctrlKey, shiftKey, target",
    },
    {
        label: "on:input",
        snippet: 'on:input="${1:handler}"',
        doc: "Input value change (every keystroke). **Event:** `InputEvent`\n\n```html\n<input on:input=\"{handleInput}\" />\n```\n\n**Props:** data, inputType, target.value",
    },
    {
        label: "on:change",
        snippet: 'on:change="${1:handler}"',
        doc: "Value change (on blur). **Event:** `Event`\n\n```html\n<select on:change=\"{handleSelect}\">...</select>\n```\n\n**Props:** target.value, target.checked, target.files",
    },
    {
        label: "on:submit",
        snippet: 'on:submit="${1:handler}"',
        doc: "Form submission. **Event:** `SubmitEvent`\n\n```html\n<form on:submit=\"{handleSubmit}\">...</form>\n```\n\n**Props:** submitter, target.elements",
    },
    {
        label: "on:keydown",
        snippet: 'on:keydown="${1:handler}"',
        doc: "Key pressed down. **Event:** `KeyboardEvent`\n\n**Props:** key, code, ctrlKey, shiftKey, altKey, metaKey\n**Keys:** Enter, Escape, Tab, Backspace, Delete, ArrowUp/Down/Left/Right",
    },
    {
        label: "on:keyup",
        snippet: 'on:keyup="${1:handler}"',
        doc: "Key released. **Event:** `KeyboardEvent`",
    },
    {
        label: "on:keypress",
        snippet: 'on:keypress="${1:handler}"',
        doc: "Key press (deprecated, use keydown). **Event:** `KeyboardEvent`",
    },
    {
        label: "on:focus",
        snippet: 'on:focus="${1:handler}"',
        doc: "Element receives focus. **Event:** `FocusEvent`",
    },
    {
        label: "on:blur",
        snippet: 'on:blur="${1:handler}"',
        doc: "Element loses focus. **Event:** `FocusEvent`",
    },
    {
        label: "on:mouseenter",
        snippet: 'on:mouseenter="${1:handler}"',
        doc: "Mouse enters element. **Event:** `MouseEvent`\n\n**Props:** clientX, clientY, relatedTarget",
    },
    {
        label: "on:mouseleave",
        snippet: 'on:mouseleave="${1:handler}"',
        doc: "Mouse leaves element. **Event:** `MouseEvent`",
    },
    {
        label: "on:mousemove",
        snippet: 'on:mousemove="${1:handler}"',
        doc: "Mouse moves over element. **Event:** `MouseEvent`\n\n**Props:** clientX, clientY, movementX, movementY",
    },
    {
        label: "on:mousedown",
        snippet: 'on:mousedown="${1:handler}"',
        doc: "Mouse button pressed. **Event:** `MouseEvent`\n\n**Props:** button (0=left, 1=middle, 2=right), clientX, clientY",
    },
    {
        label: "on:mouseup",
        snippet: 'on:mouseup="${1:handler}"',
        doc: "Mouse button released. **Event:** `MouseEvent`",
    },
    {
        label: "on:dblclick",
        snippet: 'on:dblclick="${1:handler}"',
        doc: "Double click. **Event:** `MouseEvent`",
    },
    {
        label: "on:contextmenu",
        snippet: 'on:contextmenu="${1:handler}"',
        doc: "Right-click menu. **Event:** `MouseEvent`\n\nCall `e.preventDefault()` to suppress default menu.",
    },
    {
        label: "on:wheel",
        snippet: 'on:wheel="${1:handler}"',
        doc: "Mouse wheel. **Event:** `WheelEvent`\n\n**Props:** deltaX, deltaY, deltaZ, deltaMode",
    },
    {
        label: "on:scroll",
        snippet: 'on:scroll="${1:handler}"',
        doc: "Element scroll. **Event:** `Event`\n\n**Props:** target.scrollTop, target.scrollLeft",
    },
    {
        label: "on:resize",
        snippet: 'on:resize="${1:handler}"',
        doc: "Element resize. **Event:** `UIEvent`\n\n**Props:** target.offsetWidth, target.offsetHeight",
    },
    {
        label: "on:load",
        snippet: 'on:load="${1:handler}"',
        doc: "Resource loaded (img, video, etc). **Event:** `Event`",
    },
    {
        label: "on:error",
        snippet: 'on:error="${1:handler}"',
        doc: "Resource load error. **Event:** `Event`",
    },
    {
        label: "on:dragstart",
        snippet: 'on:dragstart="${1:handler}"',
        doc: "Drag starts. **Event:** `DragEvent`\n\n**Props:** dataTransfer, dataTransfer.setData()",
    },
    {
        label: "on:drag",
        snippet: 'on:drag="${1:handler}"',
        doc: "Dragging. **Event:** `DragEvent`",
    },
    {
        label: "on:dragend",
        snippet: 'on:dragend="${1:handler}"',
        doc: "Drag ends. **Event:** `DragEvent`",
    },
    {
        label: "on:dragover",
        snippet: 'on:dragover="${1:handler}"',
        doc: "Dragged over element. **Event:** `DragEvent`\n\nCall `e.preventDefault()` to allow drop.",
    },
    {
        label: "on:dragenter",
        snippet: 'on:dragenter="${1:handler}"',
        doc: "Drag enters element. **Event:** `DragEvent`",
    },
    {
        label: "on:dragleave",
        snippet: 'on:dragleave="${1:handler}"',
        doc: "Drag leaves element. **Event:** `DragEvent`",
    },
    {
        label: "on:drop",
        snippet: 'on:drop="${1:handler}"',
        doc: "Drop on element. **Event:** `DragEvent`\n\n**Props:** dataTransfer, dataTransfer.files, dataTransfer.getData()",
    },
    {
        label: "on:touchstart",
        snippet: 'on:touchstart="${1:handler}"',
        doc: "Touch begins. **Event:** `TouchEvent`\n\n**Props:** touches, changedTouches",
    },
    {
        label: "on:touchmove",
        snippet: 'on:touchmove="${1:handler}"',
        doc: "Touch moves. **Event:** `TouchEvent`",
    },
    {
        label: "on:touchend",
        snippet: 'on:touchend="${1:handler}"',
        doc: "Touch ends. **Event:** `TouchEvent`",
    },
    {
        label: "on:copy",
        snippet: 'on:copy="${1:handler}"',
        doc: "Copy to clipboard. **Event:** `ClipboardEvent`\n\n**Props:** clipboardData",
    },
    {
        label: "on:cut",
        snippet: 'on:cut="${1:handler}"',
        doc: "Cut from clipboard. **Event:** `ClipboardEvent`",
    },
    {
        label: "on:paste",
        snippet: 'on:paste="${1:handler}"',
        doc: "Paste from clipboard. **Event:** `ClipboardEvent`\n\n**Props:** clipboardData, clipboardData.getData('text')",
    },
    {
        label: "on:transitionend",
        snippet: 'on:transitionend="${1:handler}"',
        doc: "CSS transition completed. **Event:** `TransitionEvent`\n\n**Props:** propertyName, elapsedTime",
    },
    {
        label: "on:animationstart",
        snippet: 'on:animationstart="${1:handler}"',
        doc: "CSS animation started. **Event:** `AnimationEvent`",
    },
    {
        label: "on:animationend",
        snippet: 'on:animationend="${1:handler}"',
        doc: "CSS animation completed. **Event:** `AnimationEvent`",
    },
    {
        label: "on:animationiteration",
        snippet: 'on:animationiteration="${1:handler}"',
        doc: "CSS animation iteration. **Event:** `AnimationEvent`",
    },
    {
        label: "on:beforeinput",
        snippet: 'on:beforeinput="${1:handler}"',
        doc: "Before input (before oninput). **Event:** `InputEvent`\n\n**Props:** inputType, data, isComposing",
    },
];
class FlyTemplateCompletionProvider {
    provideCompletionItems(document, position, _token, _context) {
        const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        if (this.isInsideScriptBlock(textBefore))
            return [];
        if (this.isInsideStyleBlock(textBefore))
            return [];
        const lineText = document.lineAt(position.line).text;
        const charBefore = position.character > 0 ? lineText[position.character - 1] : "";
        const items = [];
        if (charBefore === "<" || lineText.trim().startsWith("<")) {
            for (const tag of FLY_TAGS) {
                const item = new vscode.CompletionItem(tag.tag, tag.kind);
                item.detail = `<${tag.tag}>`;
                item.documentation = new vscode.MarkdownString(tag.doc);
                item.insertText = new vscode.SnippetString(tag.snippet);
                item.sortText = "0_" + tag.tag;
                items.push(item);
            }
        }
        if (lineText.includes("on:") || lineText.includes("on:")) {
            for (const event of FLY_EVENTS) {
                const item = new vscode.CompletionItem(event.label, vscode.CompletionItemKind.Event);
                item.detail = `${event.label}=""`;
                item.documentation = new vscode.MarkdownString(event.doc);
                item.insertText = new vscode.SnippetString(event.snippet);
                item.sortText = "0_" + event.label;
                items.push(item);
            }
        }
        const inTag = /<\w+\s[^>]*$/.test(lineText);
        if (inTag) {
            for (const dir of FLY_DIRECTIVES) {
                const item = new vscode.CompletionItem(dir.label, vscode.CompletionItemKind.Keyword);
                item.detail = `${dir.label}=""`;
                item.documentation = new vscode.MarkdownString(dir.doc);
                item.insertText = new vscode.SnippetString(dir.snippet);
                item.sortText = "-1_" + dir.label;
                items.push(item);
            }
            for (const event of FLY_EVENTS) {
                const item = new vscode.CompletionItem(event.label, vscode.CompletionItemKind.Event);
                item.detail = `${event.label}=""`;
                item.documentation = new vscode.MarkdownString(event.doc);
                item.insertText = new vscode.SnippetString(event.snippet);
                item.sortText = "0_" + event.label;
                items.push(item);
            }
            const htmlAttrs = [
                { attr: "class", doc: "CSS classes. Supports: `{condition ? 'active' : ''}`" },
                { attr: "style", doc: "Inline CSS. Supports: `{color: var}`" },
                { attr: "id", doc: "Unique element ID" },
                { attr: "name", doc: "Form element name" },
                { attr: "value", doc: "Element value. Supports: `{variable}`" },
                { attr: "type", doc: "Element type" },
                { attr: "href", doc: "Link URL. Supports: `/path/{id}`" },
                { attr: "src", doc: "Source URL (img, video, etc)" },
                { attr: "alt", doc: "Alternative text" },
                { attr: "title", doc: "Tooltip text" },
                { attr: "placeholder", doc: "Placeholder text" },
                { attr: "disabled", doc: "Disable element. Supports: `{condition}`" },
                { attr: "readonly", doc: "Read-only input" },
                { attr: "required", doc: "Required field" },
                { attr: "checked", doc: "Checkbox/radio state. Supports: `{condition}`" },
                { attr: "selected", doc: "Option selected state" },
                { attr: "multiple", doc: "Allow multiple selections" },
                { attr: "autofocus", doc: "Auto-focus on load" },
                { attr: "tabindex", doc: "Tab order index" },
                { attr: "target", doc: "Link target (_blank, _self)" },
                { attr: "rel", doc: "Relationship (noopener, noreferrer)" },
                { attr: "download", doc: "Trigger file download" },
                { attr: "draggable", doc: "Enable drag" },
                { attr: "hidden", doc: "Hide element" },
                { attr: "contenteditable", doc: "Editable content" },
                { attr: "translate", doc: "Translate text (yes/no)" },
                { attr: "dir", doc: "Text direction (ltr/rtl/auto)" },
                { attr: "lang", doc: "Language code" },
                { attr: "tabindex", doc: "Tab navigation order" },
                { attr: "min", doc: "Minimum value (number, date)" },
                { attr: "max", doc: "Maximum value (number, date)" },
                { attr: "step", doc: "Step increment" },
                { attr: "minlength", doc: "Minimum text length" },
                { attr: "maxlength", doc: "Maximum text length" },
                { attr: "pattern", doc: "Validation regex" },
                { attr: "rows", doc: "Textarea rows" },
                { attr: "cols", doc: "Textarea columns" },
                { attr: "wrap", doc: "Text wrap mode" },
                { attr: "action", doc: "Form action URL" },
                { attr: "method", doc: "Form method (GET/POST)" },
                { attr: "enctype", doc: "Form encoding" },
                { attr: "novalidate", doc: "Disable validation" },
                { attr: "loading", doc: "Image lazy loading (lazy/eager)" },
                { attr: "width", doc: "Element width" },
                { attr: "height", doc: "Element height" },
                { attr: "decoding", doc: "Image decode mode" },
                { attr: "srcset", doc: "Responsive image sources" },
                { attr: "sizes", doc: "Responsive image sizes" },
                { attr: "crossorigin", doc: "CORS mode" },
                { attr: "fetchpriority", doc: "Fetch priority (high/low/auto)" },
            ];
            for (const { attr, doc } of htmlAttrs) {
                const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
                item.detail = `${attr}=""`;
                item.documentation = new vscode.MarkdownString(doc);
                item.insertText = new vscode.SnippetString(`${attr}="\${1}"`);
                item.sortText = "1_" + attr;
                items.push(item);
            }
        }
        const stateVars = this.extractStateVars(textBefore);
        const exportedFns = this.extractExportedFunctions(textBefore);
        if (this.isInsideInterpolation(lineText, position.character)) {
            for (const varName of stateVars) {
                const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
                item.detail = "Reactive variable";
                item.documentation = new vscode.MarkdownString(`Access reactive variable \`${varName}\``);
                item.insertText = varName;
                item.sortText = "2_" + varName;
                items.push(item);
                const dotItem = new vscode.CompletionItem(varName + ".", vscode.CompletionItemKind.Variable);
                dotItem.detail = `Property of ${varName}`;
                dotItem.insertText = new vscode.SnippetString(`${varName}.\${1:property}`);
                dotItem.sortText = "2_" + varName + "_dot";
                items.push(dotItem);
            }
            for (const fnName of exportedFns) {
                const item = new vscode.CompletionItem(fnName, vscode.CompletionItemKind.Function);
                item.detail = "Exported function";
                item.insertText = fnName + "()";
                item.sortText = "2_" + fnName;
                items.push(item);
            }
            const builtins = [
                { name: "data", doc: "Data returned from loader()" },
                { name: "params", doc: "Route parameters" },
                { name: "request", doc: "HTTP Request object" },
                { name: "url", doc: "Parsed URL object" },
                { name: "cache", doc: "Data cache instance" },
                { name: "flyUtils", doc: "FlyFramework utilities" },
            ];
            for (const { name, doc } of builtins) {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
                item.detail = "FlyFramework built-in";
                item.documentation = new vscode.MarkdownString(doc);
                item.insertText = name;
                item.sortText = "3_" + name;
                items.push(item);
            }
        }
        return items;
    }
    isInsideScriptBlock(text) {
        const lastOpen = text.lastIndexOf("<script");
        if (lastOpen === -1)
            return false;
        const lastClose = text.lastIndexOf("</script>");
        return lastOpen > lastClose;
    }
    isInsideStyleBlock(text) {
        const lastOpen = text.lastIndexOf("<style");
        if (lastOpen === -1)
            return false;
        const lastClose = text.lastIndexOf("</style>");
        return lastOpen > lastClose;
    }
    isInsideInterpolation(line, charPos) {
        let depth = 0;
        for (let i = 0; i < charPos; i++) {
            if (line[i] === "{")
                depth++;
            else if (line[i] === "}")
                depth--;
        }
        return depth > 0;
    }
    extractStateVars(text) {
        const vars = [];
        const regex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            vars.push(match[1]);
        }
        return vars;
    }
    extractExportedFunctions(text) {
        const fns = [];
        const regex = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
        let match;
        while ((match = regex.exec(text))) {
            fns.push(match[1]);
        }
        return fns;
    }
}
exports.FlyTemplateCompletionProvider = FlyTemplateCompletionProvider;
//# sourceMappingURL=templateCompletion.js.map