"use client"

import { useState } from "react"
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { ImageDropzone, ExcelDropzone, ValidationPreview, BulkUploadResults } from "@/components/carga-masiva"
import { 
  validateExcelFile, 
  processBulkUpload,
  type UploadedImage, 
  type ValidationResult,
  type BulkUploadResult
} from "@/lib/actions/admin-carga-masiva"

type Step = 'upload' | 'preview' | 'results'

export default function CargaMasivaPage() {
  // State
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Handlers
  const handleImagesUploaded = (images: UploadedImage[]) => {
    setUploadedImages(prev => [...prev, ...images])
    toast.success(`${images.length} imagen(es) subida(s) correctamente`)
  }

  const handleRemoveImage = (fileName: string) => {
    setUploadedImages(prev => prev.filter(img => img.fileName !== fileName))
  }

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)
    setValidationResult(null)
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setValidationResult(null)
  }

  const handleValidate = async () => {
    if (!selectedFile) return

    setIsValidating(true)
    try {
      const formData = new FormData()
      formData.append('excel', selectedFile)

      const result = await validateExcelFile(formData, uploadedImages)

      if (!result.success) {
        toast.error(result.error || 'Error al validar el archivo')
        return
      }

      if (result.result) {
        setValidationResult(result.result)
        setCurrentStep('preview')
        
        // Show summary toast
        const { toCreate, duplicates, errors } = result.result
        if (toCreate.length === 0) {
          toast.warning('No hay productos válidos para crear')
        } else {
          toast.success(`${toCreate.length} producto(s) listo(s) para crear`)
        }
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast.error('Error al validar el archivo')
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirm = async () => {
    if (!validationResult || validationResult.toCreate.length === 0) return

    setIsProcessing(true)
    try {
      const result = await processBulkUpload(validationResult.toCreate)
      
      setUploadResult(result)
      setCurrentStep('results')

      if (result.success) {
        toast.success(`${result.created} producto(s) creado(s) exitosamente`)
      } else if (result.created > 0) {
        toast.warning(`Se crearon ${result.created} producto(s) con ${result.errors} error(es)`)
      } else {
        toast.error('No se pudo crear ningún producto')
      }
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Error al procesar la carga')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setCurrentStep('upload')
    setValidationResult(null)
  }

  const handleReset = () => {
    setCurrentStep('upload')
    setUploadedImages([])
    setSelectedFile(null)
    setValidationResult(null)
    setUploadResult(null)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/vehiculos"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Productos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Carga Masiva de Productos</h1>
        <p className="text-gray-600 mt-2">
          Sube múltiples productos de una sola vez mediante un archivo Excel
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'upload' 
                ? 'bg-primary text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {currentStep !== 'upload' ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <div>
              <p className="font-medium text-gray-900">Subir Archivos</p>
              <p className="text-sm text-gray-500">Imágenes y Excel</p>
            </div>
          </div>

          <div className="flex-1 h-1 mx-4 bg-gray-200 rounded">
            <div className={`h-full bg-primary rounded transition-all ${
              currentStep !== 'upload' ? 'w-full' : 'w-0'
            }`} />
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'preview' 
                ? 'bg-primary text-white' 
                : currentStep === 'results'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep === 'results' ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <div>
              <p className={`font-medium ${currentStep !== 'upload' ? 'text-gray-900' : 'text-gray-400'}`}>
                Validar
              </p>
              <p className="text-sm text-gray-500">Revisar datos</p>
            </div>
          </div>

          <div className="flex-1 h-1 mx-4 bg-gray-200 rounded">
            <div className={`h-full bg-primary rounded transition-all ${
              currentStep === 'results' ? 'w-full' : 'w-0'
            }`} />
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'results' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep === 'results' ? <CheckCircle className="w-5 h-5" /> : '3'}
            </div>
            <div>
              <p className={`font-medium ${currentStep === 'results' ? 'text-gray-900' : 'text-gray-400'}`}>
                Resultado
              </p>
              <p className="text-sm text-gray-500">Confirmación</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on step */}
      {currentStep === 'upload' && (
        <div className="space-y-8">
          {/* Section 1: Images */}
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">1. Subir Imágenes</h2>
                <p className="text-sm text-gray-500">Sube las imágenes de los productos primero</p>
              </div>
            </div>
            <ImageDropzone
              onImagesUploaded={handleImagesUploaded}
              uploadedImages={uploadedImages}
              onRemoveImage={handleRemoveImage}
            />
          </div>

          {/* Section 2: Excel */}
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">2. Subir Excel</h2>
                <p className="text-sm text-gray-500">Descarga la plantilla, complétala y súbela</p>
              </div>
            </div>
            <ExcelDropzone
              onFileSelected={handleFileSelected}
              onValidate={handleValidate}
              selectedFile={selectedFile}
              onClearFile={handleClearFile}
              isValidating={isValidating}
            />
          </div>
        </div>
      )}

      {currentStep === 'preview' && validationResult && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Vista Previa de Validación</h2>
          <ValidationPreview
            result={validationResult}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {currentStep === 'results' && uploadResult && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Resultado de la Carga</h2>
          <BulkUploadResults
            result={uploadResult}
            duplicatesSkipped={validationResult?.duplicates.length || 0}
            errorsInValidation={validationResult?.errors.length || 0}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  )
}
