import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** YYYY-MM-DD in the user's local timezone. */
export function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** YYYY-MM in the user's local timezone. */
export function getLocalMonthString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

/** Seconds as m:ss, e.g. 1500 -> "25:00". */
export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`
}
