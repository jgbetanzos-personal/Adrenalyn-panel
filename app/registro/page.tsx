import { Suspense } from 'react'
import { RegisterForm } from './register-form'

export const dynamic = 'force-dynamic'

export default function RegistroPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
