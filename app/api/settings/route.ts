import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireTerminalAuth } from '@/lib/terminal/auth'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

async function readSettings(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeSettings(data: Record<string, string>): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true })
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  const settings = await readSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAuth(req)
  if ('error' in auth) return auth.error
  const body = await req.json()
  const current = await readSettings()
  const updated = { ...current, ...body }
  await writeSettings(updated)
  return NextResponse.json({ ok: true })
}
