import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { C, FPS, Scene, deva, enter, fadeOut, lineAt, mono, pop, rel, sans, wordAt } from "./theme";
import { Callout, Chapter, LiveDot, Pill, Rise, Tag } from "./ui";

const Paper: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <AbsoluteFill style={{ background: dark ? C.dark : C.paper, fontFamily: sans, color: dark ? "#f4f4f4" : C.ink }}>
    {!dark && <AbsoluteFill style={{ backgroundImage: `radial-gradient(${C.line} 1.2px, transparent 1.2px)`, backgroundSize: "36px 36px", opacity: 0.55 }} />}
    {children}
  </AbsoluteFill>
);

const count = (f: number, from: number, to: number, a: number, d = 40) =>
  interpolate(f, [a, a + d], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: t => 1 - Math.pow(1 - t, 3) });

/* =============== 1 · OPEN =============== */
export const Open: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const l1 = lineAt(sc, 1), l2 = lineAt(sc, 2);
  const a = enter(f, 6) * fadeOut(f, l1 - 8);
  const b = enter(f, l1) * fadeOut(f, l2 - 8);
  const hackSys = wordAt(sc, 2, /system/i), hackPerson = wordAt(sc, 2, /person/i);
  return (
    <Paper dark>
      <Chapter n="00" title="IBM Z Datathon 2026" dark />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {a > 0 && <div style={{ opacity: a, textAlign: "center", transform: `scale(${0.96 + 0.04 * a})` }}>
          <div style={{ fontSize: 200, fontWeight: 300, letterSpacing: -4, lineHeight: 1 }}>{count(f, 0, 24.5, 6, 50).toFixed(1)}<span style={{ fontSize: 110 }}> billion</span></div>
          <div style={{ fontSize: 46, color: "#c6c6c6", marginTop: 24 }}>UPI payments in India, every month</div>
          <div style={{ fontFamily: mono, fontSize: 20, color: "#8d8d8d", marginTop: 40 }}>Source: NPCI, August 2026</div>
        </div>}
        {b > 0 && <div style={{ position: "absolute", opacity: b, textAlign: "center", transform: `scale(${0.96 + 0.04 * b})` }}>
          <div style={{ fontSize: 190, fontWeight: 300, letterSpacing: -4, lineHeight: 1, color: "#ff8389" }}>₹{Math.round(count(f, 0, 22845, l1, 55)).toLocaleString("en-IN")}<span style={{ fontSize: 100 }}> crore</span></div>
          <div style={{ fontSize: 46, color: "#c6c6c6", marginTop: 24 }}>lost to cyber fraud in 2024 alone</div>
          <div style={{ fontFamily: mono, fontSize: 20, color: "#8d8d8d", marginTop: 40 }}>Source: Ministry of Home Affairs, Lok Sabha reply</div>
        </div>}
        {f >= l2 - 4 && <div style={{ position: "absolute", textAlign: "center" }}>
          <Rise at={l2}><div style={{ fontSize: 84, fontWeight: 400, color: "#a8a8a8" }}>Most scams don't hack <span style={{ color: "#f4f4f4" }}>the system.</span></div></Rise>
          <div style={{ height: 30 }} />
          <div style={{ fontSize: 120, fontWeight: 700, opacity: enter(f, hackPerson - 6, 10),
            transform: `scale(${0.8 + 0.2 * pop(f, hackPerson - 6)})`, letterSpacing: -2 }}>
            They hack <span style={{ color: C.blue, background: "#fff", padding: "0 18px" }}>the person.</span></div>
          <span style={{ display: "none" }}>{hackSys}</span>
        </div>}
      </AbsoluteFill>
    </Paper>
  );
};

/* =============== 2 · PROBLEM =============== */
const ICON: Record<string, React.ReactNode> = {
  call: <svg viewBox="0 0 48 48" width="56" height="56"><path d="M14 6h8l3 10-5 3c2 5 5 8 10 10l3-5 10 3v8c0 2-2 4-4 4C22 39 9 26 9 10c0-2 2-4 5-4z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>,
  gift: <svg viewBox="0 0 48 48" width="56" height="56"><rect x="7" y="18" width="34" height="24" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M5 12h38v6H5zM24 12v30M24 12c-4-8-14-8-12-1M24 12c4-8 14-8 12-1" fill="none" stroke="currentColor" strokeWidth="3"/></svg>,
  sim: <svg viewBox="0 0 48 48" width="56" height="56"><path d="M12 4h18l8 8v32H12z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><rect x="18" y="22" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"/></svg>,
  mule: <svg viewBox="0 0 48 48" width="56" height="56"><circle cx="10" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="10" cy="36" r="5" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="38" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M15 13l17 9M15 35l17-9" stroke="currentColor" strokeWidth="3"/></svg>,
};
export const Problem: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const cards = [
    { k: "call", t: "Digital arrest", d: "Fake police keep the victim on a call until they transfer their savings", at: wordAt(sc, 0, /police/i) - 4, c: C.red },
    { k: "gift", t: "Collect-request scam", d: "“Approve to receive your prize”: approving actually pays", at: wordAt(sc, 0, /prizes/i) - 4, c: C.amberInk },
    { k: "sim", t: "SIM-swap takeover", d: "A new phone in another city drains the account", at: wordAt(sc, 0, /^SIM/i) - 4, c: "#8a3ffc" },
    { k: "mule", t: "Money mules", d: "Rented accounts pass the money on within minutes", at: wordAt(sc, 0, /mule/i) - 4, c: C.blue },
  ];
  const l1 = lineAt(sc, 1);
  const out = fadeOut(f, l1 - 6, 10);
  const settle = wordAt(sc, 1, /during/i);
  return (
    <Paper>
      <Chapter n="01" title="The problem" />
      {out > 0 && <AbsoluteFill style={{ padding: "170px 96px 0", opacity: out }}>
        <Rise at={2}><div style={{ fontSize: 62, fontWeight: 600, letterSpacing: -1 }}>Four scams. One weakness: <span style={{ color: C.blue }}>people under pressure.</span></div></Rise>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, marginTop: 64 }}>
          {cards.map((c, i) => {
            const p = pop(f, c.at);
            const rot = [-2.2, 1.6, -1.2, 2][i] * (1 - Math.min(1, p));
            return <div key={c.k} style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 70}px) rotate(${rot}deg)`,
              background: "#fff", border: `1.5px solid ${C.line}`, borderTop: `8px solid ${c.c}`, padding: "30px 30px 36px", minHeight: 420,
              boxShadow: "0 18px 44px rgba(0,0,0,.08)" }}>
              <div style={{ color: c.c }}>{ICON[c.k]}</div>
              <div style={{ fontFamily: mono, fontSize: 20, color: C.muted, marginTop: 22 }}>0{i + 1}</div>
              <div style={{ fontSize: 40, fontWeight: 600, marginTop: 6, lineHeight: 1.15 }}>{c.t}</div>
              <div style={{ fontSize: 27, color: C.ink2, marginTop: 16, lineHeight: 1.4 }}>{c.d}</div>
            </div>;
          })}
        </div>
      </AbsoluteFill>}
      {f >= l1 - 6 && <AbsoluteFill style={{ justifyContent: "center", padding: "0 140px" }}>
        <Rise at={l1}><div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -1, lineHeight: 1.15 }}>Once a payment settles,<br/>it's almost impossible to get back.</div></Rise>
        {/* timeline: Pay -> Settled */}
        <div style={{ position: "relative", height: 200, marginTop: 90 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 60, height: 6, background: C.line }} />
          <div style={{ position: "absolute", left: 0, top: 60, height: 6, background: C.ink, width: `${100 * enter(f, l1 + 10, 50)}%` }} />
          {[["Customer taps Pay", 0], ["Bank authorises", 50], ["Money settled", 100]].map(([t, x], i) => (
            <div key={i} style={{ position: "absolute", left: `${x}%`, top: 44, transform: "translateX(-50%)", textAlign: "center", opacity: enter(f, l1 + 10 + i * 22, 12) }}>
              <div style={{ width: 38, height: 38, borderRadius: 19, background: i === 2 ? C.red : C.ink, margin: "0 auto" }} />
              <div style={{ fontSize: 26, marginTop: 18, color: C.ink2, whiteSpace: "nowrap" }}>{t}</div>
            </div>))}
          <div style={{ position: "absolute", left: "25%", top: -36, transform: `translateX(-50%) scale(${pop(f, settle - 4)})`, background: C.blue, color: "#fff",
            fontSize: 28, fontWeight: 600, padding: "10px 20px", whiteSpace: "nowrap" }}>The only moment to stop it</div>
          <div style={{ position: "absolute", left: "25%", top: 20, width: 4, height: 46, background: C.blue, opacity: enter(f, settle, 8) }} />
        </div>
      </AbsoluteFill>}
    </Paper>
  );
};

/* =============== 3 · MEET ZEROLAG =============== */
export const Meet: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const l1 = lineAt(sc, 1);
  const letters = "ZeroLag".split("");
  const top = interpolate(f, [l1 - 10, l1 + 8], [0, -170], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pills: ["ALLOW" | "WARN" | "HOLD", RegExp, string][] = [
    ["ALLOW", /allowed/i, "Payment goes through. Nothing to notice."], ["WARN", /warned/i, "A clear warning, then the customer confirms."],
    ["HOLD", /held/i, "Paused safely until it is verified."]];
  return (
    <Paper>
      <Chapter n="02" title="Our solution" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: `translateY(${top}px)`, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", fontSize: 190, fontWeight: 700, letterSpacing: -6 }}>
            {letters.map((ch, i) => {
              const p = pop(f, 6 + i * 3);
              return <span key={i} style={{ display: "inline-block", opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 60}px)`, color: i >= 4 ? C.blue : C.ink }}>{ch}</span>;
            })}
          </div>
          <Rise at={wordAt(sc, 0, /Real-time/i)}><div style={{ fontSize: 40, color: C.ink2, marginTop: 4 }}>Real-time AI that checks every UPI payment <b>inside the transaction</b></div></Rise>
          <Rise at={wordAt(sc, 0, /LinuxONE/i, 60) - 6}><div style={{ display: "inline-flex", gap: 12, alignItems: "center", marginTop: 26, fontFamily: mono, fontSize: 24,
            border: `1.5px solid ${C.ink}`, padding: "8px 18px" }}>running on IBM LinuxONE</div></Rise>
        </div>
        <div style={{ position: "absolute", top: 600, display: "flex", gap: 40 }}>
          {pills.map(([k, re, d]) => {
            const at = wordAt(sc, 1, re, 30) - 6;
            const p = pop(f, at);
            return <div key={k} style={{ opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 40}px)`, width: 470, background: "#fff",
              border: `1.5px solid ${C.line}`, padding: "28px 30px", boxShadow: "0 14px 36px rgba(0,0,0,.07)" }}>
              <Pill kind={k} size={34} />
              <div style={{ fontSize: 28, color: C.ink2, marginTop: 18, lineHeight: 1.35 }}>{d}</div>
            </div>;
          })}
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

/* =============== 4 · HOW IT WORKS =============== */
export const How: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const steps = [
    { t: "Tokenise", d: "UPI & device IDs → HMAC tokens", at: wordAt(sc, 0, /tokenised/i) - 8 },
    { t: "14 signals", d: "Customer & receiver behaviour", at: wordAt(sc, 0, /Fourteen/i) - 6 },
    { t: "Risk model", d: "Gradient-boosted trees", at: wordAt(sc, 1, /gradient/i) - 6 },
    { t: "Novelty", d: "Flags the never-seen-before", at: wordAt(sc, 1, /novelty/i) - 6 },
    { t: "Decide + explain", d: "Allowed · Warned · Held, with reasons", at: wordAt(sc, 1, /reasons/i) - 14 },
  ];
  return (
    <Paper>
      <Chapter n="03" title="How it works" />
      <Tag at={14}>Inside the authorisation call</Tag>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px" }}>
        <Rise at={4}><div style={{ fontSize: 58, fontWeight: 600, letterSpacing: -1, marginBottom: 70 }}>From “Pay” to a decision in milliseconds</div></Rise>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          {steps.map((s, i) => {
            const p = pop(f, s.at);
            const arrow = enter(f, s.at + 10, 10);
            return <React.Fragment key={i}>
              <div style={{ flex: 1, opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 40}px)`, background: i === 4 ? C.ink : "#fff",
                color: i === 4 ? "#fff" : C.ink, border: `1.5px solid ${i === 4 ? C.ink : C.line}`, padding: "30px 26px", minHeight: 250 }}>
                <div style={{ fontFamily: mono, fontSize: 20, color: i === 4 ? "#78a9ff" : C.blue }}>0{i + 1}</div>
                <div style={{ fontSize: 36, fontWeight: 600, marginTop: 14 }}>{s.t}</div>
                <div style={{ fontSize: 24, marginTop: 14, lineHeight: 1.4, color: i === 4 ? "#c6c6c6" : C.ink2 }}>{s.d}</div>
              </div>
              {i < 4 && <div style={{ width: 56, display: "flex", alignItems: "center", justifyContent: "center", opacity: arrow }}>
                <svg width="40" height="24" viewBox="0 0 40 24"><path d="M0 12h32M24 3l10 9-10 9" fill="none" stroke={C.ink} strokeWidth="3"/></svg></div>}
            </React.Fragment>;
          })}
        </div>
        <Rise at={wordAt(sc, 0, /never/i)} style={{ marginTop: 56 }}>
          <div style={{ display: "inline-block", background: C.blueSoft, color: C.ink, fontSize: 28, padding: "14px 22px" }}>
            The model never sees who you are, only how this payment compares with normal behaviour.</div>
        </Rise>
      </AbsoluteFill>
    </Paper>
  );
};

/* =============== 5 · PROOF (terminal) =============== */
const TERM: { cmd: string; out: string[]; hl?: string }[] = [
  { cmd: "ssh -i zerolag.pem linux1@148.100.xx.xx", out: [""] },
  { cmd: "uname -m", out: ["s390x"], hl: "s390x" },
  { cmd: "cat /etc/redhat-release", out: ["Red Hat Enterprise Linux release 9.8 (Plow)"] },
  { cmd: "lscpu | grep -E 'Vendor|Machine|static|Hyperv.*:|Flags'", out: [
    "Vendor ID:            IBM/S390", "Machine type:         9175", "CPU static MHz:       5508", "Hypervisor:           z/VM 7.3.0",
    "Flags:                esan3 zarch stfle msa ... vxe2 vxp2 nnpa sie"], hl: "nnpa" },
];
export const Proof: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  // schedule: type each command, then reveal output
  let t = 8;
  const rows: React.ReactNode[] = [];
  TERM.forEach((c, i) => {
    const typeDur = Math.min(26, c.cmd.length * 0.9);
    const typed = Math.floor(interpolate(f, [t, t + typeDur], [0, c.cmd.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    const outAt = t + typeDur + 6;
    const prompt = i === 0 ? <span style={{ color: "#78a9ff" }}>team@laptop:~$ </span>
      : <><span style={{ color: "#c6c6c6" }}>[</span><span style={{ color: "#42be65" }}>linux1@zerolag</span><span style={{ color: "#c6c6c6" }}> ~]$ </span></>;
    if (f >= t) rows.push(<div key={"c" + i}>{prompt}{c.cmd.slice(0, typed)}
      {f < outAt && Math.floor(f / 8) % 2 === 0 && <span style={{ background: "#f4f4f4" }}>&nbsp;</span>}</div>);
    if (f >= outAt) c.out.forEach((o, j) => {
      const parts = c.hl && o.includes(c.hl) ? o.split(c.hl) : null;
      rows.push(<div key={`o${i}_${j}`} style={{ color: "#e0e0e0" }}>{parts ? <>{parts[0]}<span style={{ background: C.amber, color: "#111", padding: "0 6px", fontWeight: 500 }}>{c.hl}</span>{parts[1]}</> : o || " "}</div>);
    });
    t = outAt + (i === 0 ? 14 : 30);
  });
  const nnpaAt = wordAt(sc, 0, /NNPA/i, 200);
  const s390At = wordAt(sc, 0, /s390x/i, 100);
  return (
    <Paper dark>
      <Chapter n="04" title="Proof: it runs on IBM Z" dark />
      <AbsoluteFill style={{ padding: "150px 0 0 90px" }}>
        <div style={{ background: "#111", border: "1px solid #333", borderRadius: 10, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.6)", width: 1180 }}>
          <div style={{ height: 44, background: "#1f1f1f", display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
            {["#ff5f56", "#ffbd2e", "#27c93f"].map(c => <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
            <span style={{ fontFamily: mono, fontSize: 18, color: "#8d8d8d", marginLeft: 16 }}>linux1@zerolag — ssh — IBM LinuxONE</span>
          </div>
          <div style={{ fontFamily: mono, fontSize: 25, lineHeight: 1.6, padding: "22px 28px", minHeight: 560, color: "#f4f4f4", whiteSpace: "pre" }}>{rows}</div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", right: 90, top: 230, width: 420, display: "grid", gap: 22 }}>
        {[["Architecture", "s390x", s390At], ["Machine type", "9175 · IBM z17 generation", s390At + 20], ["On-chip AI", "NNPA · Telum II accelerator", nnpaAt]].map(([k, v, at], i) => {
          const p = pop(f, (at as number) - 4);
          return <div key={i} style={{ opacity: Math.min(1, p), transform: `translateX(${(1 - p) * 50}px)`, borderLeft: `5px solid ${i === 2 ? C.amber : C.blue}`,
            background: "rgba(255,255,255,.05)", padding: "16px 20px" }}>
            <div style={{ fontFamily: mono, fontSize: 18, color: "#a8a8a8", textTransform: "uppercase", letterSpacing: 1 }}>{k as string}</div>
            <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{v as string}</div>
          </div>;
        })}
      </div>
    </Paper>
  );
};

/* =============== 6 · CONSOLE (screen recording) =============== */
export const Console: React.FC<{ sc: Scene; clipOffset: number }> = ({ sc, clipOffset }) => {
  const f = useCurrentFrame();
  const l1 = lineAt(sc, 1), l2 = lineAt(sc, 2);
  const zoom = interpolate(f, [0, 30], [1.04, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <OffthreadVideo src={staticFile("clips/console.webm")} startFrom={clipOffset} muted />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 40, bottom: 150, display: "flex", gap: 12, alignItems: "center", background: C.ink, color: "#fff",
        fontFamily: sans, fontSize: 24, padding: "10px 18px", opacity: enter(f, 6) * fadeOut(f, 140) }}><LiveDot /> Live demo · served from IBM LinuxONE (s390x)</div>
      <Callout at={wordAt(sc, 0, /four/i) - 10} until={l1 - 12} x={1340} y={120} w={520} title="≈ 4 ms per decision"
        body="Tokenise, compute 14 signals, score, explain and decide, on the mainframe." />
      <Callout at={wordAt(sc, 1, /reasons/i) - 4} until={l2 - 6} x={1480} y={560} w={400} title="Ranked reasons"
        body="How much each signal raised the risk." accent={C.red} />
      <Callout at={l2 - 4} x={1480} y={620} w={400} title="Bilingual warning" body="Shown to the customer in English and Hindi, with the 1930 helpline." accent={C.amber} />
    </AbsoluteFill>
  );
};

/* =============== 7 · TEST (screen recording) =============== */
export const Test: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const l1 = lineAt(sc, 1), l2 = lineAt(sc, 2);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile("clips/test.webm")} muted />
      <div style={{ position: "absolute", left: 40, bottom: 150, display: "flex", gap: 12, alignItems: "center", background: C.ink, color: "#fff",
        fontFamily: sans, fontSize: 24, padding: "10px 18px", opacity: enter(f, 6) * fadeOut(f, 140) }}><LiveDot /> Test a payment · same API the bank calls</div>
      <Callout at={8} until={l1 - 10} x={60} y={640} w={560} title="Scenario: “digital arrest”" body="Age 85 · on a phone call · ₹95,000 · receiver account 6 days old" accent={C.red} />
      <Callout at={l1 - 2} until={l2 - 8} x={60} y={640} w={560} title="Held in under 5 ms" body="First-time receiver, large amount, brand-new account." accent={C.red} />
      <Callout at={l2 + 18} x={60} y={640} w={560} title="Everyday payment: Allowed" body="Usual amount, usual payee, usual phone. No friction." accent={C.green} />
    </AbsoluteFill>
  );
};

/* =============== 8 · RESULTS =============== */
export const Results: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const l1 = lineAt(sc, 1);
  const kpis = [
    { v: 95.9, s: "%", l: "of scams warned or held", at: wordAt(sc, 0, /ninety-six/i, 60) - 6, c: C.green, d: 1 },
    { v: 98.3, s: "%", l: "of fraud value intercepted", at: wordAt(sc, 0, /ninety-eight/i, 100) - 6, c: C.green, d: 1 },
    { v: 0.37, s: "%", l: "of genuine payments interrupted", at: wordAt(sc, 0, /fewer/i, 150) - 6, c: C.ink, d: 2 },
  ];
  const fast = wordAt(sc, 1, /three/i, 20) - 6, fair = wordAt(sc, 1, /age/i, 120) - 6;
  return (
    <Paper>
      <Chapter n="06" title="Results" />
      <Tag at={10}>Held-out week · 32,854 simulated payments · 437 scams</Tag>
      <AbsoluteFill style={{ padding: "170px 96px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 36 }}>
          {kpis.map((k, i) => <div key={i} style={{ borderTop: `4px solid ${k.c === C.ink ? C.ink : C.green}`, paddingTop: 22, opacity: enter(f, k.at, 10) }}>
            <div style={{ fontSize: 124, fontWeight: 300, letterSpacing: -3, color: k.c, lineHeight: 1 }}>{count(f, 0, k.v, k.at, 36).toFixed(k.d)}{k.s}</div>
            <div style={{ fontSize: 32, color: C.ink2, marginTop: 14 }}>{k.l}</div>
          </div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 70, marginTop: 80, opacity: enter(f, l1 - 4) }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 22, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Median decision time</div>
            {[["Laptop (x86)", 13, C.muted], ["IBM LinuxONE", 4.2, C.blue]].map(([n, v, c], i) => {
              const w = enter(f, fast + i * 10, 30) * ((v as number) / 13) * 100;
              return <div key={i} style={{ display: "grid", gridTemplateColumns: "250px 1fr 120px", alignItems: "center", gap: 20, marginTop: 24, fontSize: 30 }}>
                <span style={{ fontWeight: i ? 600 : 400 }}>{n as string}</span>
                <span style={{ height: 34, background: C.fill, position: "relative" }}><i style={{ position: "absolute", inset: 0, width: `${w}%`, background: c as string }} /></span>
                <span style={{ textAlign: "right", fontWeight: 600 }}>{v} ms</span></div>;
            })}
            <Rise at={fast + 30}><div style={{ fontSize: 26, color: C.ink2, marginTop: 22 }}>3× faster · p99 27 ms → 5.5 ms</div></Rise>
          </div>
          <div style={{ opacity: enter(f, fair) }}>
            <div style={{ fontFamily: mono, fontSize: 22, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Scams caught, by age group</div>
            {[["18–35", 92.7], ["36–55", 96.7], ["56 and over", 97.4]].map(([g, v], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "190px 1fr 110px", alignItems: "center", gap: 18, marginTop: 22, fontSize: 28 }}>
                <span>{g}</span><span style={{ height: 22, background: C.fill, position: "relative" }}>
                  <i style={{ position: "absolute", inset: 0, width: `${(v as number) * enter(f, fair + i * 6, 24)}%`, background: C.ink2 }} /></span>
                <span style={{ textAlign: "right" }}>{v}%</span></div>))}
            <div style={{ fontSize: 24, color: C.muted, marginTop: 18 }}>Age is never a model input.</div>
          </div>
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

/* =============== 9 · WHY IBM Z =============== */
export const Why: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  const items = [
    ["Telum II on-chip AI", "Run the model on the NNPA accelerator", /Telum/i, C.blue],
    ["Crypto Express", "Tokenisation keys held in hardware", /Crypto/i, "#8a3ffc"],
    ["Secure Execution", "Confidential computing for customer data", /Secure/i, C.green],
  ] as const;
  return (
    <Paper dark>
      <Chapter n="07" title="Why IBM Z" dark />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 120px" }}>
        <Rise at={4}><div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1 }}>Payments already live on IBM Z.</div></Rise>
        <Rise at={wordAt(sc, 0, /brings/i, 60) - 4}><div style={{ fontSize: 60, fontWeight: 300, color: "#78a9ff", marginTop: 16 }}>So we bring the AI to the data.</div></Rise>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30, marginTop: 80 }}>
          {items.map(([t, d, re, c], i) => {
            const p = pop(f, wordAt(sc, 0, re, 200 + i * 30) - 6);
            return <div key={i} style={{ opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 40}px)`, borderTop: `6px solid ${c}`,
              background: "#1a1a1a", padding: "28px 30px" }}>
              <div style={{ fontFamily: mono, fontSize: 20, color: "#8d8d8d" }}>NEXT · 0{i + 1}</div>
              <div style={{ fontSize: 38, fontWeight: 600, marginTop: 10 }}>{t}</div>
              <div style={{ fontSize: 26, color: "#c6c6c6", marginTop: 10 }}>{d}</div></div>;
          })}
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

/* =============== 10 · CLOSE =============== */
const TEAM = ["Harsharaj Shetty B", "Sachith Anchan", "Prashith Shetty", "Dishan Shetty", "Apeksha Devadiga", "Noushitha Shetty"];
export const Close: React.FC<{ sc: Scene }> = ({ sc }) => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: -5, transform: `scale(${0.9 + 0.1 * pop(f, 2)})` }}>Zero<span style={{ color: C.blue }}>Lag</span></div>
        <Rise at={wordAt(sc, 0, /Stop/i, 20) - 4}><div style={{ fontSize: 50, fontWeight: 400, marginTop: 6 }}>Stop the scam <b>before the money moves.</b></div></Rise>
        <Rise at={wordAt(sc, 0, /Stop/i, 20) + 24} style={{ marginTop: 70 }}>
          <div style={{ fontFamily: mono, fontSize: 22, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>Built by</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px 40px", maxWidth: 1500, marginTop: 18, fontSize: 32 }}>
            {TEAM.map((n, i) => <span key={n} style={{ opacity: enter(f, wordAt(sc, 0, /Stop/i, 20) + 24 + i * 4, 10) }}>{n}</span>)}
          </div>
          <div style={{ fontFamily: mono, fontSize: 26, marginTop: 44, color: C.ink2 }}>github.com/hsbofficial1/zerolag</div>
          <div style={{ fontSize: 24, color: C.muted, marginTop: 12 }}>IBM Z Datathon 2026 · Bengaluru hub · Real-Time AI for Critical Decisions</div>
        </Rise>
      </AbsoluteFill>
    </Paper>
  );
};

export const sceneStart = (sc: Scene) => Math.round(sc.start * FPS);
export { rel, deva };
