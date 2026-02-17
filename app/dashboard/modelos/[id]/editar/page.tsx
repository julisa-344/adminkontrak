import { notFound } from 'next/navigation'
import { getModeloById } from '@/lib/actions/admin-modelos'
import { ModeloForm } from '@/components/ModeloForm'

interface EditarModeloPageProps {
  params: {
    id: string
  }
}

export default async function EditarModeloPage({ params }: EditarModeloPageProps) {
  const id = parseInt(params.id)
  if (isNaN(id)) {
    notFound()
  }

  const modelo = await getModeloById(id)
  if (!modelo) {
    notFound()
  }

  return <ModeloForm modelo={modelo} isEditing />
}
