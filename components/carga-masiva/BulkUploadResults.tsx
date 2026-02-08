"use client"

import { CheckCircle, XCircle, AlertTriangle, ArrowRight, RotateCcw, Download } from "lucide-react"
import Link from "next/link"
import type { BulkUploadResult, ValidationError } from "@/lib/actions/admin-carga-masiva"

interface BulkUploadResultsProps {
  result: BulkUploadResult
  duplicatesSkipped: number
  errorsInValidation: number
  onReset: () => void
}

export function BulkUploadResults({ 
  result, 
  duplicatesSkipped,
  errorsInValidation,
  onReset 
}: BulkUploadResultsProps) {
  const downloadErrorReport = () => {
    if (!result.errorDetails || result.errorDetails.length === 0) return

    const csvContent = [
      ['Fila', 'Campo', 'Error', 'Valor'].join(','),
      ...result.errorDetails.map(err => 
        [err.rowNumber, err.field, `"${err.message}"`, `"${err.value || ''}"`].join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `errores_carga_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const isSuccess = result.created > 0 && result.errors === 0
  const isPartialSuccess = result.created > 0 && result.errors > 0
  const isFailed = result.created === 0

  return (
    <div className="space-y-6">
      {/* Main result card */}
      <div className={`rounded-xl p-6 ${
        isSuccess 
          ? 'bg-green-50 border-2 border-green-200' 
          : isPartialSuccess 
            ? 'bg-yellow-50 border-2 border-yellow-200'
            : 'bg-red-50 border-2 border-red-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isSuccess 
              ? 'bg-green-100' 
              : isPartialSuccess 
                ? 'bg-yellow-100'
                : 'bg-red-100'
          }`}>
            {isSuccess ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : isPartialSuccess ? (
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${
              isSuccess 
                ? 'text-green-800' 
                : isPartialSuccess 
                  ? 'text-yellow-800'
                  : 'text-red-800'
            }`}>
              {isSuccess 
                ? 'Carga completada exitosamente' 
                : isPartialSuccess 
                  ? 'Carga completada con errores'
                  : 'Error en la carga'}
            </h3>
            <p className={`mt-1 ${
              isSuccess 
                ? 'text-green-700' 
                : isPartialSuccess 
                  ? 'text-yellow-700'
                  : 'text-red-700'
            }`}>
              {isSuccess 
                ? `Se crearon ${result.created} producto(s) correctamente.`
                : isPartialSuccess
                  ? `Se crearon ${result.created} producto(s), pero hubo ${result.errors} error(es) al procesar.`
                  : 'No se pudo crear ningún producto.'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{result.created}</div>
          <div className="text-sm text-gray-600 mt-1">Productos creados</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{duplicatesSkipped}</div>
          <div className="text-sm text-gray-600 mt-1">Duplicados omitidos</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{errorsInValidation}</div>
          <div className="text-sm text-gray-600 mt-1">Errores de validación</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{result.errors}</div>
          <div className="text-sm text-gray-600 mt-1">Errores al crear</div>
        </div>
      </div>

      {/* Error details */}
      {result.errorDetails && result.errorDetails.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-red-800">Errores durante la creación</h4>
            <button
              onClick={downloadErrorReport}
              className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-800"
            >
              <Download className="w-4 h-4" />
              Descargar reporte
            </button>
          </div>
          <div className="max-h-40 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-red-700">
                  <th className="p-2">Fila</th>
                  <th className="p-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {result.errorDetails.slice(0, 10).map((err, idx) => (
                  <tr key={idx} className="border-t border-red-200">
                    <td className="p-2 text-red-600">#{err.rowNumber}</td>
                    <td className="p-2 text-red-700">{err.message}</td>
                  </tr>
                ))}
                {result.errorDetails.length > 10 && (
                  <tr className="border-t border-red-200">
                    <td colSpan={2} className="p-2 text-red-600 text-center">
                      ... y {result.errorDetails.length - 10} errores más
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        {result.created > 0 && (
          <Link
            href="/dashboard/vehiculos"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Ver productos creados
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Realizar nueva carga
        </button>
      </div>
    </div>
  )
}
