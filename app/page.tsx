import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LandingLoginForm } from "@/components/landing-login-form";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { MedicoDashboard } from "@/app/home/components/medico-dashboard";
import { RecepcionistaDashboard } from "@/app/home/components/recepcionista-dashboard";
import { fetchMedicoDashboardData, fetchRecepcionistaDashboardData } from "@/app/home/actions";

export const dynamic = 'force-dynamic'

export default async function HomePage() {

  const supabase = await createClient();

  // Fetch clinic name for branding (works for both authenticated and anon users)
  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("nombre")
    .single();

  const clinicName = clinicInfo?.nombre || "Clínica Dermatológica";

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, show welcome page with sidebar
  if (user) {
    // Fetch user data from usuarios_pms table with role
    const { data: usuarioPms, error: userError } = await supabase
      .from("usuarios_pms")
      .select("nombre, apellido, email, foto_perfil_url, roles(nombre)")
      .eq("id", user.id)
      .single();

    if (userError || !usuarioPms) {
      // Log the error for debugging
      console.error("Error fetching user from usuarios_pms:", userError);
      console.error("User ID:", user.id);
      console.error("User email:", user.email);

      // If user doesn't exist in usuarios_pms, redirect to auth/login
      redirect("/auth/login");
    }

    // Construct full name
    const fullName = `${usuarioPms.nombre} ${usuarioPms.apellido}`;

    // Extract role name from the joined roles table
    // Note: roles is returned as an object (not array) due to single() foreign key relation
    const roles = usuarioPms.roles as unknown as { nombre: string } | null;
    const userRole = roles?.nombre || "Usuario";

    // Render role-specific dashboard content
    let dashboardContent: React.ReactNode;

    if (userRole === "Medico") {
      // Fetch médico dashboard data
      const { data: medicoDashboardData, error: dashboardError } = await fetchMedicoDashboardData(user.id);

      if (dashboardError || !medicoDashboardData) {
        dashboardContent = (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                Error al cargar el dashboard
              </h1>
              <p className="text-xl text-muted-foreground">
                {dashboardError || "No se pudo cargar la información del médico"}
              </p>
            </div>
          </div>
        );
      } else {
        dashboardContent = <MedicoDashboard data={medicoDashboardData} />;
      }
    } else if (userRole === "Recepcionista") {
      // Fetch recepcionista dashboard data (all médicos)
      const { data: recepcionistaDashboardData, error: dashboardError } = await fetchRecepcionistaDashboardData();

      if (dashboardError || !recepcionistaDashboardData) {
        dashboardContent = (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                Error al cargar el dashboard
              </h1>
              <p className="text-xl text-muted-foreground">
                {dashboardError || "No se pudo cargar la información del dashboard"}
              </p>
            </div>
          </div>
        );
      } else {
        dashboardContent = <RecepcionistaDashboard data={recepcionistaDashboardData} userName={usuarioPms.nombre} />;
      }
    } else {
      // Default dashboard for other roles (Administrador, etc.)
      dashboardContent = (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Bienvenido al Sistema de Gestión de Pacientes
            </h1>
            <p className="text-xl text-muted-foreground">
              Seleccione una opción del menú para comenzar
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          userName={fullName}
          userEmail={usuarioPms.email}
          userAvatar={usuarioPms.foto_perfil_url}
          userRole={userRole}
          clinicName={clinicName}
        />
        <main className="flex-1 overflow-y-auto">
          {dashboardContent}
        </main>
      </div>
    );
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
            {clinicName}
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground">
            Sistema de gestión de pacientes
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
