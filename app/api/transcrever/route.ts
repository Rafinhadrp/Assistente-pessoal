import { NextResponse } from "next/server";
import { emailPermitido } from "@/lib/acesso";
import { criarClienteServidor } from "@/lib/supabase/server";

// Transcrição de voz com o Deepgram. A chave fica só aqui no servidor.
export const maxDuration = 30;

const CHAVE = process.env.DEEPGRAM_API_KEY?.trim();
const MODELO = process.env.DEEPGRAM_MODEL?.trim() || "nova-3";
const MODELO_RESERVA = "nova-2"; // usado se o principal recusar o português
const LIMITE_BYTES = 8 * 1024 * 1024; // ~2 minutos de áudio comprimido sobra

async function usuarioPermitido() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  return data.user && emailPermitido(data.user.email) ? data.user : null;
}

// O app pergunta aqui se a transcrição do Deepgram está ligada
export async function GET() {
  if (!(await usuarioPermitido())) return NextResponse.json({ disponivel: false }, { status: 401 });
  return NextResponse.json({ disponivel: Boolean(CHAVE) });
}

async function transcrever(audio: ArrayBuffer, tipo: string, modelo: string) {
  const parametros = new URLSearchParams({
    model: modelo,
    language: "pt-BR",
    smart_format: "true", // pontuação, números e datas formatados
    punctuate: "true",
  });
  return fetch(`https://api.deepgram.com/v1/listen?${parametros}`, {
    method: "POST",
    headers: { Authorization: `Token ${CHAVE}`, "Content-Type": tipo },
    body: audio,
  });
}

export async function POST(request: Request) {
  if (!(await usuarioPermitido())) return NextResponse.json({ erro: "Faça login de novo." }, { status: 401 });
  if (!CHAVE) return NextResponse.json({ erro: "Transcrição do Deepgram não configurada." }, { status: 501 });

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) return NextResponse.json({ erro: "Áudio vazio." }, { status: 400 });
  if (audio.byteLength > LIMITE_BYTES) return NextResponse.json({ erro: "Áudio muito longo." }, { status: 413 });
  const tipo = request.headers.get("content-type")?.split(";")[0] || "audio/webm";

  try {
    let resposta = await transcrever(audio, tipo, MODELO);
    if (resposta.status === 400 && MODELO !== MODELO_RESERVA) {
      console.error("Deepgram recusou o modelo", MODELO, await resposta.text());
      resposta = await transcrever(audio, tipo, MODELO_RESERVA);
    }
    if (!resposta.ok) {
      console.error("Erro do Deepgram:", resposta.status, await resposta.text());
      const texto =
        resposta.status === 401 || resposta.status === 403
          ? "A chave do Deepgram (DEEPGRAM_API_KEY) está inválida."
          : resposta.status === 402
            ? "Acabaram os créditos do Deepgram."
            : "Não consegui transcrever agora. Tente de novo.";
      return NextResponse.json({ erro: texto }, { status: 502 });
    }
    const json = await resposta.json();
    const texto: string = json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    return NextResponse.json({ texto: texto.trim() });
  } catch (e) {
    console.error("Falha ao chamar o Deepgram:", e);
    return NextResponse.json({ erro: "Sem conexão com o serviço de transcrição." }, { status: 502 });
  }
}
