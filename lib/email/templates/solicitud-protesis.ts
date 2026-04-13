/**
 * Email templates for prótesis solicitud processing flow
 *
 * - protesisFirstProcesadaEmail: credentials delivery (first-time admin action
 *   that registers the odontólogo in Vevi Dental).
 * - protesisSubsequentProcesadaEmail: confirmation on subsequent solicitudes
 *   for an odontólogo who is already registered.
 */

import { baseTemplate } from "./base"

interface FirstProcesadaParams {
  nombre: string
  apellido: string
  usuario: string
  password: string
  comentarios?: string | null
}

export function protesisFirstProcesadaEmail(params: FirstProcesadaParams): {
  subject: string
  html: string
} {
  const { nombre, apellido, usuario, password, comentarios } = params

  return {
    subject: "Solicitud procesada — Credenciales Vevi Dental",
    html: baseTemplate({
      title: "Solicitud procesada — Credenciales Vevi Dental",
      content: `
        <h2 style="color: #16a34a; margin-bottom: 16px;">Tu solicitud ha sido procesada</h2>
        <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
        <p>Tu solicitud de prótesis ha sido procesada y ya estás registrado en la plataforma <strong>Vevi Dental</strong>.</p>
        <p>A continuación encontrarás tus credenciales de acceso:</p>
        <table style="margin: 20px 0; border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 10px 16px; background-color: #f4f4f5; border: 1px solid #e4e4e7; font-weight: 600;">Usuario</td>
            <td style="padding: 10px 16px; border: 1px solid #e4e4e7;">${usuario}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; background-color: #f4f4f5; border: 1px solid #e4e4e7; font-weight: 600;">Contraseña</td>
            <td style="padding: 10px 16px; border: 1px solid #e4e4e7;">${password}</td>
          </tr>
        </table>
        <p style="margin-top: 16px;">También podés consultar tus credenciales en cualquier momento desde la sección <strong>Acceso Vevi</strong> dentro de la plataforma.</p>
        ${comentarios ? `<p style="margin-top: 16px;"><strong>Comentarios:</strong></p><p>${comentarios}</p>` : ""}
        <p style="margin-top: 24px; color: #71717a; font-size: 14px;">Si tenés alguna duda, no dudes en contactarnos.</p>
      `,
    }),
  }
}

interface SubsequentProcesadaParams {
  nombre: string
  apellido: string
}

export function protesisSubsequentProcesadaEmail(
  params: SubsequentProcesadaParams
): { subject: string; html: string } {
  const { nombre, apellido } = params

  return {
    subject: "Solicitud de prótesis procesada",
    html: baseTemplate({
      title: "Solicitud de prótesis procesada",
      content: `
        <h2 style="color: #16a34a; margin-bottom: 16px;">Tu solicitud ha sido procesada</h2>
        <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
        <p>Tu solicitud de prótesis ha sido procesada. Podés hacer seguimiento desde la plataforma Vevi.</p>
        <p style="margin-top: 24px; color: #71717a; font-size: 14px;">Si tenés alguna duda, no dudes en contactarnos.</p>
      `,
    }),
  }
}

interface CredencialesActualizadasParams {
  nombre: string
  apellido: string
  usuario: string
  password: string
  comentarios?: string | null
}

export function protesisCredencialesActualizadasEmail(
  params: CredencialesActualizadasParams
): { subject: string; html: string } {
  const { nombre, apellido, usuario, password, comentarios } = params

  return {
    subject: "Tus credenciales de Vevi Dental fueron actualizadas",
    html: baseTemplate({
      title: "Credenciales de Vevi Dental actualizadas",
      content: `
        <h2 style="color: #2563eb; margin-bottom: 16px;">Tus credenciales fueron actualizadas</h2>
        <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
        <p>Un administrador actualizó tus credenciales de acceso a <strong>Vevi Dental</strong>. Podés consultarlas en cualquier momento desde la sección <strong>Acceso Vevi</strong> dentro de la plataforma.</p>
        <p>Tus nuevas credenciales son:</p>
        <table style="margin: 20px 0; border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 10px 16px; background-color: #f4f4f5; border: 1px solid #e4e4e7; font-weight: 600;">Usuario</td>
            <td style="padding: 10px 16px; border: 1px solid #e4e4e7;">${usuario}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; background-color: #f4f4f5; border: 1px solid #e4e4e7; font-weight: 600;">Contraseña</td>
            <td style="padding: 10px 16px; border: 1px solid #e4e4e7;">${password}</td>
          </tr>
        </table>
        ${comentarios ? `<p style="margin-top: 16px;"><strong>Comentarios:</strong></p><p>${comentarios}</p>` : ""}
        <p style="margin-top: 24px; color: #71717a; font-size: 14px;">Si no esperabas este cambio, contactá con el administrador del laboratorio.</p>
      `,
    }),
  }
}
