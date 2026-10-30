import { PageHeader } from '@/components/layout/page-header'
import { AccountSection } from '@/features/settings/components/account-section'

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Definições" />
      <AccountSection />
    </div>
  )
}
