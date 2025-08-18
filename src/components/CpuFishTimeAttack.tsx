import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { animated } from "@react-spring/three";
import useFishCpu from "../hooks/useFishCpu";
import TestFish from "./TestFish";
import type { Position } from "../types/three";
import type { Group } from "three";
import type { Float } from "../types/float";
import { calcFloatFishDist } from "../util/fish/float";
import type { ObjectState } from "../types/multWindow";
import { Html } from "@react-three/drei";

interface CpuFishTimeAttackProps {
  initialPosition?: Position;
  targetPosition?: Position;
  floatsInfo?: Float[] | [];
  handleFishStateChange?: (state: ObjectState) => void;
  handleFishBite?: () => void;
  handleFishCaught?: (fishId: string) => void; // 魚が釣れた時のコールバック
  scale?: [number, number, number] | number;
  animationName?: string;
  speed?: number;
  fishId?: string; // 魚の識別用ID
}

const CpuFishTimeAttack = ({
  initialPosition = [0, 0, 0],
  targetPosition = [0, 1, 0],
  handleFishStateChange,
  handleFishBite,
  handleFishCaught,
  floatsInfo = [],
  scale = 1,
  speed = 1,
  fishId = "fish_1",
}: CpuFishTimeAttackProps) => {
  const groupRef = useRef<Group>(null);
  const [currentTarget, setCurrentTarget] = useState<Position>(targetPosition);
  const [fishStatus, setFishStatus] = useState<
    | "swimming" //魚が泳いでいる状態
    | "idle" //魚がじっとしている状態
    | "interested" //魚が興味を持っている状態
    | "biting" //魚が食いついている状態
    | "escaping" //魚が逃げている状態
    | "caught" //魚が釣れている状態
    | "disappeared" //魚が消えた状態
  >("idle");
  const [interestedFloatIndex, setInterestedFloatIndex] = useState<
    number | null
  >(null);
  const [resetAnimation, setResetAnimation] = useState<boolean>(false);
  const [isCaught, setIsCaught] = useState<boolean>(false);
  const caughtAnimationTimeRef = useRef<number>(0);
  const caughtPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const caughtRotationRef = useRef<[number, number, number]>([0, 0, 0]);

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

  const bounds = {
    minX: -viewport.width / 2,
    maxX: viewport.width / 2,
    minY: -viewport.height / 2,
    maxY: viewport.height / 2,
    minZ: -2,
    maxZ: 2,
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "ANIMATION_RESET") {
        setResetAnimation(true);
        setTimeout(() => setResetAnimation(false), 100);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (window.opener) {
      window.postMessage("ANIMATION_RESET", "*");
    }
  }, []);

  useFrame(() => {
    // 釣れるアニメーション処理
    if (fishStatus === "caught") {
      caughtAnimationTimeRef.current += 0.018;

      const t = caughtAnimationTimeRef.current;
      const totalDuration = Math.PI; // 半円分の時間（π秒間）

      if (t < totalDuration) {
        // test.tsxと同様の半円運動（ただし半円のみ）
        const radius = 5; // test.tsxと同じradius
        const angle = t; // 0からπまで（半円分）

        const x = radius * Math.cos(angle + Math.PI); // +πで左端から開始
        const y = 0; // Y座標は画面の真ん中（0）に固定
        const z = 2 + radius * Math.sin(-angle + Math.PI); // カメラのz軸+2を中心とする半円

        // test.tsxと同様のrotation計算
        const rotationY = angle - Math.PI / 2;
        const position: [number, number, number] = [x, y, z];
        const rotation: [number, number, number] = [
          Math.PI / 2,
          Math.PI,
          -Math.PI / 2 + rotationY,
        ];

        caughtPositionRef.current = position;
        caughtRotationRef.current = rotation;
      } else {
        // アニメーション完了後に魚を消す
        setFishStatus("disappeared");
        handleFishCaught?.(fishId); // 親コンポーネントに釣れたことを通知
        caughtAnimationTimeRef.current = 0;
        caughtPositionRef.current = [0, 0, 0];
        caughtRotationRef.current = [0, 0, 0];
      }
    }

    // 魚がbiting状態でプレイヤーキューブの位置に近づいたかチェック
    if (fishStatus === "biting" && interestedFloatIndex !== null && !isCaught) {
      const interestedFloat = floatsInfo[interestedFloatIndex];
      if (interestedFloat) {
        // プレイヤーキューブとinterestedFloatの距離を計算
        const spacing = 4;
        const startX = (-(4 - 1) * spacing) / 2; // 4プレイヤー分を想定
        const playerCubeX = startX + interestedFloatIndex * spacing;
        const playerCubeY = -5;
        const playerCubeZ = 0;

        const distanceToPlayer = Math.sqrt(
          Math.pow(interestedFloat.position.x - playerCubeX, 2) +
            Math.pow(interestedFloat.position.y - playerCubeY, 2) +
            Math.pow(interestedFloat.position.z - playerCubeZ, 2)
        );

        // 距離が0.5以下になったら釣れるアニメーションを開始
        if (distanceToPlayer <= 0.5) {
          setIsCaught(true);
          setFishStatus("caught");
          caughtAnimationTimeRef.current = 0;
        }
      }
    }

    // 魚が消えた状態の場合は何もしない
    if (fishStatus === "disappeared") {
      return;
    }

    // 割り込みの行動
    if (
      fishStatus !== "escaping" &&
      fishStatus !== "biting" &&
      fishStatus !== "caught"
    ) {
      floatsInfo.forEach((float) => {
        // floatがstatusがidleの場合無視
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
      if (fishStatus === "biting") {
        handleFishBite?.();
        handleFishStateChange?.({
          position: [
            floatsInfo[interestedFloatIndex!].position.x,
            floatsInfo[interestedFloatIndex!].position.y,
            floatsInfo[interestedFloatIndex!].position.z,
          ],
          rotation: [
            0,
            0,
            Math.atan2(
              floatsInfo[interestedFloatIndex!].fishermanPosition.y -
                floatsInfo[interestedFloatIndex!].position.y,
              floatsInfo[interestedFloatIndex!].fishermanPosition.x -
                floatsInfo[interestedFloatIndex!].position.x
            ) +
              Math.PI / 2,
          ],
        });
        return;
      }
      if (fishStatus !== "caught" && fishStatus !== "disappeared") {
        fishAction();
      }
    }

    // マルチウィンドウ用の処理
    if (fishStatus !== "biting" && fishStatus !== "caught" && fishStatus !== "disappeared") {
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
    } else if (fishStatus === "caught") {
      handleFishStateChange?.({
        position: caughtPositionRef.current,
        rotation: caughtRotationRef.current,
      });
    }
  });

  const fishAction = () => {
    // 魚が消えた状態の場合は何もしない
    if (fishStatus === "disappeared") {
      return;
    }

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

    if (fishStatus === "interested") {
      setFishStatus("biting");
    } else if (fishStatus !== "disappeared") {
      setFishStatus("idle");
    }
    if (Math.random() > 0.03) return;
    let minDist = Infinity;
    let minFloat: Float | null = null;
    let targetPosition: Position = [randomX, randomY, randomZ];

    // 距離計算をswimmingまたはidleの場合のみ実行
    if ((fishStatus === "swimming" || fishStatus === "idle") && fishStatus !== "disappeared") {
      floatsInfo.forEach((float, index) => {
        const dist =
          float.status === "idle"
            ? Infinity
            : calcFloatFishDist(
                [
                  fishXPosAnimationRef.current.get(),
                  fishYPosAnimationRef.current.get(),
                  fishZPosAnimationRef.current.get(),
                ],
                float
              );
        if (dist < 2.5 && dist < minDist) {
          minDist = dist;
          minFloat = float;
          setInterestedFloatIndex(index);
          targetPosition = [
            float.position.x,
            float.position.y,
            float.position.z,
          ];
          console.log("Fish is near a float", float);
        }
      });

      // 最短距離の浮きが見つかった場合、fishStatusをinterestedに変更
      if (minFloat) {
        setFishStatus("interested");
      } else {
        setFishStatus("swimming");
        setInterestedFloatIndex(null);
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
  };

  // 魚が消えた状態の場合は何も表示しない
  if (fishStatus === "disappeared") {
    return null;
  }

  return (
    <>
      <Html>{fishStatus}</Html>
      <animated.group ref={groupRef}>
        <TestFish
          position={
            fishStatus === "caught"
              ? caughtPositionRef.current
              : fishStatus === "biting" &&
                interestedFloatIndex !== null &&
                floatsInfo[interestedFloatIndex]
              ? [
                  floatsInfo[interestedFloatIndex].position.x,
                  floatsInfo[interestedFloatIndex].position.y,
                  floatsInfo[interestedFloatIndex].position.z,
                ]
              : [
                  fishXPosAnimationRef.current,
                  fishYPosAnimationRef.current,
                  fishZPosAnimationRef.current,
                ]
          }
          rotation={
            fishStatus === "caught"
              ? caughtRotationRef.current
              : fishStatus === "biting" &&
                interestedFloatIndex !== null &&
                floatsInfo[interestedFloatIndex]
              ? [
                  0,
                  0,
                  Math.atan2(
                    floatsInfo[interestedFloatIndex].fishermanPosition.y -
                      floatsInfo[interestedFloatIndex].position.y,
                    floatsInfo[interestedFloatIndex].fishermanPosition.x -
                      floatsInfo[interestedFloatIndex].position.x
                  ) +
                    Math.PI / 2,
                ]
              : [
                  fishXRotAnimationRef.current,
                  fishYRotAnimationRef.current,
                  fishZRotAnimationRef.current,
                ]
          }
          scale={scale}
          autoPlay={true}
          speed={fishStatus === "biting" || fishStatus === "caught" ? 5 : speed}
          resetAnimation={resetAnimation}
        />
      </animated.group>
    </>
  );
};

export default CpuFishTimeAttack;