"use client"

import { CheckCircle, AlertTriangle, XCircle, Package, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import type { ValidationResult, ValidatedProduct, DuplicateProduct, ValidationError } from "@/lib/actions/admin-carga-masiva"

interface ValidationPreviewProps {
  result: ValidationResult
  onConfirm: () => void
  onCancel: () => void
  isProcessing?: boolean
}

export function ValidationPreview({ 
  result, 
  onConfirm, 
  onCancel,
  isProcessing = false 
}: ValidationPreviewProps) {
  const [expandedSections, setExpandedSections] = useState({
    toCreate: true,
    duplicates: result.duplicates.length > 0,
    errors: result.errors.length > 0
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const totalRows = result.toCreate.length + result.duplicates.length + result.errors.length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{result.toCreate.length}</div>
          <div className="text-sm text-green-700 mt-1">Productos a crear</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{result.duplicates.length}</div>
          <div className="text-sm text-yellow-700 mt-1">Duplicados detectados</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{result.errors.length}</div>
          <div className="text-sm text-red-700 mt-1">Errores de validación</div>
        </div>
      </div>

      {/* Products to create */}
      {result.toCreate.length > 0 && (
        <div className="border border-green-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('toCreate')}
            className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Productos a Crear ({result.toCreate.length})
              </span>
            </div>
            {expandedSections.toCreate ? (
              <ChevronUp className="w-5 h-5 text-green-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-green-600" />
            )}
          </button>

          {expandedSections.toCreate && (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-50/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Fila</th>
                    <th className="text-left p-3 font-medium text-gray-700">Marca</th>
                    <th className="text-left p-3 font-medium text-gray-700">Modelo</th>
                    <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                    <th className="text-center p-3 font-medium text-gray-700">Año</th>
                    <th className="text-right p-3 font-medium text-gray-700">Precio/Día</th>
                    <th className="text-center p-3 font-medium text-gray-700">Stock</th>
                    <th className="text-center p-3 font-medium text-gray-700">Imagen</th>
                  </tr>
                </thead>
                <tbody>
                  {result.toCreate.map((product) => (
                    <tr key={product.rowNumber} className="border-t border-green-100 hover:bg-green-50/30">
                      <td className="p-3 text-gray-500">#{product.rowNumber}</td>
                      <td className="p-3 font-medium text-gray-900">{product.marca}</td>
                      <td className="p-3 text-gray-700">{product.modelo}</td>
                      <td className="p-3 text-gray-600">{product.categoria}</td>
                      <td className="p-3 text-center text-gray-600">{product.anio}</td>
                      <td className="p-3 text-right text-gray-900">S/ {product.precio_dia.toFixed(2)}</td>
                      <td className="p-3 text-center text-gray-600">{product.stock}</td>
                      <td className="p-3 text-center">
                        {product.imagen ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            {product.imagen.length > 15 ? product.imagen.substring(0, 15) + '...' : product.imagen}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sin imagen</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Duplicates */}
      {result.duplicates.length > 0 && (
        <div className="border border-yellow-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('duplicates')}
            className="w-full flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 transition"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                Duplicados Detectados ({result.duplicates.length}) - No se crearán
              </span>
            </div>
            {expandedSections.duplicates ? (
              <ChevronUp className="w-5 h-5 text-yellow-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-yellow-600" />
            )}
          </button>

          {expandedSections.duplicates && (
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-yellow-50/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Fila</th>
                    <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                    <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                    <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.duplicates.map((dup) => (
                    <tr key={dup.rowNumber} className="border-t border-yellow-100 hover:bg-yellow-50/30">
                      <td className="p-3 text-gray-500">#{dup.rowNumber}</td>
                      <td className="p-3 font-medium text-gray-900">{dup.nombre}</td>
                      <td className="p-3 text-gray-600">{dup.categoria}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                          Ya existe (ID: {dup.existingId})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('errors')}
            className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition"
          >
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">
                Errores de Validación ({result.errors.length}) - No se crearán
              </span>
            </div>
            {expandedSections.errors ? (
              <ChevronUp className="w-5 h-5 text-red-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-600" />
            )}
          </button>

          {expandedSections.errors && (
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-50/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Fila</th>
                    <th className="text-left p-3 font-medium text-gray-700">Campo</th>
                    <th className="text-left p-3 font-medium text-gray-700">Error</th>
                    <th className="text-left p-3 font-medium text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((err, idx) => (
                    <tr key={`${err.rowNumber}-${err.field}-${idx}`} className="border-t border-red-100 hover:bg-red-50/30">
                      <td className="p-3 text-gray-500">#{err.rowNumber}</td>
                      <td className="p-3 font-medium text-gray-900">{err.field}</td>
                      <td className="p-3 text-red-700">{err.message}</td>
                      <td className="p-3 text-gray-500 truncate max-w-[150px]" title={err.value}>
                        {err.value || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-gray-500">
          {result.toCreate.length > 0 
            ? `Se crearán ${result.toCreate.length} producto(s). Los duplicados y errores serán omitidos.`
            : 'No hay productos válidos para crear.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={result.toCreate.length === 0 || isProcessing}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Confirmar y Crear {result.toCreate.length} Producto(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
