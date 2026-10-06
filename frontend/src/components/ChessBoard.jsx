import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { parseFenBoard, pieceGlyph, squareName, capturedFromBoard } from "../pieces";
import Piece3D from "./Piece3D.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const FILES = "abcdefgh";
const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const LIGHT_HI = "#ffe28a";
const DARK_HI = "#d4a84b";
const LIGHT_SEL = "#f6f669";
const DARK_SEL = "#c9c94a";
const LIGHT_CHK = "#e07a6a";
const DARK_CHK = "#c45c4e";
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 48;
const ZOOM_DEFAULT = 12.6;

function sqPos(file, rank) {
  return [file - 3.5, 0, 3.5 - (rank - 1)];
}

function CapturedRow({ pieces, z }) {
  const gap = 0.48;
  return pieces.map((p, i) => {
    const col = i % 8;
    const row = Math.floor(i / 8);
    const count = Math.min(pieces.length - row * 8, 8);
    const start = -((count - 1) * gap) / 2;
    const x = start + col * gap;
    const outward = z > 0 ? 1 : -1;
    const zz = z + row * 0.42 * outward;
    return (
      <group key={`cap-${p.color}-${p.type}-${i}`} position={[x, 0.32, zz]} scale={0.5}>
        <Piece3D type={p.type} color={p.color} />
      </group>
    );
  });
}

function BoardScene({
  fen,
  flipped,
  selected,
  legal,
  lastMove,
  inCheck,
  turn,
  onSquareClick,
  interactive,
  autoRotate,
  history,
  zoomDistance,
  onZoomChange,
}) {
  const board = useMemo(() => parseFenBoard(fen || "8/8/8/8/8/8/8/8 w - - 0 1"), [fen]);
  const legalSet = useMemo(() => new Set(legal.map((m) => m.to)), [legal]);
  const captureSet = useMemo(() => new Set(legal.filter((m) => m.captured).map((m) => m.to)), [legal]);

  const kingSq = useMemo(() => {
    if (!inCheck) return null;
    const color = turn === "b" ? "b" : "w";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === "k" && p.color === color) return squareName(c, 8 - r);
      }
    }
    return null;
  }, [board, inCheck, turn]);

  const cameraZ = flipped ? -9.2 : 9.2;
  const offBoard = useMemo(() => capturedFromBoard(board), [board]);

  function clickSquare(sq, piece, e) {
    e?.stopPropagation?.();
    if (!interactive) return;
    onSquareClick?.(sq, piece);
  }

  const squares = [];
  const pieces = [];
  for (let rank = 1; rank <= 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const sq = `${FILES[file]}${rank}`;
      const [x, , z] = sqPos(file, rank);
      const light = (file + rank) % 2 === 1;
      const isSel = selected === sq;
      const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
      const isCheck = kingSq === sq;
      let color = light ? LIGHT : DARK;
      if (isCheck) color = light ? LIGHT_CHK : DARK_CHK;
      else if (isSel) color = light ? LIGHT_SEL : DARK_SEL;
      else if (isLast) color = light ? LIGHT_HI : DARK_HI;
      squares.push(
        <mesh
          key={sq}
          position={[x, 0.31, z]}
          receiveShadow
          onClick={(e) => {
            const row = 8 - rank;
            clickSquare(sq, board[row][file], e);
          }}
          onPointerOver={(e) => {
            if (!interactive) return;
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <boxGeometry args={[1, 0.08, 1]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.04} />
        </mesh>
      );

      const piece = board[8 - rank][file];
      if (piece) {
        pieces.push(
          <group
            key={`p-${sq}`}
            position={[x, 0.35, z]}
            onClick={(e) => {
              e.stopPropagation();
              clickSquare(sq, piece, e);
            }}
            onPointerOver={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <Piece3D
              type={piece.type}
              color={piece.color}
              selected={selected === sq}
              check={isCheck}
            />
          </group>
        );
      }

      if (legalSet.has(sq) && !piece) {
        squares.push(
          <mesh key={`dot-${sq}`} position={[x, 0.4, z]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => clickSquare(sq, null, e)}>
            <circleGeometry args={[0.16, 20]} />
            <meshBasicMaterial color="#1a1a1a" transparent opacity={0.35} />
          </mesh>
        );
      }
      if (captureSet.has(sq) && piece) {
        squares.push(
          <mesh key={`cap-${sq}`} position={[x, 0.4, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.32, 0.42, 24]} />
            <meshBasicMaterial color="#1a1a1a" transparent opacity={0.4} />
          </mesh>
        );
      }
    }
  }

  return (
    <>
      <color attach="background" args={["#15110e"]} />
      <fog attach="fog" args={["#15110e", 28, 80]} />
      <hemisphereLight args={["#ffe8c8", "#3a2a1c", 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-6, 6, -4]} intensity={0.35} color="#88aacc" />
      <spotLight position={[0, 14, cameraZ * 0.25]} angle={0.45} penumbra={0.5} intensity={0.5} color="#fff3d6" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.92, 0]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color="#1c3a28" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[10.2, 0.55, 11.4]} />
        <meshStandardMaterial color="#4a2c14" roughness={0.45} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <boxGeometry args={[8.4, 0.12, 8.4]} />
        <meshStandardMaterial color="#3a2412" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[11, 0.35, 12.2]} />
        <meshStandardMaterial color="#2a1a0e" roughness={0.6} />
      </mesh>
      {[
        [-4.7, -5.3],
        [4.7, -5.3],
        [-4.7, 5.3],
        [4.7, 5.3],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, -0.55, lz]} castShadow>
          <cylinderGeometry args={[0.22, 0.28, 0.7, 12]} />
          <meshStandardMaterial color="#2a1a0e" roughness={0.5} />
        </mesh>
      ))}

      {squares}
      {pieces}
      <CapturedRow pieces={offBoard.b} z={4.48} />
      <CapturedRow pieces={offBoard.w} z={-4.48} />

      <ContactShadows position={[0, -0.88, 0]} opacity={0.45} scale={16} blur={2.2} far={4} />

      <CameraRig flipped={flipped} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={ZOOM_MIN}
        maxDistance={ZOOM_MAX}
        minPolarAngle={0.2}
        maxPolarAngle={1.35}
        zoomSpeed={1.15}
        target={[0, 0.4, 0]}
        autoRotate={!!autoRotate}
        autoRotateSpeed={0.7}
      />
      <ZoomSync distance={zoomDistance} onChange={onZoomChange} />
    </>
  );
}

function CameraRig({ flipped }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(flipped ? 0.3 : -0.3, 8.6, flipped ? -9.2 : 9.2);
    camera.lookAt(0, 0.4, 0);
  }, [camera, flipped]);
  return null;
}

function ZoomSync({ distance, onChange }) {
  const { camera, controls } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0.4, 0), []);
  const last = useRef(distance);

  useEffect(() => {
    if (!Number.isFinite(distance)) return;
    const current = camera.position.distanceTo(target);
    if (Math.abs(current - distance) < 0.08) return;
    const dir = camera.position.clone().sub(target);
    if (dir.length() < 0.001) dir.set(0, 0.7, 1);
    dir.setLength(distance);
    camera.position.copy(target).add(dir);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
    last.current = distance;
  }, [camera, controls, distance, target]);

  useFrame(() => {
    const d = camera.position.distanceTo(target);
    if (Math.abs(d - last.current) < 0.05) return;
    last.current = d;
    onChange?.(d);
  });
  return null;
}

export default function ChessBoard({
  fen,
  flipped = false,
  selected,
  legal = [],
  lastMove,
  inCheck,
  turn,
  onSquareClick,
  interactive = true,
  autoRotate = false,
  history = [],
  showZoomSlider = false,
}) {
  const [promo, setPromo] = useState(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  function handleClick(sq, piece, promoMove) {
    if (!interactive) return;
    if (promoMove) {
      onSquareClick?.(sq, piece, promoMove);
      return;
    }
    if (promo) return;
    const pending = legal.find((m) => m.to === sq && m.promotion);
    if (selected && pending) {
      setPromo({ from: selected, to: sq });
      return;
    }
    onSquareClick?.(sq, piece);
  }

  function choosePromo(piece) {
    onSquareClick?.(promo.to, null, { from: promo.from, to: promo.to, promotion: piece });
    setPromo(null);
  }

  const camPos = flipped ? [0.3, 8.6, -9.2] : [-0.3, 8.6, 9.2];

  return (
    <div className="board-3d">
      <ErrorBoundary>
      <Canvas
        key={flipped ? "black" : "white"}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: camPos, fov: 32, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <BoardScene
            fen={fen}
            flipped={flipped}
            selected={selected}
            legal={legal}
            lastMove={lastMove}
            inCheck={inCheck}
            turn={turn}
            onSquareClick={handleClick}
            interactive={interactive}
            autoRotate={autoRotate}
            history={history}
            zoomDistance={zoom}
            onZoomChange={setZoom}
          />
        </Suspense>
      </Canvas>
      </ErrorBoundary>
      {showZoomSlider && (
        <div className="zoom-slider desktop-only">
          <span>−</span>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step="0.1"
            value={ZOOM_MAX + ZOOM_MIN - zoom}
            onChange={(e) => setZoom(ZOOM_MAX + ZOOM_MIN - Number(e.target.value))}
            aria-label="Board zoom"
          />
          <span>+</span>
        </div>
      )}
      {promo && (
        <div className="promo promo-3d">
          {["q", "r", "b", "n"].map((p) => (
            <button key={p} onClick={() => choosePromo(p)}>
              {pieceGlyph({ color: turn === "b" ? "b" : "w", type: p })}
            </button>
          ))}
        </div>
      )}
      <div className="board-3d-hint">Drag to rotate · scroll to zoom</div>
    </div>
  );
}
