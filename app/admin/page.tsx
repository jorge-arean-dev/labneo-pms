import { fetchEmailConfig, fetchClinicInfo, fetchEmailTemplates } from "./actions"
import { AdminPage } from "./components/admin-page"

export default async function AdminPageServer() {
  // Fetch all configs in parallel
  const [emailResult, clinicResult, templatesResult] = await Promise.all([
    fetchEmailConfig(),
    fetchClinicInfo(),
    fetchEmailTemplates(),
  ])

  if (emailResult.error || clinicResult.error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h2 className="font-semibold text-destructive">Error</h2>
          <p className="text-sm text-destructive/80">
            No se pudo cargar la configuración:{" "}
            {emailResult.error || clinicResult.error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AdminPage
      emailConfig={emailResult.data}
      clinicInfo={clinicResult.data}
      emailTemplates={templatesResult.data}
    />
  )
}
