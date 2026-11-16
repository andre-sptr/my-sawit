import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { isAuthenticated, isAuthEnabled } from '@/lib/auth'
import { resolveUploadFileByName } from '@/lib/uploads'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  if (!(await isAuthenticated())) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const resolvedParams = await params
  const filePath = await resolveUploadFileByName(resolvedParams.filename)

  if (!filePath) {
    return new NextResponse('File not found', { status: 404 })
  }

  try {
    const fileBuffer = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (ext === '.webp') contentType = 'image/webp'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': isAuthEnabled()
          ? 'private, no-store'
          : 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Error reading file', { status: 500 })
  }
}
