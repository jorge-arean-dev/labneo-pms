"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Stepper } from "@/components/ui/stepper"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signUpOdontologo } from "@/app/auth/sign-up/actions"
import { SITUACIONES_IVA } from "@/lib/types/entities"

const signUpSchema = z
  .object({
    // Step 1
    nombre: z.string().min(1, "El nombre es requerido"),
    apellido: z.string().min(1, "El apellido es requerido"),
    email: z.string().email("Ingresá un email válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    repeatPassword: z.string().min(1, "Repetí tu contraseña"),
    // Step 2
    telefono: z.string().min(1, "El teléfono es requerido"),
    localidad_id: z.string().min(1, "La localidad es requerida"),
    cuit: z.string().min(1, "El CUIT es requerido"),
    situacion_iva: z.string().min(1, "La situación frente al IVA es requerida"),
    direccion_consultorio: z.string().min(1, "La dirección del consultorio es requerida"),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Las contraseñas no coinciden",
    path: ["repeatPassword"],
  })

type SignUpFormValues = z.infer<typeof signUpSchema>

const STEP_1_FIELDS = ["nombre", "apellido", "email", "password", "repeatPassword"] as const
type Step1Field = (typeof STEP_1_FIELDS)[number]

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  localidades: { id: string; nombre_display: string }[]
}

export function SignUpForm({ className, localidades, ...props }: SignUpFormProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      password: "",
      repeatPassword: "",
      telefono: "",
      localidad_id: "",
      cuit: "",
      situacion_iva: "",
      direccion_consultorio: "",
    },
    mode: "onTouched",
  })

  const {
    register,
    trigger,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form

  const handleNextStep = async () => {
    const isValid = await trigger(STEP_1_FIELDS as unknown as Step1Field[])
    if (isValid) {
      setServerError(null)
      setCurrentStep(2)
    }
  }

  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, "")
    setValue("cuit", numericOnly, { shouldValidate: true })
  }

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true)
    setServerError(null)

    const result = await signUpOdontologo({
      nombre: values.nombre,
      apellido: values.apellido,
      email: values.email,
      password: values.password,
      telefono: values.telefono,
      localidad_id: values.localidad_id,
      cuit: values.cuit,
      situacion_iva: values.situacion_iva,
      direccion_consultorio: values.direccion_consultorio,
    })

    if (result.error) {
      setServerError(result.error)
      setIsLoading(false)
      return
    }

    router.push("/auth/sign-up-success")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <Stepper totalSteps={2} currentStep={currentStep} className="mb-4" />
          <CardTitle className="text-2xl">
            {currentStep === 1 ? "Crear cuenta" : "Datos profesionales"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1
              ? "Paso 1 de 2 — Datos de la cuenta"
              : "Paso 2 de 2 — Información del consultorio"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ==================== STEP 1 ==================== */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Juan"
                      autoComplete="given-name"
                      {...register("nombre")}
                    />
                    {errors.nombre && (
                      <p className="text-sm text-destructive">{errors.nombre.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      type="text"
                      placeholder="Pérez"
                      autoComplete="family-name"
                      {...register("apellido")}
                    />
                    {errors.apellido && (
                      <p className="text-sm text-destructive">{errors.apellido.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan@consultorio.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Repetir contraseña</Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    placeholder="Repetí tu contraseña"
                    autoComplete="new-password"
                    {...register("repeatPassword")}
                  />
                  {errors.repeatPassword && (
                    <p className="text-sm text-destructive">{errors.repeatPassword.message}</p>
                  )}
                </div>
                <Button type="button" className="w-full" onClick={handleNextStep}>
                  Siguiente
                </Button>
              </div>
            )}

            {/* ==================== STEP 2 ==================== */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    inputMode="tel"
                    placeholder="1123456789"
                    {...register("telefono")}
                  />
                  {errors.telefono && (
                    <p className="text-sm text-destructive">{errors.telefono.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="localidad_id">Localidad</Label>
                  <Select
                    value={watch("localidad_id")}
                    onValueChange={(value) => setValue("localidad_id", value, { shouldValidate: true })}
                  >
                    <SelectTrigger id="localidad_id">
                      <SelectValue placeholder="Seleccioná tu localidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {localidades.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.nombre_display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.localidad_id && (
                    <p className="text-sm text-destructive">{errors.localidad_id.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cuit">CUIT</Label>
                  <Input
                    id="cuit"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="20121231233"
                    value={watch("cuit")}
                    onChange={handleCuitChange}
                  />
                  {errors.cuit && (
                    <p className="text-sm text-destructive">{errors.cuit.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="situacion_iva">Situación frente al IVA</Label>
                  <Select
                    value={watch("situacion_iva")}
                    onValueChange={(value) => setValue("situacion_iva", value, { shouldValidate: true })}
                  >
                    <SelectTrigger id="situacion_iva">
                      <SelectValue placeholder="Seleccioná tu situación" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITUACIONES_IVA.map((sit) => (
                        <SelectItem key={sit} value={sit}>
                          {sit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.situacion_iva && (
                    <p className="text-sm text-destructive">{errors.situacion_iva.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="direccion_consultorio">Dirección del consultorio</Label>
                  <Input
                    id="direccion_consultorio"
                    type="text"
                    placeholder="Av. Corrientes 1234, CABA"
                    {...register("direccion_consultorio")}
                  />
                  {errors.direccion_consultorio && (
                    <p className="text-sm text-destructive">{errors.direccion_consultorio.message}</p>
                  )}
                </div>
                {serverError && <p className="text-sm text-destructive">{serverError}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={isLoading}
                  >
                    Volver
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creando cuenta..." : "Crear cuenta"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 text-center text-sm">
              ¿Ya tenés cuenta?{" "}
              <Link href="/" className="text-primary hover:underline underline-offset-4">
                Iniciar sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
