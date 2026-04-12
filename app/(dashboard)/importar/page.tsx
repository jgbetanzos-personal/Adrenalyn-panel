import { ImportForm } from './import-form'

export default function ImportPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar colección</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pega una lista de números de cromos o sube un CSV para actualizar tu colección.
        </p>
      </div>
      <ImportForm />
    </div>
  )
}
