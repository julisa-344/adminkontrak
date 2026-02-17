import { notFound } from "next/navigation"
import { getCategoriaById } from "@/lib/actions/admin-categorias"
import { CategoriaForm } from "@/components/CategoriaForm"

interface EditarCategoriaPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarCategoriaPage({ params }: EditarCategoriaPageProps) {
  const { id } = await params
  const categoriaId = parseInt(id, 10)
  
  if (isNaN(categoriaId)) {
    notFound()
  }
  
  const categoria = await getCategoriaById(categoriaId)
  
  if (!categoria) {
    notFound()
  }

  return (
    <CategoriaForm 
      categoria={{
        id: categoria.id,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        activa: categoria.activa
      }}
      isEditing 
    />
  )
}
