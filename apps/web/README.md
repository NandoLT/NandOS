# NandOS web

Frontend de NandOS construido con React, TypeScript y Vite. En local se ejecuta desde la raíz del monorepo con `pnpm dev`.

## Vercel

El proyecto `nand-os` usa `apps/web` como Root Directory. Activa **Include source files outside of the Root Directory** para incluir el paquete compartido `packages/contracts`.

En Production, define `NANDOS_API_ORIGIN=https://nandos-api.vercel.app` y deja `VITE_API_URL` vacío. El cliente llama a `/api` en el mismo origen y el proxy de Vercel reenvía las solicitudes al backend, incluidas las cookies de sesión.

`vercel.json` dirige `/api/:path*` a la función `api/proxy.js`, incluidas las rutas anidadas de autenticación y administración. La función reconstruye la ruta original y conserva los parámetros de consulta, el cuerpo y las cookies. El parámetro interno `__nandos_path` se elimina antes de enviar la petición al backend.

Si configuras un dominio propio, actualiza también `NANDOS_API_ORIGIN` en este proyecto y `FRONTEND_ORIGIN` en `nandos-api` para que usen los orígenes HTTPS definitivos.
