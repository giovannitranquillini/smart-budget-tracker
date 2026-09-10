import { useCallback, useEffect, useState } from 'react'
import logo from './assets/logo.svg'
import Navbar from './components/ui/Navbar'
import Footer from './components/ui/Footer'
import AddRecordModal from './components/AddRecordModal'
import RecordsTable from './components/RecordsTable'
import { listBudgetRecords } from './api'
import type { BudgetRecord } from './types'

function App() {
  const [records, setRecords] = useState<BudgetRecord[]>([])
  const [loadError, setLoadError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Incrementata dopo ogni inserimento per ricaricare la lista.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    listBudgetRecords()
      .then((data) => {
        if (ignore) return

        setRecords(data)
        setLoadError('')
      })
      .catch((error) => {
        console.error('listBudgetRecords error', error)

        if (!ignore) setLoadError('Impossibile caricare i movimenti.')
      })

    return () => {
      ignore = true
    }
  }, [reloadKey])

  const handleModalClose = useCallback(() => setIsModalOpen(false), [])

  const handleRecordCreated = () => {
    setIsModalOpen(false)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fafbff] text-slate-900">
      <Navbar
        title="Smart Budget Tracker"
        icon={<img src={logo} alt="" className="h-6 w-6" />}
        actionLabel="Nuovo movimento"
        onAction={() => setIsModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">I tuoi movimenti</h1>

          <p className="text-sm text-slate-500">
            Tutte le tue entrate e le tue uscite registrate, a mano o tramite AI.
          </p>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 text-sm text-rose-600">
            {loadError}
          </p>
        )}

        <RecordsTable records={records} />
      </main>

      <Footer />

      <AddRecordModal
        open={isModalOpen}
        onClose={handleModalClose}
        onCreated={handleRecordCreated}
      />
    </div>
  )
}

export default App
