export type Role = 'SUPER ADMIN' | 'CLUB ADMIN' | 'ENTRENADOR' | 'JUGADOR';
export const roles: {
  label: Role;
  description: string;
  mark: string;
}[] = [{
  label: 'SUPER ADMIN',
  description: 'Gestiona clubes y estructura global',
  mark: 'SA'
}, {
  label: 'CLUB ADMIN',
  description: 'Administra equipos y temporadas',
  mark: 'CA'
}, {
  label: 'ENTRENADOR',
  description: 'Registra partidos y rendimiento',
  mark: 'EN'
}, {
  label: 'JUGADOR',
  description: 'Consulta tu evolución y posición',
  mark: 'JU'
}];
