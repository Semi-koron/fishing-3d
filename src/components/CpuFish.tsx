import { useFrame, useThree } from "@react-three/fiber";
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
  const { viewport } = useThree();

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
    const bounds = {
      minX: -viewport.width / 2,
      maxX: viewport.width / 2,
      minY: -viewport.height / 2,
      maxY: viewport.height / 2,
      minZ: -2,
      maxZ: 2,
    };

    const randomX = Math.max(
      bounds.minX,
      Math.min(bounds.maxX, (Math.random() - 0.5) * viewport.width * 0.8)
    );
    const randomY = Math.max(
      bounds.minY,
      Math.min(bounds.maxY, (Math.random() - 0.5) * viewport.height * 0.8)
    );
    const randomZ = Math.max(
      bounds.minZ,
      Math.min(bounds.maxZ, (Math.random() - 0.5) * 4)
    );

    if (Math.random() < 0.03 && (clock.get() === 0 || clock.get() === 1)) {
      let minDist = Infinity;
      let minFloat: Float | null = null;
      let targetPosition: Position = [randomX, randomY, randomZ];
      floatsInfo.forEach((float) => {
        const dist = calcFloatFishDist(
          [
            fishXPosAnimationRef.current.get(),
            fishYPosAnimationRef.current.get(),
            fishZPosAnimationRef.current.get(),
          ],
          float
        );
        console.log(dist);
        if (dist < 2.5 && dist < minDist) {
          minDist = dist;
          minFloat = float;
          targetPosition = [
            float.position.x,
            float.position.y,
            float.position.z,
          ];
          console.log("Fish is near a float", float);
        }
      });

      const newTarget: Position = targetPosition;
      setCurrentTarget(newTarget);
      setFishPosition(newTarget[0], newTarget[1], newTarget[2]);
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
