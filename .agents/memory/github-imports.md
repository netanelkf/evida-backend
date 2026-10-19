---
name: Importaciones desde GitHub
description: Límites de sincronización y continuidad del entorno Replit al importar el proyecto remoto.
---

Conservar la configuración activa del entorno Replit al importar código desde GitHub; una configuración de referencia no mantiene la vista previa en funcionamiento.

**Why:** La rama importada trasladó la configuración de Replit a un archivo de referencia, lo que eliminó el workflow activo durante el checkout. El usuario pidió conservar los secrets y dejar la vista previa funcionando.

**How to apply:** Antes de actualizar desde GitHub, guardar una referencia recuperable del código y comprobar cambios en la configuración del entorno. Restaurar la configuración activa mediante las herramientas de validación de Replit cuando sea necesario. No sobrescribir secrets o variables existentes ni subir cambios a GitHub salvo petición explícita.
