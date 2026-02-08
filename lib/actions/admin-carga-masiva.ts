"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadImage, validateImageFile } from '@/lib/blob-storage'
import { auditCreate, setAuditContext } from '@/lib/audit-helpers'
import { revalidatePath } from "next/cache"
import { EstadoVehiculo } from "@prisma/client"
import * as XLSX from 'xlsx'

// ============================================================
// TIPOS
// ============================================================

export interface UploadedImage {
  fileName: string
  url: string
  size: number
}

export interface ExcelRow {
  rowNumber: number
  // Campos esenciales
  nombre: string | null
  marca: string | null
  modelo: string | null
  categoria: string | null
  anio: number | null
  // Pricing
  precio_dia: number | null
  precio_hora: number | null
  precio_semana: number | null
  precio_mes: number | null
  // Especificaciones
  peso: number | null
  potencia: number | null
  capacidad: string | null
  especificaciones: string | null
  // Control
  stock: number | null
  disponible: boolean | null
  descripcion: string | null
  // Imagen
  imagen: string | null
}

export interface ValidationResult {
  toCreate: ValidatedProduct[]
  duplicates: DuplicateProduct[]
  errors: ValidationError[]
}

export interface ValidatedProduct {
  rowNumber: number
  // Campos esenciales
  nombre: string
  marca: string
  modelo: string
  categoria: string
  anio: number
  // Pricing
  precio_dia: number
  precio_hora: number | null
  precio_semana: number | null
  precio_mes: number | null
  // Especificaciones
  peso: number | null
  potencia: number | null
  capacidad: string | null
  especificaciones: string | null
  // Control
  stock: number
  disponible: boolean
  descripcion: string | null
  // Imagen
  imagen: string | null
  imagenUrl: string | null
}

export interface DuplicateProduct {
  rowNumber: number
  nombre: string
  categoria: string
  existingId: number
}

export interface ValidationError {
  rowNumber: number
  field: string
  message: string
  value?: string
}

export interface BulkUploadResult {
  success: boolean
  created: number
  duplicatesSkipped: number
  errors: number
  createdIds: number[]
  errorDetails?: ValidationError[]
}

// ============================================================
// FUNCIONES DE AYUDA
// ============================================================

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: "No autenticado", userId: null, userEmail: null }
  const rol = session.user.rol?.toUpperCase()
  if (rol !== "ADMINISTRADOR") return { ok: false as const, error: "Solo administradores", userId: null, userEmail: null }
  const userId = session.user.id ? parseInt(session.user.id, 10) : null
  const userEmail = session.user.email || null
  return { ok: true as const, userId, userEmail }
}

/**
 * Normaliza texto para comparación (lowercase, trim, elimina espacios múltiples)
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Genera una placa única basada en timestamp
 */
function generateUniquePlaca(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `AUTO-${timestamp}-${random}`
}

/**
 * Construye el texto de especificaciones incluyendo datos adicionales
 */
function buildSpecifications(product: ValidatedProduct): string {
  const specs: string[] = []
  
  // Agregar especificaciones del usuario
  if (product.especificaciones) {
    specs.push(product.especificaciones)
  }
  
  // Agregar precios adicionales a especificaciones si existen
  if (product.precio_semana) {
    specs.push(`Precio Semana: S/ ${product.precio_semana}`)
  }
  if (product.precio_mes) {
    specs.push(`Precio Mes: S/ ${product.precio_mes}`)
  }
  
  // Agregar nombre comercial
  if (product.nombre) {
    specs.push(`Nombre Comercial: ${product.nombre}`)
  }
  
  return specs.join('|')
}

// ============================================================
// SERVER ACTIONS
// ============================================================

/**
 * Sube múltiples imágenes a blob storage
 * Retorna las URLs de las imágenes subidas
 */
export async function uploadBulkImages(formData: FormData): Promise<{
  success: boolean
  images?: UploadedImage[]
  error?: string
}> {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  const files = formData.getAll('images') as File[]
  
  if (!files || files.length === 0) {
    return { success: false, error: 'No se recibieron imágenes' }
  }

  if (files.length > 200) {
    return { success: false, error: 'Máximo 200 imágenes por carga' }
  }

  const uploadedImages: UploadedImage[] = []
  const errors: string[] = []

  for (const file of files) {
    // Validar archivo
    const validation = validateImageFile(file)
    if (!validation.valid) {
      errors.push(`${file.name}: ${validation.error}`)
      continue
    }

    // Subir a blob storage
    const result = await uploadImage(file, 'carga-masiva')
    
    if (result.success && result.url) {
      uploadedImages.push({
        fileName: file.name,
        url: result.url,
        size: file.size
      })
    } else {
      errors.push(`${file.name}: ${result.error || 'Error desconocido'}`)
    }
  }

  if (uploadedImages.length === 0 && errors.length > 0) {
    return { 
      success: false, 
      error: `No se pudo subir ninguna imagen. Errores: ${errors.join(', ')}` 
    }
  }

  return { 
    success: true, 
    images: uploadedImages,
    error: errors.length > 0 ? `Algunas imágenes fallaron: ${errors.join(', ')}` : undefined
  }
}

/**
 * Valida un archivo Excel y retorna los productos categorizados
 */
export async function validateExcelFile(
  formData: FormData,
  uploadedImages: UploadedImage[]
): Promise<{
  success: boolean
  result?: ValidationResult
  error?: string
}> {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  const file = formData.get('excel') as File
  
  if (!file) {
    return { success: false, error: 'No se recibió el archivo Excel' }
  }

  // Validar tipo de archivo
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
  
  if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return { success: false, error: 'El archivo debe ser Excel (.xlsx o .xls)' }
  }

  // Validar tamaño (máx 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'El archivo Excel no puede exceder 5MB' }
  }

  try {
    // Leer el archivo Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // Obtener la primera hoja (o la hoja "Productos" si existe)
    const sheetName = workbook.SheetNames.includes('Productos') 
      ? 'Productos' 
      : workbook.SheetNames[0]
    
    const sheet = workbook.Sheets[sheetName]
    
    if (!sheet) {
      return { success: false, error: 'El archivo no contiene hojas de datos' }
    }

    // Convertir a JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    
    if (jsonData.length < 2) {
      return { success: false, error: 'El archivo no contiene productos para procesar' }
    }

    // Validar headers
    const headers = (jsonData[0] as string[]).map(h => normalizeText(String(h || '')))
    
    // Headers requeridos y opcionales
    const requiredHeaders = ['nombre', 'marca', 'modelo', 'categoria', 'anio', 'precio_dia', 'stock', 'disponible']
    const optionalHeaders = ['precio_hora', 'precio_semana', 'precio_mes', 'peso', 'potencia', 'capacidad', 'especificaciones', 'descripcion', 'imagen']
    const allHeaders = [...requiredHeaders, ...optionalHeaders]
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      return { 
        success: false, 
        error: `Formato inválido. Columnas requeridas faltantes: ${missingHeaders.join(', ')}. Descarga la plantilla oficial.` 
      }
    }

    // Mapear índices de columnas
    const colIndex: Record<string, number> = {}
    allHeaders.forEach(h => {
      colIndex[h] = headers.indexOf(h)
    })

    // Parsear filas de datos
    const rows: ExcelRow[] = []
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown[]
      
      // Ignorar filas completamente vacías
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue
      }

      const getCell = (col: string) => colIndex[col] >= 0 ? row[colIndex[col]] : null

      rows.push({
        rowNumber: i + 1,
        // Campos esenciales
        nombre: getCell('nombre') != null ? String(getCell('nombre')).trim() : null,
        marca: getCell('marca') != null ? String(getCell('marca')).trim() : null,
        modelo: getCell('modelo') != null ? String(getCell('modelo')).trim() : null,
        categoria: getCell('categoria') != null ? String(getCell('categoria')).trim() : null,
        anio: getCell('anio') != null ? parseInt(String(getCell('anio')), 10) : null,
        // Pricing
        precio_dia: getCell('precio_dia') != null ? parseFloat(String(getCell('precio_dia'))) : null,
        precio_hora: getCell('precio_hora') != null ? parseFloat(String(getCell('precio_hora'))) : null,
        precio_semana: getCell('precio_semana') != null ? parseFloat(String(getCell('precio_semana'))) : null,
        precio_mes: getCell('precio_mes') != null ? parseFloat(String(getCell('precio_mes'))) : null,
        // Especificaciones
        peso: getCell('peso') != null ? parseFloat(String(getCell('peso'))) : null,
        potencia: getCell('potencia') != null ? parseFloat(String(getCell('potencia'))) : null,
        capacidad: getCell('capacidad') != null ? String(getCell('capacidad')).trim() : null,
        especificaciones: getCell('especificaciones') != null ? String(getCell('especificaciones')).trim() : null,
        // Control
        stock: getCell('stock') != null ? parseInt(String(getCell('stock')), 10) : null,
        disponible: getCell('disponible') != null ? String(getCell('disponible')).toUpperCase() === 'TRUE' : null,
        descripcion: getCell('descripcion') != null ? String(getCell('descripcion')).trim() : null,
        // Imagen
        imagen: getCell('imagen') != null ? String(getCell('imagen')).trim() : null,
      })
    }

    if (rows.length === 0) {
      return { success: false, error: 'El archivo no contiene productos para procesar' }
    }

    // Crear mapa de imágenes subidas (nombre -> url)
    const imageMap = new Map<string, string>()
    uploadedImages.forEach(img => {
      imageMap.set(img.fileName, img.url)
    })

    // Obtener productos existentes para detectar duplicados (por marca + modelo + categoría)
    const existingProducts = await prisma.vehiculo.findMany({
      where: { deleted_at: null },
      select: { idveh: true, marveh: true, modveh: true, categoria: true }
    })

    // Crear mapa de productos existentes (normalizado)
    const existingMap = new Map<string, number>()
    existingProducts.forEach(p => {
      const key = `${normalizeText(p.marveh)}|${normalizeText(p.modveh)}|${normalizeText(p.categoria)}`
      existingMap.set(key, p.idveh)
    })

    // Validar cada fila
    const toCreate: ValidatedProduct[] = []
    const duplicates: DuplicateProduct[] = []
    const errors: ValidationError[] = []

    // Set para detectar duplicados dentro del mismo archivo
    const seenInFile = new Set<string>()
    const currentYear = new Date().getFullYear()

    for (const row of rows) {
      const rowErrors: ValidationError[] = []

      // ==========================================
      // CAMPOS ESENCIALES
      // ==========================================

      // Validar nombre (requerido, min 3 chars, max 100)
      if (!row.nombre || row.nombre.length < 3) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'nombre',
          message: 'El nombre es requerido y debe tener al menos 3 caracteres',
          value: row.nombre || ''
        })
      } else if (row.nombre.length > 100) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'nombre',
          message: 'El nombre no puede exceder 100 caracteres',
          value: row.nombre
        })
      }

      // Validar marca (requerido, min 2 chars, max 50)
      if (!row.marca || row.marca.length < 2) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'marca',
          message: 'La marca es requerida y debe tener al menos 2 caracteres (ej: CAT, Komatsu, JCB)',
          value: row.marca || ''
        })
      } else if (row.marca.length > 50) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'marca',
          message: 'La marca no puede exceder 50 caracteres',
          value: row.marca
        })
      }

      // Validar modelo (requerido, min 2 chars, max 50)
      if (!row.modelo || row.modelo.length < 2) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'modelo',
          message: 'El modelo es requerido y debe tener al menos 2 caracteres (ej: 320D, PC200)',
          value: row.modelo || ''
        })
      } else if (row.modelo.length > 50) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'modelo',
          message: 'El modelo no puede exceder 50 caracteres',
          value: row.modelo
        })
      }

      // Validar categoría (requerido, min 3 chars)
      if (!row.categoria || row.categoria.length < 3) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'categoria',
          message: 'La categoría es requerida y debe tener al menos 3 caracteres (ej: Excavadora, Retroexcavadora)',
          value: row.categoria || ''
        })
      }

      // Validar año de fabricación (requerido, entre 1980 y año actual + 1)
      if (row.anio === null || isNaN(row.anio)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'anio',
          message: 'El año de fabricación es requerido y debe ser un número',
          value: String(row.anio)
        })
      } else if (row.anio < 1980 || row.anio > currentYear + 1) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'anio',
          message: `El año debe estar entre 1980 y ${currentYear + 1}`,
          value: String(row.anio)
        })
      }

      // ==========================================
      // PRICING
      // ==========================================

      // Validar precio_dia (requerido, > 0)
      if (row.precio_dia === null || isNaN(row.precio_dia)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'precio_dia',
          message: 'El precio por día es requerido y debe ser un número',
          value: String(row.precio_dia)
        })
      } else if (row.precio_dia <= 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'precio_dia',
          message: 'El precio por día debe ser mayor a 0',
          value: String(row.precio_dia)
        })
      }

      // Validar precio_hora (opcional, si existe debe ser > 0)
      if (row.precio_hora !== null && !isNaN(row.precio_hora) && row.precio_hora <= 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'precio_hora',
          message: 'El precio por hora debe ser mayor a 0',
          value: String(row.precio_hora)
        })
      }

      // Validar precio_semana (opcional, si existe debe ser > 0)
      if (row.precio_semana !== null && !isNaN(row.precio_semana) && row.precio_semana <= 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'precio_semana',
          message: 'El precio por semana debe ser mayor a 0',
          value: String(row.precio_semana)
        })
      }

      // Validar precio_mes (opcional, si existe debe ser > 0)
      if (row.precio_mes !== null && !isNaN(row.precio_mes) && row.precio_mes <= 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'precio_mes',
          message: 'El precio por mes debe ser mayor a 0',
          value: String(row.precio_mes)
        })
      }

      // ==========================================
      // ESPECIFICACIONES
      // ==========================================

      // Validar peso (opcional, si existe debe ser > 0)
      if (row.peso !== null && !isNaN(row.peso) && row.peso <= 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'peso',
          message: 'El peso (toneladas) debe ser mayor a 0',
          value: String(row.peso)
        })
      }

      // Validar potencia (opcional, si existe debe ser > 0)
      if (row.potencia !== null && !isNaN(row.potencia) && row.potencia <= 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'potencia',
          message: 'La potencia (HP) debe ser mayor a 0',
          value: String(row.potencia)
        })
      }

      // Validar capacidad (opcional, max 100 chars)
      if (row.capacidad && row.capacidad.length > 100) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'capacidad',
          message: 'La capacidad no puede exceder 100 caracteres',
          value: row.capacidad.substring(0, 50) + '...'
        })
      }

      // ==========================================
      // CONTROL
      // ==========================================

      // Validar stock (requerido, >= 0)
      if (row.stock === null || isNaN(row.stock)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'stock',
          message: 'El stock es requerido y debe ser un número entero',
          value: String(row.stock)
        })
      } else if (row.stock < 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'stock',
          message: 'El stock no puede ser negativo',
          value: String(row.stock)
        })
      }

      // Validar disponible (requerido)
      if (row.disponible === null) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'disponible',
          message: 'El campo disponible es requerido (TRUE o FALSE)',
          value: ''
        })
      }

      // Validar descripción (opcional, max 500)
      if (row.descripcion && row.descripcion.length > 500) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'descripcion',
          message: 'La descripción no puede exceder 500 caracteres',
          value: row.descripcion.substring(0, 50) + '...'
        })
      }

      // ==========================================
      // IMAGEN
      // ==========================================

      // Validar imagen (si se especifica, debe existir en las subidas)
      let imagenUrl: string | null = null
      if (row.imagen && row.imagen.length > 0) {
        if (!imageMap.has(row.imagen)) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'imagen',
            message: `La imagen "${row.imagen}" no fue subida. Verifique el nombre exacto (case-sensitive)`,
            value: row.imagen
          })
        } else {
          imagenUrl = imageMap.get(row.imagen) || null
        }
      }

      // Si hay errores de validación, agregar a la lista de errores
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
        continue
      }

      // Verificar duplicado en base de datos (por marca + modelo + categoría)
      const productKey = `${normalizeText(row.marca)}|${normalizeText(row.modelo)}|${normalizeText(row.categoria)}`
      
      if (existingMap.has(productKey)) {
        duplicates.push({
          rowNumber: row.rowNumber,
          nombre: row.nombre!,
          categoria: row.categoria!,
          existingId: existingMap.get(productKey)!
        })
        continue
      }

      // Verificar duplicado dentro del mismo archivo
      if (seenInFile.has(productKey)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'modelo',
          message: 'Este producto (misma marca, modelo y categoría) está duplicado dentro del mismo archivo',
          value: `${row.marca} ${row.modelo} - ${row.categoria}`
        })
        continue
      }

      seenInFile.add(productKey)

      // Producto válido para crear
      toCreate.push({
        rowNumber: row.rowNumber,
        // Campos esenciales
        nombre: row.nombre!,
        marca: row.marca!,
        modelo: row.modelo!,
        categoria: row.categoria!,
        anio: row.anio!,
        // Pricing
        precio_dia: row.precio_dia!,
        precio_hora: row.precio_hora && !isNaN(row.precio_hora) ? row.precio_hora : null,
        precio_semana: row.precio_semana && !isNaN(row.precio_semana) ? row.precio_semana : null,
        precio_mes: row.precio_mes && !isNaN(row.precio_mes) ? row.precio_mes : null,
        // Especificaciones
        peso: row.peso && !isNaN(row.peso) ? row.peso : null,
        potencia: row.potencia && !isNaN(row.potencia) ? row.potencia : null,
        capacidad: row.capacidad || null,
        especificaciones: row.especificaciones || null,
        // Control
        stock: row.stock!,
        disponible: row.disponible!,
        descripcion: row.descripcion || null,
        // Imagen
        imagen: row.imagen || null,
        imagenUrl,
      })
    }

    return {
      success: true,
      result: {
        toCreate,
        duplicates,
        errors
      }
    }

  } catch (error) {
    console.error('Error al procesar Excel:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al procesar el archivo Excel' 
    }
  }
}

/**
 * Procesa la carga masiva y crea los productos validados
 */
export async function processBulkUpload(
  products: ValidatedProduct[]
): Promise<BulkUploadResult> {
  const check = await requireAdmin()
  if (!check.ok) {
    return { 
      success: false, 
      created: 0, 
      duplicatesSkipped: 0, 
      errors: 1, 
      createdIds: [],
      errorDetails: [{ rowNumber: 0, field: 'auth', message: check.error }]
    }
  }

  const { userId, userEmail } = check

  // Configurar contexto de auditoría
  if (userId) {
    setAuditContext({
      userId,
      userEmail: userEmail || undefined,
      comment: 'Carga masiva de productos'
    })
  }

  if (!products || products.length === 0) {
    return {
      success: false,
      created: 0,
      duplicatesSkipped: 0,
      errors: 1,
      createdIds: [],
      errorDetails: [{ rowNumber: 0, field: 'products', message: 'No hay productos para crear' }]
    }
  }

  const createdIds: number[] = []
  const errorDetails: ValidationError[] = []

  // Procesar en lotes de 50 para evitar timeouts
  const batchSize = 50
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)

    for (const product of batch) {
      try {
        // Generar placa única basada en marca-modelo-timestamp
        const placa = generateUniquePlaca()
        // Usar el modelo proporcionado por el usuario, con sufijo único si es necesario
        const modeloUnico = `${product.marca}-${product.modelo}-${Date.now().toString(36)}`

        const newVehiculo = await prisma.vehiculo.create({
          data: {
            // Identificación
            plaveh: placa,
            marveh: product.marca,           // Marca (CAT, Komatsu, etc.)
            modveh: modeloUnico,             // Modelo único para evitar duplicados
            categoria: product.categoria,
            anioveh: product.anio,           // Año de fabricación
            // Pricing
            precioalquilo: product.precio_dia,
            precio_hora: product.precio_hora,
            // precio_semana y precio_mes se pueden agregar a especificaciones si no hay columnas
            // Especificaciones técnicas
            peso: product.peso,              // Toneladas
            potencia: product.potencia,      // HP
            capacidad: product.capacidad,    // Capacidad (ton o m³)
            especificaciones: buildSpecifications(product), // Texto libre + precios adicionales
            // Control
            stock: product.stock,
            disponible: product.disponible,
            descripcion: product.descripcion,
            // Imagen
            imagenUrl: product.imagenUrl,
            // Estado y auditoría
            estveh: product.disponible ? EstadoVehiculo.DISPONIBLE : EstadoVehiculo.FUERA_SERVICIO,
            idprop: userId ?? undefined,
            created_by: userId,
            updated_by: userId,
          }
        })

        // Registrar en audit_log
        await auditCreate(
          'vehiculo', 
          newVehiculo.idveh, 
          newVehiculo, 
          `Producto creado vía carga masiva: ${product.marca} ${product.modelo} (${product.categoria})`
        )

        createdIds.push(newVehiculo.idveh)

      } catch (error) {
        console.error(`Error al crear producto fila ${product.rowNumber}:`, error)
        errorDetails.push({
          rowNumber: product.rowNumber,
          field: 'create',
          message: error instanceof Error ? error.message : 'Error al crear producto',
          value: product.nombre
        })
      }
    }
  }

  // Revalidar paths
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")

  return {
    success: errorDetails.length === 0,
    created: createdIds.length,
    duplicatesSkipped: 0,
    errors: errorDetails.length,
    createdIds,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined
  }
}

/**
 * Genera y retorna los datos para la plantilla Excel
 */
export async function getExcelTemplateData(): Promise<{
  headers: string[]
  examples: (string | number | boolean)[][]
  instructions: string[][]
}> {
  return {
    headers: [
      // Campos esenciales
      'nombre',
      'marca',
      'modelo',
      'categoria',
      'anio',
      // Pricing
      'precio_dia',
      'precio_hora',
      'precio_semana',
      'precio_mes',
      // Especificaciones
      'peso',
      'potencia',
      'capacidad',
      'especificaciones',
      // Control
      'stock',
      'disponible',
      'descripcion',
      // Imagen
      'imagen'
    ],
    examples: [
      // nombre, marca, modelo, categoria, anio, precio_dia, precio_hora, precio_semana, precio_mes, peso, potencia, capacidad, especificaciones, stock, disponible, descripcion, imagen
      ['Excavadora Hidráulica 320D', 'CAT', '320D', 'Excavadora', 2020, 1500, 200, 9000, 35000, 20.5, 150, '1.2 m³', 'Alcance: 10m|Profundidad: 6.5m', 3, 'TRUE', 'Excavadora hidráulica de alto rendimiento para obras medianas y grandes', 'excavadora-cat-320.jpg'],
      ['Retroexcavadora Versátil', 'JCB', '3CX', 'Retroexcavadora', 2021, 800, 120, 4800, 18000, 8.5, 92, '0.25 m³', 'Profundidad excavación: 5.5m', 5, 'TRUE', 'Retroexcavadora versátil para múltiples trabajos de construcción', 'retroexcavadora-jcb.jpg'],
      ['Rodillo Compactador', 'Bomag', 'BW120', 'Compactadora', 2019, 450, 70, 2700, 10000, 2.5, 25, '', 'Ancho tambor: 1.2m|Vibración: Si', 2, 'TRUE', 'Rodillo compactador vibratorio para suelos y asfalto', ''],
      ['Grúa Torre Industrial', 'Liebherr', '280EC-H', 'Grúa', 2022, 3500, 500, 21000, 80000, 45, 75, '12 ton', 'Altura máx: 60m|Alcance: 50m', 1, 'FALSE', 'Grúa torre para grandes construcciones de edificios', 'grua-torre.png'],
      ['Cargador Frontal', 'Komatsu', 'WA320', 'Cargador', 2020, 1200, 180, 7200, 28000, 15.8, 165, '2.5 m³', 'Capacidad cuchara: 2.5m³', 4, 'TRUE', 'Cargador frontal de ruedas para movimiento de materiales', 'cargador-komatsu.jpg'],
    ],
    instructions: [
      ['INSTRUCCIONES DE USO - CARGA MASIVA DE MAQUINARIA'],
      [''],
      ['=== PASO 1: SUBIR IMÁGENES ==='],
      ['- Suba primero las imágenes de los productos en la sección "Subir Imágenes"'],
      ['- Anote los nombres exactos de los archivos (son case-sensitive)'],
      ['- Formatos aceptados: JPG, PNG, WEBP (máx 5MB por imagen)'],
      [''],
      ['=== PASO 2: COMPLETAR PLANTILLA ==='],
      ['- Complete la hoja "Productos" con los datos de cada máquina'],
      ['- No modifique los nombres de las columnas de la fila 1'],
      [''],
      ['=== CAMPOS ESENCIALES (REQUERIDOS) ==='],
      ['- nombre: Nombre comercial del producto (mín 3, máx 100 caracteres)'],
      ['- marca: Fabricante de la máquina (ej: CAT, Komatsu, JCB, Liebherr, Bobcat)'],
      ['- modelo: Modelo específico (ej: 320D, PC200, 3CX)'],
      ['- categoria: Tipo de máquina (ej: Excavadora, Retroexcavadora, Grúa, Cargador)'],
      ['- anio: Año de fabricación (entre 1980 y año actual + 1)'],
      [''],
      ['=== PRICING (precio_dia REQUERIDO) ==='],
      ['- precio_dia: Precio de alquiler por día en soles (requerido, > 0)'],
      ['- precio_hora: Precio por hora (opcional, > 0)'],
      ['- precio_semana: Precio por semana (opcional, > 0)'],
      ['- precio_mes: Precio por mes (opcional, > 0)'],
      [''],
      ['=== ESPECIFICACIONES (OPCIONALES) ==='],
      ['- peso: Peso operativo en toneladas (ej: 20.5 para 20.5 ton)'],
      ['- potencia: Potencia del motor en HP (ej: 150)'],
      ['- capacidad: Capacidad de carga o cuchara (ej: "1.2 m³" o "12 ton")'],
      ['- especificaciones: Otras especificaciones formato "Clave: Valor|Clave: Valor"'],
      [''],
      ['=== CONTROL (stock y disponible REQUERIDOS) ==='],
      ['- stock: Cantidad de unidades disponibles (número entero >= 0)'],
      ['- disponible: TRUE si está disponible, FALSE si no (exactamente así)'],
      ['- descripcion: Descripción detallada del producto (máx 500 caracteres)'],
      [''],
      ['=== IMAGEN (OPCIONAL) ==='],
      ['- imagen: Nombre EXACTO del archivo de imagen subido previamente (case-sensitive)'],
      [''],
      ['=== DETECCIÓN DE DUPLICADOS ==='],
      ['- Un producto se considera duplicado si ya existe con misma MARCA + MODELO + CATEGORÍA'],
      ['- La comparación ignora mayúsculas/minúsculas'],
      ['- Los duplicados se mostrarán en amarillo pero NO se crearán'],
      [''],
      ['=== LÍMITES ==='],
      ['- Máximo 500 productos por archivo'],
      ['- Tamaño máximo del Excel: 5MB'],
    ]
  }
}
