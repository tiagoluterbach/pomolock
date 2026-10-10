import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/** Back-to-timer arrow plus the page title, shared by the secondary pages. */
export function PageHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Link
                href="/"
                className="text-zinc-400 hover:text-white transition-[color,transform] duration-300 ease-[var(--ease-apple)] hover:-translate-x-0.5"
                aria-label="Back to timer"
            >
                <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
    )
}
