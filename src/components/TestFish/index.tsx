import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { Group, Vector3 } from "three";

interface TestFishProps {
  position?: [number, number, number] | Vector3;
  scale?: [number, number, number] | Vector3 | number;
  rotation?: [number, number, number];
  animationName?: string;
  autoPlay?: boolean;
  speed?: number;
}

const TestFish = ({ 
  position = [0, 0, 0], 
  scale = 1, 
  rotation = [0, 0, 0],
  animationName,
  autoPlay = true,
  speed = 1
}: TestFishProps) => {
  const group = useRef<Group>(null);

  const { animations, scene } = useGLTF("/smallfish.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const targetAnimation = animationName || names[0];
    
    if (targetAnimation && actions[targetAnimation]) {
      const action = actions[targetAnimation];
      action.timeScale = speed;
      
      if (autoPlay) {
        action.play();
      } else {
        action.stop();
      }
    }
  }, [actions, names, animationName, autoPlay, speed]);

  return (
    <group 
      ref={group} 
      position={position} 
      scale={scale} 
      rotation={rotation}
    >
      <primitive object={scene} />
    </group>
  );
};

export default TestFish;
