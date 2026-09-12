# Reatividade & Compiler (sintaxe `.fly`)

## 1. Filosofia: Compilado, não interpretado

Assim como Svelte/Vue, o Fly **compila** a reatividade em código imperativo.
Não existe Virtual DOM: o compiler sabe exatamente qual nó atualizar.

```fly
<script>
  let nome = $state("mundo")
  let vezes = $state(0)

  $derived let saudacao = `Olá ${nome} (${vezes}x)`
</script>

<input bind:value={nome} />
<p>{saudacao}</p>
<button on:click={() => vezes++}>Contar</button>
```

### O que o compiler gera (resumo)
- Para `nome`: assinatura de um "signal"; toda referência vira `effect()`.
- Para `saudacao`: `$derived` vira computed que recolhe dependências.
- `bind:value` vira listener + atualizador de signal.
- `on:click` vira `addEventListener` com cleanup automático.

## 2. Primitivos de reatividade

| Primtivo | Uso | Equivalente |
|---|---|---|
| `$state(x)` | valor reativo | `useState`/`ref` |
| `$derived(fn)` | valor computado | `useMemo`/`computed` |
| `$effect(fn)` | efeito colateral | `useEffect` |
| `$memo(fn)` | memoização pesada | `useMemo` |
| `$props()` | props do componente | props |

## 3. Componentes

```fly
<!-- components/Card.fly -->
<script>
  let { title, children } = $props()
</script>

<article class="card">
  <h2>{title}</h2>
  <slot />
</article>
```

- `<slot />` para composição.
- Props tipadas opcionalmente com TS: `let { title }: { title: string } = $props()`.

## 4. Diretivas

| Diretiva | Significado |
|---|---|
| `on:click` | evento |
| `bind:value` | two-way binding |
| `if={cond}` | bloco condicional (compilado p/ mount/unmount) |
| `for={item of list}` | loop eficiente com keys |
| `class:active={x}` | toggle de classe |
| `style:top={y}` | estilo reativo |

## 5. Pipeline do Compiler

```
.fly
  → Lexer (tokens)
  → Parser (AST: template + script + style)
  → Scope/Reactivity analyzer
  → Optimizer (dead-code, hoist)
  → Codegen (client JS + server render fn + css)
```

**Saídas:**
- `dist/client/<rota>.js` (hidratação mínima)
- `dist/server/<rota>.render.js` (SSR function)
- `dist/styles/<hash>.css`

## 6. SSR + Hidratação

- Server render usa a mesma AST para emitir HTML estático + `data-fly-id`.
- Client carrega apenas o "effect graph" mínimo para os nós interativos.
- Hidratação seletiva: nós puramente estáticos nunca hidratam.

Próximo: `03-routing.md`.
