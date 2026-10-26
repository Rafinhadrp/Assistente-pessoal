import { NextResponse } from "next/server";
import { VERSAO } from "@/lib/versao";

export const dynamic = "force-dynamic";

// O app pergunta aqui se já existe uma versão mais nova publicada
export function GET() {
  return NextResponse.json({ versao: VERSAO }, { headers: { "Cache-Control": "no-store" } });
}
