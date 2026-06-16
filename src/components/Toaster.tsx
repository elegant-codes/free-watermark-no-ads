import { X } from 'lucide-react'
import { useToastStore } from '@/store/useToastStore'

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'bg-destructive text-destructive-foreground'
              : toast.type === 'info'
                ? 'bg-muted text-foreground'
                : 'bg-green-600 text-white'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
