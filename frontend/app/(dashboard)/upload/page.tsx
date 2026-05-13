"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/toast-provider"
import { useCustomers } from "@/components/customer-context"
import { Upload, FileText, CheckCircle, AlertCircle, X, Table } from "lucide-react"
import { uploadCSV } from "@/lib/api"

interface PreviewData {
  headers: string[]
  rows: string[][]
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string>("")
  const { showToast } = useToast()
  const router = useRouter()
  const { refreshCustomers, markDataUpdated } = useCustomers()

  const requiredColumns = ["Name", "Email", "Amount", "TransactionDate", "Segment"]

  const parseCSV = (content: string): PreviewData => {
    const lines = content.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())
    const rows = lines.slice(1, 6).map((line) => line.split(",").map((cell) => cell.trim()))
    return { headers, rows }
  }

  const validateCSV = (data: PreviewData): string[] => {
    const errors: string[] = []
    const missingColumns = requiredColumns.filter(
      (col) => !data.headers.some((h) => h.toLowerCase() === col.toLowerCase())
    )

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(", ")}`)
    }

    if (data.rows.length === 0) {
      errors.push("File contains no data rows")
    }

    return errors
  }

  const formatCurrency = (value: string): string => {
    const numericValue = Number(value.replace(/[^0-9.-]+/g, ""))
    if (Number.isNaN(numericValue)) {
      return value
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(numericValue)
  }

  const isCurrencyHeader = (header: string): boolean => /amount|price|total/i.test(header)

  const handleFile = useCallback((file: File) => {
    const allowedExtensions = [".csv", ".xlsx", ".xls"]
    const isAllowed = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!isAllowed) {
      showToast("Please upload a CSV or Excel file", "error")
      return
    }

    setFile(file)
    setValidationErrors([])

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const data = parseCSV(content)
      setPreviewData(data)

      const errors = validateCSV(data)
      setValidationErrors(errors)
    }
    reader.readAsText(file)
  }, [showToast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFile(droppedFile)
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFile(selectedFile)
      }
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!file || validationErrors.length > 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Preparing upload...")

    try {
      setUploadStatus("Uploading file...")
      setUploadProgress(10)

      // Send file to backend using centralized API helper
      const result = await uploadCSV(file)

      setUploadProgress(50)
      setUploadStatus("Processing data...")

      if (result.error) {
        throw new Error(result.error)
      }

      setUploadProgress(75)
      setUploadStatus("Calculating RFM scores...")

      // Show detailed success message
      const uploadStats = result.upload_result || {}
      const message = `✅ Successfully imported ${uploadStats.customers_inserted || 0} of ${uploadStats.total_rows_processed || 0} records!\n\n` +
                     `📊 Processing Time: ${uploadStats.processing_time_seconds || 'N/A'}s\n` +
                     `⚡ Speed: ${uploadStats.records_per_second || 'N/A'} records/second\n` +
                     `📈 Success Rate: ${uploadStats.success_rate || 0}%\n` +
                     `🧮 RFM Scores: ${result.customers_updated || 0} calculated\n` +
                     `🔍 Recommendations: ${result.apriori_rules_generated || 0} rules generated`
      
      showToast(message, "success")

      setUploadProgress(90)
      setUploadStatus("Refreshing dashboard...")

      clearFile()

      // Auto-refresh customers and notify the dashboard state of new data
      await refreshCustomers()
      markDataUpdated()
      
      setUploadProgress(100)
      setUploadStatus("Complete!")
      
      setTimeout(() => {
        router.refresh()
        router.push('/dashboard')
      }, 500)

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : "Upload failed. Please try again."
      showToast(`❌ ${errorMessage}`, "error")
      setUploadProgress(0)
      setUploadStatus("")
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setUploadStatus("")
      }, 2000)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreviewData(null)
    setValidationErrors([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Data Upload</h2>
        <p className="text-sm text-muted-foreground">
          Upload your customer transaction data for RFM analysis
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Drag and drop your CSV file here
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
      </div>

      {/* Required Columns Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Required Columns</h3>
        <div className="flex flex-wrap gap-2">
          {requiredColumns.map((col) => (
            <span
              key={col}
              className="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
            >
              {col}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your CSV file must contain these columns for proper RFM analysis
        </p>
      </div>

      {/* File Preview */}
      {file && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Validation Status */}
          {validationErrors.length > 0 ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Validation Errors</span>
              </div>
              <ul className="list-inside list-disc space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-chart-2/30 bg-chart-2/5 p-4">
              <div className="flex items-center gap-2 text-chart-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">File validated successfully</span>
              </div>
            </div>
          )}

          {/* Data Preview */}
          {previewData && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Table className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Data Preview</span>
                <span className="text-xs text-muted-foreground">(first 5 rows)</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {previewData.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewData.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => {
                          const header = previewData.headers[j]
                          const displayValue = isCurrencyHeader(header)
                            ? formatCurrency(cell)
                            : cell
                          return (
                            <td key={j} className="px-4 py-2 text-foreground">
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress Bar and Status */}
          {isUploading && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{uploadStatus}</span>
                <span className="text-xs font-semibold text-muted-foreground">{uploadProgress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary animation-delay-200" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary animation-delay-400" />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={validationErrors.length > 0 || isUploading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload and Process Data"}
          </button>
        </div>
      )}
    </div>
  )
}
