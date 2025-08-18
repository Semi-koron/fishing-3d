import { Html, useGLTF } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Vector3 } from "three";

interface FloatModelProps {
  position: [number, number, number];
  scale?: [number, number, number] | Vector3 | number;
  rotation: [number, number, number];
  animationName?: string;
  autoPlay?: boolean;
  speed?: number;
  children?: React.ReactNode;
  status?: "idle" | "float" | "moving" | "biting";
}

const FloatModel = ({
  position,
  rotation,
  scale = 1,
  children,
  status = "idle",
}: FloatModelProps) => {
  const group = useRef<Group>(null);

  const { scene } = useGLTF("/float.glb");

  return (
    <>
      <Html position={position} center>
        <div>{children}</div>
      </Html>
      <mesh
        ref={group}
        position={[position[0], position[1], position[2]]}
        scale={scale}
        rotation={rotation}
      >
        <primitive object={scene} />
        <meshStandardMaterial 
          transparent={true} 
          opacity={status === "idle" ? 0.3 : 1.0}
        />
      </mesh>
    </>
  );
};

export default FloatModel;
