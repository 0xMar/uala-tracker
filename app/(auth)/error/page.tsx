import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>Something went wrong</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              There was an error with your authentication. Please try again.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <Button className="w-full">Back to Login</Button>
            </Link>
            <Link href="/sign-up" className="flex-1">
              <Button variant="outline" className="w-full">
                Sign Up
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
