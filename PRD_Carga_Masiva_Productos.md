# **PRD: Carga Masiva de Productos**
Sistema de Alquiler de Maquinaria de Construcción

# **1. Objetivo**
Permitir a los administradores cargar múltiples productos (máquinas de construcción) simultáneamente mediante un archivo Excel, incluyendo sus imágenes, reduciendo el tiempo de gestión y minimizando errores en la carga manual.
# **2. Métricas de Éxito**
- Capacidad de procesar al menos 50 productos en una sola carga
- 0% de productos duplicados creados accidentalmente
# **3. Historia de Usuario**
Como administrador del sistema, quiero poder subir un archivo Excel con información de múltiples máquinas y sus imágenes para agregarlas todas al catálogo de una sola vez, asegurándome de que no se creen productos duplicados, para ahorrar tiempo y mantener la integridad de los datos.
# **4. Criterios de Aceptación**
- El sistema permite subir múltiples imágenes antes del Excel
- El sistema valida que las imágenes referenciadas en el Excel existan
- El sistema detecta y previene productos duplicados basándose en nombre y categoría
- El sistema muestra claramente qué productos serán creados y cuáles son duplicados
- El sistema reporta errores de validación fila por fila
- El proceso completo se realiza en menos de 30 segundos para 50 productos
- El administrador puede descargar una plantilla Excel prellenada con el formato correcto
# **5. Flujo de Usuario**
1. 1. Admin navega a "Panel Admin → Productos → Carga Masiva"
1. 2. Admin ve dos secciones: "1. Subir Imágenes" y "2. Subir Excel"
1. 3. Admin hace clic en "Subir Imágenes" o arrastra imágenes a la zona designada
1. 4. Sistema valida formato (JPG, PNG, WEBP) y tamaño (máx 5MB cada una)
1. 5. Sistema muestra grid con miniaturas de las imágenes y sus nombres
1. 6. Admin puede eliminar imágenes individuales si se equivocó
1. 7. Admin hace clic en "Descargar Plantilla Excel"
1. 8. Admin completa el Excel con datos de productos, usando nombres exactos de las imágenes subidas
1. 9. Admin arrastra el Excel a la zona de carga o hace clic para seleccionar
1. 10. Sistema valida el Excel y muestra vista previa con tres categorías: "Crear", "Duplicados", "Errores"
1. 11. Admin revisa la vista previa y decide si continuar
1. 12. Admin hace clic en "Confirmar y Crear Productos"
1. 13. Sistema procesa y muestra resumen: X creados, Y duplicados omitidos, Z errores
# **6. Componentes de la Funcionalidad**
## **6.1 Zona de Carga de Imágenes**
Funcionalidad:

- Drag & drop múltiple o selector de archivos
- Validación automática: formatos JPG, PNG, WEBP únicamente
- Validación de tamaño: máximo 5MB por imagen
- Conversión automática a formato optimizado (WEBP) y subida a blob storage
- Display de miniaturas en grid con nombre de archivo visible
- Botón "Eliminar" en cada imagen antes de procesar Excel
- Indicador visual de imágenes procesando/completadas
- Persistencia temporal: imágenes disponibles por 2 horas o hasta procesar Excel
## **6.2 Plantilla Excel Descargable**
Estructura de columnas (orden exacto):

|**Columna**|**Campo**|**Tipo**|**Reglas de Validación**|
| :- | :- | :- | :- |
|**A**|nombre|Texto|Requerido. Min 3 caracteres. Usado para detectar duplicados.|
|**B**|categoria|Texto|Requerido. Ej: Excavadora, Retroexcavadora. Usado para detectar duplicados.|
|**C**|precio\_dia|Número|Requerido. Debe ser > 0. Sin símbolos de moneda.|
|**D**|precio\_hora|Número|Opcional. Si se incluye, debe ser > 0.|
|**E**|stock|Entero|Requerido. Debe ser >= 0.|
|**F**|disponible|Booleano|Requerido. Solo acepta: TRUE o FALSE (mayúsculas).|
|**G**|imagen|Texto|Requerido. Debe coincidir EXACTAMENTE con nombre de archivo subido.|
|**H**|descripcion|Texto|Opcional. Máximo 500 caracteres.|
|**I**|especificaciones|Texto|Opcional. Formato: "Clave: Valor|Clave: Valor" (separadas por |)|

La plantilla incluye:

- Hoja "Productos" con 4 ejemplos prellenados
- Hoja "Instrucciones" con guía paso a paso
- Formato condicional para facilitar llenado
- Headers con colores para identificar campos requeridos vs opcionales
## **6.3 Zona de Carga de Excel**
- Drag & drop o selector de archivos
- Acepta únicamente .xlsx y .xls
- Tamaño máximo: 5MB (aprox 1000+ productos)
- Validación instantánea al cargar
- Muestra barra de progreso durante procesamiento
## **6.4 Vista Previa de Validación**
Antes de crear los productos, el sistema muestra una tabla de validación dividida en tres secciones:

- Productos a Crear (Verde)
- Lista de productos que pasaron todas las validaciones
- Muestra: nombre, categoría, precio, imagen asignada
- Contador: "X productos listos para crear"
- Duplicados Detectados (Amarillo)
- Productos que ya existen en la base de datos
- Criterio: mismo nombre + categoría (case-insensitive)
- Muestra: nombre, categoría, "Ya existe en el sistema"
- Acción: estos productos NO se crearán
- Errores de Validación (Rojo)
- Filas con datos inválidos
- Muestra: número de fila, campo con error, razón del error
- Errores comunes: imagen no existe, precio inválido, campo requerido vacío
- Acción: estos productos NO se crearán

El admin puede cancelar o confirmar la creación. Solo los productos en "Verde" se procesarán.
# **7. Reglas de Validación**
## **7.1 Validación de Duplicados**
- Un producto se considera duplicado si existe otro con el mismo nombre Y categoría
- La comparación es case-insensitive (ej: "Excavadora" = "excavadora")
- Se elimina espacios extras antes de comparar
- Los duplicados se muestran en la vista previa pero NO se crean
- El admin recibe notificación clara de cuántos duplicados se encontraron
## **7.2 Validación de Imágenes**
- El nombre de archivo en el Excel debe coincidir EXACTAMENTE con una imagen subida
- La validación es case-sensitive: "Excavadora1.jpg" ≠ "excavadora1.jpg"
- Si la imagen no existe, se marca error y la fila no se procesa
- Se permite dejar el campo vacío (imagen opcional), se usará imagen placeholder
- Las imágenes deben haberse subido en el paso 1 de la sesión actual
## **7.3 Validación de Datos**
- nombre: requerido, mínimo 3 caracteres, máximo 100 caracteres
- categoria: requerido, mínimo 3 caracteres
- precio\_dia: requerido, número positivo mayor a 0
- precio\_hora: opcional, si existe debe ser número positivo
- stock: requerido, número entero >= 0
- disponible: requerido, solo acepta TRUE o FALSE (exacto, mayúsculas)
- descripcion: opcional, máximo 500 caracteres
- especificaciones: opcional, formato validado si incluye "|"
# **8. Casos Especiales y Manejo de Errores**
- Excel vacío o sin datos:
- *Mostrar error: "El archivo no contiene productos para procesar"*
- Excel con columnas faltantes:
- *Mostrar error: "Formato inválido. Descarga la plantilla oficial."*
- Todas las filas tienen errores:
- *Mostrar resumen de errores, no crear nada*
- Todas las filas son duplicados:
- *Mostrar mensaje: "Todos los productos ya existen en el sistema"*
- Imágenes subidas pero no Excel:
- *Mantener imágenes disponibles, mostrar mensaje instructivo*
- Excel subido sin imágenes previas:
- *Permitir continuar si productos no tienen campo imagen o está vacío*
- Admin cierra navegador durante carga:
- *Proceso se cancela, imágenes temporales se borran después de 2 horas*
- Timeout en procesamiento:
- *Si tarda más de 2 minutos, mostrar error y permitir reintento*
# **9. Estado de Éxito**
Después de procesar exitosamente, el sistema muestra:

- Card verde con resumen: "✓ Carga completada exitosamente"
- Estadísticas: "X productos creados de Y totales"
- Detalle de duplicados omitidos (si aplica)
- Detalle de errores (si aplica) con opción de descargar reporte
- Botón "Ver productos creados" que redirige al listado filtrado
- Botón "Realizar nueva carga" que limpia todo y reinicia el proceso
- Limpieza automática de imágenes temporales ya utilizadas
# **10. Requerimientos Técnicos (Backend)**
Almacenamiento de Imágenes:

- Las imágenes se suben a blob storage (ya implementado)
- Optimización automática: conversión a WEBP, resize si excede 1920px ancho
- Generación de URL pública para cada imagen
- Las imágenes temporales (no asociadas a productos) se eliminan después de 2 horas

Procesamiento de Excel:

- Parser de Excel que soporte .xlsx y .xls
- Validación de esquema antes de procesamiento
- Procesamiento en lotes de 50 productos a la vez para evitar timeouts
- Uso de transacciones: si falla una inserción, no se afecta el resto

Detección de Duplicados:

- Query a base de datos antes de insertar
- Comparación: LOWER(nombre) + LOWER(categoria)
- Trim de espacios en ambos campos antes de comparar
- Retornar lista de duplicados al frontend para mostrar en vista previa
# **11. Requerimientos de UI/UX**
- Layout responsivo: funciona en desktop (prioritario)
- Estados de loading claros durante upload de imágenes y procesamiento
- Feedback visual inmediato al arrastrar archivos
- Mensajes de error claros y accionables (no técnicos)
- Tabla de vista previa con scroll si hay muchos productos
- Códigos de color consistentes: verde=éxito, amarillo=advertencia, rojo=error
- Botones deshabilitados cuando no se puede proceder
- Tooltips explicativos en campos que puedan generar confusión
# **12. Restricciones y Límites**

|**Límite**|**Valor**|
| :- | :- |
|**Imágenes por carga**|Máximo 200 archivos|
|**Tamaño por imagen**|Máximo 5MB|
|**Productos por Excel**|Máximo 500 filas (recomendado)|
|**Tamaño de Excel**|Máximo 5MB|
|**Tiempo de procesamiento esperado**|30 segundos para 50 productos|
|**Timeout máximo**|2 minutos|
|**Retención de imágenes temporales**|2 horas|

# **13. Fuera de Alcance (V1)**
Las siguientes funcionalidades NO están incluidas en esta versión:

- Edición masiva de productos existentes
- Importación desde otras fuentes (CSV, JSON, API externa)
- Programación de cargas automáticas
- Versionado de cargas (historial)
- Rollback de cargas completadas
- Validación de duplicados por otros campos (ej: SKU, código interno)
- Soporte para múltiples idiomas en el Excel
- Subir imágenes directamente en el Excel (embebidas)
- Asignación de productos a categorías jerárquicas


*PRD v1.0 - Carga Masiva de Productos*
