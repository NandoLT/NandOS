# NandOS web

Frontend de NandOS construido con React, TypeScript y Vite. En local se ejecuta desde la raíz del monorepo con `pnpm dev`.

## Vercel

El proyecto `nand-os` usa `apps/web` como Root Directory. Activa **Include source files outside of the Root Directory** para incluir el paquete compartido `packages/contracts`.

En Production, define `NANDOS_API_ORIGIN=https://nandos-api.vercel.app` y deja `VITE_API_URL` vacío. El cliente llama a `/api` en el mismo origen y el proxy de Vercel reenvía las solicitudes al backend, incluidas las cookies de sesión.

Si configuras un dominio propio, actualiza también `NANDOS_API_ORIGIN` en este proyecto y `FRONTEND_ORIGIN` en `nandos-api` para que usen los orígenes HTTPS definitivos.
