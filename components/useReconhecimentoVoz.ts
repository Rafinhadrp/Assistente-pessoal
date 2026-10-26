"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Tipos mínimos da Web Speech API (o TypeScript ainda não traz esses tipos)
type ResultadoFala = { isFinal: boolean; 0: { transcript: string } };
type EventoResultado = { resultIndex: number; results: ArrayLike<ResultadoFala> };
type EventoErro = { error: string };
interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: EventoErro) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type ConstrutorReconhecedor = new () => Reconhecedor;

function construtor(): ConstrutorReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstrutorReconhecedor;
    webkitSpeechRecognition?: ConstrutorReconhecedor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MENSAGENS_DE_ERRO: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Libere o acesso ao microfone nas configurações do navegador.",
  "service-not-allowed": "O navegador não deixou usar o reconhecimento de voz. No iPhone, ative a Siri e o Ditado nos Ajustes.",
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
  "audio-capture": "O microfone está ocupado ou não foi encontrado. Feche outros apps que usam o microfone e tente de novo.",
  network: "O reconhecimento de voz precisa de internet.",
  "language-not-supported": "Este navegador não reconhece português.",
};

const DICA_PERMISSAO =
  "Dica: para não pedir permissão toda vez, quando o celular perguntar escolha “Permitir ao usar o app” ou “Permitir sempre”, e não “Só desta vez”.";

const SEM_FALA_MS = 10000; // desiste se não ouvir nada nesse tempo
const MAXIMO_MS = 120000; // tempo máximo de uma gravação (2 minutos)
const FOLGA_FIM_MS = 1500; // espera pelo "fim" do navegador antes de destravar sozinho

type Opcoes = {
  // Texto parcial enquanto a pessoa fala (para mostrar no campo)
  aoOuvirParcial: (texto: string) => void;
  // Texto final quando a gravação termina (não envia nada sozinho)
  aoTerminar: (texto: string) => void;
};

// Reconhecimento de voz do navegador em português (Web Speech API)
export function useReconhecimentoVoz({ aoOuvirParcial, aoTerminar }: Opcoes) {
  const [suportado, setSuportado] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const reconhecedor = useRef<Reconhecedor | null>(null);
  const textoFinal = useRef("");
  const ultimoParcial = useRef("");
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);
  const callbacks = useRef({ aoOuvirParcial, aoTerminar });
  callbacks.current = { aoOuvirParcial, aoTerminar };

  const limparTemporizadores = () => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  };
  const agendar = (fn: () => void, ms: number) => {
    temporizadores.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    setSuportado(construtor() !== null);
    return () => {
      limparTemporizadores();
      reconhecedor.current?.abort();
    };
  }, []);

  // Encerra a gravação atual de vez (usado quando o navegador não avisa o fim)
  const finalizar = useCallback((r: Reconhecedor, aproveitarTexto: boolean) => {
    if (reconhecedor.current !== r) return; // já finalizada
    reconhecedor.current = null;
    limparTemporizadores();
    setOuvindo(false);
    const texto = textoFinal.current.trim() || ultimoParcial.current;
    if (aproveitarTexto && texto) callbacks.current.aoTerminar(texto);
  }, []);

  // Pede para parar e, se o navegador não responder, destrava sozinho
  const encerrar = useCallback(
    (r: Reconhecedor, modo: "stop" | "abort") => {
      try {
        if (modo === "stop") r.stop();
        else r.abort();
      } catch {
        // já estava parado
      }
      agendar(() => finalizar(r, modo === "stop"), FOLGA_FIM_MS);
    },
    [finalizar],
  );

  const iniciar = useCallback(
    (Construtor: ConstrutorReconhecedor, tentativa: number) => {
      const r = new Construtor();
      r.lang = "pt-BR";
      r.continuous = true; // continua ouvindo nas pausas; só para quando a pessoa tocar em parar
      r.interimResults = true;
      r.maxAlternatives = 1;
      textoFinal.current = "";
      ultimoParcial.current = "";

      // Todos os eventos conferem se ainda são desta gravação: eventos atrasados
      // de uma gravação anterior travavam o microfone na segunda vez.
      r.onresult = (e) => {
        if (reconhecedor.current !== r) return;
        let final = "";
        let parcial = "";
        for (let i = 0; i < e.results.length; i++) {
          const trecho = e.results[i][0].transcript;
          if (e.results[i].isFinal) final = juntarTrecho(final, trecho);
          else parcial = juntarTrecho(parcial, trecho);
        }
        textoFinal.current = final.trim();
        ultimoParcial.current = juntarTrecho(final, parcial).trim();
        callbacks.current.aoOuvirParcial(ultimoParcial.current);
      };
      r.onerror = (e) => {
        if (reconhecedor.current !== r || e.error === "aborted") return;
        setErro(MENSAGENS_DE_ERRO[e.error] ?? "Não consegui ouvir. Tente de novo.");
        if (e.error === "not-allowed") setErro(`${MENSAGENS_DE_ERRO["not-allowed"]} ${DICA_PERMISSAO}`);
      };
      r.onend = () => {
        finalizar(r, true);
        avisarSePermissaoTemporaria();
      };

      try {
        r.start();
      } catch {
        // Navegador ainda preso na gravação anterior: tenta mais uma vez
        if (tentativa === 0) {
          agendar(() => iniciar(Construtor, 1), 300);
          return;
        }
        setErro("Não consegui ligar o microfone. Feche e abra o app e tente de novo.");
        return;
      }

      reconhecedor.current = r;
      setOuvindo(true);
      agendar(() => {
        if (reconhecedor.current === r && !ultimoParcial.current) {
          setErro(MENSAGENS_DE_ERRO["no-speech"]);
          encerrar(r, "abort");
        }
      }, SEM_FALA_MS);
      agendar(() => {
        if (reconhecedor.current === r) encerrar(r, "stop");
      }, MAXIMO_MS);
    },
    [encerrar, finalizar],
  );

  const comecar = useCallback(() => {
    const Construtor = construtor();
    if (!Construtor) {
      setErro("Seu navegador não tem reconhecimento de voz. Use o Chrome (Android/PC) ou o Safari (iPhone).");
      return;
    }
    setErro(null);
    limparTemporizadores();

    // Se ficou alguma gravação presa, descarta antes de começar outra
    const anterior = reconhecedor.current;
    if (anterior) {
      reconhecedor.current = null;
      try {
        anterior.abort();
      } catch {}
      agendar(() => iniciar(Construtor, 0), 300);
      return;
    }
    iniciar(Construtor, 0);
  }, [iniciar]);

  // Parar antes da hora: o que já foi ouvido é aproveitado
  const parar = useCallback(() => {
    if (reconhecedor.current) encerrar(reconhecedor.current, "stop");
  }, [encerrar]);

  // Cancelar: descarta o que foi ouvido
  const cancelar = useCallback(() => {
    const r = reconhecedor.current;
    if (!r) return;
    textoFinal.current = "";
    ultimoParcial.current = "";
    encerrar(r, "abort");
    finalizar(r, false);
  }, [encerrar, finalizar]);

  // Se a permissão foi dada "só desta vez", o navegador vai perguntar de novo
  function avisarSePermissaoTemporaria() {
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((estado) => {
        if (estado.state === "prompt") setErro((atual) => atual ?? DICA_PERMISSAO);
      })
      .catch(() => {});
  }

  return { suportado, ouvindo, erro, limparErro: () => setErro(null), comecar, parar, cancelar };
}

// No Android, cada trecho às vezes já traz o texto anterior inteiro
// ("gastei", "gastei 35", ...). Nesse caso substitui em vez de repetir.
function juntarTrecho(acumulado: string, trecho: string): string {
  const a = acumulado.trim().toLowerCase();
  const t = trecho.trim().toLowerCase();
  if (!a) return trecho;
  if (!t) return acumulado;
  if (t.startsWith(a)) return trecho;
  if (a.endsWith(t)) return acumulado;
  return `${acumulado.trimEnd()} ${trecho.trimStart()}`;
}
