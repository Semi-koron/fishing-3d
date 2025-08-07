import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Vector3 } from "three";


interface TestFishProps {
  position: [number, number, number];
  scale?: [number, number, number] | Vector3 | number;
  rotation: [number, number, number];
  animationName?: string;
  autoPlay?: boolean;
  speed?: number;
}

const FloatModel = ({ position, rotation, scale = 1 }: TestFishProps) => {
  const group = useRef<Group>(null);

  const { scene } = useGLTF("/float.glb");

  return (
    <mesh
      ref={group}
      position={[position[0], position[1], position[2]]}
      scale={scale}
      rotation={rotation}
    >
      <primitive object={scene} />
    </mesh>
  );
};

export default FloatModel;
