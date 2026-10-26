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
  "audio-capture": "Nenhum microfone encontrado.",
  network: "O reconhecimento de voz precisa de internet.",
  "language-not-supported": "Este navegador não reconhece português.",
};

type Opcoes = {
  // Texto parcial enquanto a pessoa fala (para mostrar no campo)
  aoOuvirParcial: (texto: string) => void;
  // Texto final quando a pessoa para de falar
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
  const callbacks = useRef({ aoOuvirParcial, aoTerminar });
  callbacks.current = { aoOuvirParcial, aoTerminar };

  useEffect(() => {
    setSuportado(construtor() !== null);
    return () => reconhecedor.current?.abort();
  }, []);

  const comecar = useCallback(() => {
    const Construtor = construtor();
    if (!Construtor) {
      setErro("Seu navegador não tem reconhecimento de voz. Use o Chrome (Android/PC) ou o Safari (iPhone).");
      return;
    }
    reconhecedor.current?.abort();

    const r = new Construtor();
    r.lang = "pt-BR";
    r.continuous = false; // para sozinho quando a pessoa faz uma pausa
    r.interimResults = true;
    r.maxAlternatives = 1;
    textoFinal.current = "";
    ultimoParcial.current = "";

    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const trecho = e.results[i][0].transcript;
        if (e.results[i].isFinal) textoFinal.current += trecho;
        else parcial += trecho;
      }
      ultimoParcial.current = (textoFinal.current + parcial).trim();
      callbacks.current.aoOuvirParcial(ultimoParcial.current);
    };
    r.onerror = (e) => {
      if (e.error === "aborted") return;
      setErro(MENSAGENS_DE_ERRO[e.error] ?? "Não consegui ouvir. Tente de novo.");
    };
    r.onend = () => {
      setOuvindo(false);
      reconhecedor.current = null;
      // Alguns navegadores encerram sem marcar o trecho como final
      const texto = textoFinal.current.trim() || ultimoParcial.current;
      if (texto) callbacks.current.aoTerminar(texto);
    };

    setErro(null);
    try {
      r.start();
      reconhecedor.current = r;
      setOuvindo(true);
    } catch {
      setErro("Não consegui ligar o microfone. Tente de novo.");
    }
  }, []);

  // Parar antes da hora: o que já foi ouvido é aproveitado
  const parar = useCallback(() => reconhecedor.current?.stop(), []);

  // Cancelar: descarta o que foi ouvido
  const cancelar = useCallback(() => {
    textoFinal.current = "";
    ultimoParcial.current = "";
    reconhecedor.current?.abort();
  }, []);

  return { suportado, ouvindo, erro, limparErro: () => setErro(null), comecar, parar, cancelar };
}
