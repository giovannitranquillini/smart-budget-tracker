// src/components/BudgetSummary.tsx
import { formatCents } from '../money'
import type { BudgetRecord } from '../types'

type BudgetSummaryProps = {
  records: BudgetRecord[]
}

// Income and expenses keep the same colors as the amounts in RecordsTable.
const INCOME_COLOR = 'bg-teal-600'
const EXPENSES_COLOR = 'bg-rose-600'

type StatTileProps = {
  label: string
  value: number
  // Small colored dot that ties the tile to its bar in the chart below.
  dotClassName?: string
}

function StatTile({ label, value, dotClassName }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {dotClassName && <span className={`h-2 w-2 rounded-full ${dotClassName}`} aria-hidden="true" />}
        {label}
      </span>
      <span className="text-2xl font-semibold tracking-tight text-slate-900">{formatCents(value)}</span>
    </div>
  )
}

type ComparisonBarProps = {
  label: string
  value: number
  max: number
  colorClassName: string
}

function ComparisonBar({ label, value, max, colorClassName }: ComparisonBarProps) {
  const width = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="text-slate-500">{label}</span>

      <div className="h-3 rounded-full bg-slate-100" title={`${label}: ${formatCents(value)}`}>
        <div className={`h-full rounded-full ${colorClassName}`} style={{ width: `${width}%` }} />
      </div>

      <span className="font-medium tabular-nums text-slate-900">{formatCents(value)}</span>
    </div>
  )
}

/**
 * Totals of the loaded records: income, expenses (by record type)
 * and their balance, plus a bar chart comparing income and expenses on the same scale.
 */
export default function BudgetSummary({ records }: BudgetSummaryProps) {
  // In cents: summed as integers, converted to euros only when shown.
  let income = 0
  let expenses = 0

  for (const { type, amount } of records) {
    if (type === 'income') income += amount
    else expenses += amount
  }

  const balance = income - expenses

  // Share of the income already spent, shown under the chart.
  const spentShare = income > 0 ? Math.round((expenses / income) * 100) : null

  return (
    <section aria-label="Budget summary" className="mb-6 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Income" value={income} dotClassName={INCOME_COLOR} />
        <StatTile label="Expenses" value={expenses} dotClassName={EXPENSES_COLOR} />
        <StatTile label="Balance" value={balance} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Income vs expenses</h2>

        <ComparisonBar label="Income" value={income} max={Math.max(income, expenses)} colorClassName={INCOME_COLOR} />
        <ComparisonBar label="Expenses" value={expenses} max={Math.max(income, expenses)} colorClassName={EXPENSES_COLOR} />

        <p className="text-xs text-slate-500">
          {records.length === 0
            ? 'No transactions recorded yet.'
            : spentShare === null
              ? 'No income recorded yet.'
              : `You have spent ${spentShare}% of your income.`}
        </p>
      </div>
    </section>
  )
}
