import { useCallback, useEffect, useState } from 'react'
import logo from './assets/logo.svg'
import Navbar from './components/ui/Navbar'
import Footer from './components/ui/Footer'
import AddRecordModal from './components/AddRecordModal'
import RecordsTable from './components/RecordsTable'
import { RefreshIcon } from './components/ui/icons'
import { listBudgetRecords } from './api'
import type { BudgetRecord } from './types'

function App() {
  const [records, setRecords] = useState<BudgetRecord[]>([])
  const [loadError, setLoadError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Incremented after each insert or refresh click to reload the list.
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

        if (!ignore) setLoadError('Could not load transactions.')
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

  const handleReload = () => setReloadKey((key) => key + 1)

  return (
    <div className="flex min-h-screen flex-col bg-[#fafbff] text-slate-900">
      <Navbar
        title="Smart Budget Tracker"
        icon={<img src={logo} alt="" className="h-6 w-6" />}
        actionLabel="New transaction"
        onAction={() => setIsModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Your transactions</h1>

            <p className="text-sm text-slate-500">
              All your recorded income and expenses, entered manually or via AI.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReload}
            aria-label="Refresh transactions"
            title="Refresh transactions"
            className="group shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <RefreshIcon className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
          </button>
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
