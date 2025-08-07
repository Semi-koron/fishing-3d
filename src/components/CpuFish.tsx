import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { animated } from "@react-spring/three";
import useFishCpu from "../hooks/useFishCpu";
import TestFish from "./TestFish";
import type { Position } from "../types/three";
import type { Group } from "three";
import type { Float } from "../types/float";
import { calcFloatFishDist } from "../util/fish/float";

interface CpuFishProps {
  initialPosition?: Position;
  targetPosition?: Position;
  floatsInfo?: Float[];
  scale?: [number, number, number] | number;
  animationName?: string;
  speed?: number;
}

const CpuFish = ({
  initialPosition = [0, 0, 0],
  targetPosition = [0, 1, 0],
  floatsInfo = [],
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
    clock,
    setFishPosition,
  } = useFishCpu(initialPosition, currentTarget);

  useFrame(() => {
    const randomX = (Math.random() - 0.5) * 1;
    const randomY = (Math.random() - 0.5) * 5;
    const randomZ = (Math.random() - 0.5) * 1;

    if (Math.random() < 0.01 && (clock.get() === 0 || clock.get() === 1)) {
      let minDist = Infinity;
      let minFloat: Float | null = null;
      let targetPosition: Position = [randomX, randomY, randomZ];
      floatsInfo.forEach((float) => {
        const dist = calcFloatFishDist([randomX, randomY, randomZ], float);
        if (dist < 0.5 && dist < minDist) {
          minDist = dist;
          minFloat = float;
          targetPosition = [
            float.position.x,
            float.position.y,
            float.position.z,
          ];
        }
      });

      const newTarget: Position = targetPosition;
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
