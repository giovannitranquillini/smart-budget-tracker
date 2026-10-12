// src/pages/HomePage.tsx
import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/ui/Layout'
import AddRecordModal from '../components/AddRecordModal'
import RecordsTable from '../components/RecordsTable'
import BudgetSummary from '../components/BudgetSummary'
import { PlusIcon, RefreshIcon } from '../components/ui/icons'
import { deleteBudgetRecord, listBudgetRecords } from '../api'
import type { BudgetRecord } from '../types'

export default function HomePage() {
  const [records, setRecords] = useState<BudgetRecord[]>([])
  const [loadError, setLoadError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Incremented after each insert, delete or refresh click to reload the list.
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

  const handleDelete = async (record: BudgetRecord) => {
    if (!window.confirm(`Delete "${record.description}"?`)) return

    setDeletingId(record.id)

    try {
      await deleteBudgetRecord(record.id)
      setReloadKey((key) => key + 1)
    } catch (error) {
      console.error('deleteBudgetRecord error', error)
      setLoadError('Could not delete the transaction.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your transactions</h1>

          <p className="text-sm text-slate-500">
            All your recorded income and expenses, entered manually or via AI.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            aria-label="Refresh transactions"
            title="Refresh transactions"
            className="group rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <RefreshIcon className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="New transaction"
            title="New transaction"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">New transaction</span>
          </button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 text-sm text-rose-600">
          {loadError}
        </p>
      )}

      <BudgetSummary records={records} />

      <RecordsTable records={records} onDelete={handleDelete} deletingId={deletingId} />

      <AddRecordModal
        open={isModalOpen}
        onClose={handleModalClose}
        onCreated={handleRecordCreated}
      />
    </Layout>
  )
}
