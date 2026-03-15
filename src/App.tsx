/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Users, 
  UserPlus, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Upload,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings,
  History,
  X
} from 'lucide-react';

interface Winner {
  id: string;
  name: string;
  round: number;
  timestamp: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
  name: string;
}

export default function App() {
  const [names, setNames] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [currentName, setCurrentName] = useState('???');
  const [round, setRound] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'management' | 'winners'>('none');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const currentNameRef = useRef('???');

  const DRAW_DURATION = 3000; // 3 seconds draw duration

  const remainingNames = useMemo(() => {
    const winnerNames = winners.map(w => w.name);
    return names.filter(name => !winnerNames.includes(name));
  }, [names, winners]);

  // Generate points for the 3D planet
  const points = useMemo(() => {
    const pts: Point[] = [];
    const count = Math.min(remainingNames.length, 100); // Limit displayed points for performance
    const radius = 180;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      pts.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
        name: remainingNames[i % remainingNames.length]
      });
    }
    return pts;
  }, [remainingNames]);

  // Animation loop for the planet
  useEffect(() => {
    const animate = () => {
      setRotation(prev => ({
        x: prev.x + (isDrawing ? 0.05 : 0.01),
        y: prev.y + (isDrawing ? 0.08 : 0.02)
      }));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isDrawing]);

  const handleAddNames = () => {
    if (!inputValue.trim()) return;
    const newNames = inputValue
      .split(/[\n,，]/)
      .map(n => n.trim())
      .filter(n => n && !names.includes(n));
    
    setNames([...names, ...newNames]);
    setInputValue('');
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有名单和中奖记录吗？')) {
      setNames([]);
      setWinners([]);
      setRound(1);
      setCurrentName('???');
    }
  };

  const startDrawing = () => {
    if (remainingNames.length === 0) {
      alert('没有剩余的人可以抽奖了！');
      return;
    }
    setIsDrawing(true);
    setShowConfetti(false);
    setDrawProgress(0);
    
    // Pick an initial name immediately to avoid '???'
    const initialRandomIndex = Math.floor(Math.random() * remainingNames.length);
    const initialName = remainingNames[initialRandomIndex];
    setCurrentName(initialName);
    currentNameRef.current = initialName;
    
    const startTime = Date.now();
    let lastShuffleTime = 0;
    const initialShuffleSpeed = 100;
    const finalShuffleSpeed = 30;
    
    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min((elapsed / DRAW_DURATION) * 100, 100);
      setDrawProgress(progress);

      // Dynamic shuffle speed
      const currentShuffleSpeed = initialShuffleSpeed - (progress / 100) * (initialShuffleSpeed - finalShuffleSpeed);
      
      if (now - lastShuffleTime > currentShuffleSpeed) {
        const randomIndex = Math.floor(Math.random() * remainingNames.length);
        const name = remainingNames[randomIndex];
        setCurrentName(name);
        currentNameRef.current = name;
        lastShuffleTime = now;
      }

      if (elapsed < DRAW_DURATION) {
        progressRef.current = requestAnimationFrame(updateProgress);
      } else {
        stopDrawing();
      }
    };

    progressRef.current = requestAnimationFrame(updateProgress);
  };

  const stopDrawing = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      cancelAnimationFrame(progressRef.current);
      progressRef.current = null;
    }
    
    setIsDrawing(false);
    setDrawProgress(0);
    
    const winnerName = currentNameRef.current;
    
    setWinners(prev => {
      const newWinner: Winner = {
        id: Math.random().toString(36).substr(2, 9),
        name: winnerName,
        round: round,
        timestamp: Date.now(),
      };
      return [newWinner, ...prev];
    });
    
    setCurrentName(winnerName);
    setRound(prev => prev + 1);
    setShowConfetti(true);

    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF4D8D', '#6366f1', '#00E5FF']
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (event) => {
      const data = event.target?.result;
      let importedNames: string[] = [];

      if (isExcel) {
        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          importedNames = json
            .flat()
            .map(n => String(n).trim())
            .filter(n => n && n !== 'undefined' && n !== 'null' && n !== 'NaN');
        } catch (err) {
          console.error('Excel parsing error:', err);
          alert('Excel 文件解析失败，请检查文件格式。');
          return;
        }
      } else {
        const content = data as string;
        importedNames = content
          .split(/[\n,，\r]/)
          .map(n => n.trim())
          .filter(n => n);
      }
      
      const uniqueNewNames = importedNames.filter(n => !names.includes(n));
      setNames(prev => [...prev, ...uniqueNewNames]);
      e.target.value = '';
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 py-2">
        {/* Top Branding (More compact) */}
        <div className="mb-4 text-center">
          <div className="flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <span>ModelScope 魔搭社区</span>
              <span>Datawhale</span>
            </div>
          </div>
          <div className="mt-2 h-[1px] w-full bg-slate-200/50" />
        </div>

        {/* Header - More compact */}
        <header className="mb-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-2"
          >
            <div className="flex items-center gap-3 mb-0">
              <img src="https://img.alicdn.com/imgextra/i3/O1CN016vU7e81XvU7e81XvU_!!6000000002982-2-tps-200-200.png" alt="ModelScope" className="h-6 opacity-90" referrerPolicy="no-referrer" />
            </div>

            <div className="relative scale-90 md:scale-100 origin-top">
              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-2">
                  <span className="bg-hackathon-dark text-white px-2 py-0.5 text-4xl md:text-6xl font-black tracking-tighter">AI</span>
                  <span className="text-4xl md:text-6xl font-black tracking-tighter text-hackathon-purple">Hackathon</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-4xl md:text-6xl font-black tracking-tighter text-hackathon-dark">Tour</span>
                  <div className="bg-gradient-to-r from-hackathon-dark to-hackathon-purple px-4 py-1.5 transform skew-x-[-12deg]">
                    <span className="text-xl md:text-3xl font-bold text-white tracking-wider block transform skew-x-[12deg]">高校联赛·2026</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <div className="bg-hackathon-purple text-white px-4 py-1.5 font-bold text-base rounded-sm shadow-lg shadow-hackathon-purple/20">
                别写「简历」
              </div>
              <div className="bg-hackathon-cyan text-hackathon-dark px-4 py-1.5 font-bold text-base rounded-sm shadow-lg shadow-hackathon-cyan/20">
                去创造「作品」
              </div>
            </div>
          </motion.div>
        </header>

        <div className="relative flex flex-col items-center justify-center">
          {/* Middle Column: 3D Planet Lottery - Centered */}
          <div className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[400px]">
            <section className="w-full relative flex flex-col items-center justify-center py-0">
              {/* 3D Planet Container */}
              <div className="absolute inset-0 flex items-center justify-center perspective-[1000px] pointer-events-none overflow-hidden">
                <div 
                  className="relative w-[320px] h-[320px] transition-transform duration-100 ease-linear opacity-30"
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${rotation.x}rad) rotateY(${rotation.y}rad)`
                  }}
                >
                  {points.map((pt, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-hackathon-purple rounded-full"
                      style={{
                        transform: `translate3d(${pt.x}px, ${pt.y}px, ${pt.z}px)`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Central Display */}
              <div className="relative z-20 text-center space-y-4 w-full flex flex-col items-center">
                <div className="inline-block px-4 py-1 bg-hackathon-dark text-white font-black text-[10px] tracking-[0.3em] uppercase rounded-full shadow-2xl">
                  Round {isDrawing ? round : (winners.length > 0 ? winners[0].round : (currentName === '???' ? 1 : round - 1))}
                </div>

                <div className="h-36 flex flex-col items-center justify-center w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={(isDrawing ? currentName : (winners.length > 0 ? winners[0].name : currentName)) + isDrawing}
                      initial={{ scale: 0.5, opacity: 0, filter: 'blur(10px)' }}
                      animate={{ 
                        scale: isDrawing ? 1 : [1, 1.05, 1],
                        opacity: 1, 
                        filter: isDrawing ? 'blur(0px)' : 'blur(0px) drop-shadow(0 0 15px rgba(99, 102, 241, 0.3))',
                        color: isDrawing ? '#0a0a0a' : '#6366f1'
                      }}
                      exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                      transition={{
                        scale: { duration: isDrawing ? 0.05 : 0.6, ease: "easeOut" },
                        color: { duration: 0.3 }
                      }}
                      className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.05)] text-center w-full truncate px-4"
                    >
                      {isDrawing ? currentName : (winners.length > 0 ? winners[0].name : currentName)}
                    </motion.div>
                  </AnimatePresence>
                  
                  {!isDrawing && winners.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-hackathon-pink font-black text-[9px] uppercase tracking-[0.5em] flex items-center gap-2"
                    >
                      <Sparkles size={10} /> WINNER SELECTED <Sparkles size={10} />
                    </motion.div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-[280px] space-y-1">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {isDrawing ? "Scanning..." : "Standby"}
                    </span>
                    {isDrawing && (
                      <span className="text-[9px] font-mono font-bold text-hackathon-purple">
                        {Math.round(drawProgress)}%
                      </span>
                    )}
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-hackathon-purple to-hackathon-cyan"
                      initial={{ width: 0 }}
                      animate={{ width: `${drawProgress}%` }}
                      transition={{ type: "tween", ease: "linear" }}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 pt-2">
                  {!isDrawing ? (
                    <button 
                      onClick={startDrawing}
                      disabled={remainingNames.length === 0}
                      className="group relative px-10 py-4 bg-hackathon-dark text-white rounded-full font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl disabled:opacity-50 disabled:scale-100 min-w-[200px]"
                    >
                      <Play fill="currentColor" size={22} /> 
                      <span>开始抽奖</span>
                      <div className="absolute -inset-1 bg-gradient-to-r from-hackathon-pink via-hackathon-purple to-hackathon-cyan rounded-full blur opacity-10 group-hover:opacity-30 transition-opacity" />
                    </button>
                  ) : (
                    <button 
                      onClick={stopDrawing}
                      className="px-10 py-4 bg-hackathon-pink text-white rounded-full font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl min-w-[200px]"
                    >
                      <Pause fill="currentColor" size={22} /> 停止
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                    <Sparkles size={12} className="text-hackathon-cyan" />
                    Remaining: {remainingNames.length}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Floating Action Buttons */}
          <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
            <button 
              onClick={() => setActiveDrawer('management')}
              className="w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center text-hackathon-purple hover:bg-hackathon-purple hover:text-white transition-all hover:scale-110 active:scale-90 border border-slate-100"
              title="名单管理"
            >
              <Settings size={24} />
            </button>
            <button 
              onClick={() => setActiveDrawer('winners')}
              className="w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center text-hackathon-pink hover:bg-hackathon-pink hover:text-white transition-all hover:scale-110 active:scale-90 border border-slate-100"
              title="中奖名单"
            >
              <History size={24} />
            </button>
          </div>

          {/* Drawers */}
          <AnimatePresence>
            {activeDrawer !== 'none' && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveDrawer('none')}
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
                />
                
                {/* Drawer Content */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
                >
                  <div className="p-6 flex items-center justify-between border-b border-slate-100">
                    <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                      {activeDrawer === 'management' ? (
                        <>
                          <Users className="text-hackathon-purple" size={24} />
                          名单管理
                        </>
                      ) : (
                        <>
                          <Trophy className="text-hackathon-pink" size={24} />
                          中奖名单
                        </>
                      )}
                    </h3>
                    <button 
                      onClick={() => setActiveDrawer('none')}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeDrawer === 'management' ? (
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">快速添加</span>
                            <span className="bg-white text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-100">
                              {names.length} TOTAL
                            </span>
                          </div>
                          <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="输入姓名..."
                            className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-hackathon-purple focus:border-transparent outline-none transition-all resize-none text-sm font-medium"
                          />
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button 
                              onClick={handleAddNames}
                              className="btn-primary py-3 text-sm flex items-center justify-center gap-2"
                            >
                              <UserPlus size={16} /> 添加
                            </button>
                            <label className="cursor-pointer btn-outline py-3 text-sm flex items-center justify-center gap-2">
                              <Upload size={16} /> 导入
                              <input type="file" accept=".txt,.csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                            </label>
                          </div>
                          <button 
                            onClick={handleClearAll}
                            className="w-full mt-4 py-2 text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 font-bold"
                          >
                            <RotateCcw size={12} /> 重置所有数据
                          </button>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest block px-1">当前名单</span>
                          {names.map((name, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl text-sm border border-slate-100">
                              <span className="font-bold text-slate-700">{name}</span>
                              {winners.some(w => w.name === name) && (
                                <CheckCircle2 size={16} className="text-hackathon-cyan" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">中奖记录</span>
                          <button 
                            onClick={() => {
                              const content = winners.map(w => `${w.round},${w.name},${new Date(w.timestamp).toLocaleString()}`).join('\n');
                              const blob = new Blob([`轮次,姓名,时间\n${content}`], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'winners.csv';
                              a.click();
                            }}
                            className="text-slate-400 hover:text-hackathon-purple transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                          >
                            <Download size={14} /> 导出CSV
                          </button>
                        </div>
                        {winners.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                            <Trophy size={64} className="mb-4 opacity-10" />
                            <p className="text-sm font-bold uppercase tracking-widest">虚位以待</p>
                          </div>
                        ) : (
                          winners.map((winner) => (
                            <motion.div
                              initial={{ x: 20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              key={winner.id}
                              className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-hackathon-pink/30 transition-colors"
                            >
                              <div>
                                <div className="font-black text-slate-800 text-xl">{winner.name}</div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                  Round {winner.round} • {new Date(winner.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="w-12 h-12 bg-white text-hackathon-pink rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Trophy size={20} />
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        }

        .btn-primary {
          background: #141414;
          color: white;
          border-radius: 12px;
          font-weight: 800;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: #2a2a2a;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.3);
        }

        .btn-secondary {
          background: #FF4D8D;
          color: white;
          border-radius: 12px;
          font-weight: 800;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #ff337a;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(255, 77, 141, 0.4);
        }

        .btn-outline {
          background: white;
          color: #141414;
          border: 2px solid #141414;
          border-radius: 12px;
          font-weight: 800;
          transition: all 0.2s;
        }
        .btn-outline:hover {
          background: #f8fafc;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
