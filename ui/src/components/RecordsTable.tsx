// src/components/RecordsTable.tsx
import type { BudgetRecord } from '../types'

type RecordsTableProps = {
  records: BudgetRecord[]
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(amount)

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date),
  )

export default function RecordsTable({ records }: RecordsTableProps) {
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
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
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
                      record.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatAmount(record.amount)}
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
