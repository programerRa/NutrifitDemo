export type DayOfWeek =
    | 'LUNES'
    | 'MARTES'
    | 'MIERCOLES'
    | 'JUEVES'
    | 'VIERNES'
    | 'SABADO'
    | 'DOMINGO';

export type ActivityStatus = 'ACTIVO' | 'INACTIVO';

export interface ActivityDTO {
    id: number;
    name: string;
    days: DayOfWeek[];
    startTime: string;
    endTime: string;
    instructorId: number;
    instructorName?: string;
    status: ActivityStatus;
}

export interface CreateActivityRequestDTO {
    name: string;
    days: DayOfWeek[];
    startTime: string;
    endTime: string;
    instructorId: number;
    status?: ActivityStatus;
}