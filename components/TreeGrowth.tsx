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
    { label: "번성", desc: "새 씨앗이 옆에 뿌려지고 있어요" },
  ];

  const stageIndex = days === 0 ? 0 : days < 8 ? 1 : days < 30 ? 2 : days < 60 ? 3 : days < 100 ? 4 : days < 110 ? 5 : 6;
  const stage = stages[stageIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 390; canvas.height = 260;
    const W = 390, H = 260, groundY = 195, mx = 155;

    let rngState = days * 9301 + 49297;
    function rand() { rngState = (rngState * 9301 + 49297) % 233280; return rngState / 233280; }
    function resetRng() { rngState = days * 9301 + 49297; }

    function drawCloud(cx: number, cy: number, s: number, a: number, off: number) {
      ctx!.save(); ctx!.globalAlpha = a; ctx!.fillStyle = "#fff";
      [[0,0,18],[15,5,14],[-15,5,14],[24,-2,10],[-24,-2,10]].forEach(([dx,dy,r]) => {
        ctx!.beginPath(); ctx!.arc(cx+dx*s+off, cy+dy*s, r*s, 0, Math.PI*2); ctx!.fill();
      }); ctx!.restore();
    }

    function drawBird(bx: number, by: number, sz: number, fl: number) {
      ctx!.save(); ctx!.strokeStyle = "#1A2A3A"; ctx!.lineWidth = 1.5; ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(bx-sz, by+fl); ctx!.quadraticCurveTo(bx-sz*.5, by-sz*.8+fl, bx, by+fl);
      ctx!.moveTo(bx, by+fl); ctx!.quadraticCurveTo(bx+sz*.5, by-sz*.8+fl, bx+sz, by+fl);
      ctx!.stroke(); ctx!.restore();
    }

    function branch(x: number, y: number, angle: number, len: number, depth: number, maxD: number, density: number, lc1: string, lc2: string) {
      if (depth > maxD || len < 2) return;
      const nx = x + Math.cos(angle)*len, ny = y + Math.sin(angle)*len;
      ctx!.save(); ctx!.strokeStyle = "#7A5C20";
      ctx!.lineWidth = Math.max(0.6, (maxD-depth+1)*1.1); ctx!.lineCap = "round";
      ctx!.beginPath(); ctx!.moveTo(x,y); ctx!.lineTo(nx,ny); ctx!.stroke(); ctx!.restore();
      if (depth >= maxD-1 && rand() < density) {
        ctx!.save(); ctx!.fillStyle = rand()>.5 ? lc1 : lc2; ctx!.globalAlpha = .88;
        ctx!.beginPath(); ctx!.arc(nx, ny, rand()*5+6, 0, Math.PI*2); ctx!.fill(); ctx!.restore();
      }
      const sp = .35+rand()*.12, sh = .66+rand()*.08;
      branch(nx,ny,angle-sp,len*sh,depth+1,maxD,density,lc1,lc2);
      branch(nx,ny,angle+sp,len*sh,depth+1,maxD,density,lc1,lc2);
      if (depth < 3 && rand() < .4) branch(nx,ny,angle+(rand()-.5)*.4,len*sh*.82,depth+1,maxD,density,lc1,lc2);
    }

    let t = 0;
    function draw() {
      ctx!.clearRect(0,0,W,H); t++;
      // 하늘
      const sky = ctx!.createLinearGradient(0,0,0,groundY);
      sky.addColorStop(0,"#7EC8E3"); sky.addColorStop(.5,"#C5E8F7"); sky.addColorStop(1,"#E8F6FE");
      ctx!.fillStyle = sky; ctx!.fillRect(0,0,W,groundY);
      // 태양
      ctx!.save(); ctx!.fillStyle="#FFE066"; ctx!.globalAlpha=.95;
      ctx!.beginPath(); ctx!.arc(330,38,22,0,Math.PI*2); ctx!.fill();
      ctx!.globalAlpha=.18; ctx!.beginPath(); ctx!.arc(330,38,32,0,Math.PI*2); ctx!.fill(); ctx!.restore();
      // 구름
      const co = Math.sin(t*.008)*4;
      drawCloud(70,35,.9,.8,co); drawCloud(200,26,.75,.65,-co*.6); drawCloud(310,55,.6,.5,co*.4);
      // 땅
      const ground = ctx!.createLinearGradient(0,groundY,0,H);
      ground.addColorStop(0,"#8B6820"); ground.addColorStop(.3,"#6B4F18"); ground.addColorStop(1,"#3A2808");
      ctx!.fillStyle=ground; ctx!.fillRect(0,groundY,W,H-groundY);

      if (days <= 7) {
        // 씨앗
        const sy = days>=1 ? groundY-3 : groundY-14;
        ctx!.save(); ctx!.fillStyle="#8B6914";
        ctx!.beginPath(); ctx!.ellipse(mx,sy,7,4.5,-.3,0,Math.PI*2); ctx!.fill();
        ctx!.strokeStyle="#5A4010"; ctx!.lineWidth=.8;
        ctx!.beginPath(); ctx!.moveTo(mx-5,sy); ctx!.quadraticCurveTo(mx,sy-3,mx+5,sy); ctx!.stroke(); ctx!.restore();
        if (days>=3) {
          ctx!.save(); ctx!.strokeStyle="#7A5A1A"; ctx!.lineWidth=.9; ctx!.globalAlpha=.5; ctx!.lineCap="round";
          [[-10,14],[-4,18],[4,18],[10,14]].forEach(([dx,dy]) => {
            ctx!.beginPath(); ctx!.moveTo(mx,groundY); ctx!.quadraticCurveTo(mx+dx*.5,groundY+dy*.5,mx+dx,groundY+dy); ctx!.stroke();
          }); ctx!.restore();
        }
        ctx!.save(); ctx!.fillStyle="#6B6B6B"; ctx!.font="12px Pretendard,sans-serif"; ctx!.textAlign="center";
        ctx!.fillText(days===0?"씨앗을 심어봐요 🌰":"뿌리를 내리는 중...", mx, groundY-28); ctx!.restore();
        animRef.current = requestAnimationFrame(draw); return;
      }

      const ratio = Math.min(1,(days-7)/93);
      // 뿌리
      ctx!.save(); ctx!.strokeStyle="#7A5A1A"; ctx!.lineWidth=1.2; ctx!.globalAlpha=.4; ctx!.lineCap="round";
      const rd = Math.min(1,ratio*1.8);
      [[-16,18],[-8,22],[0,24],[8,22],[16,18]].forEach(([dx,dy]) => {
        ctx!.beginPath(); ctx!.moveTo(mx,groundY); ctx!.quadraticCurveTo(mx+dx*.5,groundY+dy*.5,mx+dx*rd,groundY+dy*rd); ctx!.stroke();
      }); ctx!.restore();

      // 줄기
      const th = Math.min(115,ratio*115), tw = Math.max(2,Math.min(9,th/11)), tt = groundY-th;
      if (th>2) {
        ctx!.save(); ctx!.strokeStyle="#7A5C20"; ctx!.lineWidth=tw*2; ctx!.lineCap="round";
        ctx!.beginPath(); ctx!.moveTo(mx,groundY); ctx!.quadraticCurveTo(mx-5,groundY-th*.55,mx,tt); ctx!.stroke(); ctx!.restore();
      }

      // 가지+잎
      if (th>14) {
        const maxD = Math.min(7,Math.floor(2+ratio*5.5));
        const baseLen = Math.min(65,12+ratio*53);
        const density = Math.min(.97,.25+ratio*.72);
        const g = Math.floor(105+ratio*65);
        const lc1 = `rgb(${Math.floor(22+ratio*28)},${g},${Math.floor(22+ratio*18)})`;
        const lc2 = `rgb(${Math.floor(32+ratio*18)},${Math.floor(g+18)},${Math.floor(32+ratio*10)})`;
        resetRng();
        branch(mx,tt,-Math.PI/2,baseLen,0,maxD,density,lc1,lc2);

        // 열매 (60일+)
        if (days>=60) {
          const fc = Math.min(7,Math.floor((days-59)/6)+1);
          const fp=[[-32,-72],[24,-82],[-14,-98],[35,-62],[-40,-58],[18,-114],[-8,-50]];
          for(let i=0;i<fc;i++) {
            const pulse = Math.sin(t*.05+i)*.15+.85;
            ctx!.save(); ctx!.fillStyle="#E8C547"; ctx!.globalAlpha=pulse;
            ctx!.beginPath(); ctx!.arc(mx+fp[i][0],tt+fp[i][1]+th*.28,4.5,0,Math.PI*2); ctx!.fill(); ctx!.restore();
          }
        }

        // 새 (80일+)
        if (days>=80) {
          const bc = Math.min(4,Math.floor((days-79)/6)+1);
          const bp=[[mx-38,tt-22],[mx+30,tt-32],[mx-15,tt-58],[mx+46,tt-14]];
          for(let i=0;i<bc;i++) drawBird(bp[i][0],bp[i][1],6+i*.5,Math.sin(t*.06+i*1.8)*2);
          if (days>=100) {
            const fx=((t*1.2+80)%(W+80))-40, fy=tt-40+Math.sin(t*.04)*12;
            drawBird(fx,fy,5,Math.sin(t*.08)*2);
          }
        }
      }

      // 110일+ 두번째 씨앗
      if (days>=110) {
        const d2=days-110, sx=265;
        if (d2<5) {
          ctx!.save(); ctx!.fillStyle="#8B6914"; ctx!.globalAlpha=.9;
          ctx!.beginPath(); ctx!.ellipse(sx,groundY-3,6,4,-.3,0,Math.PI*2); ctx!.fill(); ctx!.restore();
        } else {
          const r2=Math.min(.3,(d2-5)/90), th2=Math.min(45,r2*150);
          ctx!.save(); ctx!.strokeStyle="#7A5C20"; ctx!.lineWidth=Math.max(1.5,th2/16); ctx!.lineCap="round";
          ctx!.beginPath(); ctx!.moveTo(sx,groundY); ctx!.lineTo(sx,groundY-th2); ctx!.stroke(); ctx!.restore();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [days]);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 12, left: 16, zIndex: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "var(--gold)", color: "var(--dark)", fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 20 }}>
            {stage.label}
          </span>
          <span style={{ background: "rgba(255,255,255,0.75)", color: "var(--dark)", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>
            {days}일째
          </span>
        </div>
        <canvas ref={canvasRef} style={{ width: "100%", height: 260, display: "block", borderRadius: 0 }} />
      </div>
      <div style={{ padding: "8px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{stage.desc}</span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{Math.min(days,100)} / 100일</span>
        </div>
        <div className="streak-bar">
          <div className="streak-bar-fill" style={{ width: `${Math.min((days/100)*100,100)}%` }} />
        </div>
      </div>
    </div>
  );
}
