// Transição discreta ao trocar de tela (aparece suavemente, sem pular)
export default function Transicao({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 animate-surgir flex-col">{children}</div>;
}
