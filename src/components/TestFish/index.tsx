import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { Group, Vector3 } from "three";

import { a, Interpolation } from "@react-spring/three";

interface TestFishProps {
  position:
    | [
        Interpolation<number, number>,
        Interpolation<number, number>,
        Interpolation<number, number>
      ]
    | [number, number, number];
  scale?: [number, number, number] | Vector3 | number;
  rotation:
    | [
        Interpolation<number, number>,
        Interpolation<number, number>,
        Interpolation<number, number>
      ]
    | [number, number, number];
  animationName?: string;
  autoPlay?: boolean;
  speed?: number;
  resetAnimation?: boolean;
}

const TestFish = ({
  position,
  rotation,
  scale = 1,
  animationName,
  autoPlay = true,
  speed = 1,
  resetAnimation = false,
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

  useEffect(() => {
    if (resetAnimation) {
      const targetAnimation = animationName || names[0];
      if (targetAnimation && actions[targetAnimation]) {
        const action = actions[targetAnimation];
        action.reset();
        if (autoPlay) {
          action.play();
        }
      }
    }
  }, [resetAnimation, actions, names, animationName, autoPlay]);

  return (
    <a.mesh
      ref={group}
      position-x={position[0]}
      position-y={position[1]}
      position-z={0}
      scale={scale}
      rotation-x={rotation[0]}
      rotation-y={rotation[1]}
      rotation-z={rotation[2]}
    >
      <primitive object={scene} />
    </a.mesh>
  );
};

export default TestFish;
