export type DiaSemana =
    | 'LUNES'
    | 'MARTES'
    | 'MIERCOLES'
    | 'JUEVES'
    | 'VIERNES'
    | 'SABADO'
    | 'DOMINGO';

export type EstadoActividad = 'ACTIVO' | 'INACTIVO';

export interface Actividad {
    id: number;
    nombre: string;
    dias: DiaSemana[];
    hora_inicio: string; // Formato 'HH:MM' o 'HH:MM:SS'
    hora_fin: string;    // Formato 'HH:MM' o 'HH:MM:SS'
    instructor_id: number;
    estado: EstadoActividad;
}

export interface CrearActividadDTO {
    nombre: string;
    dias: DiaSemana[];
    hora_inicio: string;
    hora_fin: string;
    instructor_id: number;
    estado?: EstadoActividad;
}