import { notFound } from 'next/navigation'
import { getMarcaById } from '@/lib/actions/admin-marcas'
import { MarcaForm } from '@/components/MarcaForm'

interface EditarMarcaPageProps {
  params: {
    id: string
  }
}

export default async function EditarMarcaPage({ params }: EditarMarcaPageProps) {
  const id = parseInt(params.id)
  if (isNaN(id)) {
    notFound()
  }

  const marca = await getMarcaById(id)
  if (!marca) {
    notFound()
  }

  return <MarcaForm marca={marca} isEditing />
}