import { SignJWT, jwtVerify } from 'jose'

const getSecret = () => new TextEncoder().encode(process.env.TERMINAL_JWT_SECRET!)

export interface TerminalJWTPayload {
  terminalId: string
  merchantId: string
  termId: string
  merchantKeyId?: string
}

export async function createTerminalJWT(payload: TerminalJWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(await getSecret())
}

export async function verifyTerminalJWT(token: string): Promise<TerminalJWTPayload> {
  const { payload } = await jwtVerify(token, await getSecret())
  return payload as unknown as TerminalJWTPayload
}
