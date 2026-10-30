"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ditado como no app do Claude: grava o áudio, mostra a onda da voz e,
// ao parar, manda para o servidor transcrever (Deepgram).

const BARRAS = 28;
const MAXIMO_MS = 120_000; // 2 minutos

const ERROS: Record<string, string> = {
  NotAllowedError: "O microfone está bloqueado. Libere o acesso ao microfone nas configurações do navegador.",
  NotFoundError: "Nenhum microfone encontrado.",
  NotReadableError: "O microfone está sendo usado por outro app. Feche-o e tente de novo.",
};

function formatoSuportado() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const tipo of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(tipo)) return tipo;
  }
  return "";
}

export function useGravacao({ aoTerminar }: { aoTerminar: (texto: string) => void }) {
  const [disponivel, setDisponivel] = useState<boolean | null>(null); // null = ainda verificando
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [niveis, setNiveis] = useState<number[]>(() => Array(BARRAS).fill(0));
  const [segundos, setSegundos] = useState(0);

  const gravador = useRef<MediaRecorder | null>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const descartar = useRef(false);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const callback = useRef(aoTerminar);
  callback.current = aoTerminar;

  // O servidor diz se a transcrição está configurada (chave do Deepgram)
  useEffect(() => {
    if (!formatoSuportado() || !navigator.mediaDevices?.getUserMedia) {
      setDisponivel(false);
      return;
    }
    fetch("/api/transcrever")
      .then((r) => r.json())
      .then((j) => setDisponivel(Boolean(j.disponivel)))
      .catch(() => setDisponivel(false));
  }, []);

  const liberar = useCallback(() => {
    timers.current.forEach(clearInterval);
    timers.current = [];
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setNiveis(Array(BARRAS).fill(0));
  }, []);

  useEffect(() => () => {
    descartar.current = true;
    gravador.current?.state === "recording" && gravador.current.stop();
    liberar();
  }, [liberar]);

  async function enviar(audio: Blob) {
    setTranscrevendo(true);
    try {
      const r = await fetch("/api/transcrever", {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audio,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 501) setDisponivel(false); // chave removida: volta para o ditado do celular
        setErro(j.erro ?? "Não consegui transcrever. Tente de novo.");
      } else if (!j.texto) {
        setErro("Não entendi o que foi dito. Tente falar de novo, mais perto do microfone.");
      } else {
        callback.current(j.texto);
      }
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setTranscrevendo(false);
    }
  }

  const comecar = useCallback(async () => {
    if (gravador.current?.state === "recording") return;
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      fluxo.current = stream;

      // Onda da voz: mede o volume em faixas de frequência
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analisador = ctx.createAnalyser();
      analisador.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analisador);
      const dados = new Uint8Array(analisador.frequencyBinCount);
      timers.current.push(
        setInterval(() => {
          analisador.getByteFrequencyData(dados);
          let soma = 0;
          for (let i = 2; i < 40; i++) soma += dados[i];
          const nivel = Math.min(1, soma / 38 / 160);
          setNiveis((n) => [...n.slice(1), nivel]);
        }, 70),
      );

      const tipo = formatoSuportado();
      const g = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      gravador.current = g;
      pedacos.current = [];
      descartar.current = false;
      g.ondataavailable = (e) => e.data.size > 0 && pedacos.current.push(e.data);
      g.onstop = () => {
        liberar();
        setGravando(false);
        const audio = new Blob(pedacos.current, { type: g.mimeType || tipo || "audio/webm" });
        pedacos.current = [];
        if (!descartar.current && audio.size > 0) void enviar(audio);
      };
      g.start(250);
      setGravando(true);

      const inicio = Date.now();
      setSegundos(0);
      timers.current.push(
        setInterval(() => {
          const s = Math.floor((Date.now() - inicio) / 1000);
          setSegundos(s);
          if (s * 1000 >= MAXIMO_MS && g.state === "recording") g.stop();
        }, 250),
      );
    } catch (e) {
      liberar();
      const nome = (e as { name?: string })?.name ?? "";
      setErro(ERROS[nome] ?? "Não consegui ligar o microfone. Tente de novo.");
    }
  }, [liberar]);

  // Parar: transcreve o que foi gravado
  const parar = useCallback(() => {
    if (gravador.current?.state === "recording") gravador.current.stop();
  }, []);

  // Cancelar: joga fora a gravação
  const cancelar = useCallback(() => {
    descartar.current = true;
    if (gravador.current?.state === "recording") gravador.current.stop();
  }, []);

  return {
    disponivel,
    gravando,
    transcrevendo,
    erro,
    limparErro: () => setErro(null),
    niveis,
    segundos,
    comecar,
    parar,
    cancelar,
  };
}
