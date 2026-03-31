"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer"
import { PacienteWithObraSocial, ConsultaWithRelations } from "@/lib/types/entities"

// Register a font for better Spanish character support (optional, uses default otherwise)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
})

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 500,
    color: "#374151",
    marginTop: 6,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  generationDate: {
    fontSize: 9,
    color: "#64748b",
  },
  // Title
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#0f172a",
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    color: "#1e293b",
  },
  // Patient Info Grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    marginBottom: 8,
  },
  infoItemFull: {
    width: "100%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 10,
    color: "#0f172a",
  },
  // Consulta Card
  consultaCard: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#fafafa",
  },
  consultaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  consultaHeaderLeft: {
    flex: 1,
  },
  consultaDateTime: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  consultaMedico: {
    fontSize: 10,
    color: "#475569",
  },
  // Estado Badge
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 8,
    fontWeight: "bold",
  },
  // Consulta Body
  consultaBody: {
    marginTop: 8,
  },
  consultaField: {
    marginBottom: 6,
  },
  consultaFieldLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 2,
  },
  consultaFieldValue: {
    fontSize: 9,
    color: "#1e293b",
    lineHeight: 1.4,
  },
  // Empty State
  emptyState: {
    padding: 20,
    textAlign: "center",
    color: "#64748b",
    fontStyle: "italic",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  pageNumber: {
    fontSize: 8,
    color: "#94a3b8",
  },
})

// Estado colors for PDF (simplified RGB values)
const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  programada: { bg: "#DBEAFE", text: "#1E40AF" },
  en_curso: { bg: "#FEF3C7", text: "#A16207" },
  completada: { bg: "#D1FAE5", text: "#047857" },
  cancelada: { bg: "#FEE2E2", text: "#B91C1C" },
  ausente: { bg: "#F3F4F6", text: "#374151" },
}

// Tipo consulta labels
const TIPO_CONSULTA_LABELS: Record<string, string> = {
  primera_vez: "Primera vez",
  control: "Control",
  urgencia: "Urgencia",
}

// Gender labels
const GENERO_LABELS: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  Otro: "Otro",
}

interface HistoriaClinicaPDFProps {
  paciente: PacienteWithObraSocial
  consultas: ConsultaWithRelations[]
  logoUrl: string | null
  clinicName: string
  generationDate: string
}

// Helper to format date for PDF (long Spanish format)
function formatDateLongPDF(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  const date = new Date(dateString)
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Helper to format date-time for PDF (long Spanish format with time)
function formatDateTimeLongPDF(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  const date = new Date(dateString)
  const formatted = date.toLocaleString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  return formatted.replace(/a\.\s*m\./gi, "am").replace(/p\.\s*m\./gi, "pm")
}

// Calculate age from birth date
function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

export function HistoriaClinicaPDF({
  paciente,
  consultas,
  logoUrl,
  clinicName,
  generationDate,
}: HistoriaClinicaPDFProps) {
  const formattedGenerationDate = formatDateLongPDF(generationDate)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>Logo no{"\n"}disponible</Text>
              </View>
            )}
            <Text style={styles.clinicName}>{clinicName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.generationDate}>Fecha de generación:</Text>
            <Text style={styles.generationDate}>{formattedGenerationDate}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>HISTORIA CLÍNICA</Text>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN DEL PACIENTE</Text>
          <View style={styles.infoGrid}>
            {/* Personal Info */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nombre completo</Text>
              <Text style={styles.infoValue}>
                {paciente.nombre} {paciente.apellido}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DNI</Text>
              <Text style={styles.infoValue}>{paciente.dni}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha de nacimiento</Text>
              <Text style={styles.infoValue}>
                {formatDateLongPDF(paciente.fecha_nacimiento)} ({calculateAge(paciente.fecha_nacimiento)} años)
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Género</Text>
              <Text style={styles.infoValue}>
                {paciente.genero ? GENERO_LABELS[paciente.genero] : "—"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Estado</Text>
              <Text style={styles.infoValue}>
                {paciente.is_active ? "Activo" : "Inactivo"}
              </Text>
            </View>

            {/* Contact Info */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{paciente.telefono || "—"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{paciente.email || "—"}</Text>
            </View>
            <View style={styles.infoItemFull}>
              <Text style={styles.infoLabel}>Domicilio</Text>
              <Text style={styles.infoValue}>{paciente.domicilio || "—"}</Text>
            </View>

            {/* Insurance Info */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Obra Social</Text>
              <Text style={styles.infoValue}>
                {paciente.obra_social?.nombre || "—"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Plan</Text>
              <Text style={styles.infoValue}>{paciente.plan || "—"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Número de afiliado</Text>
              <Text style={styles.infoValue}>{paciente.numero_afiliado || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Consultas Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            HISTORIAL DE CONSULTAS ({consultas.length})
          </Text>

          {consultas.length === 0 ? (
            <Text style={styles.emptyState}>
              Sin historial de consultas registrado al {formattedGenerationDate}.
            </Text>
          ) : (
            consultas.map((consulta) => {
              const estadoColors = ESTADO_COLORS[consulta.estado.codigo] || ESTADO_COLORS.programada

              return (
                <View key={consulta.id} style={styles.consultaCard} wrap={false}>
                  {/* Consulta Header */}
                  <View style={styles.consultaHeader}>
                    <View style={styles.consultaHeaderLeft}>
                      <Text style={styles.consultaDateTime}>
                        {formatDateTimeLongPDF(consulta.fecha_hora)}
                      </Text>
                      <Text style={styles.consultaMedico}>
                        Médico: {consulta.medico.nombre} {consulta.medico.apellido}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.estadoBadge,
                        { backgroundColor: estadoColors.bg },
                      ]}
                    >
                      <Text style={[styles.estadoText, { color: estadoColors.text }]}>
                        {consulta.estado.nombre}
                      </Text>
                    </View>
                  </View>

                  {/* Consulta Body */}
                  <View style={styles.consultaBody}>
                    {/* Tipo */}
                    {consulta.tipo_consulta && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Tipo de consulta</Text>
                        <Text style={styles.consultaFieldValue}>
                          {TIPO_CONSULTA_LABELS[consulta.tipo_consulta] || consulta.tipo_consulta}
                        </Text>
                      </View>
                    )}

                    {/* Motivo */}
                    {consulta.motivo && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Motivo</Text>
                        <Text style={styles.consultaFieldValue}>{consulta.motivo}</Text>
                      </View>
                    )}

                    {/* Diagnóstico */}
                    {consulta.diagnostico && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Diagnóstico</Text>
                        <Text style={styles.consultaFieldValue}>{consulta.diagnostico}</Text>
                      </View>
                    )}

                    {/* Informe */}
                    {consulta.informe && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Informe</Text>
                        <Text style={styles.consultaFieldValue}>{consulta.informe}</Text>
                      </View>
                    )}

                    {/* Tratamiento */}
                    {consulta.tratamiento && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Tratamiento</Text>
                        <Text style={styles.consultaFieldValue}>{consulta.tratamiento}</Text>
                      </View>
                    )}

                    {/* Receta */}
                    {consulta.receta && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Receta</Text>
                        <Text style={styles.consultaFieldValue}>{consulta.receta}</Text>
                      </View>
                    )}

                    {/* Notas */}
                    {consulta.notas && (
                      <View style={styles.consultaField}>
                        <Text style={styles.consultaFieldLabel}>Notas</Text>
                        <Text style={styles.consultaFieldValue}>{consulta.notas}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Documento generado el {formattedGenerationDate}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
