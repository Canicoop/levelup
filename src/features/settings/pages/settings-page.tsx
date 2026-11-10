import { PageHeader } from '@/components/layout/page-header'
import { AccountSection } from '@/features/settings/components/account-section'
import { DeviceCopyStatus } from '@/features/settings/components/device-copy-status'

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Definições" />
      <AccountSection />
      <DeviceCopyStatus />
    </div>
  )
}
