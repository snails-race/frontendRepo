import { useState, useEffect, useRef, useCallback } from 'react';
import s from './ScanAnalysisPage.module.css';

/* ── helpers ── */
function hexStr(len: number) {
  let r = '';
  for (let i = 0; i < len; i++) r += Math.floor(Math.random() * 16).toString(16).toUpperCase();
  return r;
}

const STEPS = [
  'Extracting spatial features...',
  'Analyzing temporal consistency...',
  'Checking facial landmark alignment...',
  'Running CNN-LSTM model...',
  'Compiling confidence report...',
];

const CLASSES = ['Temporal-Sync', 'Spatial-Blend', 'Mesh-Deform', 'Lighting-Incon'];
const VECTORS = ['FACE.01', 'MOUTH.L', 'EYE.R', 'BG.BLEND'];
const NUM_ROWS = 16;

/* ── Table data generator ── */
function makeTableData() {
  const rows: {
    time: string;
    frameId: string;
    vector: string;
    classification: string;
    score: number;
    variance: number;
    isPositive: boolean;
  }[] = [];
  for (let i = 0; i < 40; i++) {
    const scoreBase = i > 15 && i < 30 ? 0.6 + Math.random() * 0.38 : 0.1 + Math.random() * 0.4;
    rows.push({
      time: `00:00:${(i * 0.1).toFixed(3).padStart(6, '0')}`,
      frameId: `FRM-${Math.floor(1000 + i * 4.2)}`,
      vector: VECTORS[Math.floor(Math.random() * VECTORS.length)],
      classification: CLASSES[Math.floor(Math.random() * CLASSES.length)],
      score: parseFloat(scoreBase.toFixed(4)),
      variance: parseFloat((Math.random() * 0.5).toFixed(3)),
      isPositive: Math.random() > 0.5,
    });
  }
  return rows;
}

/* ── Topography bar data generator ── */
function makeTopoData(n = 120) {
  const bars: { height: number; isAnomalous: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    let h = 10 + Math.random() * 20;
    if (i > 50 && i < 100) {
      const d = Math.abs(75 - i);
      const spike = Math.max(0, 1 - d / 25);
      h += spike * 60 + Math.random() * 20;
    }
    h = Math.min(95, h);
    bars.push({ height: h, isAnomalous: h > 75 });
  }
  return bars;
}

/* ── Radial node data ── */
function makeRadialNodes() {
  const nodes: { x: number; y: number; size: number; blue: boolean; angle: number; radius: number }[] = [];
  const lines: { angle: number; radius: number }[] = [];
  [25, 50, 75, 100].forEach((ringSize) => {
    const r = ringSize / 2;
    const count = Math.floor(ringSize * 0.5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const x = 50 + r * Math.cos(angle);
      const y = 50 + r * Math.sin(angle);
      const isAnomalous = ringSize >= 75 && Math.random() > 0.4;
      nodes.push({ x, y, size: isAnomalous ? 6 : 4, blue: isAnomalous, angle, radius: r });
      if (isAnomalous && Math.random() > 0.5) {
        lines.push({ angle, radius: r });
      }
    }
  });
  return { nodes, lines };
}

/* ━━━━━━━━━━━━ Component ━━━━━━━━━━━━ */
export default function ScanAnalysisPage() {
  const [view, setView] = useState<'loading' | 'results'>('loading');
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState(STEPS[0]);

  /* Matrix state */
  const [matrixRows, setMatrixRows] = useState<{ data: string; state: 'idle' | 'active' | 'fading' }[]>(
    () => Array.from({ length: NUM_ROWS }, () => ({ data: '-- -- -- --', state: 'idle' as const }))
  );
  const [scannerRow, setScannerRow] = useState(0);
  const scannerRowRef = useRef(0);

  /* Params */
  const [param1, setParam1] = useState('0.045');
  const [param2, setParam2] = useState('0.920');

  /* Canvas refs */
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const graphAnimRef = useRef<number>(0);

  /* Results data (lazy) */
  const [topoData, setTopoData] = useState<ReturnType<typeof makeTopoData>>([]);
  const [topoAnimated, setTopoAnimated] = useState(false);
  const [tableData, setTableData] = useState<ReturnType<typeof makeTableData>>([]);
  const [radialData, setRadialData] = useState<ReturnType<typeof makeRadialNodes>>({ nodes: [], lines: [] });
  const [radialExpanded, setRadialExpanded] = useState(false);

  /* ── Matrix scanner interval ── */
  useEffect(() => {
    if (view !== 'loading') return;
    const id = setInterval(() => {
      const cur = scannerRowRef.current;
      const prev = cur === 0 ? NUM_ROWS - 1 : cur - 1;
      const val1 = hexStr(4);
      const val2 = hexStr(4);

      setMatrixRows((rows) =>
        rows.map((r, i) => {
          if (i === cur) return { data: `${val1} ${val2} [EXTRACT]`, state: 'active' };
          if (i === prev) return { ...r, state: 'fading' };
          return r;
        })
      );
      setScannerRow(cur);
      scannerRowRef.current = (cur + 1) % NUM_ROWS;

      if (Math.random() > 0.7) setParam1((0.04 + Math.random() * 0.01).toFixed(3));
      if (Math.random() > 0.7) setParam2((0.9 + Math.random() * 0.05).toFixed(3));
    }, 100);
    return () => clearInterval(id);
  }, [view]);

  /* ── Canvas graphs ── */
  const initGraph = useCallback(
    (canvas: HTMLCanvasElement, color: string, speed: number, complexity: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const data: number[] = new Array(60).fill(0.5);
      let time = 0;

      function resize() {
        canvas.width = canvas.parentElement!.offsetWidth;
        canvas.height = canvas.parentElement!.offsetHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      function draw() {
        time += speed;
        const noise = (Math.random() - 0.5) * 0.1;
        const trend = Math.sin(time * complexity) * 0.3 + 0.5;
        data.push(Math.max(0.1, Math.min(0.9, trend + noise)));
        data.shift();

        ctx!.clearRect(0, 0, canvas.width, canvas.height);

        ctx!.strokeStyle = '#E5E5EA';
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(0, canvas.height / 2);
        ctx!.lineTo(canvas.width, canvas.height / 2);
        ctx!.stroke();

        ctx!.strokeStyle = color;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        const step = canvas.width / (data.length - 1);
        for (let i = 0; i < data.length; i++) {
          const x = i * step;
          const y = canvas.height - data[i] * canvas.height;
          if (i === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();

        const lastY = canvas.height - data[data.length - 1] * canvas.height;
        ctx!.beginPath();
        ctx!.arc(canvas.width - 2, lastY, 3, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();

        graphAnimRef.current = requestAnimationFrame(draw);
      }
      draw();
      return () => window.removeEventListener('resize', resize);
    },
    []
  );

  useEffect(() => {
    if (view !== 'loading') return;
    const c1 = canvas1Ref.current;
    const c2 = canvas2Ref.current;
    if (!c1 || !c2) return;

    const cleanup1 = initGraph(c1, '#0003FF', 0.05, 1);
    const cleanup2 = initGraph(c2, '#111111', 0.03, 2);

    return () => {
      cancelAnimationFrame(graphAnimRef.current);
      cleanup1?.();
      cleanup2?.();
    };
  }, [view, initGraph]);

  /* ── Progress ── */
  useEffect(() => {
    if (view !== 'loading') return;
    let prog = 0;
    const id = setInterval(() => {
      prog += Math.random() * 2.5;
      if (prog > 100) prog = 100;
      setProgress(prog);
      const stepIdx = Math.floor((prog / 100) * STEPS.length);
      if (STEPS[stepIdx]) setStepText(STEPS[stepIdx]);
      if (prog >= 100) {
        clearInterval(id);
        setTimeout(() => showResults(), 500);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* ── Switch to results ── */
  function showResults() {
    cancelAnimationFrame(graphAnimRef.current);
    setTopoData(makeTopoData());
    setTableData(makeTableData());
    setRadialData(makeRadialNodes());
    setRadialExpanded(false);
    setTopoAnimated(false);
    setView('results');

    setTimeout(() => {
      setTopoAnimated(true);
      setRadialExpanded(true);
    }, 300);
  }

  function resetAnalysis() {
    setProgress(0);
    setStepText(STEPS[0]);
    scannerRowRef.current = 0;
    setScannerRow(0);
    setMatrixRows(Array.from({ length: NUM_ROWS }, () => ({ data: '-- -- -- --', state: 'idle' })));
    setView('loading');
  }

  const pctStr = `${Math.floor(progress)}%`;

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <header className={s.header}>
        <div className={s.logoWrap}>
          <svg viewBox="0 0 24 24" fill="none" className={s.logoIcon}>
            <circle cx="9" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
            <circle cx="15" cy="12" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
          Solomon AI
        </div>
        <div className={s.headerMeta}>
          <div className={s.metaItem}>
            <span className={s.metaLabel}>Target</span>
            <span className={s.metaValue}>video_evidence_73A.mp4</span>
          </div>
          <div className={s.metaItem}>
            <span className={s.metaLabel}>System</span>
            <span className={s.statusOnline}>
              <span className={s.statusDot} />
              ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className={s.main}>
        {/* ── Loading View ── */}
        <div className={`${s.viewLoading} ${view !== 'loading' ? s.hidden : ''}`}>
          <div className={s.loadingCard}>
            {/* Top bar */}
            <div className={s.loadingTopBar}>
              <div className={s.topBarGroup}>
                <div>
                  <span>SYS</span> <b className={s.topBarValue}>DEEPFAKE_ENG</b>
                </div>
                <div>
                  <span className={s.scanIndicator}>►</span>{' '}
                  <b className={s.topBarValue}>SCANNING</b>
                </div>
              </div>
              <div className={s.topBarGroup}>
                <div>
                  <span>MEM</span> <b className={s.topBarValue}>4.2GB</b>
                </div>
                <div>
                  <span>PROG</span> <b className={s.topBarBlue}>{pctStr}</b>
                </div>
              </div>
            </div>

            {/* Loading grid */}
            <div className={s.loadingGrid}>
              {/* Matrix panel */}
              <div className={s.matrixPanel}>
                <div className={s.matrixHeader}>
                  <div>IDX</div>
                  <div className={s.matrixHeaderLeft}>WEIGHT_HASH</div>
                  <div>ST</div>
                </div>
                <div className={s.matrixBody}>
                  <div className={s.scannerBar} style={{ top: scannerRow * 28 }} />
                  {matrixRows.map((row, i) => (
                    <div className={s.matrixRow} key={i}>
                      <div className={s.matrixIdx}>{i.toString(16).toUpperCase().padStart(2, '0')}</div>
                      <div
                        className={`${s.matrixData} ${
                          row.state === 'active' ? s.matrixDataActive : row.state === 'fading' ? s.matrixDataFading : ''
                        }`}
                      >
                        {row.data}
                      </div>
                      <div className={s.matrixSt}>:</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div className={s.rightPanel}>
                <div className={s.sectionHeader}>
                  <span className={s.sectionTitle}>Neural Parameters</span>
                  <span className={s.sectionTag}>CNN-LSTM ARCHITECTURE</span>
                </div>

                {/* Params grid */}
                <div className={s.paramsGrid}>
                  <div className={`${s.paramCell} ${s.paramCellLeft}`}>
                    <div className={s.paramRow}>
                      <span>L_RATE</span>
                      <span className={s.paramValue}>{param1}</span>
                    </div>
                    <div className={s.paramSlider}>
                      <div className={s.paramKnob} style={{ left: '45%' }} />
                    </div>
                  </div>
                  <div className={s.paramCell}>
                    <div className={s.paramRow}>
                      <span>DECAY</span>
                      <span className={s.paramValue}>{param2}</span>
                    </div>
                    <div className={s.paramSlider}>
                      <div className={s.paramKnob} style={{ left: '92%' }} />
                    </div>
                  </div>
                  <div className={`${s.paramCell} ${s.paramCellLeft}`}>
                    <div className={s.paramRow}>
                      <span>BATCH</span>
                      <span className={s.paramValue}>64</span>
                    </div>
                    <div className={s.paramSlider}>
                      <div className={s.paramKnob} style={{ left: '30%' }} />
                    </div>
                  </div>
                  <div className={s.paramCell}>
                    <div className={s.paramRow}>
                      <span>FRAMES</span>
                      <span className={s.paramValue}>1248</span>
                    </div>
                    <div className={s.paramSlider}>
                      <div className={s.paramKnob} style={{ left: '75%' }} />
                    </div>
                  </div>
                </div>

                {/* Graphs section header */}
                <div className={s.sectionHeader}>
                  <span className={s.sectionTitle}>Real-time Extraction</span>
                  <span className={s.sectionTag}>TENSOR_FLOW</span>
                </div>

                {/* Canvas graphs */}
                <div className={s.graphsArea}>
                  <div className={s.graphBox}>
                    <span className={s.graphLabel}>Facial Mesh Loss</span>
                    <canvas ref={canvas1Ref} className={s.graphCanvas} />
                  </div>
                  <div className={s.graphBox}>
                    <span className={s.graphLabel}>Temporal Consistency</span>
                    <canvas ref={canvas2Ref} className={s.graphCanvas} />
                  </div>
                </div>

                {/* Progress */}
                <div className={s.progressSection}>
                  <div className={s.progressInfo}>
                    <span>{stepText}</span>
                    <span className={s.progressPct}>{pctStr}</span>
                  </div>
                  <div className={s.progressTrack}>
                    <div className={s.progressFill} style={{ width: pctStr }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Results View ── */}
        <div className={`${s.viewResults} ${view !== 'results' ? s.hidden : ''}`}>
          {/* Results header */}
          <div className={s.resultsHeader}>
            <div>
              <h1 className={s.resultsTitle}>Analysis Report</h1>
              <p className={s.resultsSubtitle}>Video Evidence 73A &bull; Analyzed in 4.2s</p>
            </div>
            <button className={s.newAnalysisBtn} onClick={resetAnalysis}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Run New Analysis
            </button>
          </div>

          {/* Dashboard grid */}
          <div className={`${s.dashGrid} ${s.fadeEnter} ${view === 'results' ? s.fadeEnterActive : ''}`}>
            {/* Stat cards */}
            <div className={s.statsRow}>
              {/* Verdict */}
              <div className={`${s.statCard} ${s.statCardBlue}`}>
                <div className={s.statTop}>
                  <span className={`${s.statLabel} ${s.statLabelWhite}`}>Verdict</span>
                  <span className={`${s.statIndex} ${s.statIndexWhite}`}>01</span>
                </div>
                <div>
                  <div className={s.statBigValue}>94%</div>
                  <div className={s.statDesc}>AI GENERATED</div>
                </div>
              </div>
              {/* Temporal */}
              <div className={s.statCard}>
                <div className={s.statTop}>
                  <span className={s.statLabel}>Temporal Inconsistency</span>
                  <span className={`${s.statIndex} ${s.statIndexMuted}`}>02</span>
                </div>
                <div>
                  <div className={`${s.statBigValue} ${s.statBigValue4xl}`}>0.84</div>
                  <div className={s.statDescMuted}>High variation in frame sequence</div>
                </div>
              </div>
              {/* Spatial */}
              <div className={s.statCard}>
                <div className={s.statTop}>
                  <span className={s.statLabel}>Spatial Artifacts</span>
                  <span className={`${s.statIndex} ${s.statIndexMuted}`}>03</span>
                </div>
                <div>
                  <div className={`${s.statBigValue} ${s.statBigValue4xl}`}>12.4k</div>
                  <div className={s.statDescMuted}>Anomalous pixels in facial bounds</div>
                </div>
              </div>
              {/* System Load */}
              <div className={s.statCard}>
                <div className={s.statTop}>
                  <span className={s.statLabel}>System Load / Conf</span>
                  <span className={`${s.statIndex} ${s.statIndexMuted}`}>04</span>
                </div>
                <div>
                  <div className={`${s.statBigValue} ${s.statBigValue4xl}`}>High</div>
                  <div className={s.statDescMuted}>Model confidence threshold met</div>
                </div>
              </div>
            </div>

            {/* Topography chart */}
            <div className={s.topoCell}>
              <div className={s.topoHeader}>
                <div>
                  <span className={s.topoSectionLabel}>Macro Observation</span>
                  <h2 className={s.topoTitle}>
                    Frame-by-Frame <span className={s.topoTitleMuted}>Anomaly Topography.</span>
                  </h2>
                </div>
                <div className={s.topoAxisLabels}>
                  <span className={s.topoAxisY}>Y: ANOMALY SCORE</span>
                  <span className={s.topoAxisX}>X: TIME (S)</span>
                </div>
              </div>
              <div className={s.topoContainer}>
                <div className={s.topoDashLine} style={{ bottom: '25%' }} />
                <div className={s.topoDashLine} style={{ bottom: '50%' }} />
                <div className={`${s.topoDashLine} ${s.topoDashLineThreshold}`} style={{ bottom: '75%' }}>
                  <span className={s.topoThresholdLabel}>THRESHOLD (0.75)</span>
                </div>
                {topoData.map((bar, i) => (
                  <div
                    key={i}
                    className={`${s.topoBar} ${bar.isAnomalous ? s.topoBarBlue : ''}`}
                    style={{ height: topoAnimated ? `${bar.height}%` : '0%', transitionDelay: `${i * 10}ms` }}
                  >
                    {i % 15 === 0 && <span className={s.topoBarLabel}>{(i * 0.1).toFixed(1)}s</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Radial chart */}
            <div className={s.radialCell}>
              <div className={s.radialHeader}>
                <span className={s.radialSectionLabel}>Micro Distribution</span>
                <div className={s.radialTitle}>Facial Landmark Deviations</div>
              </div>
              <div className={s.radialArea}>
                <div className={s.radialContainer}>
                  <div className={`${s.radialRing} ${s.radialRing100}`} />
                  <div className={`${s.radialRing} ${s.radialRing75}`} />
                  <div className={`${s.radialRing} ${s.radialRing50}`} />
                  <div className={`${s.radialRing} ${s.radialRing25}`} />
                  <div className={s.radialCenter} />
                  {radialData.lines.map((line, i) => (
                    <div
                      key={`line-${i}`}
                      className={s.radialLine}
                      style={{
                        transform: `rotate(${line.angle}rad)`,
                        width: radialExpanded ? `${line.radius}%` : '0%',
                      }}
                    />
                  ))}
                  {radialData.nodes.map((node, i) => (
                    <div
                      key={`node-${i}`}
                      className={s.radialNode}
                      style={{
                        left: radialExpanded ? `${node.x}%` : '50%',
                        top: radialExpanded ? `${node.y}%` : '50%',
                        width: node.size,
                        height: node.size,
                        backgroundColor: node.blue ? 'var(--accent-blue)' : 'var(--text-main)',
                        opacity: Math.random() > 0.3 ? 1 : 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className={s.radialFooter}>
                <span>Core Features</span>
                <span>Periphery Features</span>
              </div>
            </div>

            {/* Data table */}
            <div className={s.tableCell}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Frame ID</th>
                    <th>Artifact Vector</th>
                    <th>Classification</th>
                    <th className={s.thRight}>Anomaly Score</th>
                    <th className={s.thRight}>Variance (&Delta;)</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      <td className={s.tdMuted}>{row.time}</td>
                      <td>{row.frameId}</td>
                      <td className={s.tdMuted}>{row.vector}</td>
                      <td>{row.classification}</td>
                      <td className={`${s.tdRight} ${row.score > 0.75 ? s.tdAnomaly : s.tdNormal}`}>
                        {row.score.toFixed(4)}
                      </td>
                      <td className={`${s.tdRight} ${row.isPositive ? s.tdPositive : s.tdNegative}`}>
                        {row.isPositive ? '+' : '-'}
                        {row.variance.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
