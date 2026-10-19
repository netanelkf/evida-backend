---
name: Procesos de la vista previa
description: Limpieza de procesos duplicados y protección del proceso de control de Replit.
---

Al limpiar procesos Node, distinguir los servidores de la aplicación del proceso de control de Replit; no ejecutar un cierre indiscriminado de todos los procesos Node.

**Why:** El entorno incluye un proceso Node de infraestructura identificado por `pid2` y `bootstrap.cjs`. Además, detener el workflow no eliminó todas las instancias de la aplicación: una instancia huérfana de Vite seguía activa. El arranque duplicado produjo conflictos de puerto y una segunda instancia en un puerto alternativo.

**How to apply:** Detener primero el workflow, inspeccionar procesos y listeners, terminar los procesos de la aplicación que permanezcan y verificar puertos libres antes de iniciar una sola vez. Confirmar los listeners reales, no solo el estado RUNNING del workflow.
