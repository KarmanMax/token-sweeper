"use client"

import { useState, useCallback, useEffect } from "react"
import type { SupportedChainId } from "@/types"

export interface SweepRecord {
  id: string
  timestamp: number
  chainId: SupportedChainId
  txHash: string
  tokensSwept: number
  inputValueUsd: number
  outputTokenSymbol: string
  outputAmount: number
  isAtomic: boolean
}

const STORAGE_KEY = "token-sweeper-history"
const MAX_RECORDS = 50

function loadHistory(): SweepRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(records: SweepRecord[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useSweepHistory() {
  const [history, setHistory] = useState<SweepRecord[]>([])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const addRecord = useCallback((record: Omit<SweepRecord, "id" | "timestamp">) => {
    const newRecord: SweepRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }
    setHistory((prev) => {
      const updated = [newRecord, ...prev].slice(0, MAX_RECORDS)
      saveHistory(updated)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return { history, addRecord, clearHistory }
}
