"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export interface LogEntry {
  id: string
  message: string
  timestamp: Date
  type: "info" | "success" | "error" | "smtp"
}

interface ConsoleLogProps {
  logs: LogEntry[]
  onClear: () => void
}

export function ConsoleLog({ logs, onClear }: ConsoleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-green-400"
      case "error":
        return "text-red-400"
      case "smtp":
        return "text-blue-400"
      default:
        return "text-gray-400"
    }
  }

  const getLogPrefix = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "[SUCCESS]"
      case "error":
        return "[ERROR]"
      case "smtp":
        return "[SMTP]"
      default:
        return "[INFO]"
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden flex flex-col h-48">
      {/* Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <h3 className="text-sm font-semibold text-foreground">Console Log</h3>
          <span className="text-xs text-muted-foreground ml-2">({logs.length} entries)</span>
        </div>
        <button
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Clear logs"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Log Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-card p-4 space-y-2 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-xs">Ready for simulation...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`flex gap-3 ${getLogColor(log.type)}`}>
              <span className="text-xs text-muted-foreground flex-shrink-0 w-24">
                {log.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
              </span>
              <span className="font-bold text-xs flex-shrink-0 w-12">
                {getLogPrefix(log.type)}
              </span>
              <span className="flex-1 break-words">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
