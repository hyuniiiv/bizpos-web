import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}

export async function POST() {
  return NextResponse.json({ code: '0000', msg: 'OK' })
}
