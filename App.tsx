
import React, { useState, useRef } from 'react';
import { Mic, Square, Sparkles, RefreshCw, Volume2, AlertCircle, Ghost, Dna, BrainCircuit, User, Wind, Skull, Zap, Star, Send, Type as TypeIcon } from 'lucide-react';
import { AppStatus, AnalysisResult, Variation } from './types';
import { geminiService, PrebuiltVoice } from './services/gemini';
import { blobToBase64, playRawPCM } from './utils/audio';
import { Visualizer } from './components/Visualizer';

interface VoiceOption {
  id: PrebuiltVoice;
  name: string;
  desc: string;
  icon: React.ReactNode;
}

const VOICES: VoiceOption[] = [
  { id: 'Puck', name: 'Le Farfadet', desc: 'Malicieux & aigu', icon: <Zap className="w-5 h-5" /> },
  { id: 'Kore', name: "L'Oracle", desc: 'Doux & mystique', icon: <Star className="w-5 h-5" /> },
  { id: 'Charon', name: 'Le Passeur', desc: 'Sombre & profond', icon: <Skull className="w-5 h-5" /> },
  { id: 'Fenrir', name: 'Le Loup', desc: 'Rude & sauvage', icon: <Ghost className="w-5 h-5" /> },
  { id: 'Zephyr', name: 'Le Souffle', desc: 'Léger & neutre', icon: <Wind className="w-5 h-5" /> },
];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<PrebuiltVoice>('Puck');
  const [manualText, setManualText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(userStream);
      setError(null);
      setStatus(AppStatus.RECORDING);

      const mediaRecorder = new MediaRecorder(userStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(blob);
      };

      mediaRecorder.start();
    } catch (err) {
      setError("Impossible d'accéder au micro. Vérifie tes permissions !");
      setStatus(AppStatus.ERROR);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === AppStatus.RECORDING) {
      mediaRecorderRef.current.stop();
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setStatus(AppStatus.PROCESSING);
    }
  };

  const processAudio = async (blob: Blob) => {
    try {
      const base64 = await blobToBase64(blob);
      const res = await geminiService.analyzeAudio(base64, 'audio/webm');
      setResult(res);
      setStatus(AppStatus.RESULT);
    } catch (err: any) {
      setError("Erreur lors de l'analyse : " + err.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setStatus(AppStatus.PROCESSING);
    setError(null);
    try {
      const res = await geminiService.analyzeText(manualText);
      setResult(res);
      setStatus(AppStatus.RESULT);
    } catch (err: any) {
      setError("Erreur lors de l'analyse : " + err.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handlePlayVariation = async (variation: Variation) => {
    if (playingId) return;
    setPlayingId(variation.id);
    try {
      const audioData = await geminiService.speak(variation.text, selectedVoice);
      await playRawPCM(audioData);
    } catch (err) {
      console.error(err);
    } finally {
      setPlayingId(null);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setManualText('');
    setStatus(AppStatus.IDLE);
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('glitch')) return <BrainCircuit className="w-6 h-6 text-cyan-400" />;
    if (l.includes('surréaliste')) return <Ghost className="w-6 h-6 text-pink-400" />;
    return <Dna className="w-6 h-6 text-emerald-400" />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-[#050505] via-[#0f0a1a] to-[#050505]">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="bungee text-5xl md:text-7xl mb-4 text-purple-500 neon-text">CHELOU-IZER</h1>
        <p className="text-gray-400 max-w-lg mx-auto font-medium px-4">
          Capture ta voix ou tape ton texte, choisis ton avatar vocal et découvre trois versions absurdes.
        </p>
      </div>

      <div className="w-full max-w-5xl glass rounded-[2rem] p-6 md:p-10 shadow-2xl transition-all duration-500 border-purple-500/20">
        
        {/* Voice Selector Section */}
        {(status === AppStatus.IDLE || status === AppStatus.RESULT) && (
          <div className="mb-10 animate-in fade-in duration-700">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-purple-400 font-black">Sélecteur de Timbre</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 ${
                    selectedVoice === v.id 
                      ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-2 rounded-xl mb-2 ${selectedVoice === v.id ? 'text-white' : 'text-gray-500'}`}>
                    {v.icon}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-tighter ${selectedVoice === v.id ? 'text-white' : 'text-gray-500'}`}>
                    {v.name}
                  </span>
                  <span className="text-[9px] text-gray-600 mt-1">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === AppStatus.IDLE && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-6">
            {/* Option A: Voice */}
            <div className="flex flex-col items-center gap-6 border-b lg:border-b-0 lg:border-r border-white/10 pb-12 lg:pb-0 lg:pr-12">
              <button
                onClick={startRecording}
                className="group relative w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-all duration-300 hover:scale-105 shadow-[0_0_50px_rgba(168,85,247,0.3)]"
              >
                <Mic className="text-white w-14 h-14 group-hover:scale-110 transition-transform" />
                <div className="absolute -inset-4 border-2 border-purple-500/20 rounded-full animate-pulse" />
              </button>
              <div className="text-center">
                <p className="text-white font-black text-xl mb-1">MODE VOCAL</p>
                <p className="text-purple-400 text-sm">Appuie et parle librement</p>
              </div>
            </div>

            {/* Option B: Text */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/5 p-2 rounded-lg">
                  <TypeIcon className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-white font-black text-xl uppercase tracking-tight">Mode Manuel</p>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Tape ta phrase ici..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-all min-h-[120px] resize-none font-medium"
                />
                <button
                  type="submit"
                  disabled={!manualText.trim()}
                  className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-400 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  <Send className="w-5 h-5" />
                  TRANSFORMER
                </button>
              </form>
            </div>
          </div>
        )}

        {status === AppStatus.RECORDING && (
          <div className="flex flex-col items-center gap-8 py-14">
            <Visualizer stream={stream} isActive={true} />
            <div className="flex flex-col items-center gap-4">
              <p className="text-red-500 font-black uppercase tracking-[0.3em] text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                Capture en cours
              </p>
              <button
                onClick={stopRecording}
                className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              >
                <Square className="text-white fill-current w-8 h-8" />
              </button>
            </div>
          </div>
        )}

        {status === AppStatus.PROCESSING && (
          <div className="flex flex-col items-center gap-8 py-14">
            <div className="relative">
              <RefreshCw className="w-20 h-20 text-purple-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-yellow-400 w-8 h-8 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2 text-white">Fabrication de bêtises...</h3>
              <p className="text-purple-300/60 font-mono italic">"Le cerveau artificiel chauffe un peu là."</p>
            </div>
          </div>
        )}

        {status === AppStatus.RESULT && result && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black mb-2 block">INPUT ORIGINAL</span>
              <p className="text-gray-400 text-lg italic px-4">"{result.original}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.variations.map((v) => (
                <div 
                  key={v.id} 
                  className="flex flex-col h-full bg-black/40 border border-white/5 rounded-3xl p-6 hover:border-purple-500/40 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-white/5 p-3 rounded-2xl">
                      {getIcon(v.label)}
                    </div>
                    <span className="text-2xl">{v.mood}</span>
                  </div>
                  
                  <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{v.label}</h3>
                  <p className="text-[10px] text-gray-500 mb-4 font-medium uppercase tracking-wider">{v.description}</p>
                  
                  <div className="flex-grow mb-6">
                    <p className="text-purple-100 text-lg font-bold leading-relaxed group-hover:text-white transition-colors">
                      {v.text}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePlayVariation(v)}
                    disabled={!!playingId}
                    className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      playingId === v.id 
                        ? 'bg-purple-500 text-white animate-pulse' 
                        : 'bg-white text-black hover:bg-purple-400'
                    } disabled:opacity-50`}
                  >
                    {playingId === v.id ? <RefreshCw className="animate-spin w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {playingId === v.id ? 'LECTURE...' : 'ÉCOUTER'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={reset}
                className="flex items-center gap-3 px-8 py-4 bg-purple-600/20 text-purple-400 font-bold rounded-2xl hover:bg-purple-600/30 border border-purple-500/20 transition-all hover:scale-105"
              >
                <RefreshCw className="w-5 h-5" />
                NOUVEAU TEST
              </button>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="flex flex-col items-center gap-6 py-14 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <AlertCircle className="text-red-500 w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-red-500 mb-2">ERREUR SYSTÈME</h3>
              <p className="text-gray-400 max-w-sm mx-auto">{error}</p>
            </div>
            <button
              onClick={reset}
              className="px-10 py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
            >
              RECOMMENCER
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-12 opacity-30 text-white text-[10px] text-center uppercase tracking-[0.5em] font-black">
        Surrealist Labs • Version 6.0 "Double Access"
      </div>
    </div>
  );
};

export default App;
