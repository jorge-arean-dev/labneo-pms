import { SignUpForm } from "@/components/sign-up-form"
import { fetchLocalidadesForSignup } from "./actions"

export const dynamic = "force-dynamic"

export default async function Page() {
  const { data: localidades } = await fetchLocalidadesForSignup()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <SignUpForm localidades={localidades ?? []} />
      </div>
    </div>
  )
}
