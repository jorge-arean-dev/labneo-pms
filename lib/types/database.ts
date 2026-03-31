// Database type definitions for PMS
// Generated based on database schema

export interface ObraSocial {
  id: string;
  nombre: string;
  codigo: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  sitio_web: string | null;
  is_active: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Paciente {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  genero: 'M' | 'F' | 'Otro' | null;
  telefono: string | null;
  email: string | null;
  domicilio: string | null;
  obra_social_id: string | null;
  plan: string | null;
  numero_afiliado: string | null;
  foto_perfil_url: string | null;
  notas: string | null;
  is_active: boolean;
  consentimiento_datos: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Medico {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  matricula: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface MedicoObraSocial {
  id: string;
  medico_id: string;
  obra_social_id: string;
  porcentaje_cobertura: number | null;
  copago: number | null;
  requiere_autorizacion: boolean;
  numero_convenio: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Consulta {
  id: string;
  paciente_id: string;
  medico_id: string;
  fecha_hora: string;
  duracion_minutos: number;
  motivo: string | null;
  estado: 'programada' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada' | 'ausente';
  tipo_consulta: 'primera_vez' | 'control' | 'urgencia' | null;
  informe: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  receta: string | null;
  proxima_consulta: string | null;
  archivos_adjuntos: ArchivoAdjunto[];
  notas: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ArchivoAdjunto {
  url: string;
  nombre: string;
  tipo: string;
  fecha_subida: string;
}

export interface MedicoHorario {
  id: string;
  medico_id: string;
  dia_semana: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hora_inicio: string;
  hora_fin: string;
  duracion_consulta: number;
  duracion_buffer: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Insert types (without auto-generated fields)
export type ObraSocialInsert = Omit<ObraSocial, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type PacienteInsert = Omit<Paciente, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type MedicoInsert = Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type MedicoObraSocialInsert = Omit<MedicoObraSocial, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type ConsultaInsert = Omit<Consulta, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type MedicoHorarioInsert = Omit<MedicoHorario, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;

// Update types (all fields optional except id)
export type ObraSocialUpdate = Partial<Omit<ObraSocial, 'id' | 'created_at' | 'created_by'>> & { id: string };
export type PacienteUpdate = Partial<Omit<Paciente, 'id' | 'created_at' | 'created_by'>> & { id: string };
export type MedicoUpdate = Partial<Omit<Medico, 'id' | 'created_at' | 'created_by'>> & { id: string };
export type MedicoObraSocialUpdate = Partial<Omit<MedicoObraSocial, 'id' | 'created_at' | 'created_by'>> & { id: string };
export type ConsultaUpdate = Partial<Omit<Consulta, 'id' | 'created_at' | 'created_by'>> & { id: string };
export type MedicoHorarioUpdate = Partial<Omit<MedicoHorario, 'id' | 'created_at' | 'created_by'>> & { id: string };

// Database tables type map
export interface Database {
  public: {
    Tables: {
      obras_sociales: {
        Row: ObraSocial;
        Insert: ObraSocialInsert;
        Update: ObraSocialUpdate;
      };
      pacientes: {
        Row: Paciente;
        Insert: PacienteInsert;
        Update: PacienteUpdate;
      };
      medicos: {
        Row: Medico;
        Insert: MedicoInsert;
        Update: MedicoUpdate;
      };
      medicos_obras_sociales: {
        Row: MedicoObraSocial;
        Insert: MedicoObraSocialInsert;
        Update: MedicoObraSocialUpdate;
      };
      consultas: {
        Row: Consulta;
        Insert: ConsultaInsert;
        Update: ConsultaUpdate;
      };
      medicos_horarios: {
        Row: MedicoHorario;
        Insert: MedicoHorarioInsert;
        Update: MedicoHorarioUpdate;
      };
    };
  };
}

// Helper types for common operations
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type EstadoConsulta = 'programada' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada' | 'ausente';
export type TipoConsulta = 'primera_vez' | 'control' | 'urgencia';
export type Genero = 'M' | 'F' | 'Otro';
