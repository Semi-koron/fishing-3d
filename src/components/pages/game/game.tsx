import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useState } from "react";
import CpuFish from "../../CpuFish";
import type { Float } from "../../../types/float";
import FloatModel from "../../Float";
import type { ObjectState } from "../../../types/multWindow";
import TestFish from "../../TestFish";
import type { Position } from "../../../types/three";
import { useJoyCon } from "../../../hooks/useJoycon";
import type { StickDirection } from "../../../hooks/useJoycon";
import { PlayerCube } from "../../PlayerCube";
interface CameraOffset {
  x: number;
  y: number;
  z: number;
}

const CameraController = ({ offset }: { offset: CameraOffset }) => {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(offset.x, offset.y, 10 + offset.z);
    camera.updateProjectionMatrix();
  });

  return null;
};

const FloatController = ({ onMove }: { onMove: () => void }) => {
  useFrame(() => {
    onMove();
  });

  return null;
};

// 目標方向管理用
interface TargetDirection {
  current: StickDirection;
  next: StickDirection;
}

export default function Game() {
  const { players, connect, toggleStick, lastError } = useJoyCon();
  const [playerFloats, setPlayerFloats] = useState<(Float | null)[]>(
    Array.from({ length: 4 }, (_, index) => {
      const spacing = 4;
      const startX = (-(4 - 1) * spacing) / 2;
      const playerPosition = {
        x: startX + index * spacing,
        y: -5,
        z: 0,
      };
      return {
        status: "idle" as const,
        position: playerPosition,
        fishermanPosition: playerPosition,
      };
    })
  );
  const [isFishBiting, setIsFishBiting] = useState(false);
  const [receivedFishState, setReceivedFishState] =
    useState<ObjectState | null>(null);
  const [receivedFloatStates, setReceivedFloatStates] = useState<{
    [key: number]: ObjectState | null;
  }>({});
  const [receivedPlayerCubes, setReceivedPlayerCubes] = useState<any[]>([]);

  const [childWindow, setChildWindow] = useState<Window | null>(null);
  const [isChild, setIsChild] = useState(false);
  const [cameraOffset, setCameraOffset] = useState<CameraOffset>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [receivedCameraOffset, setReceivedCameraOffset] =
    useState<CameraOffset>({
      x: 0,
      y: 0,
      z: 0,
    });

  // 各プレイヤーの目標方向を管理
  const [targetDirections, setTargetDirections] = useState<
    Map<number, TargetDirection>
  >(new Map());

  // 時計回りの次の方向を取得する関数
  const getNextClockwiseDirection = (
    current: StickDirection
  ): StickDirection => {
    const clockwisePattern: StickDirection[] = [
      "right",
      "down-right",
      "down",
      "down-left",
      "left",
      "up-left",
      "up",
      "up-right",
    ];
    const currentIndex = clockwisePattern.indexOf(current);
    if (currentIndex === -1) return "right"; // デフォルト
    return clockwisePattern[(currentIndex + 1) % clockwisePattern.length];
  };

  // 目標方向に到達したかチェックし、到達していたら移動して次の目標を設定
  const checkAndMoveToTarget = useCallback(
    (direction: StickDirection, playerId: number): boolean => {
      const target = targetDirections.get(playerId);

      if (!target) {
        // 初回の場合、目標方向を設定
        if (direction !== "neutral") {
          const nextDirection = getNextClockwiseDirection(direction);
          setTargetDirections(
            (prev) =>
              new Map(
                prev.set(playerId, {
                  current: direction,
                  next: nextDirection,
                })
              )
          );
        }
        return false;
      }

      // 目標方向に到達したかチェック
      if (direction === target.next) {
        // 到達したので次の目標を設定
        const nextDirection = getNextClockwiseDirection(direction);
        setTargetDirections(
          (prev) =>
            new Map(
              prev.set(playerId, {
                current: direction,
                next: nextDirection,
              })
            )
        );
        return true; // 移動すべき
      }

      return false;
    },
    [targetDirections]
  );

  const sendGameStateUpdate = useCallback(
    (updateData: {
      playerCubes?: any[];
      floats?: {
        [playerId: number]: {
          objectState: ObjectState;
          status: string;
          visible: boolean;
        };
      };
      fish?: { objectState: ObjectState };
      camera?: CameraOffset;
    }) => {
      if (childWindow && !childWindow.closed) {
        childWindow.postMessage(
          {
            type: "GAME_STATE_UPDATE",
            data: updateData,
          },
          window.location.origin
        );
      }
    },
    [childWindow]
  );

  // floatの最後の状態変更時刻を管理
  const [lastStateChangeTime, setLastStateChangeTime] = useState<
    Map<number, number>
  >(new Map());

  // PlayerCubeの位置情報を送信する関数
  const sendPlayerCubesUpdate = useCallback(() => {
    if (!childWindow || childWindow.closed) return;

    const playerCubesData = players.map((player, index) => {
      const spacing = 4;
      const startX = (-(players.length - 1) * spacing) / 2;
      const position = [startX + index * spacing, -5, 0];

      return {
        playerId: index,
        position: position,
        isConnected: player.isConnected,
        player: {
          id: player.id,
          isConnected: player.isConnected,
          deviceType: player.deviceType,
          useRightStick: player.useRightStick,
          rotation: player.rotation,
          // HIDDeviceやdataオブジェクトは送信しない
        },
      };
    });

    sendGameStateUpdate({
      playerCubes: playerCubesData,
    });
  }, [players, sendGameStateUpdate]);

  // floatを移動させるための関数
  const moveFloatTowardsPlayer = useCallback(() => {
    const now = Date.now();

    setPlayerFloats((prev) => {
      const newFloats = [...prev];
      let hasMovement = false;

      newFloats.forEach((floatInfo, index) => {
        if (
          !floatInfo ||
          (floatInfo.status !== "float" && floatInfo.status !== "moving")
        )
          return;

        const player = players[index];
        if (!player?.isConnected || !player.data) return;

        // プレイヤーの位置を計算
        const spacing = 4;
        const startX = (-(players.length - 1) * spacing) / 2;
        const playerPosition = {
          x: startX + index * spacing,
          y: -5,
          z: 0,
        };

        // 左右どちらのスティックでも目標方向チェック
        const leftDirection = player.data.leftStick.direction;
        const rightDirection = player.data.rightStick.direction;

        const isLeftTargetReached = checkAndMoveToTarget(
          leftDirection,
          index * 2
        ); // 左スティック用ID
        const isRightTargetReached = checkAndMoveToTarget(
          rightDirection,
          index * 2 + 1
        ); // 右スティック用ID
        const shouldMove = isLeftTargetReached || isRightTargetReached;

        // floatとプレイヤーの距離を計算
        const dx = playerPosition.x - floatInfo.position.x;
        const dy = playerPosition.y - floatInfo.position.y;
        const dz = playerPosition.z - floatInfo.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // 最後の状態変更時刻を取得
        const lastChange = lastStateChangeTime.get(index) || now;

        if (floatInfo.status === "moving") {
          // 距離が0.1以下になったらidleに戻す
          if (distance <= 0.1) {
            newFloats[index] = {
              ...floatInfo,
              status: "idle",
              position: playerPosition,
            };
            hasMovement = true;
            setLastStateChangeTime((prev) => new Map(prev.set(index, now)));
          } else if (shouldMove) {
            // 目標方向に到達したら0.1移動してタイムスタンプ更新
            const moveDistance = 0.1;
            const normalizedDirection = {
              x: dx / distance,
              y: dy / distance,
              z: dz / distance,
            };

            newFloats[index] = {
              ...floatInfo,
              position: {
                x: floatInfo.position.x + normalizedDirection.x * moveDistance,
                y: floatInfo.position.y + normalizedDirection.y * moveDistance,
                z: floatInfo.position.z + normalizedDirection.z * moveDistance,
              },
            };
            hasMovement = true;
            setLastStateChangeTime((prev) => new Map(prev.set(index, now)));
          } else if (now - lastChange > 300) {
            // 0.3秒間状態変更がなければfloatに戻す
            newFloats[index] = {
              ...floatInfo,
              status: "float",
            };
            hasMovement = true;
            setLastStateChangeTime((prev) => new Map(prev.set(index, now)));
          }
        } else if (floatInfo.status === "float" && shouldMove) {
          // floatステータスから目標到達が検知されたらmovingに変更
          newFloats[index] = {
            ...floatInfo,
            status: "moving",
          };
          hasMovement = true;
          setLastStateChangeTime((prev) => new Map(prev.set(index, now)));
        }
      });

      if (hasMovement) {
        // 浮きの状態をキーベースで送信
        const floatsData: {
          [playerId: number]: {
            objectState: ObjectState;
            status: string;
            visible: boolean;
          };
        } = {};

        newFloats.forEach((floatInfo, index) => {
          if (floatInfo) {
            floatsData[index] = {
              objectState: {
                position: [
                  floatInfo.position.x,
                  floatInfo.position.y,
                  floatInfo.position.z,
                ],
                rotation: [0, 0, 0],
              },
              status: floatInfo.status,
              visible:
                floatInfo.status === "float" ||
                floatInfo.status === "moving" ||
                floatInfo.status === "biting",
            };
          }
        });

        sendGameStateUpdate({
          floats: floatsData,
        });

        // 従来のメッセージも保持（互換性のため）
        newFloats.forEach((floatInfo, index) => {
          if (floatInfo && childWindow && !childWindow.closed) {
            childWindow.postMessage({
              type: `FLOAT_${index}_STATE_UPDATE`,
              objectState: {
                position: [
                  floatInfo.position.x,
                  floatInfo.position.y,
                  floatInfo.position.z,
                ],
                rotation: [0, 0, 0],
              },
            });
          }
        });
      }

      return newFloats;
    });
  }, [
    players,
    checkAndMoveToTarget,
    sendGameStateUpdate,
    childWindow,
    lastStateChangeTime,
  ]);

  //マルチウィンドウの処理
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsChild(urlParams.get("child") === "true");

    const handleMessage = (event: MessageEvent) => {
      // 魚の状態を受信
      if (event.data.type === "OBJECT_STATE_UPDATE") {
        setReceivedFishState(event.data.objectState);
      }
      if (event.data.type === "FISH_BITE") {
        console.log("Fish bite detected from child window");
        setIsFishBiting(true);
      }

      // 浮きの状態を受信
      if (
        event.data.type.startsWith("FLOAT_") &&
        event.data.type.endsWith("_STATE_UPDATE")
      ) {
        const floatId = parseInt(
          event.data.type.replace("FLOAT_", "").replace("_STATE_UPDATE", "")
        );
        setReceivedFloatStates((prev) => ({
          ...prev,
          [floatId]: event.data.objectState,
        }));
      }
      // カメラのオフセットを受信
      if (event.data.type === "CAMERA_OFFSET_UPDATE") {
        setReceivedCameraOffset(event.data.cameraOffset);
      }
      // キーベースの統合メッセージを受信
      if (event.data.type === "GAME_STATE_UPDATE") {
        const { playerCubes, floats, fish, camera } = event.data.data;

        if (playerCubes) {
          setReceivedPlayerCubes(playerCubes);
        }

        if (floats) {
          Object.entries(floats).forEach(
            ([playerId, floatData]: [string, any]) => {
              setReceivedFloatStates((prev) => ({
                ...prev,
                [parseInt(playerId)]: floatData.objectState,
              }));
            }
          );
        }

        if (fish) {
          setReceivedFishState(fish.objectState);
        }

        if (camera) {
          setReceivedCameraOffset(camera);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const openChildWindow = () => {
    const newWindow = window.open(
      `${window.location.pathname}?child=true`,
      "_blank",
      "width=800,height=600"
    );
    setChildWindow(newWindow);
  };

  const handleFishStateChange = (newFishState: ObjectState) => {
    if (childWindow && !childWindow.closed) {
      childWindow.postMessage(
        {
          type: "OBJECT_STATE_UPDATE",
          objectState: newFishState,
        },
        window.location.origin
      );
    }
  };

  const handleFishBite = () => {
    if (childWindow && !childWindow.closed) {
      console.log("Sending fish bite event to child window");
      childWindow.postMessage(
        {
          type: "FISH_BITE",
        },
        window.location.origin
      );
    }
  };

  const handleCameraOffsetChange = (newOffset: CameraOffset) => {
    console.log("Updating camera offset:", newOffset);
    setCameraOffset(newOffset);
    const childOffset = {
      x: -newOffset.x,
      y: newOffset.y,
      z: newOffset.z,
    };

    if (childWindow && !childWindow.closed) {
      childWindow.postMessage(
        {
          type: "CAMERA_OFFSET_UPDATE",
          cameraOffset: childOffset,
        },
        window.location.origin
      );
    }
  };

  const handleCastFloat = (
    playerId: number,
    direction: number,
    power: number
  ) => {
    setPlayerFloats((prev) => {
      const newFloats = [...prev];
      if (newFloats[playerId]?.status === "idle") {
        const playerPosition = [
          (-(players.length - 1) * 4) / 2 + playerId * 4,
          -5,
          0,
        ];

        // 浮きを投げる距離を計算（パワーに基づく）
        const distance = Math.max(3, Math.min(10, power * 15));

        newFloats[playerId] = {
          status: "float",
          position: {
            x: playerPosition[0] + Math.cos(direction) * distance,
            y: playerPosition[1] + Math.sin(direction) * distance,
            z: 0,
          },
          fishermanPosition: {
            x: playerPosition[0],
            y: playerPosition[1],
            z: playerPosition[2],
          },
        };

        // キーベースで浮き状態を送信
        const floatsData: {
          [playerId: number]: {
            objectState: ObjectState;
            status: string;
            visible: boolean;
          };
        } = {};
        floatsData[playerId] = {
          objectState: {
            position: [
              newFloats[playerId].position.x,
              newFloats[playerId].position.y,
              newFloats[playerId].position.z,
            ],
            rotation: [0, 0, 0],
          },
          status: newFloats[playerId].status,
          visible: true,
        };

        sendGameStateUpdate({
          floats: floatsData,
        });

        // 従来のメッセージも保持（互換性のため）
        if (childWindow && !childWindow.closed) {
          childWindow.postMessage({
            type: `FLOAT_${playerId}_STATE_UPDATE`,
            objectState: {
              position: [
                newFloats[playerId].position.x,
                newFloats[playerId].position.y,
                newFloats[playerId].position.z,
              ],
              rotation: [0, 0, 0],
            },
          });
        }
      }
      return newFloats;
    });
  };

  // プレイヤーの状態が変更された際にPlayerCubeの情報を送信
  useEffect(() => {
    sendPlayerCubesUpdate();
  }, [sendPlayerCubesUpdate, players]);

  const currentCameraOffset = isChild ? receivedCameraOffset : cameraOffset;

  return (
    <>
      {!isChild && (
        <>
          <button
            onClick={openChildWindow}
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 1000,
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            子ウィンドウを開く
          </button>
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "10px",
              zIndex: 1000,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "15px",
              borderRadius: "5px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ marginBottom: "10px" }}>カメラ位置調整</div>
            <div style={{ marginBottom: "8px" }}>
              X: {cameraOffset.x.toFixed(1)}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={cameraOffset.x}
                onChange={(e) =>
                  handleCameraOffsetChange({
                    ...cameraOffset,
                    x: parseFloat(e.target.value),
                  })
                }
                style={{ marginLeft: "10px" }}
              />
            </div>
            <div style={{ marginBottom: "8px" }}>
              Y: {cameraOffset.y.toFixed(1)}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={cameraOffset.y}
                onChange={(e) =>
                  handleCameraOffsetChange({
                    ...cameraOffset,
                    y: parseFloat(e.target.value),
                  })
                }
                style={{ marginLeft: "10px" }}
              />
            </div>
            <div>
              Z: {cameraOffset.z.toFixed(1)}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={cameraOffset.z}
                onChange={(e) =>
                  handleCameraOffsetChange({
                    ...cameraOffset,
                    z: parseFloat(e.target.value),
                  })
                }
                style={{ marginLeft: "10px" }}
              />
            </div>
          </div>
        </>
      )}
      <Canvas>
        <CameraController offset={currentCameraOffset} />
        <FloatController onMove={moveFloatTowardsPlayer} />
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        {!isChild && (
          <CpuFish
            initialPosition={[0, 0, 0]}
            scale={1}
            animationName="swim"
            speed={1}
            handleFishStateChange={handleFishStateChange}
            handleFishBite={handleFishBite}
            floatsInfo={playerFloats.filter((f): f is Float => f !== null)}
          />
        )}
        {isChild && receivedFishState && (
          <TestFish
            position={receivedFishState?.position}
            rotation={receivedFishState?.rotation}
            speed={isFishBiting ? 5 : 1}
          />
        )}

        {/* プレイヤーキューブの配置 */}
        {!isChild &&
          players.map((player, index) => {
            const spacing = 4;
            const startX = (-(players.length - 1) * spacing) / 2;
            const position: [number, number, number] = [
              startX + index * spacing,
              -5,
              0,
            ];

            return (
              <PlayerCube
                key={player.id}
                player={player}
                position={position}
                playerId={index}
                onConnect={connect}
                onToggleStick={toggleStick}
                floatInfo={playerFloats[index]}
                onCastFloat={handleCastFloat}
              />
            );
          })}

        {/* 子ウィンドウでのプレイヤーキューブ表示 */}
        {isChild &&
          receivedPlayerCubes.map((playerCubeData) => (
            <PlayerCube
              key={`child-${playerCubeData.playerId}`}
              player={playerCubeData.player}
              position={playerCubeData.position}
              playerId={playerCubeData.playerId}
              onConnect={() => {}} // 子ウィンドウでは接続機能は無効
              onToggleStick={() => {}} // 子ウィンドウではトグル機能は無効
              floatInfo={null} // 子ウィンドウでは浮き情報は別途表示
              onCastFloat={() => {}} // 子ウィンドウでは投げ機能は無効
              isChildWindow={true}
            />
          ))}

        {/* 投げられた浮きの表示（親ウィンドウ） */}
        {!isChild &&
          playerFloats.map((floatInfo, index) => {
            if (
              floatInfo?.status === "float" ||
              floatInfo?.status === "moving" ||
              floatInfo?.status === "biting"
            ) {
              const colors = ["#ff4444", "#44ff44", "#4444ff", "#ffff44"];
              const playerColor = colors[index] || "#ffffff";
              return (
                <mesh
                  key={`cast-float-cube-${index}`}
                  position={[
                    floatInfo.position.x,
                    floatInfo.position.y,
                    floatInfo.position.z,
                  ]}
                >
                  <boxGeometry args={[0.3, 0.3, 0.3]} />
                  <meshStandardMaterial
                    color={playerColor}
                    emissive={
                      floatInfo.status === "moving" ||
                      floatInfo.status === "biting"
                        ? playerColor
                        : "#000000"
                    }
                    emissiveIntensity={
                      floatInfo.status === "moving"
                        ? 0.3
                        : floatInfo.status === "biting"
                        ? 0.6
                        : 0
                    }
                  />
                </mesh>
              );
            }
            return null;
          })}

        {/* 投げられた浮きの表示（子ウィンドウ） */}
        {isChild &&
          Object.entries(receivedFloatStates).map(([playerId, floatState]) => {
            if (floatState && floatState.position) {
              const colors = ["#ff4444", "#44ff44", "#4444ff", "#ffff44"];
              const playerColor = colors[parseInt(playerId)] || "#ffffff";
              return (
                <mesh
                  key={`child-float-${playerId}`}
                  position={floatState.position}
                >
                  <boxGeometry args={[0.3, 0.3, 0.3]} />
                  <meshStandardMaterial
                    color={playerColor}
                    emissive={playerColor}
                    emissiveIntensity={0.3}
                  />
                </mesh>
              );
            }
            return null;
          })}
      </Canvas>

      {/* エラー表示 */}
      {lastError && !isChild && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            backgroundColor: "rgba(255, 0, 0, 0.8)",
            color: "white",
            padding: 10,
            borderRadius: 5,
            zIndex: 1000,
          }}
        >
          Error: {lastError}
        </div>
      )}

      {/* 操作説明 */}
      {!isChild && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: 15,
            borderRadius: 5,
            fontSize: 14,
            zIndex: 1000,
          }}
        >
          <div>🎮 Click cube to connect JoyCon</div>
          <div>🔄 Double-click to switch stick</div>
          <div>🕹️ Move stick to rotate cube</div>
          <div>🌀 Rotate stick clockwise to reel in float</div>
        </div>
      )}
    </>
  );
}
