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

    fishXPosAnimationRef.current = clock.to(
      [0, 0.1, 0.9, 1],
      [from[0], from[0], to[0], to[0]]
    );
    fishYPosAnimationRef.current = clock.to(
      [0, 0.1, 0.9, 1],
      [from[1], from[1], to[1], to[1]]
    );
    fishZPosAnimationRef.current = clock.to(
      [0, 0.1, 0.9, 1],
      [from[2], from[2], to[2], to[2]]
    );

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

    console.log("isAnimated to", isAnimated === 0 ? 1 : 0);
    setIsAnimated(isAnimated === 0 ? 1 : 0);
  };

  const interruptFishAnimation = (x: number, y: number, z: number) => {
    // 現在のclock値を取得
    const currentClockValue = clock.get();

    // 0と1のうち遠い方をゴールとして決定
    const targetClockValue = currentClockValue > 0.5 ? 0 : 1;

    // 現在位置を取得
    const currentPos = [
      fishXPosAnimationRef.current.get(),
      fishYPosAnimationRef.current.get(),
      fishZPosAnimationRef.current.get(),
    ];

    // 目標位置を設定
    const targetPos = [x, y, z];

    // 現在のclock値から目標clock値に向かって、現在位置から目標位置への補間を設定
    if (targetClockValue === 0) {
      // 0に向かう場合: 現在位置 → 目標位置
      fishXPosAnimationRef.current = clock.to(
        [currentClockValue, 0],
        [currentPos[0], targetPos[0]]
      );
      fishYPosAnimationRef.current = clock.to(
        [currentClockValue, 0],
        [currentPos[1], targetPos[1]]
      );
      fishZPosAnimationRef.current = clock.to(
        [currentClockValue, 0],
        [currentPos[2], targetPos[2]]
      );
    } else {
      // 1に向かう場合: 現在位置 → 目標位置
      fishXPosAnimationRef.current = clock.to(
        [currentClockValue, 1],
        [currentPos[0], targetPos[0]]
      );
      fishYPosAnimationRef.current = clock.to(
        [currentClockValue, 1],
        [currentPos[1], targetPos[1]]
      );
      fishZPosAnimationRef.current = clock.to(
        [currentClockValue, 1],
        [currentPos[2], targetPos[2]]
      );
    }

    // 回転も設定（0を目指す場合は0.4で終了、1を目指す場合は0.6で終了）
    const currentRotation = fishZRotAnimationRef.current.get();
    const dx = targetPos[0] - currentPos[0];
    const dy = targetPos[1] - currentPos[1];
    const targetRotation = Math.atan2(dy, dx) + Math.PI / 2;

    if (targetClockValue === 0) {
      // 0に向かう場合: 0.4で回転終了
      fishZRotAnimationRef.current = clock.to(
        [0, 0.4, currentClockValue],
        [targetRotation, targetRotation, currentRotation]
      );
    } else {
      // 1に向かう場合: 0.6で回転終了
      fishZRotAnimationRef.current = clock.to(
        [currentClockValue, 0.6, 1],
        [currentRotation, targetRotation, targetRotation]
      );
    }

    // アニメーション状態を強制的に目標値に設定
    console.log("isAnimated to", targetClockValue);
    setIsAnimated(targetClockValue);
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
    interruptFishAnimation,
  };
};

export default useFishCpu;
