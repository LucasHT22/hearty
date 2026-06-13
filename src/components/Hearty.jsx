import { useRef, useEffect, useState, useCallback } from "react";

// credits to my digital design classes for the palettes database
const PALETTES = [
    { name: "crimson", cols: ["#ff1744","#ff5252","#ff80ab","#f06292", "#e91e63"] },
    { name: "blush", cols: ["#ff6b9d","#ff8fab","#ffb3c6", "#ffc8dd", "#ff4d6d"] },
    { name: "violet", cols: ["#9c27b0","#ce93d8","#e040fb","#7b1fa2","#f48fb1"] },
    { name: "ember", cols: ["#ff6d00","#ff3d00","#ff9100","#ffab40","#e64a19"] },
    { name: "neon", cols: ["#ff0055","#ff00aa","#aa00ff","#ff3399","#ff0077"] },
    { name: "mono", cols: ["#ffffff","#cccccc","#999999","#e0e0e0","#f5f5f5"] },
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

function hexAlpha(hex, alpha) {
    return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

function drawScene(ctx, W, H, params, seed) {
    const { count, sizeLevel, rotLevel, opacityLevel, fillRatio, dirIndex, paletteIndex, darkBg } = params;
    const rand = seededRand(seed);

    const maxScale = 0.15 + sizeLevel * 0.28;
    const rotSpread = (rotLevel / 10) * Math.PI;
    const minAlpha = 0.08 + opacityLevel * 0.04;
    const fillProb = fillRatio / 10;
    const dir = DIRS[dirIndex];
    const pal = PALETTES[paletteIndex].cols;

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

        const sizeT = Math.pow(rand(), 1.5);
        const scale = 0.06 + sizeT * maxScale;
        const angle = (rand() - 0.5) * 2 * rotSpread;
        const alpha = minAlpha + rand() * (1 - minAlpha) * 0.8;
        const col = pal[Math.floor(rand() * pal.length)];
        const filled = rand() < fillProb;

        const pts = heartPoints(cx, cy, scale, angle);
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
    const [params, setParams] = useState({ count: 130, sizeLevel: 5, rotLevel: 3, opacityLevel: 6, fillRatio: 6, dirIndex: 0, paletteIndex: 0, darkBg: true, });

    const set = (key) => (val) => setParams(p => ({ ...p, [key]: val }));

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        drawScene(ctx, W, H, params, seed);
    }, [params, seed]);

    useEffect(() => { redraw(); }, [redraw]);

    const reshuffle = () => setSeed(Date.now() & 0x7fffffff);

    const exportJpg = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `hearty-${seed}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();
    };

    return (
        <div style={styles.root}>
            <div style={{ ...styles.canvasWrap, background: params.darkBg ? "#0d0a14" : "#fff8f9" }}>
                <canvas ref={canvasRef} width={W} height={H} style={styles.canvas} />
            </div>

            <div style={styles.controls}>
                <Slider label="hearts" id="count" min={20} max={300} value={params.count} onChange={set("count")} />
                <Slider label="size range" id="size" min={1} max={10} value={params.sizeLevel} onChange={set("sizeLevel")} />
                <Slider label="rotation spread" id="rot" min={0} max={10} value={params.rotLevel} onChange={set("rotLevel")} />
                <Slider label="opacity" id="opacity" min={1} max={10} value={params.opacityLevel} onChange={set("opacityLevel")} />
                <Slider label="fill ratio" id="fill" min={0} max={10} value={params.fillRatio} onChange={set("fillRatio")} />
                <Slider label="flow direction" id="dir" min={0} max={8} value={params.dirIndex} onChange={set("dirIndex")} format={v => DIR_LABELS[v]} />

                <div style={{ ...styles.ctrl, gridColumn: "1 / -1"}}>
                    <label style={styles.label}>palette</label>
                    <div style={styles.paletteRow}>
                        {PALETTES.map((p, i) => (
                            <button key={p.name} title={p.name} onClick={() => set("paletteIndex")(i)} style={{ ...styles.swatch, background: p.cols[0], outline: i === params.paletteIndex ? "2px solid #ffffff" : "2px solid transparent", outlineOffset: "2px" }} />
                        ))}
                    </div>
                </div>

                <div style={{ ...styles.btnRow, gridColumn: "1 / -1" }}>
                    <button style={styles.btn} onClick={reshuffle}>reshuffle</button>
                    <button style={styles.btn} onClick={() => set("darkBg")(!params.darkBg)}>toggle bg</button>
                    <button style={{ ...styles.btn, marginLeft: "auto" }} onClick={exportJpg}>export jpg</button>
                </div>
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
    }
};