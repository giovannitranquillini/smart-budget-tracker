// src/pages/CategoriesPage.tsx
import { useEffect, useState, type FormEvent } from 'react'
import Layout from '../components/ui/Layout'
import { PlusIcon, TrashIcon } from '../components/ui/icons'
import { ApiError, createBudgetCategory, deleteBudgetCategory, listBudgetCategories } from '../api'
import type { BudgetCategory } from '../types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [error, setError] = useState('')
  // Incremented after each insert or delete to reload the list.
  const [reloadKey, setReloadKey] = useState(0)

  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    listBudgetCategories()
      .then((data) => {
        if (!ignore) setCategories(data)
      })
      .catch((error) => {
        console.error('listBudgetCategories error', error)

        if (!ignore) setError('Could not load categories.')
      })

    return () => {
      ignore = true
    }
  }, [reloadKey])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setIsCreating(true)

    try {
      await createBudgetCategory(name.trim())

      setName('')
      setReloadKey((key) => key + 1)
    } catch (error) {
      console.error('createBudgetCategory error', error)

      setError(
        error instanceof ApiError && error.status === 409
          ? `A category named "${name.trim()}" already exists.`
          : 'Could not create the category.'
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (category: BudgetCategory) => {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return

    setError('')
    setDeletingId(category.id)

    try {
      await deleteBudgetCategory(category.id)
      setReloadKey((key) => key + 1)
    } catch (error) {
      console.error('deleteBudgetCategory error', error)

      setError(
        error instanceof ApiError && error.status === 409
          ? `"${category.name}" is used by some transactions: delete them first.`
          : 'Could not delete the category.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>

        <p className="text-sm text-slate-500">
          The categories you can assign to your transactions, also used by the AI to classify them.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <label htmlFor="category-name" className="sr-only">
          Category name
        </label>

        <input
          id="category-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New category, e.g. Travel"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        <button
          type="submit"
          disabled={isCreating || name.trim() === ''}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300"
        >
          <PlusIcon className="h-4 w-4" />
          {isCreating ? 'Adding…' : 'Add category'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-4 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {categories.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-slate-50/70"
              >
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {category.name}
                </span>

                <button
                  type="button"
                  onClick={() => handleDelete(category)}
                  disabled={deletingId === category.id}
                  aria-label={`Delete the category "${category.name}"`}
                  title="Delete category"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}
