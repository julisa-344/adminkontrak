"use client"

import { useState, useCallback, useRef } from "react"
import { FileSpreadsheet, X, Download, AlertCircle, Loader2, CheckCircle } from "lucide-react"
import * as XLSX from 'xlsx'

interface ExcelDropzoneProps {
  onFileSelected: (file: File) => void
  onValidate: () => void
  selectedFile: File | null
  onClearFile: () => void
  disabled?: boolean
  isValidating?: boolean
}

export function ExcelDropzone({ 
  onFileSelected, 
  onValidate,
  selectedFile,
  onClearFile,
  disabled = false,
  isValidating = false
}: ExcelDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    const isValidType = validTypes.includes(file.type) || 
                        file.name.endsWith('.xlsx') || 
                        file.name.endsWith('.xls')
    
    if (!isValidType) {
      return { valid: false, error: 'El archivo debe ser Excel (.xlsx o .xls)' }
    }

    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, error: 'El archivo no puede exceder 5MB' }
    }

    return { valid: true }
  }

  const handleFile = (file: File) => {
    setError(null)
    
    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Archivo inválido')
      return
    }

    onFileSelected(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [disabled])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = async () => {
    try {
      // Crear workbook
      const wb = XLSX.utils.book_new()

      // Headers con todos los campos nuevos
      const headers = [
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
      ]

      // Ejemplos actualizados
      const examples = [
        // nombre, marca, modelo, categoria, anio, precio_dia, precio_hora, precio_semana, precio_mes, peso, potencia, capacidad, especificaciones, stock, disponible, descripcion, imagen
        ['Excavadora Hidráulica 320D', 'CAT', '320D', 'Excavadora', 2020, 1500, 200, 9000, 35000, 20.5, 150, '1.2 m³', 'Alcance: 10m|Profundidad: 6.5m', 3, 'TRUE', 'Excavadora hidráulica de alto rendimiento', 'excavadora-cat-320.jpg'],
        ['Retroexcavadora Versátil', 'JCB', '3CX', 'Retroexcavadora', 2021, 800, 120, 4800, 18000, 8.5, 92, '0.25 m³', 'Profundidad: 5.5m', 5, 'TRUE', 'Retroexcavadora versátil', 'retroexcavadora-jcb.jpg'],
        ['Rodillo Compactador', 'Bomag', 'BW120', 'Compactadora', 2019, 450, 70, 2700, 10000, 2.5, 25, '', 'Ancho: 1.2m|Vibración: Si', 2, 'TRUE', 'Rodillo compactador vibratorio', ''],
        ['Grúa Torre Industrial', 'Liebherr', '280EC-H', 'Grúa', 2022, 3500, 500, 21000, 80000, 45, 75, '12 ton', 'Altura: 60m|Alcance: 50m', 1, 'FALSE', 'Grúa torre para construcciones', 'grua-torre.png'],
        ['Cargador Frontal', 'Komatsu', 'WA320', 'Cargador', 2020, 1200, 180, 7200, 28000, 15.8, 165, '2.5 m³', 'Capacidad cuchara: 2.5m³', 4, 'TRUE', 'Cargador frontal de ruedas', 'cargador-komatsu.jpg'],
      ]

      // Crear hoja de productos
      const productosData = [headers, ...examples]
      const wsProductos = XLSX.utils.aoa_to_sheet(productosData)

      // Configurar ancho de columnas
      wsProductos['!cols'] = [
        { wch: 28 }, // nombre
        { wch: 12 }, // marca
        { wch: 12 }, // modelo
        { wch: 15 }, // categoria
        { wch: 6 },  // anio
        { wch: 12 }, // precio_dia
        { wch: 12 }, // precio_hora
        { wch: 14 }, // precio_semana
        { wch: 12 }, // precio_mes
        { wch: 8 },  // peso
        { wch: 10 }, // potencia
        { wch: 12 }, // capacidad
        { wch: 35 }, // especificaciones
        { wch: 8 },  // stock
        { wch: 12 }, // disponible
        { wch: 35 }, // descripcion
        { wch: 25 }, // imagen
      ]

      XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos')

      // Crear hoja de instrucciones
      const instrucciones = [
        ['INSTRUCCIONES DE USO - CARGA MASIVA DE MAQUINARIA'],
        [''],
        ['=== PASO 1: SUBIR IMÁGENES ==='],
        ['- Suba primero las imágenes en la sección "Subir Imágenes"'],
        ['- Anote los nombres exactos de los archivos (son case-sensitive)'],
        ['- Formatos aceptados: JPG, PNG, WEBP (máx 5MB por imagen)'],
        [''],
        ['=== PASO 2: COMPLETAR PLANTILLA ==='],
        ['- Complete la hoja "Productos" con los datos de cada máquina'],
        ['- No modifique los nombres de las columnas de la fila 1'],
        [''],
        ['=== CAMPOS ESENCIALES (REQUERIDOS) ==='],
        ['- nombre: Nombre comercial del producto (mín 3, máx 100 caracteres)'],
        ['- marca: Fabricante (ej: CAT, Komatsu, JCB, Liebherr, Bobcat)'],
        ['- modelo: Modelo específico (ej: 320D, PC200, 3CX)'],
        ['- categoria: Tipo de máquina (ej: Excavadora, Retroexcavadora, Grúa)'],
        ['- anio: Año de fabricación (entre 1980 y año actual + 1)'],
        [''],
        ['=== PRICING (precio_dia REQUERIDO) ==='],
        ['- precio_dia: Precio por día en soles (requerido, > 0)'],
        ['- precio_hora: Precio por hora (opcional)'],
        ['- precio_semana: Precio por semana (opcional)'],
        ['- precio_mes: Precio por mes (opcional)'],
        [''],
        ['=== ESPECIFICACIONES (OPCIONALES) ==='],
        ['- peso: Peso en toneladas (ej: 20.5)'],
        ['- potencia: Potencia en HP (ej: 150)'],
        ['- capacidad: Capacidad (ej: "1.2 m³" o "12 ton")'],
        ['- especificaciones: Otras specs formato "Clave: Valor|Clave: Valor"'],
        [''],
        ['=== CONTROL (stock y disponible REQUERIDOS) ==='],
        ['- stock: Cantidad de unidades (número >= 0)'],
        ['- disponible: TRUE o FALSE (exactamente así)'],
        ['- descripcion: Descripción del producto (máx 500 caracteres)'],
        [''],
        ['=== IMAGEN (OPCIONAL) ==='],
        ['- imagen: Nombre EXACTO del archivo subido (case-sensitive)'],
        [''],
        ['=== DETECCIÓN DE DUPLICADOS ==='],
        ['- Duplicado = misma MARCA + MODELO + CATEGORÍA'],
        ['- Ignora mayúsculas/minúsculas'],
        ['- Los duplicados NO se crearán'],
        [''],
        ['=== LÍMITES ==='],
        ['- Máximo 500 productos por archivo'],
        ['- Tamaño máximo del Excel: 5MB'],
      ]

      const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
      wsInstrucciones['!cols'] = [{ wch: 70 }]
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

      // Descargar archivo
      XLSX.writeFile(wb, 'plantilla_carga_masiva.xlsx')
    } catch (err) {
      console.error('Error generating template:', err)
      setError('Error al generar la plantilla')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Download template button */}
      <div className="flex justify-end">
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 border border-primary rounded-lg hover:bg-primary/5 transition"
        >
          <Download className="w-4 h-4" />
          Descargar Plantilla Excel
        </button>
      </div>

      {/* Dropzone or selected file */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : disabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra el archivo Excel aquí'}
          </p>
          <p className={`text-sm mt-1 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
            o haz clic para seleccionar
          </p>
          <p className="text-xs text-gray-400 mt-2">
            .xlsx o .xls • Máximo 5MB
          </p>
        </div>
      ) : (
        <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isValidating && (
                <button
                  onClick={onClearFile}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar archivo"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Validate button */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <button
              onClick={onValidate}
              disabled={isValidating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validando archivo...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Validar y Previsualizar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
