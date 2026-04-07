"use client";

import { useEffect, useRef } from "react";

export default function TreeGrowth({ days }: { days: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const stages = [
    { label: "씨앗", desc: "겨자씨 한 알이 기다리고 있어요" },
    { label: "발아 중", desc: "땅 속에서 뿌리를 내리고 있어요" },
    { label: "새싹", desc: "고개를 들고 햇빛을 찾아요" },
    { label: "묘목", desc: "가지가 뻗고 잎이 돋아나요" },
    { label: "성장 중", desc: "열매를 맺을 준비를 해요" },
    { label: "완성 🎉", desc: "새들이 날아와 깃들었어요" },
    { label: "번성", desc: "새 씨앗이 뿌려지고 있어요" },
  ];

  const si = days === 0 ? 0 : days < 8 ? 1 : days < 30 ? 2 : days < 60 ? 3 : days < 100 ? 4 : days < 110 ? 5 : 6;
  const stage = stages[si];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 390; canvas.height = 240;
    const W = 390, H = 240, groundY = 182, mx = 155;

    let rng = days * 9301 + 49297;
    const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
    const resetRng = () => { rng = days * 9301 + 49297; };

    const drawCloud = (cx: number, cy: number, s: number, a: number, off: number) => {
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#fff";
      [[0,0,18],[15,5,14],[-15,5,14],[24,-2,10],[-24,-2,10]].forEach(([dx,dy,r]) => {
        ctx.beginPath(); ctx.arc(cx+dx*s+off, cy+dy*s, r*s, 0, Math.PI*2); ctx.fill();
      }); ctx.restore();
    };

    const drawBird = (bx: number, by: number, sz: number, fl: number) => {
      ctx.save(); ctx.strokeStyle = "#2C2B28"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx-sz, by+fl); ctx.quadraticCurveTo(bx-sz*.5, by-sz*.8+fl, bx, by+fl);
      ctx.moveTo(bx, by+fl); ctx.quadraticCurveTo(bx+sz*.5, by-sz*.8+fl, bx+sz, by+fl);
      ctx.stroke(); ctx.restore();
    };

    const branch = (x: number, y: number, angle: number, len: number, depth: number, maxD: number, density: number, lc1: string, lc2: string) => {
      if (depth > maxD || len < 2) return;
      const nx = x + Math.cos(angle)*len, ny = y + Math.sin(angle)*len;
      ctx.save(); ctx.strokeStyle = "#8B6830";
      ctx.lineWidth = Math.max(0.5, (maxD-depth+1)*1.0); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(nx,ny); ctx.stroke(); ctx.restore();
      if (depth >= maxD-1 && rand() < density) {
        ctx.save(); ctx.fillStyle = rand()>.5 ? lc1 : lc2; ctx.globalAlpha = .88;
        ctx.beginPath(); ctx.arc(nx, ny, rand()*5+6, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
      const sp = .35+rand()*.12, sh = .66+rand()*.08;
      branch(nx,ny,angle-sp,len*sh,depth+1,maxD,density,lc1,lc2);
      branch(nx,ny,angle+sp,len*sh,depth+1,maxD,density,lc1,lc2);
      if (depth < 3 && rand() < .4) branch(nx,ny,angle+(rand()-.5)*.4,len*sh*.82,depth+1,maxD,density,lc1,lc2);
    };

    let t = 0;
    const draw = () => {
      ctx.clearRect(0,0,W,H); t++;
      const sky = ctx.createLinearGradient(0,0,0,groundY);
      sky.addColorStop(0,"#A8D4F0"); sky.addColorStop(.5,"#D4EEF9"); sky.addColorStop(1,"#E8F6FE");
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,groundY);
      ctx.save(); ctx.fillStyle="#FFE066"; ctx.globalAlpha=.9;
      ctx.beginPath(); ctx.arc(330,35,20,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=.15; ctx.beginPath(); ctx.arc(330,35,30,0,Math.PI*2); ctx.fill(); ctx.restore();
      const co = Math.sin(t*.008)*4;
      drawCloud(70,32,.85,.75,co); drawCloud(200,24,.7,.6,-co*.6); drawCloud(300,48,.55,.45,co*.4);
      const ground = ctx.createLinearGradient(0,groundY,0,H);
      ground.addColorStop(0,"#9B7830"); ground.addColorStop(.3,"#7A5820"); ground.addColorStop(1,"#4A3010");
      ctx.fillStyle=ground; ctx.fillRect(0,groundY,W,H-groundY);

      if (days <= 7) {
        const sy = days>=1 ? groundY-3 : groundY-14;
        ctx.save(); ctx.fillStyle="#8B6914";
        ctx.beginPath(); ctx.ellipse(mx,sy,7,4.5,-.3,0,Math.PI*2); ctx.fill(); ctx.restore();
        if (days>=3) {
          ctx.save(); ctx.strokeStyle="#7A5A1A"; ctx.lineWidth=.9; ctx.globalAlpha=.5; ctx.lineCap="round";
          [[-10,14],[-4,18],[4,18],[10,14]].forEach(([dx,dy]) => {
            ctx.beginPath(); ctx.moveTo(mx,groundY); ctx.quadraticCurveTo(mx+dx*.5,groundY+dy*.5,mx+dx,groundY+dy); ctx.stroke();
          }); ctx.restore();
        }
        ctx.save(); ctx.fillStyle="#7A7060"; ctx.font="11px sans-serif"; ctx.textAlign="center";
        ctx.fillText(days===0?"씨앗을 심어봐요 🌰":"뿌리를 내리는 중...", mx, groundY-26); ctx.restore();
        animRef.current = requestAnimationFrame(draw); return;
      }

      const ratio = Math.min(1,(days-7)/93);
      ctx.save(); ctx.strokeStyle="#7A5A1A"; ctx.lineWidth=1.2; ctx.globalAlpha=.4; ctx.lineCap="round";
      const rd = Math.min(1,ratio*1.8);
      [[-16,18],[-8,22],[0,24],[8,22],[16,18]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(mx,groundY); ctx.quadraticCurveTo(mx+dx*.5,groundY+dy*.5,mx+dx*rd,groundY+dy*rd); ctx.stroke();
      }); ctx.restore();

      const th = Math.min(110,ratio*110), tw = Math.max(2,Math.min(8,th/12)), tt = groundY-th;
      if (th>2) {
        ctx.save(); ctx.strokeStyle="#8B6830"; ctx.lineWidth=tw*2; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(mx,groundY); ctx.quadraticCurveTo(mx-5,groundY-th*.55,mx,tt); ctx.stroke(); ctx.restore();
      }

      if (th>14) {
        const maxD = Math.min(7,Math.floor(2+ratio*5.5));
        const baseLen = Math.min(62,12+ratio*50);
        const density = Math.min(.97,.25+ratio*.72);
        const g = Math.floor(100+ratio*60);
        const lc1 = `rgb(${Math.floor(60+ratio*30)},${g+20},${Math.floor(50+ratio*20)})`;
        const lc2 = `rgb(${Math.floor(80+ratio*20)},${g+30},${Math.floor(60+ratio*10)})`;
        resetRng();
        branch(mx,tt,-Math.PI/2,baseLen,0,maxD,density,lc1,lc2);

        if (days>=60) {
          const fc = Math.min(7,Math.floor((days-59)/6)+1);
          const fp=[[-32,-70],[24,-80],[-14,-96],[35,-60],[-40,-56],[18,-112],[-8,-48]];
          for(let i=0;i<fc;i++) {
            const pulse = Math.sin(t*.05+i)*.12+.88;
            ctx.save(); ctx.fillStyle="#C4956A"; ctx.globalAlpha=pulse;
            ctx.beginPath(); ctx.arc(mx+fp[i][0],tt+fp[i][1]+th*.28,4,0,Math.PI*2); ctx.fill(); ctx.restore();
          }
        }
        if (days>=80) {
          const bc = Math.min(4,Math.floor((days-79)/6)+1);
          const bp=[[mx-38,tt-20],[mx+30,tt-30],[mx-15,tt-56],[mx+46,tt-12]];
          for(let i=0;i<bc;i++) drawBird(bp[i][0],bp[i][1],6+i*.5,Math.sin(t*.06+i*1.8)*2);
          if (days>=100) {
            const fx=((t*1.2+80)%(W+80))-40, fy=tt-38+Math.sin(t*.04)*12;
            drawBird(fx,fy,5,Math.sin(t*.08)*2);
          }
        }
      }

      if (days>=110) {
        const d2=days-110, sx=265;
        if (d2<5) {
          ctx.save(); ctx.fillStyle="#8B6914"; ctx.globalAlpha=.85;
          ctx.beginPath(); ctx.ellipse(sx,groundY-3,6,4,-.3,0,Math.PI*2); ctx.fill(); ctx.restore();
        } else {
          const r2=Math.min(.3,(d2-5)/90), th2=Math.min(40,r2*140);
          ctx.save(); ctx.strokeStyle="#8B6830"; ctx.lineWidth=Math.max(1.5,th2/16); ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(sx,groundY); ctx.lineTo(sx,groundY-th2); ctx.stroke(); ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [days]);

  return (
    <div style={{ margin: "0 16px 14px" }}>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, background: "var(--terra)", color: "white", fontSize: 10, fontWeight: 700, padding: "4px 11px", borderRadius: 20, letterSpacing: "0.3px" }}>
          {stage.label}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, background: "rgba(255,255,255,0.88)", color: "var(--text)", fontSize: 10, fontWeight: 600, padding: "4px 11px", borderRadius: 20 }}>
          {days}일째
        </div>
        <canvas ref={canvasRef} style={{ width: "100%", height: 240, display: "block" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 2px" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{stage.desc}</span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{Math.min(days,100)} / 100일</span>
      </div>
      <div className="progress-bar" style={{ marginTop: 6 }}>
        <div className="progress-fill" style={{ width: `${Math.min((days/100)*100,100)}%` }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="streak-chip">
          <span style={{ fontSize: 12 }}>🔥</span>
          <span>{days}일 연속 기록 중</span>
        </div>
      </div>
    </div>
  );
}
