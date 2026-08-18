
import { Providers } from '@/react/Providers'
import AdminLayout from '@/components/admin/AdminLayout'
import Page from '@/react/pages/admin/BarcodePage'

export default function AdminBarcodeEntry() {
  return (
    <Providers>
      <AdminLayout>
        <Page />
      </AdminLayout>
    </Providers>
  )
}
