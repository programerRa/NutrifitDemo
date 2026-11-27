import { pool } from '../db';
import type { UserSessionDTO } from '../types/auth.types';
import type {
    ActivityDTO,
    ActivityStatus,
    CreateActivityRequestDTO,
    DayOfWeek,
} from '../types/activity.types';

const VALID_DAYS: DayOfWeek[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
];

export class ActivityService {
    private ensureAdmin(currentUser: UserSessionDTO) {
        if (currentUser.role !== 'ADMINISTRADOR') {
            throw new Error('Acceso denegado: solo un ADMINISTRADOR puede gestionar actividades.');
        }
    }

    private validateTimeFormat(time: string) {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
            throw new Error(`Formato de hora inválido (${time}). Usá HH:MM (ej. 09:30).`);
        }
    }

    async hasScheduleOverlap(
        instructorId: number,
        days: DayOfWeek[],
        startTime: string,
        endTime: string,
        excludeActivityId?: number
    ): Promise<boolean> {
        const query = `
      SELECT 1
      FROM activities
      WHERE instructor_id = $1
        AND status = 'ACTIVO'
        AND days && $2::text[]
        AND start_time < $4::time
        AND end_time > $3::time
        AND ($5::int IS NULL OR id <> $5)
      LIMIT 1;
    `;

        const res = await pool.query(query, [
            instructorId,
            days,
            startTime,
            endTime,
            excludeActivityId ?? null,
        ]);

        return (res.rowCount ?? 0) > 0;
    }

    async create(
        currentUser: UserSessionDTO,
        dto: CreateActivityRequestDTO
    ): Promise<{ message: string; activity: ActivityDTO }> {
        this.ensureAdmin(currentUser);

        if (!dto.name || dto.name.trim().length === 0) {
            throw new Error('El nombre de la actividad es obligatorio.');
        }

        if (!dto.days || dto.days.length === 0) {
            throw new Error('Debés ingresar al menos un día válido.');
        }

        const normalizedDays = Array.from(
            new Set(dto.days.map((d) => d.trim().toUpperCase() as DayOfWeek))
        );

        for (const day of normalizedDays) {
            if (!VALID_DAYS.includes(day)) {
                throw new Error(`Día inválido: ${day}. Valores permitidos: ${VALID_DAYS.join(', ')}`);
            }
        }

        this.validateTimeFormat(dto.startTime);
        this.validateTimeFormat(dto.endTime);

        if (dto.startTime >= dto.endTime) {
            throw new Error('La hora de inicio debe ser estrictamente anterior a la hora de fin.');
        }

        const status: ActivityStatus = dto.status ?? 'ACTIVO';

        if (status === 'ACTIVO') {
            const overlap = await this.hasScheduleOverlap(
                dto.instructorId,
                normalizedDays,
                dto.startTime,
                dto.endTime
            );

            if (overlap) {
                throw new Error(
                    'Superposición horaria: el instructor ya tiene una actividad ACTIVA en ese día y franja horaria.'
                );
            }
        }

        const insertQuery = `
      INSERT INTO activities (name, days, start_time, end_time, instructor_id, status)
      VALUES ($1, $2::text[], $3::time, $4::time, $5, $6)
      RETURNING id, name, days, start_time::text, end_time::text, instructor_id, status;
    `;

        const res = await pool.query(insertQuery, [
            dto.name.trim(),
            normalizedDays,
            dto.startTime,
            dto.endTime,
            dto.instructorId,
            status,
        ]);

        const row = res.rows[0];
        return {
            message: 'Actividad creada correctamente.',
            activity: {
                id: row.id,
                name: row.name,
                days: row.days,
                startTime: row.start_time.slice(0, 5),
                endTime: row.end_time.slice(0, 5),
                instructorId: row.instructor_id,
                status: row.status,
            },
        };
    }

    async listAll(currentUser: UserSessionDTO): Promise<ActivityDTO[]> {
        this.ensureAdmin(currentUser);

        const query = `
      SELECT id, name, days, start_time::text, end_time::text, instructor_id, status
      FROM activities
      ORDER BY id ASC;
    `;
        const res = await pool.query(query);

        return res.rows.map((row) => ({
            id: row.id,
            name: row.name,
            days: row.days,
            startTime: row.start_time.slice(0, 5),
            endTime: row.end_time.slice(0, 5),
            instructorId: row.instructor_id,
            status: row.status,
        }));
    }
}