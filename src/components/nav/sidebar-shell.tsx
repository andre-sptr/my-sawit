'use client'

import { useState } from 'react'
import type { Kapling } from '@prisma/client'
import { Sidebar } from '@/components/nav/sidebar'
import { AddKaplingModal } from '@/components/kapling/add-kapling-modal'

export function SidebarShell({ kaplings, authEnabled }: { kaplings: Kapling[]; authEnabled: boolean }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Sidebar kaplings={kaplings} authEnabled={authEnabled} onAddKapling={() => setModalOpen(true)} />
      <AddKaplingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
