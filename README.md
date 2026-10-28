# NandOS

Portfolio web interactivo con estética de sistema operativo.

## Desarrollo local

```bash
pnpm install
pnpm --filter @nandoos/api db:migrate
pnpm dev
```

Configura antes `apps/api/.env` a partir de `apps/api/.env.example`. `pnpm dev` arranca la web y el API. La web conserva el contenido inicial si el API no está configurado; el panel privado requiere Neon y sus migraciones.

## Estructura

- `apps/web`: frontend React + Vite.
- `apps/api`: Fastify, Neon/Drizzle, autenticación administrativa y gestión de contenido/CV.
- `packages/contracts`: contratos compartidos entre frontend y backend.
- `packages/config`: configuración compartida del monorepo.

Consulta [ROADMAP.md](./ROADMAP.md) para las decisiones del proyecto.

La sesión pública de Invitado sigue siendo una simulación y no autentica contra el backend. El panel administrativo se abre desde el login y requiere una cuenta creada con una clave inicial secreta; no hay credenciales `admin/admin` por defecto. Consulta [apps/api/README.md](./apps/api/README.md) para configuración y despliegue.
