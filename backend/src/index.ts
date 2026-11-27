import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { RegisterAuthService } from './services/register.auth.service';
import { LoginAuthService } from './services/login.auth.service';
import { pool } from './db';
import type { RegisterRequestDTO, UserSessionDTO } from './types/auth.types';
import { CreateAvailabilityService } from './services/create.availability.service';
import { UpdateAvailabilityService } from './services/update.availability.service';
import { ListAvailabilityService } from './services/list.availability.service';
import type { AvailabilityDTO } from './types/availability.types';
import { ListAssignmentService } from './services/list.assignment.service';
import { UpdateAssignmentService } from './services/update.assignment.service';
import type { ClientRosterItemDTO } from './types/assignment.types';
import { ActivityService } from './services/activity.service';
import type { DayOfWeek, ActivityStatus } from './types/activity.types';

async function promptAdminRegister(
  rl: readline.Interface,
  registerService: RegisterAuthService,
  currentUser: UserSessionDTO
) {
  console.log('\n=== ALTA DE USUARIO (PANEL ADMINISTRADOR) ===');
  console.log('¿Qué rol tendrá el nuevo usuario?');
  console.log('1. CLIENTE');
  console.log('2. NUTRICIONISTA');
  console.log('3. INSTRUCTOR');
  console.log('4. ADMINISTRADOR');
  const roleOption = (await rl.question('Elegí el rol a registrar (1-4): ')).trim();

  if (!['1', '2', '3', '4'].includes(roleOption)) {
    throw new Error('Opción de rol inválida.');
  }

  const name = (await rl.question('Nombre: ')).trim();
  const lastname = (await rl.question('Apellido: ')).trim();
  const dni = (await rl.question('DNI: ')).trim();
  const phoneNumber = (await rl.question('Teléfono: ')).trim();
  const birthdate = (await rl.question('Fecha de nacimiento (YYYY-MM-DD): ')).trim();
  const email = (await rl.question('Email: ')).trim();
  const password = (await rl.question('Contraseña (mín. 6 caracteres): ')).trim();

  let dto: RegisterRequestDTO;

  if (roleOption === '1') {
    const heightStr = (await rl.question('Altura en cm (opcional, Enter para omitir): ')).trim();
    const mainGoal = (await rl.question('Objetivo principal (opcional): ')).trim();
    const medicalConditions = (await rl.question('Condiciones médicas (opcional): ')).trim();

    dto = {
      role: 'CLIENTE',
      name,
      lastname,
      dni,
      phoneNumber,
      birthdate,
      email,
      password,
      heightCm: heightStr ? Number(heightStr) : undefined,
      mainGoal: mainGoal || undefined,
      medicalConditions: medicalConditions || undefined,
    };
  } else if (roleOption === '2') {
    const residentialArea = (await rl.question('Zona de atención: ')).trim();
    const professionalTitle = (await rl.question('Título profesional: ')).trim();
    const professionalLicense = (await rl.question('Matrícula profesional: ')).trim();

    dto = {
      role: 'NUTRICIONISTA',
      name,
      lastname,
      dni,
      phoneNumber,
      birthdate,
      email,
      password,
      residentialArea,
      professionalTitle,
      professionalLicense,
    };
  } else if (roleOption === '3') {
    const residentialArea = (await rl.question('Zona de atención: ')).trim();
    const trainingTitle = (await rl.question('Título / Certificación: ')).trim();
    const registrationNumber = (await rl.question('Número de registro (opcional): ')).trim();

    dto = {
      role: 'INSTRUCTOR',
      name,
      lastname,
      dni,
      phoneNumber,
      birthdate,
      email,
      password,
      residentialArea,
      trainingTitle,
      registrationNumber: registrationNumber || undefined,
    };
  } else {
    dto = {
      role: 'ADMINISTRADOR',
      name,
      lastname,
      dni,
      phoneNumber,
      birthdate,
      email,
      password,
    };
  }

  const res = await registerService.register(currentUser, dto);
  console.log('\n✅', res.message, `(ID: ${res.userId} | Rol: ${res.role})`);
}

async function selectProfessional(
  rl: readline.Interface,
  listService: ListAvailabilityService,
  currentUser: UserSessionDTO
): Promise<number> {
  const professionals = await listService.listProfessionals(currentUser);
  if (professionals.length === 0) {
    throw new Error('No hay profesionales activos registrados.');
  }

  console.log('\nProfesionales:');
  professionals.forEach((p) =>
    console.log(`  [${p.userId}] ${p.name} ${p.lastname} (${p.role})`)
  );

  const userId = Number((await rl.question('ID del profesional: ')).trim());
  if (!Number.isInteger(userId) || !professionals.some((p) => p.userId === userId)) {
    throw new Error('ID de profesional inválido.');
  }
  return userId;
}

function printAvailability(blocks: AvailabilityDTO[]) {
  if (blocks.length === 0) {
    console.log('  (sin franjas cargadas)');
    return;
  }
  blocks.forEach((b) =>
    console.log(`  [${b.id}] ${b.dayOfWeek}: ${b.startTime} - ${b.endTime}`)
  );
}

async function promptAdminAvailability(
  rl: readline.Interface,
  createService: CreateAvailabilityService,
  updateService: UpdateAvailabilityService,
  listService: ListAvailabilityService,
  currentUser: UserSessionDTO
) {
  console.log('\n=== DISPONIBILIDAD HORARIA (PANEL ADMINISTRADOR) ===');
  console.log('1. Ver franjas de un profesional');
  console.log('2. Crear franja');
  console.log('3. Editar franja');
  const option = (await rl.question('Elegí una opción (1-3): ')).trim();

  if (!['1', '2', '3'].includes(option)) {
    throw new Error('Opción inválida.');
  }

  const userId = await selectProfessional(rl, listService, currentUser);

  if (option === '1') {
    const blocks = await listService.listByProfessional(currentUser, userId);
    console.log('\nFranjas del profesional:');
    printAvailability(blocks);
  } else if (option === '2') {
    const dayOfWeek = (await rl.question('Día (LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO): ')).trim();
    const startTime = (await rl.question('Hora de inicio (HH:MM): ')).trim();
    const endTime = (await rl.question('Hora de fin (HH:MM): ')).trim();

    const res = await createService.create(currentUser, {
      userId,
      dayOfWeek,
      startTime,
      endTime,
    });
    const a = res.availability;
    console.log('\n✅', res.message, `(ID: ${a.id} | ${a.dayOfWeek} ${a.startTime}-${a.endTime})`);
  } else {
    const blocks = await listService.listByProfessional(currentUser, userId);
    console.log('\nFranjas del profesional:');
    printAvailability(blocks);

    if (blocks.length === 0) {
      return;
    }

    const availabilityId = Number((await rl.question('ID de la franja a editar: ')).trim());
    if (!blocks.some((b) => b.id === availabilityId)) {
      throw new Error('ID de franja inválido.');
    }

    const dayOfWeek = (await rl.question('Nuevo día (Enter para mantener): ')).trim();
    const startTime = (await rl.question('Nueva hora de inicio HH:MM (Enter para mantener): ')).trim();
    const endTime = (await rl.question('Nueva hora de fin HH:MM (Enter para mantener): ')).trim();

    const res = await updateService.update(currentUser, {
      availabilityId,
      dayOfWeek: dayOfWeek || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });
    const a = res.availability;
    console.log('\n✅', res.message, `(ID: ${a.id} | ${a.dayOfWeek} ${a.startTime}-${a.endTime})`);
  }
}

function printClientsRoster(clients: ClientRosterItemDTO[]) {
  if (clients.length === 0) {
    console.log('  (no hay clientes activos registrados)');
    return;
  }

  clients.forEach((c) => {
    const nutLabel = c.nutritionistName
      ? `${c.nutritionistName} (ID:${c.nutritionistId})`
      : 'Sin asignar';
    const instLabel = c.instructorName
      ? `${c.instructorName} (ID:${c.instructorId})`
      : 'Sin asignar';

    let badge = '❌ SIN ASIGNAR';
    if (c.nutritionistId && c.instructorId) {
      badge = '✅ COMPLETO';
    } else if (c.nutritionistId) {
      badge = '🥗 SOLO NUTRICIONISTA';
    } else if (c.instructorId) {
      badge = '🏃 SOLO INSTRUCTOR';
    }

    console.log(
      `  [Cliente ID: ${c.clientId}] ${c.name} ${c.lastname} (DNI: ${c.dni}) | Estado: ${badge}\n` +
      `      Nutricionista: ${nutLabel} | Instructor: ${instLabel}`
    );
  });
}

async function promptAdminAssignments(
  rl: readline.Interface,
  listAssignmentService: ListAssignmentService,
  updateAssignmentService: UpdateAssignmentService,
  currentUser: UserSessionDTO
) {
  console.log('\n=== ASIGNACIÓN DE NUTRICIONISTA E INSTRUCTOR ===');
  console.log('1. Ver padrón de clientes y estado de asignación');
  console.log('2. Asignar / Modificar / Desvincular profesionales de un cliente');
  const option = (await rl.question('Elegí una opción (1-2): ')).trim();

  if (!['1', '2'].includes(option)) {
    throw new Error('Opción inválida.');
  }

  const roster = await listAssignmentService.listClientsRoster(currentUser);
  console.log('\nPadrón de clientes:');
  printClientsRoster(roster);

  if (option === '1' || roster.length === 0) {
    return;
  }

  const clientId = Number((await rl.question('\nIngresá el ID del cliente a gestionar: ')).trim());
  const selectedClient = roster.find((c) => c.clientId === clientId);
  if (!selectedClient) {
    throw new Error('ID de cliente inválido.');
  }

  // Selección de Nutricionista
  const nutritionists = await listAssignmentService.listActiveNutritionists(currentUser);
  console.log('\nNutricionistas disponibles:');
  if (nutritionists.length === 0) {
    console.log('  (no hay nutricionistas activos)');
  } else {
    nutritionists.forEach((n) =>
      console.log(`  [${n.professionalId}] ${n.name} ${n.lastname} - ${n.specialtyOrTitle}`)
    );
  }
  const nutInput = (
    await rl.question(
      'ID de Nutricionista (Enter para mantener actual | 0 para DESVINCULAR): '
    )
  ).trim();

  let nutritionistId: number | null | undefined = undefined;
  if (nutInput === '0') {
    nutritionistId = null;
  } else if (nutInput !== '') {
    const parsedNut = Number(nutInput);
    if (!nutritionists.some((n) => n.professionalId === parsedNut)) {
      throw new Error('ID de nutricionista inválido.');
    }
    nutritionistId = parsedNut;
  }

  // Selección de Instructor
  const instructors = await listAssignmentService.listActiveInstructors(currentUser);
  console.log('\nInstructores disponibles:');
  if (instructors.length === 0) {
    console.log('  (no hay instructores activos)');
  } else {
    instructors.forEach((i) =>
      console.log(`  [${i.professionalId}] ${i.name} ${i.lastname} - ${i.specialtyOrTitle}`)
    );
  }
  const instInput = (
    await rl.question(
      'ID de Instructor (Enter para mantener actual | 0 para DESVINCULAR): '
    )
  ).trim();

  let instructorId: number | null | undefined = undefined;
  if (instInput === '0') {
    instructorId = null;
  } else if (instInput !== '') {
    const parsedInst = Number(instInput);
    if (!instructors.some((i) => i.professionalId === parsedInst)) {
      throw new Error('ID de instructor inválido.');
    }
    instructorId = parsedInst;
  }

  const res = await updateAssignmentService.assignOrUpdate(currentUser, {
    clientId,
    nutritionistId,
    instructorId,
  });

  console.log(`\n ${res.message}`);
  printClientsRoster([res.client]);
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const registerService = new RegisterAuthService();
  const loginService = new LoginAuthService();
  const createAvailabilityService = new CreateAvailabilityService();
  const updateAvailabilityService = new UpdateAvailabilityService();
  const listAvailabilityService = new ListAvailabilityService();
  const listAssignmentService = new ListAssignmentService();
  const updateAssignmentService = new UpdateAssignmentService();
  const activityService = new ActivityService();
  let currentUser: UserSessionDTO | null = null;
  let running = true;

  try {
    while (running) {
      if (!currentUser) {
        console.log('\n==============================');
        console.log('   BIENVENIDO A NUTRIFIT');
        console.log('==============================');
        console.log('1. Iniciar sesión');
        console.log('0. Salir');
        const opt = (await rl.question('Opción: ')).trim();

        try {
          if (opt === '1') {
            const email = (await rl.question('Email: ')).trim();
            const password = (await rl.question('Contraseña: ')).trim();
            currentUser = await loginService.login({ email, password });
            console.log(
              `\n Sesión iniciada: ${currentUser.name} ${currentUser.lastname} [${currentUser.role}]`
            );
          } else if (opt === '0') {
            running = false;
          } else {
            console.log('Opción inválida.');
          }
        } catch (err: any) {
          console.error('\n', err.message);
        }
      } else {
        console.log(`\n--- MENÚ ${currentUser.role} (${currentUser.email}) ---`);
        if (currentUser.role === 'CLIENTE') {
          console.log('1. Ver mi plan nutricional y rutina (Pendiente)');
        } else if (currentUser.role === 'NUTRICIONISTA') {
          console.log('1. Ver mis clientes asignados');
        } else if (currentUser.role === 'INSTRUCTOR') {
          console.log('1. Ver mis alumnos asignados');
        } else if (currentUser.role === 'ADMINISTRADOR') {
          console.log('1. Registrar nuevo usuario (CLIENTE / NUTRICIONISTA / INSTRUCTOR / ADMINISTRADOR)');
          console.log('2. Gestionar disponibilidad horaria de profesionales');
          console.log('3. Gestionar asignación de Nutricionista e Instructor a clientes');
          console.log('4. Gestionar actividades (crear / listar)');
        }
        console.log('9. Cerrar sesión');

        const opt = (await rl.question('Opción: ')).trim();

        try {
          if (opt === '9') {
            console.log(`\n Sesión cerrada (${currentUser.email}).`);
            currentUser = null;
          } else if (opt === '1' && currentUser.role === 'ADMINISTRADOR') {
            await promptAdminRegister(rl, registerService, currentUser);
          } else if (opt === '2' && currentUser.role === 'ADMINISTRADOR') {
            await promptAdminAvailability(
              rl,
              createAvailabilityService,
              updateAvailabilityService,
              listAvailabilityService,
              currentUser
            );
          } else if (opt === '3' && currentUser.role === 'ADMINISTRADOR') {
            await promptAdminAssignments(
              rl,
              listAssignmentService,
              updateAssignmentService,
              currentUser
            );
          } else if (opt === '4' && currentUser.role === 'ADMINISTRADOR') {
            await promptAdminActivities(rl, activityService, listAssignmentService, currentUser);
          } else if (
            opt === '1' &&
            (currentUser.role === 'NUTRICIONISTA' || currentUser.role === 'INSTRUCTOR')
          ) {
            const portfolio = await listAssignmentService.listPortfolioByProfessionalUser(currentUser);
            console.log('\n=== MI CARTERA DE CLIENTES ASIGNADOS ===');
            printClientsRoster(portfolio);
          } else if (opt === '1') {
            console.log(' Funcionalidad en desarrollo para el próximo sprint.');
          } else {
            console.log('Opción inválida.');
          }
        } catch (err: any) {
          console.error('\n', err.message);
        }
      }
    }
  } finally {
    rl.close();
    await pool.end();
    console.log('Aplicación finalizada.');
  }

  async function promptAdminActivities(
    rl: readline.Interface,
    activityService: ActivityService,
    listAssignmentService: ListAssignmentService,
    currentUser: UserSessionDTO
  ) {
    console.log('\n=== GESTIÓN DE ACTIVIDADES (PANEL ADMINISTRADOR) ===');
    console.log('1. Listar actividades');
    console.log('2. Crear nueva actividad');
    const option = (await rl.question('Elegí una opción (1-2): ')).trim();

    if (!['1', '2'].includes(option)) {
      throw new Error('Opción inválida.');
    }

    if (option === '1') {
      const activities = await activityService.listAll(currentUser);
      if (activities.length === 0) {
        console.log('  (no hay actividades cargadas)');
        return;
      }

      activities.forEach((a) =>
        console.log(
          `  [ID: ${a.id}] ${a.name} | Días: ${a.days.join(', ')} | ${a.startTime}-${a.endTime} | Instructor ID: ${a.instructorId} | Estado: ${a.status}`
        )
      );

      return;
    }

    const name = (await rl.question('Nombre de la actividad (ej. Funcional, Spinning): ')).trim();
    const daysInput = (
      await rl.question('Días separados por coma (ej. LUNES,MIERCOLES,VIERNES): ')
    ).trim();
    const days = daysInput
      .split(',')
      .map((d) => d.trim().toUpperCase() as DayOfWeek)
      .filter(Boolean);

    const startTime = (await rl.question('Hora de inicio (HH:MM): ')).trim();
    const endTime = (await rl.question('Hora de fin (HH:MM): ')).trim();

    const instructors = await listAssignmentService.listActiveInstructors(currentUser);
    if (instructors.length === 0) {
      throw new Error('No hay instructores activos para asignar.');
    }

    console.log('\nInstructores disponibles:');
    instructors.forEach((i) =>
      console.log(`  [${i.professionalId}] ${i.name} ${i.lastname} - ${i.specialtyOrTitle}`)
    );

    const instructorId = Number((await rl.question('ID del instructor a cargo: ')).trim());
    if (!instructors.some((i) => i.professionalId === instructorId)) {
      throw new Error('ID de instructor inválido.');
    }

    const statusInput = (
      await rl.question('Estado (1 = ACTIVO, 2 = INACTIVO) [Enter = ACTIVO]: ')
    ).trim();
    const status: ActivityStatus = statusInput === '2' ? 'INACTIVO' : 'ACTIVO';

    const res = await activityService.create(currentUser, {
      name,
      days,
      startTime,
      endTime,
      instructorId,
      status,
    });

    const act = res.activity;
    console.log(
      `\n✅ ${res.message} (ID: ${act.id} | ${act.name} | ${act.days.join(', ')} ${act.startTime}-${act.endTime} | ${act.status})`
    );
  }
}

main();