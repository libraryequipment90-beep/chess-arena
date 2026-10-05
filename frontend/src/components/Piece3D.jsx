

const WHITE = {
  color: "#f4efe4",
  roughness: 0.28,
  metalness: 0.12,
  emissive: "#3a3428",
  emissiveIntensity: 0.04,
};

const BLACK = {
  color: "#1a1410",
  roughness: 0.32,
  metalness: 0.18,
  emissive: "#0a0705",
  emissiveIntensity: 0.08,
};

function Mat({ color }) {
  const props = color === "w" ? WHITE : BLACK;
  return <meshStandardMaterial {...props} />;
}

function Base({ color, r = 0.28 }) {
  return (
    <>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r + 0.04, 0.1, 24]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[r - 0.05, r, 0.06, 24]} />
        <Mat color={color} />
      </mesh>
    </>
  );
}

export function Pawn3D({ color }) {
  return (
    <group>
      <Base color={color} r={0.22} />
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 0.28, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <torusGeometry args={[0.1, 0.03, 10, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <sphereGeometry args={[0.13, 20, 16]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

export function Rook3D({ color }) {
  return (
    <group>
      <Base color={color} r={0.26} />
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.42, 8]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.1, 8]} />
        <Mat color={color} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.16, 0.74, Math.sin(a) * 0.16]} castShadow>
            <boxGeometry args={[0.1, 0.16, 0.1]} />
            <Mat color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Knight3D({ color }) {
  return (
    <group>
      <Base color={color} r={0.24} />
      <mesh position={[0, 0.32, 0.02]} castShadow>
        <boxGeometry args={[0.22, 0.28, 0.28]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.52, -0.02]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.28, 0.22]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.7, -0.08]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.2, 0.22, 0.28]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.62, 0.16]} rotation={[0.6, 0, 0]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.2]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0.07, 0.84, -0.14]} castShadow>
        <coneGeometry args={[0.05, 0.14, 8]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[-0.07, 0.84, -0.14]} castShadow>
        <coneGeometry args={[0.05, 0.14, 8]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

export function Bishop3D({ color }) {
  return (
    <group>
      <Base color={color} r={0.24} />
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.18, 0.28, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <coneGeometry args={[0.18, 0.46, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <sphereGeometry args={[0.07, 16, 12]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

export function Queen3D({ color }) {
  return (
    <group>
      <Base color={color} r={0.27} />
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.2, 0.36, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.12, 0.12, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <coneGeometry args={[0.2, 0.28, 8]} />
        <Mat color={color} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * Math.PI) / 3;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, 0.9, Math.sin(a) * 0.14]} castShadow>
            <sphereGeometry args={[0.045, 12, 10]} />
            <Mat color={color} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.98, 0]} castShadow>
        <sphereGeometry args={[0.07, 16, 12]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

export function King3D({ color }) {
  return (
    <group>
      <Base color={color} r={0.28} />
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.21, 0.4, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.13, 0.12, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.22, 20]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.07, 0.28, 0.07]} />
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.2, 0.07, 0.07]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

const MAP = {
  p: Pawn3D,
  r: Rook3D,
  n: Knight3D,
  b: Bishop3D,
  q: Queen3D,
  k: King3D,
};

export default function Piece3D({ type, color, selected, check }) {
  const Comp = MAP[type] || Pawn3D;
  const rotY = color === "b" ? Math.PI : 0;
  const lift = selected ? 0.18 : 0;
  return (
    <group position={[0, lift, 0]} rotation={[0, rotY, 0]}>
      <Comp color={color} />
      {check && type === "k" && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.38, 24]} />
          <meshBasicMaterial color="#e85848" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
