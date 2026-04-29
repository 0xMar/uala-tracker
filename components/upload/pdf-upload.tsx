'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { uploadStatement, type UploadResult } from '@/lib/actions'
import { useRouter } from 'next/navigation'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

type FileStatus = {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error' | 'duplicate'
  error?: string
  duplicatePeriod?: string
}

export function PdfUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null)
  
  // Duplicate confirmation dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateFileIndex, setDuplicateFileIndex] = useState<number | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    
    if (selectedFiles.length === 0) {
      setFiles([])
      return
    }

    // Client-side validation for each file
    const validatedFiles: FileStatus[] = selectedFiles.map((file) => {
      if (file.type !== 'application/pdf') {
        return {
          file,
          status: 'error' as const,
          error: 'Only PDF files are allowed',
        }
      }

      if (file.size > MAX_FILE_SIZE) {
        return {
          file,
          status: 'error' as const,
          error: 'File size exceeds 5MB limit',
        }
      }

      return {
        file,
        status: 'pending' as const,
      }
    })

    setFiles(validatedFiles)
  }

  // Process files sequentially, one by one
  async function processFiles(fileList: FileStatus[], startIndex = 0, forceReplaceIndex: number | null = null) {
    for (let i = startIndex; i < fileList.length; i++) {
      const entry = fileList[i]

      // Skip files that already have an error from validation
      if (entry.status === 'error') continue

      setCurrentFileIndex(i)
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      )

      const formData = new FormData()
      formData.append('file', entry.file)

      const result: UploadResult = await uploadStatement(formData, forceReplaceIndex === i)

      if (result.success) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'success' } : f))
        )
      } else if (result.duplicatePeriod) {
        // Pause processing and show dialog for this file
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'duplicate', duplicatePeriod: result.duplicatePeriod }
              : f
          )
        )
        setDuplicateFileIndex(i)
        setShowDuplicateDialog(true)
        return // Stop — dialog callbacks will resume
      } else {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: result.error || 'Upload failed' } : f
          )
        )
      }
    }

    // All files processed
    setCurrentFileIndex(null)
    setIsUploading(false)

    const anySuccess = fileList.some((f) => f.status === 'success')
    if (anySuccess) {
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const validFiles = files.filter((f) => f.status === 'pending')
    if (validFiles.length === 0 && files.length === 0) return

    setIsUploading(true)
    await processFiles(files)
  }

  async function handleConfirmReplace() {
    if (duplicateFileIndex === null) return

    setShowDuplicateDialog(false)

    const updatedFiles = files.map((f, idx) =>
      idx === duplicateFileIndex ? { ...f, status: 'pending' as const } : f
    )
    setFiles(updatedFiles)

    const nextIndex = duplicateFileIndex
    setDuplicateFileIndex(null)

    await processFiles(updatedFiles, nextIndex, nextIndex)
  }

  async function handleCancelReplace() {
    if (duplicateFileIndex === null) return

    setShowDuplicateDialog(false)

    setFiles((prev) =>
      prev.map((f, idx) =>
        idx === duplicateFileIndex
          ? { ...f, status: 'error', error: 'Skipped — duplicate period' }
          : f
      )
    )

    const nextIndex = duplicateFileIndex + 1
    setDuplicateFileIndex(null)

    await processFiles(files, nextIndex)
  }

  function formatPeriod(period: string): string {
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const totalValid = files.filter((f) => f.status !== 'error' || !f.error?.startsWith('Only')).length
  const successCount = files.filter((f) => f.status === 'success').length
  const allDone = files.length > 0 && files.every((f) => f.status !== 'pending' && f.status !== 'uploading')
  const progressPercent =
    files.length > 0 && currentFileIndex !== null
      ? Math.round(((currentFileIndex) / files.length) * 100)
      : 0

  const duplicateFile = duplicateFileIndex !== null ? files[duplicateFileIndex] : null

  return (
    <>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Upload Statements</CardTitle>
          <CardDescription>
            Upload one or more UALA credit card statement PDFs. They will be processed sequentially.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-file">PDF Files</Label>
              <Input
                ref={fileInputRef}
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={handleFileChange}
                disabled={isUploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size: 5MB per file. Multiple files supported.
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`rounded-md p-3 flex items-center gap-3 text-sm ${
                      entry.status === 'success'
                        ? 'bg-green-500/10'
                        : entry.status === 'error'
                        ? 'bg-destructive/10'
                        : entry.status === 'uploading'
                        ? 'bg-muted'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(entry.file.size / 1024).toFixed(1)} KB
                      </p>
                      {entry.status === 'error' && entry.error && (
                        <p className="text-xs text-destructive mt-0.5">{entry.error}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-xs font-medium">
                      {entry.status === 'pending' && (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                      {entry.status === 'uploading' && (
                        <span className="flex items-center gap-1.5 text-foreground">
                          <Spinner className="h-3 w-3" />
                          Uploading
                        </span>
                      )}
                      {entry.status === 'success' && (
                        <span className="text-green-600 dark:text-green-400">Done</span>
                      )}
                      {entry.status === 'error' && (
                        <span className="text-destructive">Failed</span>
                      )}
                      {entry.status === 'duplicate' && (
                        <span className="text-yellow-600 dark:text-yellow-400">Duplicate</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar while uploading */}
            {isUploading && files.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing files...</span>
                  <span>{successCount} / {files.length} done</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}

            {/* All done message */}
            {allDone && successCount > 0 && (
              <div className="rounded-md bg-green-500/10 p-3 text-green-600 dark:text-green-400 text-sm">
                {successCount === 1
                  ? 'Statement uploaded successfully! Redirecting...'
                  : `${successCount} statement${successCount > 1 ? 's' : ''} uploaded successfully! Redirecting...`}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={files.length === 0 || isUploading || (allDone && successCount > 0)}
            >
              {isUploading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {files.length > 1 ? `Uploading ${currentFileIndex !== null ? currentFileIndex + 1 : ''}/${files.length}...` : 'Uploading...'}
                </>
              ) : files.length > 1 ? (
                `Upload ${files.length} Statements`
              ) : (
                'Upload Statement'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Statement Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateFile && (
                <>
                  <span className="font-medium">{duplicateFile.file.name}</span> — a statement for{' '}
                  <span className="font-semibold">
                    {duplicateFile.duplicatePeriod
                      ? formatPeriod(duplicateFile.duplicatePeriod)
                      : 'this period'}
                  </span>{' '}
                  already exists. Do you want to replace it?
                  <br />
                  <br />
                  This will delete the existing statement and all its transactions.
                  {files.length > 1 && (
                    <>
                      <br />
                      <br />
                      Remaining files will continue to be processed regardless of your choice.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>
              Skip This File
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>
              Replace Statement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
