import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Unit & Currency Data (compact) ─────────────────────────────────────────
const UNIT_DATA = {
  "Length":{"Meter (m)":1,"Kilometer (km)":1000,"Centimeter (cm)":0.01,"Millimeter (mm)":0.001,"Micrometer (μm)":1e-6,"Nanometer (nm)":1e-9,"Mile (mi)":1609.344,"Yard (yd)":0.9144,"Foot (ft)":0.3048,"Inch (in)":0.0254,"Nautical Mile":1852,"Light Year":9.461e15},
  "Area":{"Square Meter (m²)":1,"Square Kilometer (km²)":1e6,"Square Centimeter (cm²)":1e-4,"Hectare (ha)":10000,"Acre":4046.856,"Square Mile (mi²)":2589988,"Square Yard (yd²)":0.8361,"Square Foot (ft²)":0.0929,"Square Inch (in²)":6.452e-4},
  "Volume":{"Liter (L)":1,"Milliliter (mL)":0.001,"Cubic Meter (m³)":1000,"Gallon (US)":3.785,"Gallon (UK)":4.546,"Quart (US)":0.946,"Pint (US)":0.473,"Cup (US)":0.237,"Fluid Oz (US)":0.0296,"Tablespoon":0.0148,"Teaspoon":0.00493,"Cubic Foot":28.317},
  "Mass":{"Kilogram (kg)":1,"Gram (g)":0.001,"Milligram (mg)":1e-6,"Metric Ton (t)":1000,"Pound (lb)":0.4536,"Ounce (oz)":0.02835,"Stone":6.350,"Short Ton (US)":907.2,"Long Ton (UK)":1016,"Carat":2e-4},
  "Temperature":{"Celsius (°C)":"C","Fahrenheit (°F)":"F","Kelvin (K)":"K","Rankine (°R)":"R"},
  "Speed":{"m/s":1,"km/h":0.2778,"mph":0.4470,"Knot":0.5144,"ft/s":0.3048,"Mach":343,"Speed of Light":299792458},
  "Time":{"Second":1,"Millisecond":0.001,"Minute":60,"Hour":3600,"Day":86400,"Week":604800,"Month (avg)":2629746,"Year":31556952},
  "Energy":{"Joule (J)":1,"Kilojoule (kJ)":1000,"Calorie":4.184,"Kilocalorie":4184,"Watt-hour":3600,"kWh":3.6e6,"BTU":1055,"eV":1.602e-19},
  "Power":{"Watt (W)":1,"Kilowatt (kW)":1000,"Megawatt (MW)":1e6,"Horsepower (hp)":745.7,"BTU/h":0.293},
  "Pressure":{"Pascal (Pa)":1,"Kilopascal (kPa)":1000,"Bar":1e5,"PSI":6895,"Atmosphere":101325,"Torr":133.3},
  "Data":{"Bit":1,"Byte":8,"Kilobyte (KB)":8000,"Megabyte (MB)":8e6,"Gigabyte (GB)":8e9,"Terabyte (TB)":8e12},
  "Frequency":{"Hertz (Hz)":1,"kHz":1000,"MHz":1e6,"GHz":1e9,"RPM":1/60},
  "Force":{"Newton (N)":1,"kN":1000,"Dyne":1e-5,"Pound-force":4.448,"kgf":9.807},
  "Angle":{"Degree (°)":1,"Radian":57.296,"Gradian":0.9,"Revolution":360},
};
function convertTemperature(v,from,to){let c;if(from==="C")c=v;else if(from==="F")c=(v-32)*5/9;else if(from==="K")c=v-273.15;else c=(v-491.67)*5/9;if(to==="C")return c;if(to==="F")return c*9/5+32;if(to==="K")return c+273.15;return(c+273.15)*9/5;}
function convertUnit(v,cat,from,to){if(from===to)return v;const c=UNIT_DATA[cat];if(!c)return null;if(cat==="Temperature")return convertTemperature(v,c[from],c[to]);const ff=c[from],tf=c[to];if(typeof ff!=="number"||typeof tf!=="number")return null;return(v*ff)/tf;}

const CURRENCY_DATA = {
  "USD":{rate:1,name:"US Dollar",flag:"🇺🇸"},"EUR":{rate:0.92,name:"Euro",flag:"🇪🇺"},"GBP":{rate:0.79,name:"British Pound",flag:"🇬🇧"},
  "JPY":{rate:149.5,name:"Japanese Yen",flag:"🇯🇵"},"AUD":{rate:1.53,name:"Australian Dollar",flag:"🇦🇺"},"CAD":{rate:1.36,name:"Canadian Dollar",flag:"🇨🇦"},
  "CHF":{rate:0.88,name:"Swiss Franc",flag:"🇨🇭"},"CNY":{rate:7.24,name:"Chinese Yuan",flag:"🇨🇳"},"INR":{rate:83.1,name:"Indian Rupee",flag:"🇮🇳"},
  "MXN":{rate:17.15,name:"Mexican Peso",flag:"🇲🇽"},"BRL":{rate:4.97,name:"Brazilian Real",flag:"🇧🇷"},"KRW":{rate:1320,name:"South Korean Won",flag:"🇰🇷"},
  "SGD":{rate:1.34,name:"Singapore Dollar",flag:"🇸🇬"},"HKD":{rate:7.82,name:"Hong Kong Dollar",flag:"🇭🇰"},"SEK":{rate:10.4,name:"Swedish Krona",flag:"🇸🇪"},
  "NZD":{rate:1.63,name:"New Zealand Dollar",flag:"🇳🇿"},"ZAR":{rate:18.6,name:"S. African Rand",flag:"🇿🇦"},"TRY":{rate:28.9,name:"Turkish Lira",flag:"🇹🇷"},
  "PLN":{rate:4.05,name:"Polish Zloty",flag:"🇵🇱"},"THB":{rate:35.4,name:"Thai Baht",flag:"🇹🇭"},"AED":{rate:3.67,name:"UAE Dirham",flag:"🇦🇪"},
  "SAR":{rate:3.75,name:"Saudi Riyal",flag:"🇸🇦"},"ILS":{rate:3.67,name:"Israeli Shekel",flag:"🇮🇱"},"EGP":{rate:30.9,name:"Egyptian Pound",flag:"🇪🇬"},
  "PKR":{rate:285,name:"Pakistani Rupee",flag:"🇵🇰"},"NGN":{rate:780,name:"Nigerian Naira",flag:"🇳🇬"},"KWD":{rate:0.31,name:"Kuwaiti Dinar",flag:"🇰🇼"},
};

// ─── Math Engine ────────────────────────────────────────────────────────────
const MathEngine = {
  tokenize(expr){const tokens=[];let i=0;const s=expr.replace(/\s+/g,"");while(i<s.length){if(/[0-9.]/.test(s[i])){let n="";while(i<s.length&&/[0-9.]/.test(s[i]))n+=s[i++];tokens.push({type:"number",value:parseFloat(n)});continue;}if(/[a-zA-Zπ]/.test(s[i])){let n="";while(i<s.length&&/[a-zA-Zπ0-9]/.test(s[i]))n+=s[i++];const l=n.toLowerCase();if(l==="pi"||n==="π")tokens.push({type:"number",value:Math.PI});else if(l==="e"&&(i>=s.length||s[i]!=="x"))tokens.push({type:"number",value:Math.E});else if(l==="x")tokens.push({type:"variable",value:"x"});else if(l==="ans")tokens.push({type:"ans"});else tokens.push({type:"function",value:l});continue;}if("+-*/^%".includes(s[i])){tokens.push({type:"operator",value:s[i]});i++;continue;}if(s[i]==="("||s[i]===")"){tokens.push({type:"paren",value:s[i]});i++;continue;}if(s[i]==="!"){tokens.push({type:"postfix",value:"!"});i++;continue;}if(s[i]==="="){tokens.push({type:"equals",value:"="});i++;continue;}i++;}return tokens;},
  evaluate(expr,vars={}){try{let tokens=this.tokenize(expr);tokens=tokens.map(t=>{if(t.type==="ans")return{type:"number",value:vars.ans||0};if(t.type==="variable"&&vars[t.value]!==undefined)return{type:"number",value:vars[t.value]};return t;});const expanded=[];for(let i=0;i<tokens.length;i++){const t=tokens[i],prev=expanded[expanded.length-1];if(prev){const nm=(prev.type==="number"||prev.type==="variable"||(prev.type==="paren"&&prev.value===")")||prev.type==="postfix")&&(t.type==="number"||t.type==="variable"||t.type==="function"||(t.type==="paren"&&t.value==="("));if(nm)expanded.push({type:"operator",value:"*"});}expanded.push(t);}const output=[],ops=[],prec={"+":1,"-":1,"*":2,"/":2,"%":2,"^":3},ra={"^":true};const processed=[];for(let i=0;i<expanded.length;i++){const t=expanded[i];if(t.type==="operator"&&t.value==="-"){const p=processed[processed.length-1];if(!p||p.type==="operator"||(p.type==="paren"&&p.value==="(")){processed.push({type:"function",value:"neg"});continue;}}processed.push(t);}for(const t of processed){if(t.type==="number"||t.type==="variable")output.push(t);else if(t.type==="function")ops.push(t);else if(t.type==="operator"){while(ops.length&&ops[ops.length-1].type==="operator"&&(ra[t.value]?prec[ops[ops.length-1].value]>prec[t.value]:prec[ops[ops.length-1].value]>=prec[t.value]))output.push(ops.pop());ops.push(t);}else if(t.type==="paren"&&t.value==="(")ops.push(t);else if(t.type==="paren"&&t.value===")"){while(ops.length&&!(ops[ops.length-1].type==="paren"&&ops[ops.length-1].value==="("))output.push(ops.pop());ops.pop();if(ops.length&&ops[ops.length-1].type==="function")output.push(ops.pop());}else if(t.type==="postfix")output.push(t);}while(ops.length)output.push(ops.pop());const stack=[];for(const t of output){if(t.type==="number")stack.push(t.value);else if(t.type==="variable")stack.push(vars[t.value]||0);else if(t.type==="operator"){const b=stack.pop(),a=stack.pop();switch(t.value){case"+":stack.push(a+b);break;case"-":stack.push(a-b);break;case"*":stack.push(a*b);break;case"/":stack.push(a/b);break;case"^":stack.push(Math.pow(a,b));break;case"%":stack.push(a%b);break;}}else if(t.type==="postfix"&&t.value==="!")stack.push(this.factorial(stack.pop()));else if(t.type==="function"){const a=stack.pop();const fns={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,log:Math.log10,ln:Math.log,log2:Math.log2,sqrt:Math.sqrt,cbrt:Math.cbrt,abs:Math.abs,ceil:Math.ceil,floor:Math.floor,round:Math.round,exp:Math.exp,neg:x=>-x};stack.push(fns[t.value]?fns[t.value](a):NaN);}}const r=stack[0];return(r===undefined||isNaN(r))?null:r;}catch{return null;}},
  factorial(n){if(n<0)return NaN;if(n===0||n===1)return 1;if(n>170)return Infinity;if(!Number.isInteger(n))return this.gamma(n+1);let r=1;for(let i=2;i<=n;i++)r*=i;return r;},
  gamma(z){if(z<0.5)return Math.PI/(Math.sin(Math.PI*z)*this.gamma(1-z));z-=1;const c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];let x=c[0];for(let i=1;i<9;i++)x+=c[i]/(z+i);const t=z+7.5;return Math.sqrt(2*Math.PI)*Math.pow(t,z+0.5)*Math.exp(-t)*x;},
  fmt(n){if(n===null||n===undefined)return"Error";if(!isFinite(n))return n>0?"∞":"-∞";if(Number.isInteger(n)&&Math.abs(n)<1e15)return n.toLocaleString("en-US",{maximumFractionDigits:0});if(Math.abs(n)<0.0001||Math.abs(n)>1e12)return n.toExponential(8);return parseFloat(n.toPrecision(12)).toString();},
  suggest(expr){if(!expr||expr.length<1)return[];const sg=[];const r=this.evaluate(expr);if(r!==null)sg.push({label:`= ${this.fmt(r)}`,action:"eval",p:0});const fns=["sin","cos","tan","sqrt","log","ln","abs"];if(r!==null)for(const fn of fns){const fr=this.evaluate(`${fn}(${expr})`);if(fr!==null&&isFinite(fr))sg.push({label:`${fn}(…) = ${this.fmt(fr)}`,action:`${fn}(${expr})`,p:2});}return sg.sort((a,b)=>a.p-b.p).slice(0,5);},
  solve(expr){const parts=expr.split("=");let fe=parts.length===2?`(${parts[0].trim()})-(${parts[1].trim()})`:expr;const f=x=>this.evaluate(fe,{x}),df=x=>{const h=1e-8;return(f(x+h)-f(x-h))/(2*h);};const sols=new Set();for(const x0 of[-100,-10,-5,-2,-1,-0.5,0,0.5,1,2,5,10,100]){let x=x0,conv=false;for(let i=0;i<200;i++){const fx=f(x),dfx=df(x);if(Math.abs(dfx)<1e-15)break;const xn=x-fx/dfx;if(Math.abs(xn-x)<1e-12){conv=true;x=xn;break;}x=xn;}if(conv&&isFinite(x)&&Math.abs(f(x))<1e-8)sols.add(Math.round(x*1e10)/1e10);}return[...sols].sort((a,b)=>a-b).map(s=>this.fmt(s));},
  graphPts(expr,xMin=-10,xMax=10,steps=400){const pts=[],dx=(xMax-xMin)/steps;for(let i=0;i<=steps;i++){const x=xMin+i*dx,y=this.evaluate(expr,{x});pts.push({x,y:(y!==null&&isFinite(y))?y:null});}return pts;}
};


// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL MATH TREE
// Nodes: {id, type, ...}
// "seq"   → children[]          (sequence of nodes)
// "char"  → value               (single character/token)
// "frac"  → num(seq), den(seq)  (fraction)
// "sup"   → base(seq), exp(seq) (superscript/exponent)
// "sqrt"  → rad(seq)            (square root)
// "func"  → name, arg(seq)      (named function)
// "paren" → inner(seq)          (parenthesized group)
// ═══════════════════════════════════════════════════════════════════════════

let _nid = 0;
function nid() { return ++_nid; }

function mkSeq(ch) { return { id: nid(), type: "seq", children: ch || [] }; }
function mkChar(v) { return { id: nid(), type: "char", value: v }; }
function mkFrac(n, d) { return { id: nid(), type: "frac", num: n || mkSeq(), den: d || mkSeq() }; }
function mkSup(b, e) { return { id: nid(), type: "sup", base: b || mkSeq(), exp: e || mkSeq() }; }
function mkSqrt(r) { return { id: nid(), type: "sqrt", rad: r || mkSeq() }; }
function mkFunc(name, a) { return { id: nid(), type: "func", name, arg: a || mkSeq() }; }
function mkParen(c) { return { id: nid(), type: "paren", inner: c || mkSeq() }; }

// AST → flat expression string
function toExpr(n) {
  if (!n) return "";
  switch (n.type) {
    case "char": return n.value;
    case "seq": return n.children.map(toExpr).join("");
    case "frac": return `((${toExpr(n.num)})/(${toExpr(n.den)}))`;
    case "sup": return `(${toExpr(n.base)})^(${toExpr(n.exp)})`;
    case "sqrt": return `sqrt(${toExpr(n.rad)})`;
    case "func": return `${n.name}(${toExpr(n.arg)})`;
    case "paren": return `(${toExpr(n.inner)})`;
    default: return "";
  }
}

// Find seq by id
function findSeq(node, id) {
  if (!node) return null;
  if (node.id === id && node.type === "seq") return node;
  switch (node.type) {
    case "seq": for (const c of node.children) { const r = findSeq(c, id); if (r) return r; } return null;
    case "frac": return findSeq(node.num, id) || findSeq(node.den, id);
    case "sup": return findSeq(node.base, id) || findSeq(node.exp, id);
    case "sqrt": return findSeq(node.rad, id);
    case "func": return findSeq(node.arg, id);
    case "paren": return findSeq(node.inner, id);
    default: return null;
  }
}

// Find which seq contains the structural node with a given child seq id
function findParentOf(root, seqId) {
  // Returns { parentSeq, structIdx, structNode, slotName } or null
  function walk(node) {
    if (!node) return null;
    if (node.type === "seq") {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === "frac" && (child.num.id === seqId || child.den.id === seqId))
          return { parentSeq: node, structIdx: i, structNode: child, slotName: child.num.id === seqId ? "num" : "den" };
        if (child.type === "sup" && (child.base.id === seqId || child.exp.id === seqId))
          return { parentSeq: node, structIdx: i, structNode: child, slotName: child.base.id === seqId ? "base" : "exp" };
        if (child.type === "sqrt" && child.rad.id === seqId)
          return { parentSeq: node, structIdx: i, structNode: child, slotName: "rad" };
        if (child.type === "func" && child.arg.id === seqId)
          return { parentSeq: node, structIdx: i, structNode: child, slotName: "arg" };
        if (child.type === "paren" && child.inner.id === seqId)
          return { parentSeq: node, structIdx: i, structNode: child, slotName: "inner" };
        const deeper = walk(child);
        if (deeper) return deeper;
      }
    }
    if (node.type === "frac") { return walk(node.num) || walk(node.den); }
    if (node.type === "sup") { return walk(node.base) || walk(node.exp); }
    if (node.type === "sqrt") { return walk(node.rad); }
    if (node.type === "func") { return walk(node.arg); }
    if (node.type === "paren") { return walk(node.inner); }
    return null;
  }
  // Check root itself
  if (root.id === seqId) return null; // root has no parent
  return walk(root);
}


// ─── Math Render ────────────────────────────────────────────────────────────
function MathRender({ node, fontSize, cursorSeqId, cursorPos, onTapSeq }) {
  if (!node) return null;
  const f = fontSize || 22;

  if (node.type === "char") {
    const isOp = "+-×÷*/%=".includes(node.value);
    const isLetter = /^[a-zA-Zπ]/.test(node.value);
    return (
      <span style={{ fontSize: f, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500,
        color: isOp ? "#f472b6" : isLetter ? "#60a5fa" : "#e8e8e8",
        padding: "0 0.5px", lineHeight: 1.1
      }}>
        {node.value === "*" ? "×" : node.value}
      </span>
    );
  }

  if (node.type === "seq") {
    const isEmpty = node.children.length === 0;
    const isHere = cursorSeqId === node.id;
    return (
      <span
        onClick={(e) => { e.stopPropagation(); onTapSeq(node.id, node.children.length); }}
        style={{
          display: "inline-flex", alignItems: "baseline", flexWrap: "wrap", cursor: "text",
          minWidth: isEmpty ? Math.max(12, f * 0.5) : undefined,
          minHeight: isEmpty ? f * 0.65 : undefined,
          background: isEmpty ? "rgba(244,114,182,0.06)" : "transparent",
          border: isEmpty ? "1px dashed rgba(244,114,182,0.15)" : "none",
          borderRadius: 3, position: "relative", padding: isEmpty ? "0 2px" : 0,
        }}
      >
        {isHere && cursorPos === 0 && <Cursor h={f * 0.85} />}
        {node.children.map((child, i) => (
          <span key={child.id} style={{ display: "inline-flex", alignItems: "baseline" }}
            onClick={(e) => { e.stopPropagation(); onTapSeq(node.id, i + 1); }}>
            <MathRender node={child} fontSize={f} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
            {isHere && cursorPos === i + 1 && <Cursor h={f * 0.85} />}
          </span>
        ))}
      </span>
    );
  }

  if (node.type === "frac") {
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 4px" }}>
        <span style={{ display: "flex", justifyContent: "center", padding: "2px 6px", minWidth: 20 }}>
          <MathRender node={node.num} fontSize={f * 0.78} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        </span>
        <span style={{ width: "100%", minWidth: 20, height: 1.5, background: "#777", borderRadius: 1, margin: "2px 0" }} />
        <span style={{ display: "flex", justifyContent: "center", padding: "2px 6px", minWidth: 20 }}>
          <MathRender node={node.den} fontSize={f * 0.78} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        </span>
      </span>
    );
  }

  if (node.type === "sup") {
    return (
      <span style={{ display: "inline-flex", alignItems: "flex-start" }}>
        <MathRender node={node.base} fontSize={f} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        <span style={{ marginTop: f * -0.4, marginLeft: 1 }}>
          <MathRender node={node.exp} fontSize={f * 0.58} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        </span>
      </span>
    );
  }

  if (node.type === "sqrt") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", margin: "0 2px" }}>
        <span style={{ color: "#888", fontSize: f * 1.15, fontFamily: "serif", lineHeight: 0.85, marginRight: -1 }}>√</span>
        <span style={{ borderTop: "1.5px solid #888", display: "inline-flex", padding: "3px 4px 0", minWidth: 14 }}>
          <MathRender node={node.rad} fontSize={f * 0.85} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        </span>
      </span>
    );
  }

  if (node.type === "func") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={{ color: "#34d399", fontSize: f * 0.75, fontFamily: "'DM Mono',monospace", fontWeight: 600, marginRight: 1 }}>{node.name}</span>
        <span style={{ color: "#555", fontSize: f * 0.85 }}>(</span>
        <MathRender node={node.arg} fontSize={f * 0.88} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        <span style={{ color: "#555", fontSize: f * 0.85 }}>)</span>
      </span>
    );
  }

  if (node.type === "paren") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={{ color: "#555", fontSize: f }}>( </span>
        <MathRender node={node.inner} fontSize={f} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
        <span style={{ color: "#555", fontSize: f }}> )</span>
      </span>
    );
  }

  return null;
}

function Cursor({ h }) {
  return <span style={{ display: "inline-block", width: 2, height: h, background: "#f472b6", borderRadius: 1, marginLeft: 1, marginRight: 1, animation: "cursorBlink 1s infinite", flexShrink: 0 }} />;
}


// ─── Graph ──────────────────────────────────────────────────────────────────
function GraphView({ expressions, onClose }) {
  const canvasRef=useRef(null);const[vp,setVp]=useState({xMin:-10,xMax:10,yMin:-7,yMax:7});const dragRef=useRef(null);
  const colors=["#f472b6","#60a5fa","#34d399","#fbbf24","#a78bfa","#fb923c"];
  const draw=useCallback(()=>{const cv=canvasRef.current;if(!cv)return;const ctx=cv.getContext("2d");const W=cv.width=cv.offsetWidth*2,H=cv.height=cv.offsetHeight*2;ctx.scale(2,2);const w=W/2,h=H/2;const{xMin,xMax,yMin,yMax}=vp;const sx=x=>((x-xMin)/(xMax-xMin))*w,sy=y=>h-((y-yMin)/(yMax-yMin))*h;ctx.fillStyle="#0a0a0f";ctx.fillRect(0,0,w,h);const gs=v=>{const r=v/8,m=Math.pow(10,Math.floor(Math.log10(r))),n=r/m;return n<1.5?m:n<3.5?2*m:n<7.5?5*m:10*m;};const xs=gs(xMax-xMin),ys=gs(yMax-yMin);ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=0.5;for(let x=Math.ceil(xMin/xs)*xs;x<=xMax;x+=xs){const px=sx(x);ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke();ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="10px monospace";ctx.textAlign="center";if(Math.abs(x)>xs*0.01)ctx.fillText(parseFloat(x.toPrecision(4)),px,sy(0)+14);}for(let y=Math.ceil(yMin/ys)*ys;y<=yMax;y+=ys){const py=sy(y);ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke();ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="10px monospace";ctx.textAlign="right";if(Math.abs(y)>ys*0.01)ctx.fillText(parseFloat(y.toPrecision(4)),sx(0)-6,py+3);}ctx.strokeStyle="rgba(255,255,255,0.25)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx(0),0);ctx.lineTo(sx(0),h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,sy(0));ctx.lineTo(w,sy(0));ctx.stroke();expressions.forEach((expr,idx)=>{const pts=MathEngine.graphPts(expr,xMin,xMax,Math.min(800,w));ctx.strokeStyle=colors[idx%colors.length];ctx.lineWidth=2;ctx.lineJoin="round";ctx.beginPath();let d=false;for(const p of pts){if(p.y===null||Math.abs(p.y)>(yMax-yMin)*50){d=false;continue;}const px=sx(p.x),py=sy(p.y);if(!d){ctx.moveTo(px,py);d=true;}else ctx.lineTo(px,py);}ctx.stroke();});expressions.forEach((e,i)=>{ctx.fillStyle=colors[i%colors.length];ctx.font="bold 12px monospace";ctx.textAlign="left";ctx.fillText(`f(x) = ${e}`,12,20+i*20);});},[vp,expressions]);
  useEffect(()=>{draw();},[draw]);
  return(<div style={{position:"fixed",inset:0,zIndex:100,background:"#0a0a0f",display:"flex",flexDirection:"column"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}><span style={{color:"#f472b6",fontWeight:700,fontSize:14}}>GRAPH</span><div style={{display:"flex",gap:8}}><button onClick={()=>setVp({xMin:-10,xMax:10,yMin:-7,yMax:7})} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#ccc",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:11}}>Reset</button><button onClick={onClose} style={{background:"rgba(244,114,182,0.15)",border:"1px solid rgba(244,114,182,0.3)",color:"#f472b6",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>Close</button></div></div><canvas ref={canvasRef} style={{flex:1,cursor:"grab",touchAction:"none"}} onWheel={e=>{e.preventDefault();const f=e.deltaY>0?1.15:0.87;setVp(v=>{const cx=(v.xMin+v.xMax)/2,cy=(v.yMin+v.yMax)/2,hw=((v.xMax-v.xMin)/2)*f,hh=((v.yMax-v.yMin)/2)*f;return{xMin:cx-hw,xMax:cx+hw,yMin:cy-hh,yMax:cy+hh};});}} onPointerDown={e=>{const r=canvasRef.current.getBoundingClientRect();dragRef.current={x:e.clientX,y:e.clientY,v:{...vp},r};canvasRef.current.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!dragRef.current)return;const{x,y,v,r}=dragRef.current;const dx=(e.clientX-x)/r.width*(v.xMax-v.xMin),dy=(e.clientY-y)/r.height*(v.yMax-v.yMin);setVp({xMin:v.xMin-dx,xMax:v.xMax-dx,yMin:v.yMin+dy,yMax:v.yMax+dy});}} onPointerUp={()=>{dragRef.current=null;}}/></div>);
}


// ─── Unit Converter ─────────────────────────────────────────────────────────
function UnitPanel() {
  const cats=Object.keys(UNIT_DATA);const[cat,setCat]=useState("Length");const[fu,setFu]=useState("");const[tu,setTu]=useState("");const[fv,setFv]=useState("1");const[search,setSearch]=useState("");const[showCat,setShowCat]=useState(false);
  const units=useMemo(()=>Object.keys(UNIT_DATA[cat]||{}),[cat]);
  useEffect(()=>{setFu(units[0]||"");setTu(units[1]||"");},[cat,units]);
  const result=useMemo(()=>{const v=parseFloat(fv);if(isNaN(v))return"";const r=convertUnit(v,cat,fu,tu);if(r===null)return"—";if(Math.abs(r)<1e-4||Math.abs(r)>1e12)return r.toExponential(6);return parseFloat(r.toPrecision(10)).toLocaleString("en-US",{maximumFractionDigits:10});},[fv,cat,fu,tu]);
  const ss={width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13,fontFamily:"'DM Mono',monospace",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#ddd",appearance:"none",outline:"none"};
  const fc=cats.filter(c=>c.toLowerCase().includes(search.toLowerCase()));
  return(<div style={{padding:16,display:"flex",flexDirection:"column",gap:12,flex:1,overflowY:"auto"}}><button onClick={()=>setShowCat(!showCat)} style={{padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",textAlign:"left",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.15)",color:"#fbbf24",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{cat}</span><span style={{fontSize:10,opacity:0.6}}>{showCat?"▲":"▼"}</span></button>{showCat&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,maxHeight:240,overflowY:"auto",padding:4}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{width:"100%",padding:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:6,color:"#ccc",fontSize:12,fontFamily:"'DM Mono',monospace",outline:"none",marginBottom:4,boxSizing:"border-box"}}/>{fc.map(c=><button key={c} onClick={()=>{setCat(c);setShowCat(false);setSearch("");}} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",background:c===cat?"rgba(251,191,36,0.1)":"transparent",border:"none",color:c===cat?"#fbbf24":"#999",fontSize:12,fontFamily:"'DM Mono',monospace",cursor:"pointer",borderRadius:6}}>{c}</button>)}</div>}<div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:14,border:"1px solid rgba(255,255,255,0.05)"}}><div style={{fontSize:10,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>From</div><input value={fv} onChange={e=>setFv(e.target.value)} type="number" inputMode="decimal" style={{width:"100%",padding:"10px 0",background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:28,fontFamily:"'DM Mono',monospace",fontWeight:600,boxSizing:"border-box"}}/><select value={fu} onChange={e=>setFu(e.target.value)} style={ss}>{units.map(u=><option key={u} value={u}>{u}</option>)}</select></div><div style={{display:"flex",justifyContent:"center"}}><button onClick={()=>{setFu(tu);setTu(fu);}} style={{width:40,height:40,borderRadius:"50%",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",color:"#fbbf24",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>⇅</button></div><div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:14,border:"1px solid rgba(255,255,255,0.05)"}}><div style={{fontSize:10,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>To</div><div style={{fontSize:28,fontWeight:600,color:"#fbbf24",fontFamily:"'DM Mono',monospace",padding:"10px 0",minHeight:50,wordBreak:"break-all"}}>{result||"—"}</div><select value={tu} onChange={e=>setTu(e.target.value)} style={ss}>{units.map(u=><option key={u} value={u}>{u}</option>)}</select></div></div>);
}


// ─── Currency ───────────────────────────────────────────────────────────────
function CurrencyPanel() {
  const codes=Object.keys(CURRENCY_DATA);const[fc,setFc]=useState("USD");const[tc,setTc]=useState("EUR");const[amt,setAmt]=useState("1");const[search,setSearch]=useState("");const[pick,setPick]=useState(null);
  const result=useMemo(()=>{const v=parseFloat(amt);if(isNaN(v))return"";const r=v/CURRENCY_DATA[fc].rate*CURRENCY_DATA[tc].rate;if(Math.abs(r)>1e9)return r.toExponential(4);return r.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:4});},[amt,fc,tc]);
  const rate=useMemo(()=>parseFloat((CURRENCY_DATA[tc].rate/CURRENCY_DATA[fc].rate).toPrecision(6)),[fc,tc]);
  const filtered=codes.filter(c=>{const s=search.toLowerCase();return c.toLowerCase().includes(s)||CURRENCY_DATA[c].name.toLowerCase().includes(s);});
  const CB=({code,onClick})=><button onClick={onClick} style={{width:"100%",padding:"10px 12px",borderRadius:8,textAlign:"left",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#ddd",fontFamily:"'DM Mono',monospace",fontSize:13}}><span style={{fontSize:20}}>{CURRENCY_DATA[code].flag}</span><div><div style={{fontWeight:600}}>{code}</div><div style={{fontSize:10,color:"#666"}}>{CURRENCY_DATA[code].name}</div></div><span style={{marginLeft:"auto",fontSize:10,color:"#555"}}>▼</span></button>;
  if(pick)return(<div style={{padding:16,display:"flex",flexDirection:"column",gap:8,flex:1,overflowY:"auto"}}><div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={()=>{setPick(null);setSearch("");}} style={{background:"none",border:"none",color:"#a78bfa",fontSize:18,cursor:"pointer",padding:"4px 8px"}}>←</button><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." autoFocus style={{flex:1,padding:"10px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#ccc",fontSize:13,fontFamily:"'DM Mono',monospace",outline:"none"}}/></div><div style={{overflowY:"auto",display:"flex",flexDirection:"column",gap:4,flex:1}}>{filtered.map(c=><button key={c} onClick={()=>{if(pick==="from")setFc(c);else setTc(c);setPick(null);setSearch("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:(pick==="from"?fc:tc)===c?"rgba(167,139,250,0.1)":"transparent",border:(pick==="from"?fc:tc)===c?"1px solid rgba(167,139,250,0.2)":"1px solid transparent",borderRadius:8,cursor:"pointer",color:"#ccc",fontFamily:"'DM Mono',monospace",fontSize:13,textAlign:"left",width:"100%"}}><span style={{fontSize:20}}>{CURRENCY_DATA[c].flag}</span><span style={{fontWeight:600}}>{c}</span><span style={{color:"#666",fontSize:11}}>{CURRENCY_DATA[c].name}</span></button>)}</div></div>);
  return(<div style={{padding:16,display:"flex",flexDirection:"column",gap:12,flex:1,overflowY:"auto"}}><div style={{textAlign:"center",fontSize:10,color:"#555"}}>Approximate offline rates</div><div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:14,border:"1px solid rgba(255,255,255,0.05)"}}><div style={{fontSize:10,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>From</div><input value={amt} onChange={e=>setAmt(e.target.value)} type="number" inputMode="decimal" style={{width:"100%",padding:"10px 0",background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:28,fontFamily:"'DM Mono',monospace",fontWeight:600,boxSizing:"border-box"}}/><CB code={fc} onClick={()=>setPick("from")}/></div><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12}}><div style={{fontSize:11,color:"#555"}}>1 {fc} = {rate} {tc}</div><button onClick={()=>{setFc(tc);setTc(fc);}} style={{width:40,height:40,borderRadius:"50%",background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",color:"#a78bfa",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>⇅</button></div><div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:14,border:"1px solid rgba(255,255,255,0.05)"}}><div style={{fontSize:10,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>To</div><div style={{fontSize:28,fontWeight:600,color:"#a78bfa",fontFamily:"'DM Mono',monospace",padding:"10px 0",minHeight:50}}>{result||"—"}</div><CB code={tc} onClick={()=>setPick("to")}/></div></div>);
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function HandyCalc() {
  // Use refs for cursor so mutations always see current values
  const [ast, setAst] = useState(() => mkSeq());
  const [cursorSeqId, _setCursorSeqId] = useState(() => ast.id);
  const [cursorPos, _setCursorPos] = useState(0);
  const cursorRef = useRef({ seqId: ast.id, pos: 0 });

  const setCursorSeqId = (id) => { cursorRef.current.seqId = id; _setCursorSeqId(id); };
  const setCursorPos = (p) => { cursorRef.current.pos = p; _setCursorPos(p); };

  const [history, setHistory] = useState([]);
  const [lastAns, setLastAns] = useState(0);
  const [mode, setMode] = useState("calc");
  const [graphExprs, setGraphExprs] = useState([]);
  const [showGraph, setShowGraph] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [ver, setVer] = useState(0); // force re-render
  const historyRef = useRef(null);
  const containerRef = useRef(null);

  const flatExpr = useMemo(() => toExpr(ast), [ast, ver]);
  const suggestions = useMemo(() => {
    if (mode !== "calc" && mode !== "solve" && mode !== "graph") return [];
    return MathEngine.suggest(flatExpr);
  }, [flatExpr, mode, ver]);

  useEffect(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight; }, [history]);

  // ── Core mutation: directly mutates `ast` then triggers re-render ──
  function mutate(fn) {
    fn(ast, cursorRef.current);
    setAst({ ...ast }); // shallow copy to trigger re-render
    setVer(v => v + 1);
  }

  function insertChar(ch) {
    mutate((tree, cur) => {
      const seq = findSeq(tree, cur.seqId);
      if (!seq) return;
      seq.children.splice(cur.pos, 0, mkChar(ch));
      setCursorPos(cur.pos + 1);
    });
  }

  function insertStructural(type, fnName) {
    mutate((tree, cur) => {
      const seq = findSeq(tree, cur.seqId);
      if (!seq) return;

      if (type === "frac") {
        const numChildren = seq.children.splice(0, cur.pos);
        const num = mkSeq(numChildren);
        const den = mkSeq();
        const frac = mkFrac(num, den);
        seq.children.unshift(frac);
        setCursorSeqId(den.id);
        setCursorPos(0);
      } else if (type === "sup") {
        const exp = mkSeq();
        if (cur.pos > 0) {
          const base = seq.children.splice(cur.pos - 1, 1)[0];
          const sup = mkSup(mkSeq([base]), exp);
          seq.children.splice(cur.pos - 1, 0, sup);
        } else {
          const sup = mkSup(mkSeq(), exp);
          seq.children.splice(0, 0, sup);
        }
        setCursorSeqId(exp.id);
        setCursorPos(0);
      } else if (type === "sqrt") {
        const rad = mkSeq();
        seq.children.splice(cur.pos, 0, mkSqrt(rad));
        setCursorSeqId(rad.id);
        setCursorPos(0);
      } else if (type === "func") {
        const arg = mkSeq();
        seq.children.splice(cur.pos, 0, mkFunc(fnName, arg));
        setCursorSeqId(arg.id);
        setCursorPos(0);
      } else if (type === "paren") {
        const inner = mkSeq();
        seq.children.splice(cur.pos, 0, mkParen(inner));
        setCursorSeqId(inner.id);
        setCursorPos(0);
      }
    });
  }

  function doBackspace() {
    mutate((tree, cur) => {
      const seq = findSeq(tree, cur.seqId);
      if (!seq) return;

      if (cur.pos > 0) {
        const removed = seq.children[cur.pos - 1];
        if (removed.type === "char") {
          seq.children.splice(cur.pos - 1, 1);
          setCursorPos(cur.pos - 1);
        } else {
          // Structural: unwrap children into seq
          let inner = [];
          if (removed.type === "frac") inner = [...removed.num.children, ...removed.den.children];
          else if (removed.type === "sup") inner = [...removed.base.children, ...removed.exp.children];
          else if (removed.type === "sqrt") inner = removed.rad.children;
          else if (removed.type === "func") inner = removed.arg.children;
          else if (removed.type === "paren") inner = removed.inner.children;
          seq.children.splice(cur.pos - 1, 1, ...inner);
          setCursorPos(cur.pos - 1 + inner.length);
        }
      } else {
        // Navigate out
        const info = findParentOf(tree, cur.seqId);
        if (info) {
          setCursorSeqId(info.parentSeq.id);
          setCursorPos(info.structIdx);
        }
      }
    });
  }

  function navigateOut() {
    const info = findParentOf(ast, cursorRef.current.seqId);
    if (info) {
      setCursorSeqId(info.parentSeq.id);
      setCursorPos(info.structIdx + 1);
      setVer(v => v + 1);
    }
  }

  function clearAll() {
    const s = mkSeq();
    setAst(s);
    setCursorSeqId(s.id);
    setCursorPos(0);
    setVer(v => v + 1);
  }

  function calculate() {
    const expr = toExpr(ast);
    if (!expr.trim() || expr === "()") return;
    if (mode === "solve") {
      const sols = MathEngine.solve(expr);
      setHistory(h => [...h, { expr, result: sols.length ? `x = ${sols.join(", ")}` : "No solution", type: "solve" }]);
    } else if (mode === "graph") {
      setGraphExprs(p => [...p, expr]);
      setShowGraph(true);
      setHistory(h => [...h, { expr, result: "Plotted ✓", type: "graph" }]);
    } else {
      const r = MathEngine.evaluate(expr, { ans: lastAns });
      if (r !== null) { setLastAns(r); setHistory(h => [...h, { expr, result: MathEngine.fmt(r), type: "calc" }]); }
      else setHistory(h => [...h, { expr, result: "Error", type: "error" }]);
    }
    clearAll();
  }

  function pressKey(val) {
    if (val === "=") { calculate(); return; }
    if (val === "AC") { clearAll(); return; }
    if (val === "⌫") { doBackspace(); return; }
    if (val === "ANS") { insertChar("ans"); return; }
    if (val === "/") { insertStructural("frac"); return; }
    if (val === "^") { insertStructural("sup"); return; }
    if (val === "sqrt" || val === "cbrt") { if (val === "sqrt") insertStructural("sqrt"); else insertStructural("func", "cbrt"); return; }
    if (val === "(") { insertStructural("paren"); return; }
    if (val === ")") { navigateOut(); return; }
    const funcNames = ["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","log","ln","log2","abs","exp"];
    if (funcNames.includes(val)) { insertStructural("func", val); return; }
    insertChar(val);
  }

  const handleKeyDown = (e) => {
    if (mode !== "calc" && mode !== "solve" && mode !== "graph") return;
    const key = e.key;
    if (key === "Enter") { e.preventDefault(); calculate(); return; }
    if (key === "Backspace") { e.preventDefault(); doBackspace(); return; }
    if (key === "/") { e.preventDefault(); insertStructural("frac"); return; }
    if (key === "^") { e.preventDefault(); insertStructural("sup"); return; }
    if (key === "(") { e.preventDefault(); insertStructural("paren"); return; }
    if (key === ")") { e.preventDefault(); navigateOut(); return; }
    if (/^[0-9.+\-*%!=x]$/.test(key)) { e.preventDefault(); insertChar(key === "*" ? "×" : key); return; }
  };

  const onTapSeq = (id, pos) => { setCursorSeqId(id); setCursorPos(pos); setVer(v => v + 1); };

  const modeColors = { calc:{bg:"#f472b6",label:"CALC"}, solve:{bg:"#60a5fa",label:"SOLVE"}, graph:{bg:"#34d399",label:"GRAPH"}, units:{bg:"#fbbf24",label:"UNITS"}, fx:{bg:"#a78bfa",label:"FX"} };
  const showCalcUI = mode === "calc" || mode === "solve" || mode === "graph";
  const isAstEmpty = ast.children.length === 0;

  const mainKeys = shifted ? [
    ["asin","acos","atan","^"],["sinh","cosh","tanh","%"],["log2","exp","abs","!"],["⇧","cbrt","π","e"],
  ] : [
    ["sin","cos","tan","^"],["(",")","sqrt","%"],["log","ln","x","!"],["⇧","1/x","π","e"],
  ];
  const numKeys = [["7","8","9","÷"],["4","5","6","×"],["1","2","3","−"],["0",".","=","+"]];
  const keyMap = {"÷":"/","×":"*","−":"-","1/x":"1/x","⇧":null};

  const handleBtnPress = (k) => {
    if (k === "⇧") { setShifted(s => !s); return; }
    if (k === "1/x") { insertStructural("frac"); insertChar("1"); navigateOut(); return; /* not quite right, just insert 1/x as text */ }
    const mapped = keyMap[k] !== undefined ? keyMap[k] : k;
    if (mapped !== null && mapped !== "1/x") pressKey(mapped);
  };

  const getKeyStyle = (k) => {
    const base = { border:"none",borderRadius:10,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.1s",padding:0,minHeight:46 };
    if (k==="=") return{...base,background:"linear-gradient(135deg,#f472b6,#ec4899)",color:"#fff",fontSize:20};
    if ("÷×−+^%!".includes(k)) return{...base,background:"rgba(244,114,182,0.12)",color:"#f472b6",border:"1px solid rgba(244,114,182,0.15)"};
    if (k==="⇧") return{...base,background:shifted?"rgba(96,165,250,0.2)":"rgba(255,255,255,0.06)",color:shifted?"#60a5fa":"#aaa",border:shifted?"1px solid rgba(96,165,250,0.3)":"1px solid rgba(255,255,255,0.08)"};
    if (/^[0-9.]$/.test(k)) return{...base,background:"rgba(255,255,255,0.08)",color:"#fff",border:"1px solid rgba(255,255,255,0.06)"};
    return{...base,background:"rgba(255,255,255,0.04)",color:"#ccc",fontSize:12,border:"1px solid rgba(255,255,255,0.06)"};
  };

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown}
      style={{ width:"100%",maxWidth:420,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",background:"#0a0a0f",color:"#fff",fontFamily:"'DM Mono',monospace",overflow:"hidden",outline:"none" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      {showGraph && <GraphView expressions={graphExprs} onClose={()=>setShowGraph(false)} />}

      {/* Header */}
      <div style={{padding:"12px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#f472b6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>h</div>
          <span style={{fontSize:14,fontWeight:600,color:"#eee",fontFamily:"'Space Grotesk',sans-serif"}}>handyCalc</span>
        </div>
        <div style={{display:"flex",gap:3}}>
          {Object.entries(modeColors).map(([m,c])=>(
            <button key={m} onClick={()=>{setMode(m);setTimeout(()=>containerRef.current?.focus(),50);}} style={{padding:"4px 8px",borderRadius:6,fontSize:9,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",transition:"all 0.2s",border:mode===m?`1px solid ${c.bg}`:"1px solid rgba(255,255,255,0.08)",background:mode===m?`${c.bg}22`:"transparent",color:mode===m?c.bg:"#555"}}>{c.label}</button>
          ))}
        </div>
      </div>

      {showCalcUI ? (<>
        {/* History */}
        <div ref={historyRef} style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:6,minHeight:0}}>
          {history.length===0 && isAstEmpty && (
            <div style={{textAlign:"center",color:"#333",padding:"30px 20px",fontSize:12,lineHeight:1.8}}>
              <div style={{fontSize:32,marginBottom:12,opacity:0.3}}>∑</div>
              <div style={{color:"#555"}}>Type an expression to get started</div>
              <div style={{color:"#444",marginTop:4}}>
                {mode==="solve"?"Enter equation with x · fractions render naturally":mode==="graph"?"Enter f(x) · e.g. sin(x) or x²":"Press ÷ for fractions · ^ for exponents · √ for roots"}
              </div>
            </div>
          )}
          {history.map((h,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",gap:2,animation:"fadeIn 0.2s ease-out"}}>
              <div style={{fontSize:11,color:"#555",textAlign:"right",wordBreak:"break-all"}}>{h.expr}</div>
              <div style={{fontSize:h.type==="solve"?16:20,fontWeight:600,textAlign:"right",color:h.type==="error"?"#ef4444":h.type==="solve"?"#60a5fa":h.type==="graph"?"#34d399":"#f472b6"}}>{h.result}</div>
            </div>
          ))}
        </div>

        {/* Live Math Display */}
        <div onClick={()=>{ onTapSeq(ast.id, ast.children.length); containerRef.current?.focus(); }}
          style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",minHeight:56,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"text",overflowX:"auto",overflowY:"hidden",background:"rgba(255,255,255,0.012)"}}>
          {isAstEmpty ? (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{color:"#2a2a2a",fontSize:20,fontFamily:"'Space Grotesk',sans-serif"}}>{mode==="solve"?"x² − 4 = 0":mode==="graph"?"f(x)":"0"}</span>
              <Cursor h={22} />
            </div>
          ) : (
            <MathRender node={ast} fontSize={24} cursorSeqId={cursorSeqId} cursorPos={cursorPos} onTapSeq={onTapSeq} />
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length>0&&<div style={{padding:"4px 12px",display:"flex",gap:6,overflowX:"auto",flexShrink:0,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
          {suggestions.map((s,i)=><button key={i} onClick={()=>{if(s.action==="eval")calculate();}} style={{padding:"5px 10px",borderRadius:8,fontSize:11,fontFamily:"'DM Mono',monospace",background:i===0?"rgba(244,114,182,0.12)":"rgba(255,255,255,0.04)",border:i===0?"1px solid rgba(244,114,182,0.2)":"1px solid rgba(255,255,255,0.06)",color:i===0?"#f472b6":"#888",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{s.label}</button>)}
        </div>}

        {/* Action bar */}
        <div style={{padding:"4px 12px",display:"flex",gap:6,flexShrink:0}}>
          <button onClick={()=>pressKey("AC")} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444"}}>AC</button>
          <button onClick={()=>pressKey("⌫")} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"#888"}}>⌫</button>
          <button onClick={()=>insertChar("ans")} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"#888"}}>ANS</button>
          {mode==="graph"&&<button onClick={()=>{if(graphExprs.length)setShowGraph(true);}} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.15)",color:"#34d399"}}>VIEW</button>}
          {mode==="graph"&&<button onClick={()=>setGraphExprs([])} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"#666"}}>CLR</button>}
        </div>

        {/* Sci keys */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,padding:"4px 12px",flexShrink:0}}>
          {mainKeys.flat().map((k,i)=><button key={k+i} onClick={()=>handleBtnPress(k)} style={getKeyStyle(k)}>{k}</button>)}
        </div>
        {/* Num keys */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,padding:"4px 12px 16px",flexShrink:0}}>
          {numKeys.flat().map((k,i)=><button key={k+i} onClick={()=>handleBtnPress(k)} style={getKeyStyle(k)}>{k}</button>)}
        </div>
      </>) : mode==="units" ? <UnitPanel/> : mode==="fx" ? <CurrencyPanel/> : null}

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
        @keyframes cursorBlink{0%,100%{opacity:1;}50%{opacity:0;}}
        button:active{transform:scale(0.95)!important;opacity:0.8;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        select option{background:#1a1a2e;color:#ddd;}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;}
        input::placeholder{color:#333;}
      `}</style>
    </div>
  );
}
