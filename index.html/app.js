import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Settings, Users, Wifi, WifiOff, Copy, Clock } from 'lucide-react';
import * as Tone from 'tone';

const SyncStartMetronome = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState({ beats: 4, noteValue: 4 });
  const [volume, setVolume] = useState(-12);
  const [accentFirst, setAccentFirst] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Sync state
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [showRoomPanel, setShowRoomPanel] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [syncCountdown, setSyncCountdown] = useState(0);
  const [playerName, setPlayerName] = useState(`מוזיקאי-${Math.floor(Math.random() * 1000)}`);
  const [isWaitingForStart, setIsWaitingForStart] = useState(false);
  const [sharedSettings, setSharedSettings] = useState(null);
  
  const synthRef = useRef(null);
  const loopRef = useRef(null);
  const beatCountRef = useRef(0);
  const startTimeRef = useRef(null);

  // Simulated WebSocket connection
  const connectionRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      
      synthRef.current = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).toDestination();
      
      synthRef.current.volume.value = volume;
    };
    
    initAudio();
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (loopRef.current) {
      loopRef.current.dispose();
    }
    if (synthRef.current) {
      synthRef.current.dispose();
    }
  };

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = volume;
    }
  }, [volume]);

  // Simulated connection functions
  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    setIsConnected(true);
    setShowRoomPanel(true);
    setSharedSettings({ bpm, timeSignature });
  };

  const joinRoom = (code) => {
    if (!code) return;
    
    setRoomCode(code);
    setIsHost(false);
    setIsConnected(true);
    setShowRoomPanel(true);
    setJoinRoomCode('');
    
    // Simulate receiving settings from host
    setTimeout(() => {
      const hostSettings = { bpm: 120, timeSignature: { beats: 4, noteValue: 4 } };
      setSharedSettings(hostSettings);
      setBpm(hostSettings.bpm);
      setTimeSignature(hostSettings.timeSignature);
      setConnectedPeers([{ id: 'host', name: 'מנהיג להקה' }]);
    }, 500);
  };

  const leaveRoom = () => {
    setRoomCode('');
    setIsHost(false);
    setIsConnected(false);
    setConnectedPeers([]);
    setShowRoomPanel(false);
    setIsWaitingForStart(false);
    setSharedSettings(null);
    
    if (isPlaying) {
      stopMetronome();
    }
  };

  const broadcastSyncStart = () => {
    if (!isHost) return;
    
    const startTime = Date.now() + 5000; // 5 seconds from now
    startTimeRef.current = startTime;
    
    // Simulate broadcasting to all connected peers
    console.log('Broadcasting sync start:', { startTime, bpm, timeSignature });
    
    performSyncStart(startTime);
  };

  const performSyncStart = (startTime) => {
    setIsWaitingForStart(true);
    
    const countdownInterval = setInterval(() => {
      const remaining = Math.ceil((startTime - Date.now()) / 1000);
      setSyncCountdown(remaining);
      
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setSyncCountdown(0);
        setIsWaitingForStart(false);
        startMetronomeAtTime(startTime);
      } else if (remaining <= 3) {
        // Play countdown clicks for last 3 seconds
        playClick(1);
      }
    }, 100);
  };

  const startMetronomeAtTime = async (targetTime) => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    const now = Date.now();
    const delay = Math.max(0, targetTime - now);
    
    setTimeout(() => {
      beatCountRef.current = 0;
      
      loopRef.current = new Tone.Loop((time) => {
        beatCountRef.current = (beatCountRef.current % timeSignature.beats) + 1;
        
        Tone.Draw.schedule(() => {
          setCurrentBeat(beatCountRef.current);
        }, time);
        
        playClick(beatCountRef.current);
      }, `${60/bpm}s`);
      
      loopRef.current.start();
      Tone.Transport.start();
      setIsPlaying(true);
    }, delay);
  };

  const stopAllMetronomes = () => {
    if (!isHost) return;
    
    // Simulate broadcasting stop to all peers
    console.log('Broadcasting stop to all peers');
    stopMetronome();
  };

  const playClick = (beat) => {
    if (synthRef.current) {
      const note = (accentFirst && beat === 1) ? "C6" : "C5";
      synthRef.current.triggerAttackRelease(note, "16n");
    }
  };

  const startMetronome = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    beatCountRef.current = 0;
    
    loopRef.current = new Tone.Loop((time) => {
      beatCountRef.current = (beatCountRef.current % timeSignature.beats) + 1;
      
      Tone.Draw.schedule(() => {
        setCurrentBeat(beatCountRef.current);
      }, time);
      
      playClick(beatCountRef.current);
    }, `${60/bpm}s`);
    
    loopRef.current.start();
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopMetronome = () => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current.dispose();
      loopRef.current = null;
    }
    Tone.Transport.stop();
    setIsPlaying(false);
    setCurrentBeat(0);
    beatCountRef.current = 0;
    setIsWaitingForStart(false);
  };

  const handlePlayPause = () => {
    if (isConnected && isHost) {
      if (isPlaying || isWaitingForStart) {
        stopAllMetronomes();
      } else {
        broadcastSyncStart();
      }
    } else if (!isConnected) {
      if (isPlaying) {
        stopMetronome();
      } else {
        startMetronome();
      }
    }
  };

  const adjustBpm = (change) => {
    if (isConnected && !isHost) return; // Only host can change BPM when connected
    
    const newBpm = Math.max(40, Math.min(300, bpm + change));
    setBpm(newBpm);
    
    if (isHost && isConnected) {
      setSharedSettings(prev => ({ ...prev, bpm: newBpm }));
      // Simulate broadcasting new BPM to peers
      console.log('Broadcasting new BPM:', newBpm);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  const getCurrentSettings = () => {
    return isConnected && sharedSettings ? sharedSettings : { bpm, timeSignature };
  };

  const currentSettings = getCurrentSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">מטרונום מסונכרן</h1>
          <p className="text-purple-200">סינכרון התחלה בלבד</p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {isConnected ? (
            <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">חדר {roomCode}</span>
              {isHost && <span className="text-xs">(מנהיג)</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-500/20 text-gray-300 px-3 py-1 rounded-full">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">עצמאי</span>
            </div>
          )}
        </div>

        {/* Sync Countdown */}
        {syncCountdown > 0 && (
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-yellow-400 mb-2 animate-pulse">
              {syncCountdown}
            </div>
            <div className="text-yellow-200">התחלה בעוד...</div>
          </div>
        )}

        {/* Waiting for start indicator */}
        {isWaitingForStart && syncCountdown === 0 && (
          <div className="text-center mb-6">
            <div className="text-2xl text-green-400 mb-2">🎵</div>
            <div className="text-green-200">מתחיל...</div>
          </div>
        )}

        {/* Room Panel */}
        {!showRoomPanel && (
          <div className="mb-6 space-y-3">
            <button
              onClick={createRoom}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              צור חדר לסינכרון
            </button>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="קוד חדר"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                className="flex-1 bg-white/10 text-white placeholder-purple-200 px-4 py-3 rounded-xl"
              />
              <button
                onClick={() => joinRoom(joinRoomCode)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all duration-200"
              >
                הצטרף
              </button>
            </div>
            
            <div className="text-center text-purple-200 text-sm">
              או השתמש במצב עצמאי ללא סינכרון
            </div>
          </div>
        )}

        {/* Connected Room Panel */}
        {showRoomPanel && isConnected && (
          <div className="mb-6 bg-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-300" />
                <span className="text-white font-medium">חדר {roomCode}</span>
              </div>
              <button
                onClick={copyRoomCode}
                className="text-purple-300 hover:text-white transition-colors"
                title="העתק קוד"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            
            {isHost ? (
              <div className="space-y-2 mb-3">
                <div className="text-sm text-green-200">
                  ✓ אתה מנהיג הלהקה
                </div>
                <div className="text-xs text-purple-200">
                  הגדר את הטמפו ולחץ התחל לסינכרון כולם
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <div className="text-sm text-blue-200">
                  מחכה למנהיג הלהקה
                </div>
                <div className="text-xs text-purple-200">
                  הטמפו יתעדכן אוטומטית מהמנהיג
                </div>
              </div>
            )}
            
            <div className="text-sm text-purple-200 mb-3">
              מחוברים: {connectedPeers.length + 1} מוזיקאים
            </div>
            
            <button
              onClick={leaveRoom}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm transition-all duration-200"
            >
              עזוב חדר
            </button>
          </div>
        )}

        {/* BPM Display */}
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold text-white mb-2">
            {currentSettings.bpm}
          </div>
          <div className="text-purple-200 text-lg">
            BPM
            {isConnected && !isHost && (
              <span className="text-xs block text-purple-300">
                (מנוהל על ידי המנהיג)
              </span>
            )}
          </div>
        </div>

        {/* BPM Controls - Only for host when connected or always when solo */}
        {(!isConnected || isHost) && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => adjustBpm(-1)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-all duration-200"
            >
              -
            </button>
            
            <input
              type="range"
              min="40"
              max="300"
              value={currentSettings.bpm}
              onChange={(e) => {
                const newBpm = parseInt(e.target.value);
                setBpm(newBpm);
                if (isHost && isConnected) {
                  setSharedSettings(prev => ({ ...prev, bpm: newBpm }));
                }
              }}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((currentSettings.bpm-40)/(300-40))*100}%, rgba(255,255,255,0.2) ${((currentSettings.bpm-40)/(300-40))*100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            
            <button
              onClick={() => adjustBpm(1)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-all duration-200"
            >
              +
            </button>
          </div>
        )}

        {/* Beat Indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: currentSettings.timeSignature.beats }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-100 ${
                currentBeat === i + 1
                  ? accentFirst && i === 0
                    ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 scale-125'
                    : 'bg-purple-400 shadow-lg shadow-purple-400/50 scale-125'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Play/Pause Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handlePlayPause}
            disabled={isConnected && !isHost && !isWaitingForStart}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              isConnected && !isHost && !isWaitingForStart
                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                : (isPlaying || isWaitingForStart)
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
            } ${(isWaitingForStart || syncCountdown > 0) ? 'animate-pulse' : ''}`}
          >
            {isPlaying || isWaitingForStart ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>

        {/* Status Message */}
        {isConnected && !isHost && !isWaitingForStart && (
          <div className="text-center text-purple-200 text-sm mb-4">
            המתן למנהיג הלהקה להתחיל
          </div>
        )}

        {/* Settings Toggle - Only for host when connected or always when solo */}
        {(!isConnected || isHost) && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200"
            >
              <Settings className="w-4 h-4" />
              הגדרות
            </button>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (!isConnected || isHost) && (
          <div className="bg-white/10 rounded-2xl p-6 space-y-6">
            
            {/* Time Signature */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                חתימת זמן
              </label>
              <div className="flex gap-2">
                <select
                  value={currentSettings.timeSignature.beats}
                  onChange={(e) => {
                    const newTimeSignature = { ...currentSettings.timeSignature, beats: parseInt(e.target.value) };
                    setTimeSignature(newTimeSignature);
                    if (isHost && isConnected) {
                      setSharedSettings(prev => ({ ...prev, timeSignature: newTimeSignature }));
                    }
                  }}
                  className="bg-white/20 text-white rounded-lg px-3 py-2 flex-1"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
                <span className="text-white text-2xl">/</span>
                <select
                  value={currentSettings.timeSignature.noteValue}
                  onChange={(e) => {
                    const newTimeSignature = { ...currentSettings.timeSignature, noteValue: parseInt(e.target.value) };
                    setTimeSignature(newTimeSignature);
                    if (isHost && isConnected) {
                      setSharedSettings(prev => ({ ...prev, timeSignature: newTimeSignature }));
                    }
                  }}
                  className="bg-white/20 text-white rounded-lg px-3 py-2 flex-1"
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                </select>
              </div>
            </div>

            {/* Volume */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <Volume2 className="w-4 h-4 inline mr-2" />
                עוצמת קול (אישי)
              </label>
              <input
                type="range"
                min="-40"
                max="0"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Accent First Beat */}
            <div className="flex items-center justify-between">
              <label className="text-white text-sm font-medium">
                הדגשת פעימה ראשונה
              </label>
              <button
                onClick={() => setAccentFirst(!accentFirst)}
                className={`w-12 h-6 rounded-full transition-all duration-200 ${
                  accentFirst ? 'bg-purple-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-200 ${
                    accentFirst ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-purple-200 text-sm mt-6">
          {isConnected ? (
            <div className="space-y-1">
              <p><strong>מצב מסונכרן:</strong></p>
              {isHost ? (
                <p>לחץ התחל וכל המוזיקאים יקבלו ספירה לאחור</p>
              ) : (
                <p>המטרונום יתחיל אוטומטית עם כולם</p>
              )}
              <p className="text-xs text-purple-300 mt-2">
                ⚡ סינכרון חד-פעמי - לא תלוי ברשת במהלך הנגינה
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p>צור חדר לסינכרון עם מוזיקאים אחרים</p>
              <p>או השתמש במצב עצמאי</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SyncStartMetronome;