import { Dumbbell, House, Scale, Wallet, type LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

// Shared by the bottom tab bar (mobile) and the sidebar (desktop).
export const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: House },
  { to: '/treino', label: 'Treino', icon: Dumbbell },
  { to: '/peso', label: 'Peso', icon: Scale },
  { to: '/financas', label: 'Finanças', icon: Wallet },
]
