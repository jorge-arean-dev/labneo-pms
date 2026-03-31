import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LandingLoginForm } from "@/components/landing-login-form";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export const dynamic = 'force-dynamic'

export default async function HomePage() {

  const supabase = await createClient();

  // Fetch lab name for branding (works for both authenticated and anon users)
  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("nombre")
    .single();

  const labName = clinicInfo?.nombre || "Portal Labneo";

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, redirect to their default landing page
  if (user) {
    // Fetch user role to determine redirect
    const { data: usuarioPms } = await supabase
      .from("usuarios_pms")
      .select("roles(nombre)")
      .eq("id", user.id)
      .single();

    const roles = usuarioPms?.roles as unknown as { nombre: string } | null;
    const userRole = roles?.nombre?.toLowerCase() || "";

    // Redirect based on role — no separate "Inicio" page
    switch (userRole) {
      case "odontologo":
        redirect("/solicitudes");
      case "tecnico":
        redirect("/fotogrametria");
      case "administracion":
        redirect("/solicitudes");
      default:
        redirect("/solicitudes");
    }
  }

  // If user is not authenticated, show landing page with login
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme Switcher - Fixed Top Right */}
      <div className="fixed top-3 right-4 md:top-4 md:right-6 z-50">
        <ThemeSwitcher />
      </div>

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16">
        {/* Header / Branding */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            {labName}
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground">
            Portal de gestión
          </p>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-sm md:max-w-md px-2">
          <LandingLoginForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-6 pt-4 px-4">
        <div className="max-w-md mx-auto">
          <Separator className="mb-4" />
          <p className="text-sm text-muted-foreground text-center">
            Desarrollado por{" "}
            <Link
              href="https://www.crececonnexa.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4 transition-colors"
            >
              Nexa
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
