import { PdfUpload } from '@/components/upload/pdf-upload'

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Upload Statement</h1>
        <p className="text-muted-foreground">
          Import your UALA credit card statement to track your spending
        </p>
      </div>

      <PdfUpload />
    </div>
  )
}
