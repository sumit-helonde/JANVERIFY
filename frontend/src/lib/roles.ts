export type RoleKey = 'citizen' | 'inspector' | 'department_official' | 'admin' | 'reviewer' | 'contractor'

export const ALL_ROLES: RoleKey[] = ['citizen', 'inspector', 'department_official', 'admin']

export const ROLE_LABELS: Record<string, string> = {
  citizen: 'CITIZEN',
  inspector: 'AUTHORITY / WORKER',
  department_official: 'GOVERNMENT / DEPARTMENT',
  admin: 'JANVERIFY NEUTRAL TEAM',
  reviewer: 'JANVERIFY NEUTRAL TEAM',
  contractor: 'CONTRACTOR',
}

export const ROLE_SHORT: Record<string, string> = {
  citizen: 'Citizen',
  inspector: 'Authority',
  department_official: 'Government',
  admin: 'JANVERIFY Team',
  reviewer: 'JANVERIFY Team',
  contractor: 'Contractor',
}

export const ROLE_ACCENT: Record<string, string> = {
  citizen: '#179c5d',
  inspector: '#1d5cc7',
  department_official: '#7c3aed',
  admin: '#0ea5e9',
  reviewer: '#0ea5e9',
  contractor: '#d97706',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.toUpperCase().replace(/_/g, ' ')
}

export function roleShort(role: string): string {
  return ROLE_SHORT[role] ?? role.charAt(0).toUpperCase() + role.slice(1)
}

export function isRole(role: string, allowed: Iterable<string>): boolean {
  for (const r of allowed) if (role === r) return true
  return false
}

export const ROLE_HOME: Record<string, string> = {
  citizen: '/civicwatch',
  inspector: '/authority',
  department_official: '/government',
  admin: '/review',
  reviewer: '/audit-logs',
  contractor: '/',
}

export interface DemoAccount {
  key: string
  email: string
  password: string
  role: RoleKey
  name: string
  badge: string
  permissions: string[]
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: 'citizen',
    email: 'citizen@janverify.demo',
    password: 'demo1234',
    role: 'citizen',
    name: 'Citizen',
    badge: 'DEMO',
    permissions: ['Report issues', 'Corroborate with confirmations', 'Verify the fix'],
  },
  {
    key: 'authority',
    email: 'authority@janverify.demo',
    password: 'demo1234',
    role: 'inspector',
    name: 'Authority / Worker',
    badge: 'DEMO',
    permissions: ['Respond to reports', 'Log action & work in progress', 'Mark fixed'],
  },
  {
    key: 'government',
    email: 'government@janverify.demo',
    password: 'demo1234',
    role: 'department_official',
    name: 'Government / Department',
    badge: 'DEMO',
    permissions: ['Oversight dashboards', 'Project & report summaries', 'Read-only'],
  },
  {
    key: 'team',
    email: 'team@janverify.demo',
    password: 'demo1234',
    role: 'admin',
    name: 'JANVERIFY Neutral Team',
    badge: 'DEMO',
    permissions: ['Review conflicting records', 'Issue decisions', 'Audit logs'],
  },
]