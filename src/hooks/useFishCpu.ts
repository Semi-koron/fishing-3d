import { useSpring } from "@react-spring/web";
import { useRef, useState } from "react";
import type { Position } from "../types/three";

const useFishCpu = (initPos?: Position, toPos?: Position, toRot?: number) => {
  const [isAnimated, setIsAnimated] = useState<number>(0);
  const { pos } = useSpring({
    pos: isAnimated,
    config: { mass: 1, tension: 5, friction: 10, precision: 0.1 },
  });
  const posXAnimated = pos.to(
    [0, 1],
    [initPos ? initPos[0] : 0, toPos ? toPos[0] : 0]
  );
  const posYAnimated = pos.to(
    [0, 1],
    [initPos ? initPos[1] : 0, toPos ? toPos[1] : 0]
  );
  const posZAnimated = pos.to(
    [0, 1],
    [initPos ? initPos[2] : 0, toPos ? toPos[2] : 0]
  );
  const fishXPosAnimationRef = useRef(posXAnimated);
  const fishYPosAnimationRef = useRef(posYAnimated);
  const fishZPosAnimationRef = useRef(posZAnimated);

  const rotXAnimated = pos.to([0, 1], [0, 0]);
  const rotYAnimated = pos.to([0, 1], [0, 0]);
  const rotZAnimated = pos.to([0, 1], [0, toRot ?? 0]);
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

    fishXPosAnimationRef.current = pos.to([0, 1], [from[0], to[0]]);
    fishYPosAnimationRef.current = pos.to([0, 1], [from[1], to[1]]);
    fishZPosAnimationRef.current = pos.to([0, 1], [from[2], to[2]]);

    const beforeRot = fishZRotAnimationRef.current.get();
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];

    const targetRotation = Math.atan2(dy, dx) + Math.PI / 2;

    const normalizeAngle = (angle: number) => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };

    const normalizedTarget = normalizeAngle(targetRotation);
    const normalizedBefore = normalizeAngle(beforeRot);

    const fromZ = isAnimated === 0 ? normalizedBefore : normalizedTarget;
    const toZ = isAnimated === 0 ? normalizedTarget : normalizedBefore;

    if (isAnimated === 0) {
      fishZRotAnimationRef.current = pos.to([0, 0.2], [fromZ, toZ]);
    } else {
      fishZRotAnimationRef.current = pos.to([0.8, 1], [toZ, fromZ]);
    }

    console.log(toZ);

    setIsAnimated(isAnimated === 0 ? 1 : 0);
  };

  return {
    fishXPosAnimationRef,
    fishYPosAnimationRef,
    fishZPosAnimationRef,
    fishXRotAnimationRef,
    fishYRotAnimationRef,
    fishZRotAnimationRef,
    pos,
    setFishPosition,
  };
};

export default useFishCpu;
