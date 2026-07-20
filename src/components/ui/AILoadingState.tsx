import { useEffect, useRef, useState } from "react";

const TASK_SEQUENCES = [
  {
    status: "Carregando seus dados",
    lines: [
      "Conectando ao servidor...",
      "Verificando autenticação...",
      "Carregando perfil do usuário...",
      "Sincronizando dados da conta...",
    ],
  },
  {
    status: "Buscando informações",
    lines: [
      "Carregando propriedades...",
      "Buscando áreas cadastradas...",
      "Carregando dados de irrigação...",
      "Sincronizando leituras recentes...",
      "Atualizando mapa interativo...",
    ],
  },
  {
    status: "Preparando ambiente",
    lines: [
      "Configurando painel de controle...",
      "Carregando parâmetros técnicos...",
      "Inicializando componentes visuais...",
      "Aplicando preferências do usuário...",
      "Finalizando preparação...",
      "Pronto!",
    ],
  },
];

const LoadingAnimation = ({ progress }: { progress: number }) => (
  <div className="relative h-6 w-6">
    <svg
      aria-label={`Carregando: ${Math.round(progress)}%`}
      className="h-full w-full"
      fill="none"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="progress-mask">
          <rect fill="black" height="240" width="240" />
          <circle
            cx="120"
            cy="120"
            fill="white"
            r="120"
            strokeDasharray={`${(progress / 100) * 754}, 754`}
            transform="rotate(-90 120 120)"
          />
        </mask>
      </defs>

      <style>{`
        @keyframes rotate-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotate-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .g-spin circle {
          transform-origin: 120px 120px;
        }
        .g-spin circle:nth-child(1) { animation: rotate-cw 8s linear infinite; }
        .g-spin circle:nth-child(2) { animation: rotate-ccw 8s linear infinite; }
        .g-spin circle:nth-child(3) { animation: rotate-cw 8s linear infinite; }
        .g-spin circle:nth-child(4) { animation: rotate-ccw 8s linear infinite; }
        .g-spin circle:nth-child(5) { animation: rotate-cw 8s linear infinite; }
        .g-spin circle:nth-child(6) { animation: rotate-ccw 8s linear infinite; }
        .g-spin circle:nth-child(2n) { animation-delay: 0.2s; }
        .g-spin circle:nth-child(3n) { animation-delay: 0.3s; }
      `}</style>

      <g
        className="g-spin"
        mask="url(#progress-mask)"
        strokeDasharray="18% 40%"
        strokeWidth="16"
      >
        <circle cx="120" cy="120" opacity="0.95" r="150" stroke="#356b46" />
        <circle cx="120" cy="120" opacity="0.95" r="130" stroke="#4ADE80" />
        <circle cx="120" cy="120" opacity="0.95" r="110" stroke="#b57d59" />
        <circle cx="120" cy="120" opacity="0.95" r="90" stroke="#FFA726" />
        <circle cx="120" cy="120" opacity="0.95" r="70" stroke="#FFEB3B" />
        <circle cx="120" cy="120" opacity="0.95" r="50" stroke="#2D7D46" />
      </g>
    </svg>
  </div>
);

export default function AILoadingState() {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState<Array<{ text: string; number: number }>>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const lineHeight = 28;

  const currentSequence = TASK_SEQUENCES[sequenceIndex];
  const totalLines = currentSequence.lines.length;

  useEffect(() => {
    const initialLines = [];
    for (let i = 0; i < Math.min(5, totalLines); i++) {
      initialLines.push({ text: currentSequence.lines[i], number: i + 1 });
    }
    setVisibleLines(initialLines);
    setScrollPosition(0);
  }, [sequenceIndex, currentSequence.lines, totalLines]);

  useEffect(() => {
    const advanceTimer = setInterval(() => {
      const firstVisibleLineIndex = Math.floor(scrollPosition / lineHeight);
      const nextLineIndex = (firstVisibleLineIndex + 3) % totalLines;

      if (nextLineIndex < firstVisibleLineIndex && nextLineIndex !== 0) {
        setSequenceIndex((prevIndex) => (prevIndex + 1) % TASK_SEQUENCES.length);
        return;
      }

      if (nextLineIndex >= visibleLines.length && nextLineIndex < totalLines) {
        setVisibleLines((prevLines) => [
          ...prevLines,
          { text: currentSequence.lines[nextLineIndex], number: nextLineIndex + 1 },
        ]);
      }

      setScrollPosition((prevPosition) => prevPosition + lineHeight);
    }, 2000);

    return () => clearInterval(advanceTimer);
  }, [scrollPosition, visibleLines, totalLines, sequenceIndex, currentSequence.lines, lineHeight]);

  useEffect(() => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F9FAFB]">
      <div className="w-auto space-y-4">
        <div className="ml-2 flex items-center space-x-2 font-medium text-gray-600">
          <LoadingAnimation progress={(sequenceIndex / TASK_SEQUENCES.length) * 100} />
          <span className="text-sm">{currentSequence.status}...</span>
        </div>

        <div className="relative">
          <div
            className="relative h-[84px] w-full overflow-hidden rounded-lg font-mono text-xs"
            ref={codeContainerRef}
            style={{ scrollBehavior: "smooth" }}
          >
            <div>
              {visibleLines.map((line, index) => (
                <div className="flex h-[28px] items-center px-2" key={`${line.number}-${line.text}`}>
                  <div className="w-6 select-none pr-3 text-right text-gray-400">{line.number}</div>
                  <div className="ml-1 flex-1 text-gray-800">{line.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-lg from-white/90 via-white/50 to-transparent"
            style={{
              background:
                "linear-gradient(to bottom, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 30%, var(--tw-gradient-to) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
