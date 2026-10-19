---
name: Compatibilidad del esquema existente
description: Colisiones entre tablas preexistentes y nuevas definiciones SQL durante actualizaciones.
---

No asumir que `CREATE TABLE IF NOT EXISTS` convierte una tabla preexistente al esquema nuevo. Antes de resolver incompatibilidades, inspeccionar los metadatos reales y preservar los datos.

**Why:** La base conectada ya contenía identidades de usuarios y cuidadores con identificadores UUID, mientras el esquema importado esperaba identificadores enteros y usar la tabla de cuidadores para contactos ligados a usuarios. La creación condicional omitió la tabla y un índice sobre una columna inexistente hizo fallar la inicialización. Añadir la columna como INTEGER tampoco fue suficiente: la clave foránea hacia usuarios UUID resultó incompatible. El health check de conectividad siguió respondiendo correctamente, sin demostrar que el esquema se hubiera aplicado.

**How to apply:** Consultar columnas, tipos y relaciones antes de escribir una migración, incluyendo compatibilidad de tipos entre claves foráneas e identificadores existentes; no borrar, renombrar ni reconstruir tablas sin evaluar sus consumidores y los datos existentes. Verificar por separado conectividad y disponibilidad del esquema tras actualizar desde GitHub.
