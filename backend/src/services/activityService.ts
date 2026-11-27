import { pool } from '../db'; // Ajusta el nombre si exportas 'db' o 'client' en db.ts
import { Actividad, CrearActividadDTO } from '../types/actividad';

export class ActividadService {
    /**
     * Verifica si existe superposición horaria para un instructor en los días dados.
     * Si se pasa actividadIdExcluir, ignora ese registro (útil al editar).
     */
    async verificarSuperposicion(
        instructorId: number,
        dias: string[],
        horaInicio: string,
        horaFin: string,
        actividadIdExcluir?: number
    ): Promise<boolean> {
        const query = `
      SELECT 1
      FROM actividades
      WHERE instructor_id = $1
        AND estado = 'ACTIVO'
        AND dias && $2::text[]
        AND hora_inicio < $4::time
        AND hora_fin > $3::time
        AND ($5::int IS NULL OR id <> $5)
      LIMIT 1;
    `;

        const values = [
            instructorId,
            dias,
            horaInicio,
            horaFin,
            actividadIdExcluir ?? null,
        ];

        const result = await pool.query(query, values);
        return (result.rowCount ?? 0) > 0;
    }

    async crearActividad(data: CrearActividadDTO): Promise<Actividad> {
        if (!data.dias || data.dias.length === 0) {
            throw new Error('Debe especificar al menos un día para la actividad.');
        }

        if (data.hora_inicio >= data.hora_fin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin.');
        }

        const estadoFinal = data.estado ?? 'ACTIVO';

        // Solo validamos conflicto horario si la actividad estará ACTIVA
        if (estadoFinal === 'ACTIVO') {
            const hayConflicto = await this.verificarSuperposicion(
                data.instructor_id,
                data.dias,
                data.hora_inicio,
                data.hora_fin
            );

            if (hayConflicto) {
                throw new Error(
                    'Conflicto horario: el instructor ya tiene una actividad activa en ese día y franja horaria.'
                );
            }
        }

        const insertQuery = `
      INSERT INTO actividades (nombre, dias, hora_inicio, hora_fin, instructor_id, estado)
      VALUES ($1, $2::text[], $3::time, $4::time, $5, $6)
      RETURNING *;
    `;

        const result = await pool.query(insertQuery, [
            data.nombre.trim(),
            data.dias,
            data.hora_inicio,
            data.hora_fin,
            data.instructor_id,
            estadoFinal,
        ]);

        return result.rows[0];
    }
}