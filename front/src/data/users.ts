import { MS_PER_MINUTE, PLATFORM_NOW_MS } from '@/domain/clock';
import type { User } from '@/domain/types';

/** Operadores y usuarios ficticios del centro de control. */

interface UserSeed {
  id: string;
  name: string;
  role: User['role'];
  email: string;
  shift: string;
  active: boolean;
  minutesAgo: number;
}

const SEEDS: readonly UserSeed[] = [
  {
    id: 'usr-01',
    name: 'Valeria Ortiz',
    role: 'administrador',
    email: 'valeria.ortiz@agunsa.example',
    shift: 'Turno A · 06:00 – 14:00',
    active: true,
    minutesAgo: 12,
  },
  {
    id: 'usr-02',
    name: 'Marco Ferreyra',
    role: 'supervisor',
    email: 'marco.ferreyra@agunsa.example',
    shift: 'Turno A · 06:00 – 14:00',
    active: true,
    minutesAgo: 4,
  },
  {
    id: 'usr-03',
    name: 'Lucía Brunet',
    role: 'supervisor',
    email: 'lucia.brunet@agunsa.example',
    shift: 'Turno B · 14:00 – 22:00',
    active: true,
    minutesAgo: 38,
  },
  {
    id: 'usr-04',
    name: 'Daniel Ibáñez',
    role: 'operador',
    email: 'daniel.ibanez@agunsa.example',
    shift: 'Turno B · 14:00 – 22:00',
    active: true,
    minutesAgo: 2,
  },
  {
    id: 'usr-05',
    name: 'Paula Sandoval',
    role: 'operador',
    email: 'paula.sandoval@agunsa.example',
    shift: 'Turno B · 14:00 – 22:00',
    active: true,
    minutesAgo: 17,
  },
  {
    id: 'usr-06',
    name: 'Hernán Acosta',
    role: 'operador',
    email: 'hernan.acosta@agunsa.example',
    shift: 'Turno C · 22:00 – 06:00',
    active: true,
    minutesAgo: 51,
  },
  {
    id: 'usr-07',
    name: 'Rocío Vega',
    role: 'operador',
    email: 'rocio.vega@agunsa.example',
    shift: 'Turno C · 22:00 – 06:00',
    active: false,
    minutesAgo: 2 * 24 * 60,
  },
  {
    id: 'usr-08',
    name: 'Tomás Arjona',
    role: 'consulta',
    email: 'tomas.arjona@agunsa.example',
    shift: 'Visitas y auditoría',
    active: true,
    minutesAgo: 5 * 24 * 60,
  },
];

/** Operador con la sesión abierta en el mockup. */
export const CURRENT_USER_ID = 'usr-04';

export const USERS: readonly User[] = SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  role: seed.role,
  email: seed.email,
  shift: seed.shift,
  active: seed.active,
  lastActivity: new Date(PLATFORM_NOW_MS - seed.minutesAgo * MS_PER_MINUTE).toISOString(),
}));

export const USER_BY_ID = new Map(USERS.map((user) => [user.id, user] as const));

export function getUser(userId: string | null): User | undefined {
  return userId === null ? undefined : USER_BY_ID.get(userId);
}

export const CURRENT_USER = USER_BY_ID.get(CURRENT_USER_ID);
