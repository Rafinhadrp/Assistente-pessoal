"use client";

import { useRef, useState, useTransition } from "react";
import { sairDaConta, salvarPerfil, trocarSenha } from "@/app/(app)/perfil/acoes";
import { idade, nomeExibido, type Perfil } from "@/lib/perfil";
import Avatar from "./Avatar";
import { useAviso } from "./ui/Aviso";
import { Confirmar } from "./ui/Folha";
import { IconeSair } from "./ui/Icones";

const ESTADOS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

// Reduz a foto no próprio celular: recorte quadrado no centro, 256 x 256, JPEG leve
async function reduzirFoto(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// (11) 98765-4321
function formatarTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatarNascimento(data: string) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

type Aba = "perfil" | "editar" | "conta";

export default function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const [aba, setAba] = useState<Aba>("perfil");
  const [salvo, setSalvo] = useState(perfil); // o que está no banco
  const [form, setForm] = useState({
    nome: perfil.nome ?? "",
    nomeCompleto: perfil.nomeCompleto ?? "",
    nascimento: perfil.nascimento ?? "",
    telefone: perfil.telefone ?? "",
    cidade: perfil.cidade ?? "",
    estado: perfil.estado ?? "",
    profissao: perfil.profissao ?? "",
    sobre: perfil.sobre ?? "",
  });
  const [avatar, setAvatar] = useState(perfil.avatar);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [trocando, iniciarTroca] = useTransition();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [saindo, iniciarSaida] = useTransition();
  const seletor = useRef<HTMLInputElement>(null);
  const aviso = useAviso();

  const campo = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: k === "telefone" ? formatarTelefone(e.target.value) : e.target.value })),
  });

  function salvar(fotoNova: string | null = avatar) {
    setErro(null);
    iniciarSalvar(async () => {
      const r = await salvarPerfil({ ...form, avatar: fotoNova });
      if (r.ok) {
        setSalvo({ ...salvo, ...vazioParaNulo(form), avatar: fotoNova });
        aviso.mostrar({ mensagem: "Perfil salvo" }, 2500);
        setAba("perfil");
      } else {
        setErro(r.erro);
        setAba("editar");
      }
    });
  }

  const anos = idade(salvo.nascimento);
  const linhas: [string, string | null][] = [
    ["Nome completo", salvo.nomeCompleto],
    ["Como quer ser chamado", salvo.nome],
    ["Nascimento", salvo.nascimento ? `${formatarNascimento(salvo.nascimento)}${anos !== null ? ` · ${anos} anos` : ""}` : null],
    ["Telefone", salvo.telefone],
    ["Cidade", [salvo.cidade, salvo.estado].filter(Boolean).join(" - ") || null],
    ["Profissão", salvo.profissao],
    ["E-mail", salvo.email],
  ];

  return (
    <div className="space-y-5">
      {/* Cabeça do perfil: foto, nome e e-mail */}
      <section className="flex animate-entrar flex-col items-center pt-2 text-center">
        <button
          type="button"
          onClick={() => seletor.current?.click()}
          className="group relative rounded-full"
          aria-label="Trocar foto de perfil"
        >
          <Avatar perfil={{ nome: salvo.nome || salvo.nomeCompleto, email: salvo.email, avatar }} tamanho={104} />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--fundo)] bg-botao text-white shadow">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        </button>
        <input
          ref={seletor}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (!arquivo) return;
            try {
              const foto = await reduzirFoto(arquivo);
              setAvatar(foto);
              salvar(foto); // salva a foto na hora
            } catch {
              setErro("Não consegui abrir essa imagem. Tente outra.");
            }
          }}
        />
        <p className="mt-3 text-2xl font-bold tracking-tight">{nomeExibido(salvo)}</p>
        <p className="text-sm text-suave">{salvo.email}</p>
        {avatar && (
          <button
            type="button"
            onClick={() => {
              setAvatar(null);
              salvar(null);
            }}
            className="mt-2 text-xs font-medium text-suave underline-offset-2 hover:underline"
          >
            Remover foto
          </button>
        )}
      </section>

      {/* Abas */}
      <div className="vidro flex gap-1 rounded-full p-1" role="tablist">
        {(
          [
            ["perfil", "Perfil"],
            ["editar", "Editar"],
            ["conta", "Conta"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            onClick={() => setAba(valor)}
            className={`aba rounded-full ${aba === valor ? "aba-ativa" : ""}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "perfil" && (
        <div className="animate-entrar space-y-4">
          {salvo.sobre && (
            <section className="cartao p-5">
              <p className="mb-1 text-xs font-medium text-suave">Sobre mim</p>
              <p className="whitespace-pre-wrap leading-relaxed">{salvo.sobre}</p>
            </section>
          )}
          <dl className="cartao divide-y divide-borda overflow-hidden">
            {linhas.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                <dt className="shrink-0 text-sm text-suave">{rotulo}</dt>
                <dd className={`min-w-0 text-right ${valor ? "font-medium" : "text-suave/60"}`}>{valor ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <button type="button" onClick={() => setAba("editar")} className="botao-secundario w-full">
            Editar perfil
          </button>
        </div>
      )}

      {aba === "editar" && (
        <form
          className="cartao animate-entrar space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <label className="block">
            <span className="rotulo">Nome completo</span>
            <input className="campo" autoComplete="name" maxLength={120} {...campo("nomeCompleto")} />
          </label>
          <label className="block">
            <span className="rotulo">Como quer ser chamado</span>
            <input className="campo" autoComplete="nickname" placeholder="Ex: Rafa" maxLength={60} {...campo("nome")} />
            <span className="mt-1 block text-xs text-suave">É assim que o assistente vai te chamar.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="rotulo">Nascimento</span>
              <input className="campo" type="date" autoComplete="bday" {...campo("nascimento")} />
            </label>
            <label className="block">
              <span className="rotulo">Telefone</span>
              <input className="campo" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" {...campo("telefone")} />
            </label>
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <label className="block">
              <span className="rotulo">Cidade</span>
              <input className="campo" autoComplete="address-level2" placeholder="Ex: Campinas" maxLength={60} {...campo("cidade")} />
            </label>
            <label className="block">
              <span className="rotulo">Estado</span>
              <select className="campo" {...campo("estado")}>
                <option value="">—</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <span className="-mt-2 block text-xs text-suave">A cidade ajuda o assistente com o clima e lugares perto de você.</span>
          <label className="block">
            <span className="rotulo">Profissão</span>
            <input className="campo" autoComplete="organization-title" maxLength={80} {...campo("profissao")} />
          </label>
          <label className="block">
            <span className="rotulo">Sobre mim</span>
            <textarea className="campo min-h-24 resize-none" maxLength={500} placeholder="Algo que o assistente deva saber sobre você" {...campo("sobre")} />
          </label>
          {erro && <p className="rounded-xl bg-gasto-suave px-3 py-2 text-sm text-gasto">{erro}</p>}
          <button type="submit" disabled={salvando} className="botao-primario w-full">
            {salvando ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      )}

      {aba === "conta" && (
        <div className="animate-entrar space-y-5">
          <form
            className="cartao space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              setErroSenha(null);
              if (senha !== senha2) return setErroSenha("As duas senhas não são iguais.");
              iniciarTroca(async () => {
                const r = await trocarSenha(senha);
                if (r.ok) {
                  setSenha("");
                  setSenha2("");
                  aviso.mostrar({ mensagem: "Senha trocada" }, 2500);
                } else setErroSenha(r.erro);
              });
            }}
          >
            <div>
              <p className="text-xs font-medium text-suave">E-mail da conta</p>
              <p className="font-medium">{salvo.email}</p>
            </div>
            <h2 className="pt-1 font-semibold">Trocar senha</h2>
            <input className="campo" type="password" autoComplete="new-password" placeholder="Nova senha" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} required />
            <input className="campo" type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={senha2} onChange={(e) => setSenha2(e.target.value)} minLength={6} required />
            {erroSenha && <p className="rounded-xl bg-gasto-suave px-3 py-2 text-sm text-gasto">{erroSenha}</p>}
            <button type="submit" disabled={trocando} className="botao-secundario w-full">
              {trocando ? "Trocando..." : "Trocar senha"}
            </button>
          </form>

          {/* Sair: lá embaixo, separado dos outros botões, e com confirmação */}
          <button
            type="button"
            onClick={() => setConfirmarSaida(true)}
            className="vidro flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-gasto transition active:scale-[0.98]"
          >
            <IconeSair className="h-5 w-5" /> Sair da conta
          </button>
        </div>
      )}

      <Confirmar
        aberta={confirmarSaida}
        titulo="Sair da conta?"
        mensagem="Você vai precisar do e-mail e da senha para entrar de novo. Nada é apagado."
        confirmar="Sair"
        ocupado={saindo}
        aoConfirmar={() => iniciarSaida(() => sairDaConta())}
        aoCancelar={() => setConfirmarSaida(false)}
      />
      {aviso.elemento}
    </div>
  );
}

function vazioParaNulo(form: Record<string, string>) {
  return {
    nome: form.nome.trim() || null,
    nomeCompleto: form.nomeCompleto.trim() || null,
    nascimento: form.nascimento || null,
    telefone: form.telefone.trim() || null,
    cidade: form.cidade.trim() || null,
    estado: form.estado || null,
    profissao: form.profissao.trim() || null,
    sobre: form.sobre.trim() || null,
  };
}
