import { useRef, useEffect, useState, useCallback } from "react";

// credits to my digital design classes for the palettes database
const HEART_PALETTES = [
    { name: "crimson", cols: ["#ff1744","#ff5252","#ff80ab","#f06292", "#e91e63"] },
    { name: "blush", cols: ["#ff6b9d","#ff8fab","#ffb3c6", "#ffc8dd", "#ff4d6d"] },
    { name: "violet", cols: ["#9c27b0","#ce93d8","#e040fb","#7b1fa2","#f48fb1"] },
    { name: "ember", cols: ["#ff6d00","#ff3d00","#ff9100","#ffab40","#e64a19"] },
    { name: "neon", cols: ["#ff0055","#ff00aa","#aa00ff","#ff3399","#ff0077"] },
    { name: "mono", cols: ["#ffffff","#cccccc","#999999","#e0e0e0","#f5f5f5"] },
];

const STAR_PALETTES = [
    { name: "galaxy", cols: ["#7c3aed","#a78bfa","#e0c3fc","#c4b5fd","#6d28d9"] },
    { name: "aurora", cols: ["#06b6d4","#67e8f9","#a5f3fc","#0891b2","#164e63"] },
    { name: "gold", cols: ["#f59e0b","#fcd34d","#fef3c7","#d97706","#b45309"] },
    { name: "night", cols: ["#e2e8f0","#94a3b8","#cbd5e1","#f8fafc","#475569"] },
    { name: "reddish", cols: ["#ff4500","#ff6a00","#ffb347","#ff0080","#cc0000"] },
    { name: "ice", cols: ["#cffafe","#7dd3fc","#38bdf8","#e0f2fe","#bae6fd"] },
];

const DIR_LABELS = ["none","right","left","down","up","↘","↙","↗","↖"];
const DIRS = [null,[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];

function seededRand(seed) {
    let s = seed;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) | 0;
        return (s >>> 0) / 4294967296;
    };
}

function heartPoints(cx, cy, scale, angle) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
        const t = (i / 80) * Math.PI * 2;
        const x0 = 16 * Math.pow(Math.sin(t), 3);
        const y0 = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        const cos = Math.cos(angle), sin = Math.sin(angle);
        pts.push([cx + scale * (cos*x0 - sin*y0), cy + scale * (sin*x0 + cos*y0)]);
    }
    return pts;
}

function starPoints(cx, cy, scale, angle, spikes) {
    const pts = [];
    const total = spikes * 2;
    for (let i = 0; i <= total; i++) {
        const t = (i / total) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 16 : 6.5;
        const x0 = r * Math.cos(t);
        const y0 = r * Math.sin(t);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        pts.push([cx + scale * (cos*x0 - sin*y0), cy + scale * (sin*x0 + cos*y0)]);
    }
    return pts;
}

function getPoints(shape, cx, cy, scale, angle, spikes) {
    return shape === "star" ? starPoints(cx, cy, scale, angle, spikes) : heartPoints(cx, cy, scale, angle);
}

function hexAlpha(hex, alpha) {
    return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

function densityWeight(cx, cy, hx, hy, spread, W, H) {
    const dx = (cx - hx) / (W * spread);
    const dy = (cy - hy) / (H * spread);
    return Math.exp(-(dx*dx + dy*dy) * 8);
}

function drawMarker(ctx, x, y, col, shape, spikes) {
    const pts = getPoints(shape, x, y, 0.5, 0, spikes);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.closePath();
    ctx.strokeStyle = hexAlpha(col, 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.strokeStyle = hexAlpha(col, 0.4);
    ctx.lineWidth = 0.8;
    ctx.stroke();
}

function drawScene(ctx, W, H, params, seed, hotspot) {
    const { shape, count, sizeLevel, rotLevel, opacityLevel, fillRatio, dirIndex, paletteIndex, darkBg, densityStrength, densitySpread, spikes } = params;
    
    const palettes = shape === "star" ? STAR_PALETTES : HEART_PALETTES;
    
    const rand = seededRand(seed);

    const maxScale = 0.15 + sizeLevel * 0.28;
    const rotSpread = (rotLevel / 10) * Math.PI;
    const minAlpha = 0.08 + opacityLevel * 0.04;
    const fillProb = fillRatio / 10;
    const dir = DIRS[dirIndex];
    const pal = palettes[Math.min(paletteIndex, palettes.length - 1)].cols;
    const markerCol = pal[0];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = darkBg ? "#0d0a14" : "#fff8f9";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < count; i++) {
        let cx = rand() * W;
        let cy = rand() * H;

        if (dir) {
            const t = i / count;
            const band = 0.25 + rand() * 0.5;
            if (dir[0] !== 0) {
                cx = t * W * (1 + 0.3 * rand());
                cy = band * H + rand() * 80 - 40;
            } else {
                cy = t * H * (1 + 0.3 * rand());
                cx = band * W + rand() * 80 - 40;
            }
        }

        if (hotspot && densityStrength > 0) {
            const pull = densityStrength / 10;
            const spread = densitySpread * 0.15 + 0.05;
            const nx = hotspot.x + (rand() - 0.5) * W * spread * 2;
            const ny = hotspot.y + (rand() - 0.5) * H * spread * 2;
            cx = cx * (1 - pull * 0.7) + nx * (pull * 0.7);
            cy = cy * (1 - pull * 0.7) + ny * (pull * 0.7);
        }

        const sizeT = Math.pow(rand(), 1.5);
        let sizeBoost = 1;
        if (hotspot && densityStrength > 0) {
            const w = densityWeight(cx, cy, hotspot.x, hotspot.y, densitySpread * 0.5 + 0.1, W, H);
            sizeBoost = 1 + w * (densityStrength / 10) * 0.8;
        }

        const scale = (0.06 + sizeT * maxScale) * sizeBoost;
        const angle = (rand() - 0.5) * 2 * rotSpread;
        const alpha = minAlpha + rand() * (1 - minAlpha) * 0.8;
        const col = pal[Math.floor(rand() * pal.length)];
        const filled = rand() < fillProb;

        const pts = getPoints(shape, cx, cy, scale, angle, spikes);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.closePath();
        
        if (filled) {
            ctx.fillStyle = hexAlpha(col, alpha * 0.75);
            ctx.fill();
        }
        ctx.strokeStyle = hexAlpha(col, alpha);
        ctx.lineWidth = 0.4 + scale * 0.6;
        ctx.stroke();
    }

    if (hotspot) {
        drawMarker(ctx, hotspot.x, hotspot.y, markerCol, shape, spikes);
    }
}

function Slider({ label, id, min, max, value, step = 1, format, onChange }) {
    return (
        <div style={styles.ctrl}>
            <label style={styles.label} htmlFor={id}>{label}</label>
            <div style={styles.ctrlRow}>
                <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderVal}>{format ? format(value) : value}</span>
            </div>
        </div>
    );
}

export default function Hearty() {
    const canvasRef = useRef(null);
    const W = 680, H = 460;

    const [seed, setSeed] = useState(() => Date.now() & 0x7fffffff);
    const [hotspot, setHotspot] = useState(null);
    const [params, setParams] = useState({ shape: "heart", count: 130, sizeLevel: 5, rotLevel: 3, opacityLevel: 6, fillRatio: 6, dirIndex: 0, paletteIndex: 0, darkBg: true, densityStrength: 6, densitySpread: 4, spikes: 5, });

    const set = (key) => (val) => setParams(p => ({ ...p, [key]: val }));

    const switchShape = (shape) => {
        setParams(p => ({ ...p, shape, paletteIndex: 0 }));
    };

    const redraw = useCallback((withMarker = true) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        drawScene(ctx, W, H, params, seed, withMarker ? hotspot : null);
    }, [params, seed, hotspot]);

    useEffect(() => { redraw(true); }, [redraw]);

    const canvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (W / rect.width),
            y: (e.clientY - rect.top) * (H / rect.height),
        };
    };

    const handleCanvasClick = (e) => setHotspot(canvasCoords(e));
    const clearHotspot = () => setHotspot(null);
    const reshuffle = () => setSeed(Date.now() & 0x7fffffff);

    const exportJpg = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        drawScene(ctx, W, H, params, seed, null);
        const link = document.createElement("a");
        link.download = `${params.shape}-${seed}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();
        drawScene(ctx, W, H, params, seed, hotspot);
    };

    const palettes = params.shape === "star" ? STAR_PALETTES : HEART_PALETTES;

    return (
        <div style={styles.root}>
            <div style={{ ...styles.canvasWrap, background: params.darkBg ? "#0d0a14" : "#fff8f9" }}>
                <canvas ref={canvasRef} width={W} height={H} style={{ ...styles.canvas, cursor: "crosshair" }} onClick={handleCanvasClick} title="Click to set density hotspot" />
            </div>

            <div style={styles.controls}>
                <Slider label="hearts" id="count" min={20} max={300} value={params.count} onChange={set("count")} />
                <Slider label="size range" id="size" min={1} max={10} value={params.sizeLevel} onChange={set("sizeLevel")} />
                <Slider label="rotation spread" id="rot" min={0} max={10} value={params.rotLevel} onChange={set("rotLevel")} />
                <Slider label="opacity" id="opacity" min={1} max={10} value={params.opacityLevel} onChange={set("opacityLevel")} />
                <Slider label="fill ratio" id="fill" min={0} max={10} value={params.fillRatio} onChange={set("fillRatio")} />
                <Slider label="flow direction" id="dir" min={0} max={8} value={params.dirIndex} onChange={set("dirIndex")} format={v => DIR_LABELS[v]} />

                {params.shape === "star" && (
                    <Slider label="spikes" id="spikes" min={3} max={8} value={params.spikes} onChange={set("spikes")} />
                )}

                <div style={{ ...styles.sectionHeader, gridColumn: "1 / -1" }}>
                    <span style={styles.sectionLabel}>density map</span>
                    <span style={styles.sectionHint}>
                        {hotspot ? `hotspot at (${Math.round(hotspot.x)}, ${Math.round(hotspot.y)}) - click canvas to move` : "click canvas to set hotspot"}
                    </span>
                    {hotspot && <button style={styles.clearBtn} onClick={clearHotspot}>clear</button>}
                </div>

                <Slider label="pull strength" id="ds" min={0} max={10} value={params.densityStrength} onChange={set("densityStrength")} />
                <Slider label="spread" id="dp" min={1} max={10} value={params.densitySpread} onChange={set("densitySpread")} format={v => ["xs","xs","s","s","m","m","l","l","xl","xl","xl"][v]} />

                <div style={{ ...styles.ctrl, gridColumn: "1 / -1"}}>
                    <label style={styles.label}>palette</label>
                    <div style={styles.paletteRow}>
                        {palettes.map((p, i) => (
                            <button key={p.name} title={p.name} onClick={() => set("paletteIndex")(i)} style={{ ...styles.swatch, background: p.cols[0], outline: i === params.paletteIndex ? "2px solid #ffffff" : "2px solid transparent", outlineOffset: "2px" }} />
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {[
                            { key: "heart", path: "M16 27C16 27 4 19.5 4 11.5A6.5 6.5 0 0 1 16 7.8A6.5 6.5 0 0 1 28 11.5C28 19.5 16 27 16 27Z" },
                            { key: "star",  path: "M16 3L19.1 12.2H28.5L21.2 17.8L23.9 27L16 21.4L8.1 27L10.8 17.8L3.5 12.2H12.9Z" },
                        ].map(({ key, path }) => (
                            <button key={key} title={key} onClick={() => switchShape(key)} style={{ ...styles.swatch, display: "flex", alignItems: "center", justifyContent: "center", background: params.shape === key ? "#111111" : "#e8e8e8", color: params.shape === key ? "#ffffff" : "#555555", outline: params.shape === key ? "2px solid #888888" : "2px solid transparent", outlineOffset: "2px", }}>
                                <svg viewBox="0 0 32 32" width="14" height="14">
                                    <path d={path} fill="currentColor" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ ...styles.btnRow, gridColumn: "1 / -1" }}>
                <button style={styles.btn} onClick={reshuffle}>reshuffle</button>
                <button style={styles.btn} onClick={() => set("darkBg")(!params.darkBg)}>toggle bg</button>
                <button style={{ ...styles.btn, marginLeft: "auto" }} onClick={exportJpg}>export jpg</button>
            </div>
        </div>
    );
}

const styles = {
    root: {
        fontFamily: "system-ui, sans-serif",
        maxWidth: 680,
        margin: "0 auto",
        padding: "0 0 24px",
    },
    canvasWrap: {
        borderRadius: 12,
        overflow: "hidden",
    },
    canvas: {
        display: "block",
        width: "100%",
        height: "auto",
    },
    controls: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px 24px",
        padding: "16px 4px 0",
    },
    ctrl: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    label: {
        fontSize: 12,
        color: "#888888",
        userSelect: "none",
    },
    ctrlRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    slider: {
        flex: 1,
        cursor: "pointer",
        accentColor: "#000000"
    },
    sliderVal: {
        fontSize: 13,
        fontWeight: 500,
        minWidth: 32,
        textAlign: "right",
    },
    paletteRow: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        paddingTop: 2,
    },
    swatch: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        cursor: "pointer",
        border: "none",
        padding: 0,
        transition: "outline-color .15s",
    },
    btnRow: {
        display: "flex",
        gap: 8,
        paddingTop: 4,
    },
    btn: {
        padding: "6px 14px",
        fontSize: 13,
        borderRadius: 8,
        cursor: "pointer",
        border: "1px solid #dddddd",
        background: "transparent",
        color: "#111111"
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingTop: 6,
        borderTop: "1px solid #dddddd"
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: "#888888"
    },
    sectionHint: {
        fontSize: 11,
        color: "#888888",
        flex: 1,
    },
    clearBtn: {
        fontSize: 11,
        padding: "2px 5px",
        borderRadius: 6,
        cursor: "pointer",
        border: "1px solid #dddddd",
        background: "transparent",
        color: "#888888",
    },
};