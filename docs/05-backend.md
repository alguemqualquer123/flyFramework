# Backend Integrado

## 1. API Routes

```
app/api/
  users.fly            → /api/users
  users/[id].fly       → /api/users/:id
```

```fly
<script>
  export async function GET({ params, url }) {
    const users = await db.users.all()
    return Response.json(users)
  }

  export async function POST({ request }) {
    const body = await request.json()
    const created = await db.users.create(body)
    return Response.json(created, { status: 201 })
  }
</script>
```

## 2. Server Actions

Funções chamadas direto do client sem criar endpoint manual:

```fly
<script>
  export async function addTodo(text: string) {
    "use server"
    await db.todos.add(text)
    revalidate("todos")
  }
</script>

<button on:click={() => addTodo("novo")}>Add</button>
```

## 3. Middleware

```
app/middleware.fly
```

```fly
<script>
  export async function middleware({ request, next }) {
    const token = request.headers.get("authorization")
    if (!token) return new Response("no auth", { status: 401 })
    return next()
  }
</script>
```

## 4. Runtime targets

- **Node** (padrão, completo).
- **Edge** (V8 leve, sem Node APIs pesadas).
- **Serverless** (função por rota).

Todos compartilham a mesma assinatura: `handle(request): Response`.

## 5. Segurança

- Credenciais vivem só em `.server.fly` / loaders.
- `csrf` automático em mutations.
- Headers seguros por padrão (CSP opcional, nosniff, etc).

Próximo: `06-seo.md`.
