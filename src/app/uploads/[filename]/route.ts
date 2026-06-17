import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const resolvedParams = await params;
  const filename = resolvedParams.filename;
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename)

  if (!existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 })
  }

  try {
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (ext === '.webp') contentType = 'image/webp'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        // Cache control added to avoid repeated fetching if needed, though Next.js might handle some of it
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new NextResponse('Error reading file', { status: 500 })
  }
}
