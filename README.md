# Build Arena Web

Cliente web del juego de duelos por turnos **Build Arena**. Renderiza la intención y los eventos que
manda la API; no calcula reglas de combate.

- API: `https://build-arena-api.onrender.com`
- Diseño y decisiones: [`docs/design/overview.md`](./docs/design/overview.md)
- Capas: [`docs/design/architecture.md`](./docs/design/architecture.md)
- Plan de fases: [`docs/design/implementation-plan.md`](./docs/design/implementation-plan.md)
- Flujo de git: [`docs/design/git-workflow.md`](./docs/design/git-workflow.md)
- Contrato de la API: [`docs/frontend-guide.md`](./docs/frontend-guide.md)

## Requisitos

- Node 22 o superior
- pnpm 11

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # completar VITE_API_URL
pnpm dev
```

## Scripts

| Script           | Qué hace                               |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                 |
| `pnpm build`     | Chequeo de tipos y build de producción |
| `pnpm preview`   | Sirve el build de producción           |
| `pnpm typecheck` | Solo chequeo de tipos                  |
| `pnpm lint`      | ESLint sobre todo el proyecto          |
| `pnpm format`    | Prettier sobre el código               |

## Variables de entorno

Todo lo que empieza con `VITE_` se compila dentro del bundle y es público. Acá no va ningún secreto.

| Variable       | Para qué           |
| -------------- | ------------------ |
| `VITE_API_URL` | URL base de la API |
