import { REFERENCIAS_TEXTURAIS } from '../lib/soilReferences';

const vertices = {
  clay: [210, 28],
  sand: [48, 244],
  silt: [372, 244],
} as const;

function ponto(percentuais: { argila: number; areia: number; silte: number }) {
  const clay = percentuais.argila / 100;
  const sand = percentuais.areia / 100;
  const silt = percentuais.silte / 100;
  return [
    vertices.clay[0] * clay + vertices.sand[0] * sand + vertices.silt[0] * silt,
    vertices.clay[1] * clay + vertices.sand[1] * sand + vertices.silt[1] * silt,
  ] as const;
}

function linhaDosPercentuais(tipo: 'argila' | 'areia' | 'silte', percentual: number) {
  const restante = 100 - percentual;
  const extremos = tipo === 'argila'
    ? [
        ponto({ argila: percentual, areia: restante, silte: 0 }),
        ponto({ argila: percentual, areia: 0, silte: restante }),
      ]
    : tipo === 'areia'
      ? [
          ponto({ argila: percentual, areia: restante, silte: 0 }),
          ponto({ argila: 0, areia: restante, silte: percentual }),
        ]
      : [
          ponto({ argila: percentual, areia: 0, silte: restante }),
          ponto({ argila: 0, areia: restante, silte: percentual }),
        ];

  return extremos.map(([x, y]) => `${x},${y}`).join(' ');
}

interface SoilTextureTriangleProps {
  selectedClass?: string;
}

export function SoilTextureTriangle({ selectedClass }: SoilTextureTriangleProps) {
  const classe = (id: string, nome: string, x: number, y: number) => {
    const selecionada = selectedClass === id;
    return (
      <text
        key={id}
        x={x}
        y={y}
        textAnchor="middle"
        className={selecionada ? 'fill-emerald-800 font-bold' : 'fill-slate-600'}
        fontSize="11"
      >
        {nome}
      </text>
    );
  };

  const escala = (tipo: 'argila' | 'areia' | 'silte') =>
    Array.from({ length: 9 }, (_, index) => (index + 1) * 10).map((percentual) => (
      <polyline
        key={`${tipo}-${percentual}`}
        points={linhaDosPercentuais(tipo, percentual)}
        fill="none"
        stroke={percentual % 20 === 0 ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={percentual % 20 === 0 ? 1.1 : 0.7}
      />
    ));

  const selectedName = REFERENCIAS_TEXTURAIS.find(({ id }) => id === selectedClass)?.nome;

  return (
    <figure className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <figcaption className="mb-2 text-sm font-bold text-slate-800">
        Triângulo textural do solo
      </figcaption>
      <svg
        viewBox="0 0 420 300"
        role="img"
        aria-labelledby="triangulo-textural-titulo triangulo-textural-descricao"
        className="mx-auto block h-auto w-full max-w-[520px]"
      >
        <title id="triangulo-textural-titulo">Triângulo de agrupamento textural do solo</title>
        <desc id="triangulo-textural-descricao">
          Diagrama ternário com os eixos de porcentagem de argila, areia e silte. As cinco classes de referência são muito argilosa, argilosa, média, siltosa e arenosa.
        </desc>

        <polygon
          points={`${vertices.clay.join(',')} ${vertices.sand.join(',')} ${vertices.silt.join(',')}`}
          fill="#f8fafc"
          stroke="#475569"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {escala('argila')}
        {escala('areia')}
        {escala('silte')}
        <polygon
          points={`${vertices.clay.join(',')} ${vertices.sand.join(',')} ${vertices.silt.join(',')}`}
          fill="none"
          stroke="#475569"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {Array.from({ length: 6 }, (_, index) => index * 20).map((percentual) => {
          const leftTick = ponto({ argila: percentual, areia: 100 - percentual, silte: 0 });
          const rightTick = ponto({ argila: percentual, areia: 0, silte: 100 - percentual });
          const bottomTick = ponto({ argila: 0, areia: 100 - percentual, silte: percentual });
          return (
            <g key={`tick-${percentual}`} className="fill-slate-500" fontSize="9">
              <text x={leftTick[0] - 9} y={leftTick[1] + 3} textAnchor="end">{percentual}</text>
              <text x={rightTick[0] + 9} y={rightTick[1] + 3}>{100 - percentual}</text>
              <text x={bottomTick[0]} y={bottomTick[1] + 14} textAnchor="middle">{100 - percentual}</text>
            </g>
          );
        })}

        {classe('muito-argilosa', 'Muito argilosa', 210, 72)}
        {classe('argilosa', 'Argilosa', 210, 139)}
        {classe('media', 'Média', 210, 195)}
        {classe('siltosa', 'Siltosa', 300, 201)}
        {classe('arenosa', 'Arenosa', 120, 214)}

        <text x="33" y="133" transform="rotate(-53 33 133)" textAnchor="middle" className="fill-slate-700" fontSize="10" fontWeight="600">
          Argila (%)
        </text>
        <text x="210" y="278" textAnchor="middle" className="fill-slate-700" fontSize="10" fontWeight="600">
          Areia (%)
        </text>
        <text x="390" y="133" transform="rotate(53 390 133)" textAnchor="middle" className="fill-slate-700" fontSize="10" fontWeight="600">
          Silte (%)
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-600" aria-label="Classes texturais">
        {REFERENCIAS_TEXTURAIS.map(({ id, nome }) => (
          <span key={id} className={selectedClass === id ? 'font-bold text-emerald-800' : ''}>
            {nome}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-xs leading-5 text-slate-500">
        Esquema visual de referência. {selectedName ? `Classe selecionada: ${selectedName}.` : 'Confirme a classe pela análise granulométrica do solo.'}
      </p>
    </figure>
  );
}
