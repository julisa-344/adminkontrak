import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadBulkImages } from '@/lib/actions/admin-carga-masiva'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user || session.user.rol?.toUpperCase() !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const result = await uploadBulkImages(formData)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in bulk images upload:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
