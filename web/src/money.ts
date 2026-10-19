// src/money.ts

// The backend stores and returns amounts in cents (integers): euros are only for the UI.

export const eurosToCents = (euros: number) => Math.round(euros * 100)

export const centsToEuros = (cents: number) => cents / 100

const currencyFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' })

/** Formats an amount in cents as euros, e.g. 1250 -> "€12.50". */
export const formatCents = (cents: number) => currencyFormat.format(centsToEuros(cents))
