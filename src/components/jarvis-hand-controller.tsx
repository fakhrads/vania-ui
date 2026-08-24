"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Hand, Video, VideoOff, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HandGestureState {
  isTracking: boolean;
  handPresent: boolean;
  gesture: "idle" | "open_palm" | "pinch" | "fist";
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  pinchDist: number;
  deltaX: number;
  deltaY: number;
  rawLandmarks?: Array<{ x: number; y: number; z: number }>;
}

interface JarvisControllerProps {
  active: boolean;
  onToggle: () => void;
  onGesture: (state: HandGestureState) => void;
}

export function JarvisHandController({ active, onToggle, onGesture }: JarvisControllerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string>("idle");

  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // Load MediaPipe Hands via CDN script tag to avoid Next.js / webpack WASM packaging hurdles
  useEffect(() => {
    if (!active) {
      if (cameraRef.current) {
        cameraRef.current.stop?.();
        cameraRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setHandDetected(false);
      setCurrentGesture("idle");
      return;
    }

    let isCancelled = false;

    async function initMediaPipe() {
      try {
        setCameraError(null);

        // Load MediaPipe scripts dynamically if not present
        if (!(window as any).Hands) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
            script.crossOrigin = "anonymous";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Gagal memuat MediaPipe Hands"));
            document.head.appendChild(script);
          });
        }

        if (!(window as any).Camera) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
            script.crossOrigin = "anonymous";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Gagal memuat Camera Utils"));
            document.head.appendChild(script);
          });
        }

        if (isCancelled) return;

        const Hands = (window as any).Hands;
        const hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });

        hands.onResults((results: any) => {
          if (isCancelled) return;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");

          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];

            // 0: Wrist, 4: Thumb tip, 8: Index tip, 12: Middle tip, 16: Ring tip, 20: Pinky tip
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];
            const pinkyTip = landmarks[20];
            const wrist = landmarks[0];

            // Calculate pinch distance (Thumb tip to Index tip)
            const dxPinch = thumbTip.x - indexTip.x;
            const dyPinch = thumbTip.y - indexTip.y;
            const dzPinch = thumbTip.z - indexTip.z;
            const pinchDist = Math.sqrt(dxPinch * dxPinch + dyPinch * dyPinch + dzPinch * dzPinch);

            // Calculate finger fold for fist
            const isIndexFolded = indexTip.y > landmarks[6].y;
            const isMiddleFolded = middleTip.y > landmarks[10].y;
            const isRingFolded = ringTip.y > landmarks[14].y;
            const isPinkyFolded = pinkyTip.y > landmarks[18].y;

            let gesture: "idle" | "open_palm" | "pinch" | "fist" = "open_palm";

            if (pinchDist < 0.08) {
              gesture = "pinch";
            } else if (isIndexFolded && isMiddleFolded && isRingFolded && isPinkyFolded) {
              gesture = "fist";
            } else {
              gesture = "open_palm";
            }

            setCurrentGesture(gesture);

            // Normalized pointer coords (inverted X for mirror effect)
            const currentX = 1 - indexTip.x;
            const currentY = indexTip.y;

            let deltaX = 0;
            let deltaY = 0;
            if (lastPosRef.current) {
              deltaX = currentX - lastPosRef.current.x;
              deltaY = currentY - lastPosRef.current.y;
            }
            lastPosRef.current = { x: currentX, y: currentY };

            onGesture({
              isTracking: true,
              handPresent: true,
              gesture,
              x: currentX,
              y: currentY,
              pinchDist,
              deltaX,
              deltaY,
              rawLandmarks: landmarks,
            });

            // Draw HUD overlay on mini preview
            if (canvas && ctx) {
              ctx.strokeStyle = gesture === "pinch" ? "#38bdf8" : gesture === "fist" ? "#f43f5e" : "#10b981";
              ctx.lineWidth = 2;
              landmarks.forEach((pt: any) => {
                const px = (1 - pt.x) * canvas.width;
                const py = pt.y * canvas.height;
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
                ctx.fillStyle = "#38bdf8";
                ctx.fill();
              });

              // Line between thumb & index if pinching
              if (gesture === "pinch") {
                ctx.beginPath();
                ctx.moveTo((1 - thumbTip.x) * canvas.width, thumbTip.y * canvas.height);
                ctx.lineTo((1 - indexTip.x) * canvas.width, indexTip.y * canvas.height);
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 3;
                ctx.stroke();
              }
            }
          } else {
            setHandDetected(false);
            setCurrentGesture("idle");
            lastPosRef.current = null;
            onGesture({
              isTracking: true,
              handPresent: false,
              gesture: "idle",
              x: 0.5,
              y: 0.5,
              pinchDist: 1,
              deltaX: 0,
              deltaY: 0,
            });
          }
        });

        handsRef.current = hands;

        if (videoRef.current) {
          const Camera = (window as any).Camera;
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraRef.current = camera;
          setModelLoaded(true);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Jarvis init error:", err);
          setCameraError(err.message || "Gagal mengaktifkan kamera atau MediaPipe");
        }
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (cameraRef.current) {
        cameraRef.current.stop?.();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close?.();
        handsRef.current = null;
      }
    };
  }, [active, onGesture]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-xs border",
          active
            ? "bg-sky-500/15 border-sky-500/40 text-sky-400 shadow-sky-500/10 ring-1 ring-sky-500/30"
            : "bg-surface border-line text-muted hover:text-foreground hover:bg-surface-elevated"
        )}
        title="Kontrol graph 3D menggunakan sensor gestur tangan (Webcam)"
      >
        <Sparkles className={cn("size-3.5", active && "animate-pulse text-sky-400")} />
        <span>Jarvis Mode</span>
        {active && (
          <span className="inline-flex size-2 rounded-full bg-sky-400 animate-ping ml-0.5" />
        )}
      </button>

      {/* Mini HUD Preview saat Jarvis Mode Aktif */}
      {active && (
        <div className="fixed bottom-6 right-6 z-50 p-3 rounded-2xl bg-zinc-950/90 border border-sky-500/30 backdrop-blur-md shadow-2xl flex flex-col gap-2 w-64 text-xs font-mono text-zinc-300">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <Hand className="size-3.5" />
              <span>JARVIS GESTURE HUD</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "size-2 rounded-full",
                  handDetected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                )}
              />
              <span className="text-[10px] text-zinc-400">
                {handDetected ? "LOCKED" : "SEARCH"}
              </span>
            </div>
          </div>

          <div className="relative aspect-4/3 w-full bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-40"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {!modelLoaded && !cameraError && (
              <div className="flex flex-col items-center gap-1 text-zinc-400 z-10">
                <RefreshCw className="size-4 animate-spin text-sky-400" />
                <span className="text-[10px]">Loading AI Vision...</span>
              </div>
            )}
            {cameraError && (
              <div className="p-2 text-rose-400 text-[10px] text-center z-10">
                {cameraError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
            <div>
              <span className="text-zinc-500 block text-[9px]">GESTURE</span>
              <span
                className={cn(
                  "font-bold uppercase",
                  currentGesture === "open_palm"
                    ? "text-emerald-400"
                    : currentGesture === "pinch"
                    ? "text-sky-400"
                    : currentGesture === "fist"
                    ? "text-rose-400"
                    : "text-zinc-400"
                )}
              >
                {currentGesture === "open_palm"
                  ? "Orbit / Rotate"
                  : currentGesture === "pinch"
                  ? "Grab / Pinch"
                  : currentGesture === "fist"
                  ? "Pan / Move"
                  : "No Hand"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px]">ACTION</span>
              <span className="text-zinc-300 font-medium text-[10px]">
                {currentGesture === "open_palm"
                  ? "Geser: Putar 3D"
                  : currentGesture === "pinch"
                  ? "Pinch: Zoom / Drag"
                  : currentGesture === "fist"
                  ? "Kepal: Geser View"
                  : "Arahkan Tangan"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
