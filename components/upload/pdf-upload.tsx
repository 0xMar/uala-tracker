'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
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

export function PdfUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Duplicate confirmation dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicatePeriod, setDuplicatePeriod] = useState<string | null>(null)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    setError(null)
    setSuccess(false)

    if (!selectedFile) {
      setFile(null)
      return
    }

    // Client-side validation
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      setFile(null)
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 5MB limit')
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadStatement(formData, false)
    
    handleUploadResult(result, formData)
  }

  function handleUploadResult(result: UploadResult, formData: FormData) {
    setIsUploading(false)

    if (result.success) {
      setSuccess(true)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Navigate to dashboard after successful upload
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } else if (result.duplicatePeriod) {
      // Show confirmation dialog for duplicate
      setDuplicatePeriod(result.duplicatePeriod)
      setPendingFormData(formData)
      setShowDuplicateDialog(true)
    } else {
      setError(result.error || 'Upload failed')
    }
  }

  async function handleConfirmReplace() {
    if (!pendingFormData) return

    setShowDuplicateDialog(false)
    setIsUploading(true)
    setError(null)

    const result = await uploadStatement(pendingFormData, true)
    
    setPendingFormData(null)
    setDuplicatePeriod(null)
    
    // Don't pass formData again since we're done
    setIsUploading(false)
    
    if (result.success) {
      setSuccess(true)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } else {
      setError(result.error || 'Upload failed')
    }
  }

  function handleCancelReplace() {
    setShowDuplicateDialog(false)
    setPendingFormData(null)
    setDuplicatePeriod(null)
  }

  function formatPeriod(period: string): string {
    // Convert YYYY-MM to Month YYYY
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Upload Statement</CardTitle>
          <CardDescription>
            Upload your UALA credit card statement PDF to import transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-file">PDF File</Label>
              <Input
                ref={fileInputRef}
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size: 5MB
              </p>
            </div>

            {file && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-green-600 dark:text-green-400 text-sm">
                Statement uploaded successfully! Redirecting...
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Uploading...
                </>
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
              A statement for{' '}
              <span className="font-semibold">
                {duplicatePeriod ? formatPeriod(duplicatePeriod) : 'this period'}
              </span>{' '}
              already exists. Do you want to replace it with this new upload?
              <br />
              <br />
              This will delete the existing statement and all its transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>
              Cancel
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
