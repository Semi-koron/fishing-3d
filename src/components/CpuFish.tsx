import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { animated } from "@react-spring/three";
import useFishCpu from "../hooks/useFishCpu";
import TestFish from "./TestFish";
import type { Position } from "../types/three";
import type { Group } from "three";
import type { Float } from "../types/float";
import { calcFloatFishDist } from "../util/fish/float";
import type { ObjectState } from "../types/multWindow";
import { Html } from "@react-three/drei";

interface CpuFishProps {
  initialPosition?: Position;
  targetPosition?: Position;
  floatsInfo?: Float[];
  handleFishStateChange?: (state: ObjectState) => void;
  scale?: [number, number, number] | number;
  animationName?: string;
  speed?: number;
}

const CpuFish = ({
  initialPosition = [0, 0, 0],
  targetPosition = [0, 1, 0],
  handleFishStateChange,
  floatsInfo = [],
  scale = 1,
  speed = 1,
}: CpuFishProps) => {
  const groupRef = useRef<Group>(null);
  const [currentTarget, setCurrentTarget] = useState<Position>(targetPosition);
  const [fishStatus, setFishStatus] = useState<
    | "swimming" //魚が泳いでいる状態
    | "idle" //魚がじっとしている状態
    | "interested" //魚が興味を持っている状態
    | "escaping" //魚が逃げている状態
  >("idle");
  const [interestedFloat, setInterestedFloat] = useState<Float | null>(null);

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
    interruptFishAnimation,
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

    // 割り込みの行動
    if (fishStatus !== "escaping") {
      floatsInfo.forEach((float) => {
        if (float.status === "moving") {
          const dist = calcFloatFishDist(
            [
              fishXPosAnimationRef.current.get(),
              fishYPosAnimationRef.current.get(),
              fishZPosAnimationRef.current.get(),
            ],
            float
          );
          if (dist < 4.0) {
            // その浮きから少しでも離れる処理（割り込みアニメーション使用）
            const currentFishPos = [
              fishXPosAnimationRef.current.get(),
              fishYPosAnimationRef.current.get(),
              fishZPosAnimationRef.current.get(),
            ];

            // 浮きから魚への方向ベクトルを計算（逃げる方向）
            const escapeDirection = {
              x: currentFishPos[0] - float.position.x,
              y: currentFishPos[1] - float.position.y,
              z: currentFishPos[2] - float.position.z,
            };

            // 方向ベクトルの長さを計算
            const escapeLength = Math.sqrt(
              escapeDirection.x * escapeDirection.x +
                escapeDirection.y * escapeDirection.y +
                escapeDirection.z * escapeDirection.z
            );

            // 長さが0でない場合のみ処理
            if (escapeLength > 0) {
              // 方向ベクトルを正規化
              const normalizedEscape = {
                x: escapeDirection.x / escapeLength,
                y: escapeDirection.y / escapeLength,
                z: escapeDirection.z / escapeLength,
              };

              // 逃げる距離（1.0単位）
              const escapeDistance = 5.0;
              const newEscapeTarget: Position = [
                currentFishPos[0] + normalizedEscape.x * escapeDistance,
                currentFishPos[1] + normalizedEscape.y * escapeDistance,
                currentFishPos[2] + normalizedEscape.z * escapeDistance,
              ];

              // 境界チェック
              const clampedTarget: Position = [
                Math.max(
                  bounds.minX,
                  Math.min(bounds.maxX, newEscapeTarget[0])
                ),
                Math.max(
                  bounds.minY,
                  Math.min(bounds.maxY, newEscapeTarget[1])
                ),
                Math.max(
                  bounds.minZ,
                  Math.min(bounds.maxZ, newEscapeTarget[2])
                ),
              ];

              // 割り込みアニメーションを使用して即座に逃げる
              interruptFishAnimation(
                clampedTarget[0],
                clampedTarget[1],
                clampedTarget[2]
              );
              setCurrentTarget(clampedTarget);
              setFishStatus("escaping");
            }
          }
        }
      });
    }

    // 行動の更新
    if (clock.get() === 0 || clock.get() === 1) {
      if (fishStatus === "interested") return;
      setFishStatus("idle");
      if (Math.random() > 0.03) return;
      let minDist = Infinity;
      let minFloat: Float | null = null;
      let targetPosition: Position = [randomX, randomY, randomZ];

      // 距離計算をswimmingまたはidleの場合のみ実行
      if (fishStatus === "swimming" || fishStatus === "idle") {
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

        // 最短距離の浮きが見つかった場合、interestedFloatに設定しfishStatusをinterestedに変更
        if (minFloat) {
          setInterestedFloat(minFloat);
          setFishStatus("interested");
        } else {
          setFishStatus("swimming");
        }
      }

      const newTarget: Position = targetPosition;
      setCurrentTarget(newTarget);
      setFishPosition(newTarget[0], newTarget[1], newTarget[2]);
      handleFishStateChange?.({
        position: [
          fishXPosAnimationRef.current.get(),
          fishYPosAnimationRef.current.get(),
          fishZPosAnimationRef.current.get(),
        ],
        rotation: [
          fishXRotAnimationRef.current.get(),
          fishYRotAnimationRef.current.get(),
          fishZRotAnimationRef.current.get(),
        ],
      });
    }

    // マルチウィンドウ用の処理
    handleFishStateChange?.({
      position: [
        fishXPosAnimationRef.current.get(),
        fishYPosAnimationRef.current.get(),
        fishZPosAnimationRef.current.get(),
      ],
      rotation: [
        fishXRotAnimationRef.current.get(),
        fishYRotAnimationRef.current.get(),
        fishZRotAnimationRef.current.get(),
      ],
    });
  });

  return (
    <>
      <Html>{fishStatus}</Html>
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
    </>
  );
};

export default CpuFish;
