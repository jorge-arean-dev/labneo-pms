import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Acerca del Sistema</h1>
          <p className="text-muted-foreground text-lg">
            Sistema de Gestion de Pacientes para Clinica Dermatologica
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stack Tecnologico</CardTitle>
            <CardDescription>
              Tecnologias modernas para una aplicacion web segura y escalable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Frontend
              </h3>
              <div className="grid gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Next.js 14+</Badge>
                    <span className="text-sm text-muted-foreground">Framework React</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Framework de React con App Router, Server Components, y Server Actions para renderizado optimizado y mejor rendimiento
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">React 18+</Badge>
                    <span className="text-sm text-muted-foreground">Biblioteca UI</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Biblioteca de JavaScript para construir interfaces de usuario interactivas y componentes reutilizables
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">TypeScript</Badge>
                    <span className="text-sm text-muted-foreground">Lenguaje</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Superset de JavaScript con tipado estatico para mayor seguridad y mejor experiencia de desarrollo
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Tailwind CSS</Badge>
                    <span className="text-sm text-muted-foreground">Estilos</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Framework CSS utility-first para diseno responsive y consistente
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Shadcn UI + Radix</Badge>
                    <span className="text-sm text-muted-foreground">Componentes</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Coleccion de componentes UI accesibles y personalizables construidos sobre Radix primitives
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Backend y Base de Datos
              </h3>
              <div className="grid gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Supabase</Badge>
                    <span className="text-sm text-muted-foreground">Backend as a Service</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plataforma completa que incluye base de datos PostgreSQL, autenticacion, storage, y APIs en tiempo real
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">PostgreSQL</Badge>
                    <span className="text-sm text-muted-foreground">Base de Datos</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sistema de gestion de bases de datos relacional robusto con soporte completo para transacciones ACID
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Row Level Security</Badge>
                    <span className="text-sm text-muted-foreground">Seguridad</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Politicas de seguridad a nivel de fila para control de acceso basado en roles
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Hosting y Deployment
              </h3>
              <div className="grid gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Vercel</Badge>
                    <span className="text-sm text-muted-foreground">Plataforma</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plataforma de hosting optimizada para Next.js con deployments automaticos, edge network global, y Web Application Firewall (WAF)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Herramientas de Desarrollo
              </h3>
              <div className="grid gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">pnpm</Badge>
                    <span className="text-sm text-muted-foreground">Package Manager</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gestor de paquetes rapido y eficiente que ahorra espacio en disco
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">ESLint + Prettier</Badge>
                    <span className="text-sm text-muted-foreground">Code Quality</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Herramientas para mantener codigo limpio, consistente y libre de errores
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Zod</Badge>
                    <span className="text-sm text-muted-foreground">Validacion</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Biblioteca de validacion de esquemas TypeScript-first para formularios y APIs
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caracteristicas Principales</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span><strong>Gestion de Pacientes:</strong> Registro, busqueda y edicion de informacion demografica y clinica</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span><strong>Programacion de Citas:</strong> Sistema de agendamiento con deteccion de conflictos y validacion de disponibilidad medica</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span><strong>Historias Clinicas:</strong> Documentacion completa de consultas con diagnosticos, tratamientos y archivos adjuntos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span><strong>Control de Acceso Basado en Roles:</strong> Permisos diferenciados para Recepcionistas, Medicos y Administradores</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span><strong>Gestion de Horarios:</strong> Configuracion de disponibilidad semanal para cada medico</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span><strong>Gestion de Obras Sociales:</strong> Administracion de seguros medicos y relaciones con medicos</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong>Version:</strong> 1.1<br />
              <strong>Ultima actualizacion:</strong> 2025
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
