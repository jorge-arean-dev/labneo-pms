import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3">Aqui estan las preguntas frecuentes</h1>
        <p className="text-muted-foreground text-lg">
          Encuentra respuestas a las preguntas más comunes sobre nuestro Sistema de Gestión de Pacientes
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="item-1" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Qué es el Sistema de Gestión de Pacientes (PMS)?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Es una plataforma web diseñada para clínicas dermatológicas que permite digitalizar registros de pacientes,
            gestionar citas médicas y documentar consultas de manera eficiente y segura.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Quiénes pueden usar el sistema?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            El sistema cuenta con tres roles de usuario: Recepcionistas (para gestión de pacientes y citas),
            Médicos (para consultas y historiales médicos) y Administradores (para configuración del sistema y gestión de usuarios).
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Cómo funciona el agendamiento de citas?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            El sistema permite agendar citas seleccionando paciente, médico, fecha y hora. Valida automáticamente
            la disponibilidad del médico según sus horarios configurados y detecta conflictos con otras citas existentes.
            La duración predeterminada es de 30 minutos.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Qué información se almacena de cada paciente?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Se registra DNI, nombre, apellido, fecha de nacimiento, obra social, información de contacto (teléfono, email, dirección)
            y otros datos relevantes para la atención médica. El DNI debe ser único en el sistema.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Los médicos pueden ver el historial completo de los pacientes?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Sí, los médicos y administradores tienen acceso al historial médico completo, incluyendo todas las consultas previas,
            diagnósticos, tratamientos y archivos adjuntos. Los recepcionistas no tienen acceso a esta información confidencial.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Cómo se manejan las fotos dermatológicas?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Los médicos pueden cargar fotos y documentos durante las consultas. Estos archivos se almacenan de forma segura
            y quedan vinculados al registro de la consulta correspondiente para futuras referencias.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-7" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Qué estados puede tener una cita?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Las citas pueden estar en los siguientes estados: Programada (recién creada), Confirmada (paciente confirmó asistencia),
            En Curso (médico atendiendo), Completada (consulta finalizada), Cancelada o Ausente (paciente no asistió).
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-8" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Cómo se configuran los horarios de los médicos?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Los administradores pueden definir horarios semanales recurrentes para cada médico, especificando días de la semana
            y franjas horarias. Se pueden configurar múltiples bloques horarios por día (por ejemplo, turnos de mañana y tarde).
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-9" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿El sistema maneja obras sociales?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Sí, se pueden registrar diferentes obras sociales (proveedores de seguros médicos) y configurar las relaciones
            entre médicos y obras sociales, incluyendo términos de cobertura, copagos y requisitos de autorización.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-10" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Es seguro el sistema?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Sí, el sistema implementa seguridad a nivel de base de datos (Row Level Security), control de acceso basado en roles,
            y todas las comunicaciones están encriptadas. Solo los usuarios autorizados pueden acceder a información médica confidencial.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-11" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Puedo buscar pacientes rápidamente?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Sí, el sistema permite búsquedas rápidas (menos de 1 segundo) por DNI, nombre, apellido o teléfono para
            encontrar pacientes de manera eficiente.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-12" className="border rounded-lg px-6">
          <AccordionTrigger className="text-left">
            ¿Puedo reagendar o cancelar citas?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Sí, las citas pueden ser reagendadas cambiando la fecha/hora, o canceladas actualizando su estado.
            El sistema validará nuevamente la disponibilidad del médico al reagendar.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-12 p-6 bg-muted rounded-lg text-center">
        <h2 className="text-xl font-semibold mb-2">¿Necesitas más ayuda?</h2>
        <p className="text-muted-foreground">
          Si tienes otras preguntas que no están listadas aquí, por favor contacta al administrador del sistema.
        </p>
      </div>
    </div>
  )
}
