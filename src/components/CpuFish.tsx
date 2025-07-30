import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { animated } from "@react-spring/three";
import useFishCpu from "../hooks/useFishCpu";
import TestFish from "./TestFish";
import type { Position } from "../types/three";
import type { Group } from "three";

interface CpuFishProps {
  initialPosition?: Position;
  targetPosition?: Position;
  scale?: [number, number, number] | number;
  animationName?: string;
  speed?: number;
}

const CpuFish = ({
  initialPosition = [0, 0, 0],
  targetPosition = [5, 2, 3],
  scale = 1,
  speed = 1,
}: CpuFishProps) => {
  const groupRef = useRef<Group>(null);
  const [currentTarget, setCurrentTarget] = useState<Position>(targetPosition);

  const {
    fishXPosAnimationRef,
    fishYPosAnimationRef,
    fishZPosAnimationRef,
    fishXRotAnimationRef,
    fishYRotAnimationRef,
    fishZRotAnimationRef,
    pos,
    setFishPosition,
  } = useFishCpu(initialPosition, currentTarget);

  useFrame(() => {
    const randomX = (Math.random() - 0.5) * 1;
    const randomY = (Math.random() - 0.5) * 5;
    const randomZ = (Math.random() - 0.5) * 1;

    if (Math.random() < 0.01 && (pos.get() === 0 || pos.get() === 1)) {
      const newTarget: Position = [randomX, randomY, randomZ];
      setCurrentTarget(newTarget);
      setFishPosition(randomX, randomY, randomZ);
    }
  });

  return (
    <animated.group ref={groupRef}>
      <TestFish
        position={[
          fishXPosAnimationRef.current,
          fishYPosAnimationRef.current,
          fishZPosAnimationRef.current,
        ]}
        rotation={[
          fishXRotAnimationRef.current,
          fishYRotAnimationRef.current,
          fishZRotAnimationRef.current,
        ]}
        scale={scale}
        autoPlay={true}
        speed={speed}
      />
    </animated.group>
  );
};

export default CpuFish;
