import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState, useCallback, useRef } from "react";
import CpuFish from "../../CpuFish";
import type { Float } from "../../../types/float";
import FloatModel from "../../Float";
import type { ObjectState } from "../../../types/multWindow";
import TestFish from "../../TestFish";
import type { Position } from "../../../types/three";
import { useJoyCon } from "../../../hooks/useJoycon";
import { Text } from "@react-three/drei";
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

const PlayerCube = ({
  player,
  position,
  playerId,
  onConnect,
  onToggleStick,
}: {
  player: any;
  position: [number, number, number];
  playerId: number;
  onConnect: (id: number) => void;
  onToggleStick: (id: number) => void;
}) => {
  const meshRef = useRef<any>();
  const colors = ["#ff4444", "#44ff44", "#4444ff", "#ffff44"];

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = ((player.rotation || 0) * Math.PI) / 180;
    }
  });

  const stick = player.useRightStick
    ? player.data?.rightStick
    : player.data?.leftStick;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => !player.isConnected && onConnect(playerId)}
        onDoubleClick={() => player.isConnected && onToggleStick(playerId)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={colors[playerId]}
          opacity={player.isConnected ? 1 : 0.5}
          transparent
        />
      </mesh>

      {/* プレイヤー番号 */}
      {/* <Text
        position={[0, 0, 0.6]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        P{playerId + 1}
      </Text> */}

      {/* 接続状態表示 */}
      {/* <Text
        position={[0, -0.3, 0.6]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {player.isConnected ? player.deviceName : "Click to Connect"}
      </Text> */}

      {/* スティック切り替え表示 */}
      {player.isConnected && (
        <Text
          position={[0, -0.5, 0.6]}
          fontSize={0.1}
          color="yellow"
          anchorX="center"
          anchorY="middle"
        >
          {player.useRightStick ? "Right Stick" : "Left Stick"}
        </Text>
      )}

      {/* 方向矢印 */}
      {stick && (stick.direction === "left" || stick.direction === "right") && (
        <group position={[0, 0, 0.8]}>
          <mesh rotation={[0, 0, stick.direction === "right" ? 0 : Math.PI]}>
            <coneGeometry args={[0.1, 0.3, 3]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default function Game() {
  const { players, connect, toggleStick, lastError } = useJoyCon();
  const [floatsInfo, setFloatsInfo] = useState<Float[]>([
    {
      status: "idle",
      position: { x: 3, y: 3, z: 0 },
      fishermanPosition: { x: 0, y: 0, z: 0 },
    },
  ]);
  const [receivedFishState, setReceivedFishState] =
    useState<ObjectState | null>(null);
  const [receivedFloatState, setReceivedFloatState] =
    useState<ObjectState | null>(null);
  const [markerPosition, setMarkerPosition] = useState<Position | null>(null);
  const [isQPressed, setIsQPressed] = useState(false);

  const handleCanvasClick = (event: any) => {
    // クリック位置にマーカーを設置
    setMarkerPosition([event.point.x, event.point.y, event.point.z]);
  };

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

  // qキー押下検知
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "q") {
        setIsQPressed(true);
        setFloatsInfo((prevFloats) => {
          return prevFloats.map((float) => ({
            status: "moving",
            position: { ...float.position },
            fishermanPosition: { ...float.fishermanPosition },
          }));
        });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "q") {
        setIsQPressed(false);
        setFloatsInfo((prevFloats) => {
          return prevFloats.map((float) => ({
            status: "float",
            position: { ...float.position },
            fishermanPosition: { ...float.fishermanPosition },
          }));
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // qキー押下中にfloatをマーカー位置へ移動
  useEffect(() => {
    if (!isQPressed || !markerPosition || floatsInfo.length === 0) return;

    const intervalId = setInterval(() => {
      setFloatsInfo((prevFloats) => {
        const updatedFloats = prevFloats.map((float) => {
          const currentPos = float.position;
          const targetPos = {
            x: markerPosition[0],
            y: markerPosition[1],
            z: markerPosition[2],
          };

          // 方向ベクトルを計算して正規化し、固定距離(0.1)だけ移動
          const direction = {
            x: targetPos.x - currentPos.x,
            y: targetPos.y - currentPos.y,
            z: targetPos.z - currentPos.z,
          };

          // ベクトルの長さを計算
          const length = Math.sqrt(
            direction.x * direction.x +
              direction.y * direction.y +
              direction.z * direction.z
          );

          // 長さが0の場合（同じ位置）は移動しない
          if (length === 0) return float;

          // 方向ベクトルを正規化
          const normalizedDirection = {
            x: direction.x / length,
            y: direction.y / length,
            z: direction.z / length,
          };

          // 固定距離(0.1)だけ移動
          const moveDistance = 0.1;
          const newPos = {
            x: currentPos.x + normalizedDirection.x * moveDistance,
            y: currentPos.y + normalizedDirection.y * moveDistance,
            z: currentPos.z + normalizedDirection.z * moveDistance,
          };

          return { ...float, position: newPos };
        });

        // childWindowにも状態を送信
        if (updatedFloats.length > 0) {
          childWindow?.postMessage({
            type: "FLOAT_STATE_UPDATE",
            objectState: {
              position: [
                updatedFloats[0].position.x,
                updatedFloats[0].position.y,
                updatedFloats[0].position.z,
              ],
              rotation: [0, 0, 0],
            },
          });
        }

        return updatedFloats;
      });
    }, 16); // 約60FPS

    return () => clearInterval(intervalId);
  }, [isQPressed, markerPosition, childWindow]);

  //マルチウィンドウの処理
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsChild(urlParams.get("child") === "true");

    const handleMessage = (event: MessageEvent) => {
      // 魚の状態を受信
      if (event.data.type === "OBJECT_STATE_UPDATE") {
        setReceivedFishState(event.data.objectState);
      }
      // 浮きの状態を受信
      if (event.data.type === "FLOAT_STATE_UPDATE") {
        setReceivedFloatState(event.data.objectState);
      }
      // カメラのオフセットを受信
      if (event.data.type === "CAMERA_OFFSET_UPDATE") {
        setReceivedCameraOffset(event.data.cameraOffset);
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

  const handleCameraOffsetChange = (newOffset: CameraOffset) => {
    console.log("Updating camera offset:", newOffset);
    setCameraOffset(newOffset);
    if (childWindow && !childWindow.closed) {
      const childOffset = {
        x: -newOffset.x,
        y: newOffset.y,
        z: newOffset.z,
      };
      childWindow.postMessage(
        {
          type: "CAMERA_OFFSET_UPDATE",
          cameraOffset: childOffset,
        },
        window.location.origin
      );
    }
  };

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
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <mesh onClick={handleCanvasClick} visible={false}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial />
        </mesh>
        {!isChild && (
          <CpuFish
            initialPosition={[0, 0, 0]}
            scale={1}
            animationName="swim"
            speed={1}
            handleFishStateChange={handleFishStateChange}
            floatsInfo={floatsInfo}
          />
        )}
        {isChild && receivedFishState && (
          <TestFish
            position={receivedFishState?.position}
            rotation={receivedFishState?.rotation}
          />
        )}

        {/* マーカーキューブの表示 */}
        {markerPosition && !isChild && (
          <mesh position={markerPosition}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshBasicMaterial color="red" transparent opacity={0.7} />
          </mesh>
        )}

        {isChild
          ? receivedFloatState && (
              <FloatModel
                position={receivedFloatState.position}
                rotation={[Math.PI / 2, 0, 0]}
              >
                {floatsInfo[0]?.status}
              </FloatModel>
            )
          : floatsInfo[0] && (
              <FloatModel
                position={[
                  floatsInfo[0].position.x,
                  floatsInfo[0].position.y,
                  floatsInfo[0].position.z,
                ]}
                rotation={[Math.PI / 2, 0, 0]}
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
              />
            );
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
        </div>
      )}
    </>
  );
}
