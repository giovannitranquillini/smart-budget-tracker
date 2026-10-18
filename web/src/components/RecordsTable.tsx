// src/components/RecordsTable.tsx
import type { BudgetRecord } from '../types'
import { TrashIcon } from './ui/icons'

type RecordsTableProps = {
  records: BudgetRecord[]
  onDelete: (record: BudgetRecord) => void
  // Id of the record being deleted: its button is disabled until the request ends.
  deletingId?: string | null
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(amount)

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date),
  )

export default function RecordsTable({ records, onDelete, deletingId }: RecordsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="w-px px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="transition hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                    {formatDate(record.date)}
                  </td>

                  <td className="px-5 py-3 font-medium text-slate-900">{record.description}</td>

                  <td className="px-5 py-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      {record.category}
                    </span>
                  </td>

                  <td
                    className={`whitespace-nowrap px-5 py-3 text-right font-mono tabular-nums ${
                      record.amount < 0 ? 'text-rose-600' : 'text-teal-600'
                    }`}
                  >
                    {formatAmount(record.amount)}
                  </td>

                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(record)}
                      disabled={deletingId === record.id}
                      aria-label={`Delete "${record.description}"`}
                      title="Delete transaction"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
