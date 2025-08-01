import { useSpring } from "@react-spring/web";
import { useRef, useState } from "react";
import type { Position } from "../types/three";

const useFishCpu = (initPos?: Position, toPos?: Position, toRot?: number) => {
  const [isAnimated, setIsAnimated] = useState<number>(0);
  const { clock } = useSpring({
    clock: isAnimated,
    config: { mass: 0.5, tension: 5, friction: 10, precision: 0.1 },
  });
  const posXAnimated = clock.to(
    [0, 1],
    [initPos ? initPos[0] : 0, toPos ? toPos[0] : 0]
  );
  const posYAnimated = clock.to(
    [0, 1],
    [initPos ? initPos[1] : 0, toPos ? toPos[1] : 0]
  );
  const posZAnimated = clock.to(
    [0, 1],
    [initPos ? initPos[2] : 0, toPos ? toPos[2] : 0]
  );
  const fishXPosAnimationRef = useRef(posXAnimated);
  const fishYPosAnimationRef = useRef(posYAnimated);
  const fishZPosAnimationRef = useRef(posZAnimated);

  const rotXAnimated = clock.to([0, 1], [0, 0]);
  const rotYAnimated = clock.to([0, 1], [0, 0]);
  const rotZAnimated = clock.to([0, 1], [0, toRot ?? 0]);
  const fishXRotAnimationRef = useRef(rotXAnimated);
  const fishYRotAnimationRef = useRef(rotYAnimated);
  const fishZRotAnimationRef = useRef(rotZAnimated);

  const setFishPosition = (x: number, y: number, z: number) => {
    const beforePos = [
      fishXPosAnimationRef.current.get(),
      fishYPosAnimationRef.current.get(),
      fishZPosAnimationRef.current.get(),
    ];
    const from = isAnimated === 0 ? beforePos : [x, y, z];
    const to = isAnimated === 0 ? [x, y, z] : beforePos;

    fishXPosAnimationRef.current = clock.to([0, 1], [from[0], to[0]]);
    fishYPosAnimationRef.current = clock.to([0, 1], [from[1], to[1]]);
    fishZPosAnimationRef.current = clock.to([0, 1], [from[2], to[2]]);

    const beforeRot = fishZRotAnimationRef.current.get();
    const dx = x - beforePos[0];
    const dy = y - beforePos[1];
    const targetRotation = Math.atan2(dy, dx) + Math.PI / 2;

    if (isAnimated === 0) {
      fishZRotAnimationRef.current = clock.to(
        [0, 0.4, 1],
        [beforeRot, targetRotation, targetRotation]
      );
    } else {
      fishZRotAnimationRef.current = clock.to(
        [0, 0.6, 1],
        [targetRotation, targetRotation, beforeRot]
      );
    }

    setIsAnimated(isAnimated === 0 ? 1 : 0);
  };

  return {
    fishXPosAnimationRef,
    fishYPosAnimationRef,
    fishZPosAnimationRef,
    fishXRotAnimationRef,
    fishYRotAnimationRef,
    fishZRotAnimationRef,
    clock,
    setFishPosition,
  };
};

export default useFishCpu;
