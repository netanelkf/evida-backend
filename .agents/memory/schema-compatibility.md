---
name: Compatibilidad del esquema existente
description: Colisiones entre tablas preexistentes y nuevas definiciones SQL durante actualizaciones.
---

No asumir que `CREATE TABLE IF NOT EXISTS` convierte una tabla preexistente al esquema nuevo. Antes de resolver incompatibilidades, inspeccionar los metadatos reales y preservar los datos.

**Why:** La base conectada ya contenía una tabla de identidades de cuidadores con identificadores UUID, mientras el esquema importado esperaba usar ese nombre para contactos ligados a usuarios. La creación condicional omitió la tabla y un índice sobre una columna inexistente hizo fallar la inicialización. El health check de conectividad siguió respondiendo correctamente, sin demostrar que el esquema se hubiera aplicado.

**How to apply:** Consultar columnas, tipos y relaciones antes de escribir una migración; no borrar, renombrar ni reconstruir tablas sin evaluar sus consumidores y los datos existentes. Verificar por separado conectividad y disponibilidad del esquema tras actualizar desde GitHub.
