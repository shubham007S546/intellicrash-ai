import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

/* ─── data ─── */
const TECH = [
  { g: "AI / ML", icon: "🧠", items: ["Random Forest (scikit-learn 1.5)", "LSTM Neural Net (TensorFlow 2.16)", "RF+LSTM Ensemble (70/30 weighted)", "Explainable AI — real feature importances"] },
  { g: "Backend", icon: "⚡", items: ["FastAPI 0.111 (Python)", "Pydantic v2 — full docs at /docs", "SQLite — 7 tables, exportable", "Twilio SMS · Gmail SMTP"] },
  { g: "Frontend", icon: "🎨", items: ["React 18 + Vite 5", "Material UI v5", "React-Leaflet 4 (OSM tiles)", "Framer Motion + CSS animations"] },
  { g: "Data Sources", icon: "📡", items: ["iRAD/eDAR 2024 (MoRTH/NIC)", "RapidAPI — weather + traffic", "OSRM — free turn-by-turn", "OpenMeteo — 3-day forecast", "Nominatim — geocoding"] },
];

const PIPELINE = [
  { n: "01", title: "Data Collection", color: "#2563eb", desc: "20,000+ accident records from iRAD/eDAR (MoRTH). Weather, road type, time, speed, vehicles, road condition, light, critical zone, visibility." },
  { n: "02", title: "Preprocessing", color: "#7c3aed", desc: "Label encoding, StandardScaler normalization, 80/20 train-test split. Stratified sampling to handle class imbalance across severity levels." },
  { n: "03", title: "Random Forest", color: "#0891b2", desc: "100+ decision trees on bootstrap samples. Majority vote + probability averaging. Feature importances from .pkl. ~94% accuracy on HP test set." },
  { n: "04", title: "LSTM Sequential", color: "#059669", desc: "10-step sliding window of [speed, weather, timeOfDay]. Captures temporal acceleration patterns. Trained separately, adds 30% weight to ensemble." },
  { n: "05", title: "Ensemble Output", color: "#d97706", desc: "Final = 70% RF + 30% LSTM. Weighting: Low×20, Medium×55, High×90 = 0–100 risk scale. HP calibration for extreme mountain conditions." },
  { n: "06", title: "XAI Explanation", color: "#dc2626", desc: "Every prediction shows which RF features mattered most, what each factor contributed in points, and a plain-text explanation. Zero black boxes." },
];

const STATS = [
  { n: "2,109", label: "HP Accidents", sub: "Year 2024 · iRAD", color: "#2563eb" },
  { n: "35",    label: "Hotspots Mapped", sub: "GPS-verified · iRAD", color: "#7c3aed" },
  { n: "94%",   label: "Model Accuracy",  sub: "RF on HP test set",  color: "#059669" },
  { n: "15",    label: "Districts Covered", sub: "All of Himachal Pradesh", color: "#d97706" },
];

const EMERGENCY = [
  ["112", "HP Emergency / Police", "#dc2626"],
  ["108", "HP Ambulance",          "#2563eb"],
  ["101", "Fire Brigade",          "#d97706"],
  ["1077","Disaster Relief",       "#059669"],
];

/* ─── hooks ─── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Counter({ target, duration = 1600 }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useInView(0.5);
  const num = parseFloat(target.replace(/[^0-9.]/g, ""));
  const suffix = target.replace(/[0-9.,]/g, "");
  useEffect(() => {
    if (!visible) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * num));
      if (p < 1) requestAnimationFrame(step); else setVal(num);
    };
    requestAnimationFrame(step);
  }, [visible, num, duration]);
  return <span ref={ref}>{Number.isInteger(num) ? val.toLocaleString() : val}{suffix}</span>;
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{
      transition: `opacity 0.75s ${delay}s cubic-bezier(.16,1,.3,1), transform 0.75s ${delay}s cubic-bezier(.16,1,.3,1)`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(40px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Particles() {
  const dots = useRef(Array.from({ length: 24 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: 3 + Math.random() * 6,
    dur: 5 + Math.random() * 9,
    delay: Math.random() * 7,
    opacity: 0.10 + Math.random() * 0.20,
    color: ["#2563eb","#7c3aed","#0891b2","#059669"][i % 4],
  }))).current;
  return (
    <div style={{ position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none" }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position:"absolute", left:`${d.x}%`, top:`${d.y}%`,
          width:d.size, height:d.size, borderRadius:"50%",
          background:d.color, opacity:d.opacity,
          animation:`floatDot ${d.dur}s ${d.delay}s ease-in-out infinite alternate`,
        }} />
      ))}
    </div>
  );
}

/* ─── main ─── */
export default function About() {
  const nav = useNavigate();
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [activeStep, setActiveStep] = useState(null);

  useEffect(() => {
    const mv = (e) => setMouse({ x:(e.clientX/window.innerWidth)*100, y:(e.clientY/window.innerHeight)*100 });
    window.addEventListener("mousemove", mv);
    return () => window.removeEventListener("mousemove", mv);
  }, []);

  return (
    <div style={{ background:"#f8faff", fontFamily:"'DM Sans',sans-serif", color:"#0f172a", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* ══ HERO ══ */}
      <section style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", background:"#fff" }}>
        {/* Spotlight */}
        <div style={{ position:"absolute",inset:0, background:`radial-gradient(ellipse 60% 50% at ${mouse.x}% ${mouse.y}%, rgba(37,99,235,0.09) 0%, rgba(124,58,237,0.05) 45%, transparent 70%)`, transition:"background 0.4s ease", pointerEvents:"none" }} />
        {/* Animated grid */}
        <div style={{ position:"absolute",inset:0, backgroundImage:"linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)", backgroundSize:"48px 48px", animation:"gridPan 24s linear infinite", pointerEvents:"none" }} />

        <Particles />

        {/* Blobs */}
        <div style={{ position:"absolute",width:520,height:520,borderRadius:"50%", background:"radial-gradient(circle,rgba(37,99,235,0.10),transparent 70%)", top:"-120px",left:"-120px", animation:"blobA 9s ease-in-out infinite alternate" }} />
        <div style={{ position:"absolute",width:420,height:420,borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.09),transparent 70%)", bottom:"-100px",right:"-80px", animation:"blobB 11s ease-in-out infinite alternate" }} />
        <div style={{ position:"absolute",width:300,height:300,borderRadius:"50%", background:"radial-gradient(circle,rgba(8,145,178,0.07),transparent 70%)", top:"30%",right:"10%", animation:"blobA 13s 2s ease-in-out infinite alternate" }} />

        <div style={{ position:"relative",zIndex:2,textAlign:"center",padding:"0 24px",maxWidth:840 }}>
          {/* Badge */}
          <div style={{ display:"inline-flex",alignItems:"center",gap:8, background:"linear-gradient(135deg,#eff6ff,#f5f3ff)", border:"1px solid rgba(37,99,235,0.22)",borderRadius:100, padding:"8px 20px",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#2563eb", marginBottom:32,animation:"fadeDown 0.7s 0.1s both" }}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:"#2563eb",animation:"pulseBlip 2s infinite" }} />
            India's First Mountain-Road AI Platform
          </div>

          {/* Title */}
          <h1 style={{ fontSize:"clamp(64px,11vw,128px)",fontWeight:900,margin:"0 0 8px",lineHeight:0.93,letterSpacing:"-4px",color:"#0f172a",animation:"fadeUp 0.8s 0.25s both" }}>
            Intelli
            <span style={{ position:"relative",display:"inline-block" }}>
              <span style={{ background:"linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#0891b2 100%)", WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200%",animation:"gradShift 4s ease infinite" }}>Crash</span>
              <span style={{ position:"absolute",bottom:-4,left:0,right:0,height:5, background:"linear-gradient(90deg,#2563eb,#7c3aed,#0891b2)", borderRadius:3,animation:"lineGrow 0.9s 1s both" }} />
            </span>
          </h1>

          <p style={{ fontSize:"clamp(15px,2.2vw,19px)",color:"#64748b",lineHeight:1.8,margin:"30px auto 48px",maxWidth:600,animation:"fadeUp 0.8s 0.4s both",fontWeight:400 }}>
            Combining Random Forest + LSTM with official iRAD government data<br/>
            to predict, map, and prevent road accidents across Himachal Pradesh.
          </p>

          <div style={{ display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",animation:"fadeUp 0.8s 0.55s both" }}>
            <button className="btn-primary" onClick={()=>nav("/navigation")}>
              🗺️ Navigate Safely
              <span className="btn-shine" />
            </button>
            <button className="btn-outline" onClick={()=>nav("/predict")}>⚡ Predict Risk</button>
            <button className="btn-ghost" onClick={()=>window.open("/api/docs","_blank")}>📖 API Docs ↗</button>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position:"absolute",bottom:36,left:"50%",transform:"translateX(-50%)", display:"flex",flexDirection:"column",alignItems:"center",gap:6,animation:"fadeUp 1s 1.3s both" }}>
          <span style={{ fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"#cbd5e1" }}>Scroll</span>
          <div style={{ width:1,height:44,background:"linear-gradient(#2563eb,transparent)",animation:"scrollPulse 2.2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{ background:"#fff",borderTop:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9" }}>
        <div style={{ maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))" }}>
          {STATS.map((s,i)=>(
            <Reveal key={i} delay={i*0.1}>
              <div className="stat-cell" style={{ padding:"52px 24px",textAlign:"center",borderRight:i<3?"1px solid #f1f5f9":"none",position:"relative",overflow:"hidden" }}>
                <div className="stat-hover-bg" style={{ background:`radial-gradient(ellipse 80% 60% at 50% 100%, ${s.color}14, transparent)` }} />
                <div style={{ fontFamily:"serif",fontSize:56,fontWeight:900,color:s.color,lineHeight:1,marginBottom:8,position:"relative" }}>
                  <Counter target={s.n} />
                </div>
                <div style={{ fontSize:12,fontWeight:800,color:"#0f172a",textTransform:"uppercase",letterSpacing:"0.1em",position:"relative" }}>{s.label}</div>
                <div style={{ fontSize:11,color:"#94a3b8",marginTop:4,position:"relative" }}>{s.sub}</div>
                <div className="stat-bar" style={{ background:s.color }} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ VISION ══ */}
      <section style={{ padding:"100px 24px",background:"linear-gradient(180deg,#fff 0%,#f8faff 100%)" }}>
        <div style={{ maxWidth:1040,margin:"0 auto" }}>
          <Reveal>
            <span style={eyebrowStyle("#2563eb","#eff6ff")}>Mission</span>
            <h2 style={headingStyle}>
              Built for India's<br />
              <em style={{ fontStyle:"italic",color:"#94a3b8" }}>most dangerous roads.</em>
            </h2>
          </Reveal>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:32 }}>
            {[
              { emoji:"🏔️", text:<>Himachal Pradesh recorded <strong style={{color:"#0f172a"}}>2,109 accidents</strong> in 2024 across 15 districts — Shimla (319), Mandi (268), and UNA (212) bearing the worst toll. Sharp mountain curves, sudden fog, and unmarked black spots claim lives every week.</> },
              { emoji:"🤖", text:<>IntelliCrash uses <strong style={{color:"#0f172a"}}>AI + real government data</strong> to give every driver risk awareness before they face it — not after. Target: reduce fatalities by 30% through data-driven alerts, community reporting, and accessible ML tools.</> },
            ].map((c,i)=>(
              <Reveal key={i} delay={0.1+i*0.12}>
                <div className="vision-card">
                  <div style={{ fontSize:32,marginBottom:16 }}>{c.emoji}</div>
                  <p style={{ fontSize:15,color:"#475569",lineHeight:1.85,margin:0 }}>{c.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
              {["iRAD/eDAR 2024","MoRTH","NIC India","HP Police","Himachal Pradesh Govt"].map((t,i)=>(
                <span key={t} className="tag-pill" style={{ animationDelay:`${i*0.07}s` }}>{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ PIPELINE ══ */}
      <section style={{ padding:"100px 24px",background:"#f8faff" }}>
        <div style={{ maxWidth:1040,margin:"0 auto" }}>
          <Reveal>
            <span style={eyebrowStyle("#7c3aed","#f5f3ff")}>AI Architecture</span>
            <h2 style={headingStyle}>
              No black box.<br />
              <em style={{ fontStyle:"italic",color:"#94a3b8" }}>Every prediction explained.</em>
            </h2>
            <p style={{ fontSize:16,color:"#64748b",marginBottom:52,maxWidth:500,lineHeight:1.75 }}>
              6-step transparent ML pipeline — from raw government data to plain-English risk scores.
            </p>
          </Reveal>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:18 }}>
            {PIPELINE.map((p,i)=>(
              <Reveal key={i} delay={i*0.09}>
                <div
                  className="pipeline-card"
                  style={{ borderColor: activeStep===i ? p.color+"55" : "#e2e8f0", boxShadow: activeStep===i ? `0 16px 48px ${p.color}1a` : "0 2px 12px rgba(0,0,0,0.04)", transform: activeStep===i ? "translateY(-8px)" : "none" }}
                  onMouseEnter={()=>setActiveStep(i)}
                  onMouseLeave={()=>setActiveStep(null)}
                >
                  <div style={{ fontFamily:"serif",fontSize:40,fontWeight:900,color:p.color,lineHeight:1,marginBottom:6 }}>{p.n}</div>
                  <div style={{ height:3,background:p.color,borderRadius:2,marginBottom:16,transition:"width 0.35s",width:activeStep===i?56:24 }} />
                  <div style={{ fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:8 }}>{p.title}</div>
                  <div style={{ fontSize:13,color:"#64748b",lineHeight:1.75 }}>{p.desc}</div>
                  <div style={{ marginTop:14,fontSize:12,fontWeight:700,color:p.color,opacity:activeStep===i?1:0,transition:"opacity 0.2s,transform 0.2s",transform:activeStep===i?"translateX(0)":"translateX(-8px)" }}>Learn more →</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section style={{ padding:"100px 24px",background:"#fff" }}>
        <div style={{ maxWidth:1040,margin:"0 auto" }}>
          <Reveal>
            <span style={eyebrowStyle("#0891b2","#ecfeff")}>Infrastructure</span>
            <h2 style={headingStyle}>
              Production-grade stack,<br />
              <em style={{ fontStyle:"italic",color:"#94a3b8" }}>zero shortcuts.</em>
            </h2>
          </Reveal>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20 }}>
            {TECH.map((g,i)=>(
              <Reveal key={i} delay={i*0.1}>
                <div className="tech-card">
                  <div style={{ fontSize:30,marginBottom:12 }}>{g.icon}</div>
                  <div style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#0f172a",marginBottom:16 }}>{g.g}</div>
                  {g.items.map(item=>(
                    <div key={item} style={{ display:"flex",alignItems:"flex-start",gap:8,marginBottom:7 }}>
                      <span style={{ color:"#2563eb",fontWeight:800,fontSize:13,flexShrink:0,marginTop:1 }}>—</span>
                      <span style={{ fontSize:13,color:"#475569",lineHeight:1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DATA SOURCE ══ */}
      <section style={{ padding:"80px 24px",background:"#f8faff" }}>
        <Reveal style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef9c3)",border:"1px solid #fde68a",borderRadius:24,padding:"44px 40px",textAlign:"center",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(251,191,36,0.12)",animation:"blobA 7s ease-in-out infinite alternate" }} />
            <div style={{ position:"absolute",bottom:-30,left:-30,width:120,height:120,borderRadius:"50%",background:"rgba(251,191,36,0.08)",animation:"blobB 9s ease-in-out infinite alternate" }} />
            <div style={{ fontSize:40,marginBottom:14,position:"relative" }}>📊</div>
            <h3 style={{ fontSize:24,fontWeight:800,color:"#92400e",marginBottom:14,letterSpacing:"-0.5px",position:"relative" }}>Official Government Data</h3>
            <p style={{ fontSize:14,color:"#78350f",lineHeight:1.9,maxWidth:580,margin:"0 auto",position:"relative" }}>
              Accident hotspot data from the <strong>Integrated Road Accident Database (iRAD)</strong> and{" "}
              <strong>e-Detailed Accident Report (eDAR)</strong>, by the{" "}
              <strong>Ministry of Road Transport & Highways (MoRTH)</strong>, Government of India.
              Developed by NIC/NICSI. HP 2024: 2,109 accidents · 15 police districts · 35 GPS-verified hotspots.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══ CONTACT ══ */}
      <section style={{ padding:"100px 24px 96px",background:"#fff" }}>
        <div style={{ maxWidth:1040,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 380px",gap:56,alignItems:"start" }}>
          <Reveal>
            <span style={eyebrowStyle("#2563eb","#eff6ff")}>The Project</span>
            <h2 style={{ ...headingStyle,marginBottom:16 }}>IntelliCrash</h2>
            <p style={{ fontSize:16,color:"#64748b",lineHeight:1.85,maxWidth:460,marginBottom:36 }}>
              An AI-powered road safety platform for Himachal Pradesh — built with real government data,
              production ML models, and accessible community tools to save lives on mountain roads.
            </p>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {[
                { icon:"📞", text:"9015162007",                        href:"tel:9015162007" },
                { icon:"✉️", text:"shubhamabhi004@gmail.com",          href:"mailto:shubhamabhi004@gmail.com" },
                { icon: "🔗", text: "API Documentation → /api/docs", href: "/api/docs" },
              ].map(({icon,text,href})=>(
                <a key={href} href={href} className="contact-link">
                  <span>{icon}</span> {text}
                </a>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ background:"linear-gradient(135deg,#fff5f5,#fef2f2)",border:"1px solid #fecaca",borderRadius:24,padding:"32px 28px",position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(220,38,38,0.07)",animation:"blobA 8s ease-in-out infinite alternate" }} />
              <div style={{ fontSize:14,fontWeight:800,color:"#991b1b",marginBottom:20,display:"flex",alignItems:"center",gap:8,position:"relative" }}>
                <span style={{ animation:"pulseBlip 1.5s infinite" }}>🚨</span> Emergency Numbers
              </div>
              {EMERGENCY.map(([n,l,c])=>(
                <div key={n} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid rgba(254,202,202,0.5)",position:"relative" }}>
                  <span style={{ fontFamily:"serif",fontSize:30,fontWeight:900,color:c,letterSpacing:"-1px" }}>{n}</span>
                  <span style={{ fontSize:13,color:"#64748b",fontWeight:500 }}>{l}</span>
                </div>
              ))}
              <a href="tel:112" style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:20, background:"linear-gradient(135deg,#dc2626,#b91c1c)",color:"#fff",borderRadius:12,padding:"15px",fontSize:14,fontWeight:800,textDecoration:"none",animation:"sosPulse 2s ease-in-out infinite",letterSpacing:"0.03em",position:"relative" }}>
                🆘 One-Tap SOS — 112
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

const eyebrowStyle = (color, bg) => ({
  display:"inline-block", background:bg, borderRadius:6,
  padding:"4px 12px", fontSize:11, fontWeight:800,
  letterSpacing:"0.13em", textTransform:"uppercase",
  color, marginBottom:20,
});

const headingStyle = {
  fontSize:"clamp(34px,5vw,58px)", fontWeight:900, lineHeight:1.08,
  letterSpacing:"-2px", marginBottom:48, color:"#0f172a",
};

/* ─── CSS ─── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');

  * { box-sizing: border-box; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }
  @keyframes fadeDown { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:none; } }
  @keyframes gradShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
  @keyframes lineGrow  { from { transform:scaleX(0); transform-origin:left; } to { transform:scaleX(1); transform-origin:left; } }
  @keyframes blobA { from { transform:translate(0,0) scale(1); } to { transform:translate(28px,18px) scale(1.07); } }
  @keyframes blobB { from { transform:translate(0,0) scale(1); } to { transform:translate(-22px,14px) scale(1.06); } }
  @keyframes floatDot { from { transform:translateY(0); } to { transform:translateY(-20px); } }
  @keyframes gridPan  { from { background-position:0 0; } to { background-position:48px 48px; } }
  @keyframes pulseBlip { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.45; transform:scale(.7); } }
  @keyframes scrollPulse { 0% { opacity:0; transform:scaleY(0); transform-origin:top; } 40% { opacity:1; transform:scaleY(1); transform-origin:top; } 80% { opacity:1; transform:scaleY(1); transform-origin:bottom; } 100% { opacity:0; transform:scaleY(0); transform-origin:bottom; } }
  @keyframes sosPulse { 0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,.35); } 50% { box-shadow:0 0 0 14px rgba(220,38,38,0); } }
  @keyframes tagPop   { from { opacity:0; transform:scale(.85) translateY(6px); } to { opacity:1; transform:none; } }

  /* ── BUTTONS ── */
  .btn-primary {
    position:relative; overflow:hidden;
    display:inline-flex; align-items:center; gap:8px;
    background:linear-gradient(135deg,#2563eb,#1d4ed8);
    color:#fff; border:none; border-radius:12px;
    padding:15px 28px; font-size:15px; font-weight:700;
    cursor:pointer; font-family:inherit;
    box-shadow:0 4px 20px rgba(37,99,235,.32);
    transition:transform .2s,box-shadow .2s;
  }
  .btn-primary:hover { transform:translateY(-3px); box-shadow:0 10px 36px rgba(37,99,235,.42); }
  .btn-shine {
    position:absolute; inset:0;
    background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.28) 50%,transparent 62%);
    transform:translateX(-100%); transition:transform .55s;
  }
  .btn-primary:hover .btn-shine { transform:translateX(100%); }

  .btn-outline {
    display:inline-flex; align-items:center; gap:8px;
    background:#fff; color:#2563eb; border:2px solid #2563eb; border-radius:12px;
    padding:13px 24px; font-size:15px; font-weight:700;
    cursor:pointer; font-family:inherit;
    transition:background .2s,color .2s,transform .2s;
  }
  .btn-outline:hover { background:#2563eb; color:#fff; transform:translateY(-3px); }

  .btn-ghost {
    display:inline-flex; align-items:center; gap:8px;
    background:transparent; color:#64748b; border:2px solid #e2e8f0; border-radius:12px;
    padding:13px 24px; font-size:15px; font-weight:600;
    cursor:pointer; font-family:inherit;
    transition:border-color .2s,color .2s,transform .2s;
  }
  .btn-ghost:hover { border-color:#94a3b8; color:#0f172a; transform:translateY(-3px); }

  /* ── STATS ── */
  .stat-cell { transition:background .25s; }
  .stat-cell:hover { background:#f8faff; }
  .stat-hover-bg { position:absolute; inset:0; opacity:0; transition:opacity .3s; }
  .stat-cell:hover .stat-hover-bg { opacity:1; }
  .stat-bar { position:absolute; bottom:0; left:50%; transform:translateX(-50%); height:3px; width:0; border-radius:3px 3px 0 0; transition:width .4s; }
  .stat-cell:hover .stat-bar { width:64px; }

  /* ── CARDS ── */
  .vision-card {
    background:#fff; border:1px solid #e2e8f0; border-radius:20px;
    padding:36px 32px; box-shadow:0 4px 24px rgba(0,0,0,.04);
    transition:transform .28s,box-shadow .28s;
  }
  .vision-card:hover { transform:translateY(-6px); box-shadow:0 16px 48px rgba(0,0,0,.08) !important; }

  .pipeline-card {
    background:#fff; border:1px solid #e2e8f0; border-radius:18px;
    padding:28px 24px; cursor:pointer; transition:all .3s;
  }
  .pipeline-card:hover { background:#fafcff; }

  .tech-card {
    background:#f8faff; border:1px solid #e2e8f0; border-radius:18px;
    padding:28px 22px; transition:all .3s;
  }
  .tech-card:hover { background:#fff; box-shadow:0 10px 36px rgba(0,0,0,.07); transform:translateY(-5px); }

  /* ── CONTACT ── */
  .contact-link {
    display:inline-flex; align-items:center; gap:12px;
    color:#2563eb; font-weight:600; font-size:14px;
    text-decoration:none; padding:12px 16px;
    background:#f8faff; border-radius:10px; border:1px solid #e2e8f0;
    transition:all .2s; width:fit-content;
  }
  .contact-link:hover { background:#eff6ff; border-color:#bfdbfe; transform:translateX(5px); }

  /* ── TAGS ── */
  .tag-pill {
    display:inline-block;
    background:linear-gradient(135deg,#fffbeb,#fef9c3);
    border:1px solid #fde68a; border-radius:8px;
    padding:6px 14px; font-size:12px; font-weight:700; color:#92400e;
    animation:tagPop .45s both; cursor:default;
    transition:transform .2s,box-shadow .2s;
  }
  .tag-pill:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(251,191,36,.28); }

  @media (max-width:768px) {
    section > div[style*="grid-template-columns: 1fr 380px"] { grid-template-columns:1fr !important; }
    section > div[style*="grid-template-columns: 1fr 1fr"]   { grid-template-columns:1fr !important; }
  }
`;
