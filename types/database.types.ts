/**
 * Database Types
 *
 * Core database type definitions for the PMS application
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          created_at?: string
        }
      }
      usuarios_pms: {
        Row: {
          id: string
          nombre: string
          apellido: string
          email: string
          rol_id: string
          foto_perfil_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre: string
          apellido: string
          email: string
          rol_id: string
          foto_perfil_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          email?: string
          rol_id?: string
          foto_perfil_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
