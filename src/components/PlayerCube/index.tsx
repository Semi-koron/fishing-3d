import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { JoyConPlayer } from "../../hooks/useJoycon";
import type { Float } from "../../types/float";
import FloatModel from "../Float";

interface PlayerCubeProps {
  player: JoyConPlayer;
  position: [number, number, number];
  playerId: number;
  onConnect: (id: number) => void;
  onToggleStick: (id: number) => void;
  floatInfo: Float | null;
  onCastFloat: (playerId: number, direction: number, power: number) => void;
}

export const PlayerCube = ({
  player,
  position,
  playerId,
  onConnect,
  onToggleStick,
  floatInfo,
  onCastFloat,
}: PlayerCubeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const colors = ["#ff4444", "#44ff44", "#4444ff", "#ffff44"];
  const [isZlPressed, setIsZlPressed] = useState(false);
  const [isZrPressed, setIsZrPressed] = useState(false);
  const [zlStartTime, setZlStartTime] = useState<number | null>(null);
  const [zrStartTime, setZrStartTime] = useState<number | null>(null);

  // ZL/ZRボタンの状態監視
  useEffect(() => {
    if (!player.isConnected || !player.data) return;

    const isZlCurrentlyPressed = player.data.buttons.zl;
    const isZrCurrentlyPressed = player.data.buttons.zr;
    const currentTime = Date.now();

    // ZLボタンの処理（左コントローラー）
    if (isZlCurrentlyPressed && !isZlPressed) {
      setIsZlPressed(true);
      setZlStartTime(currentTime);
    } else if (!isZlCurrentlyPressed && isZlPressed) {
      setIsZlPressed(false);

      if (floatInfo?.status === "idle" && zlStartTime) {
        const power = Math.abs(player.data.accelerometer.x);
        const direction = ((player.rotation || 0) * Math.PI) / 180;
        onCastFloat(playerId, direction, power);
      }
      setZlStartTime(null);
    }

    // ZRボタンの処理（右コントローラー）
    if (isZrCurrentlyPressed && !isZrPressed) {
      setIsZrPressed(true);
      setZrStartTime(currentTime);
    } else if (!isZrCurrentlyPressed && isZrPressed) {
      setIsZrPressed(false);

      if (floatInfo?.status === "idle" && zrStartTime) {
        const power = Math.abs(player.data.accelerometer.x);
        const direction = ((player.rotation || 0) * Math.PI) / 180;
        onCastFloat(playerId, direction, power);
      }
      setZrStartTime(null);
    }
  }, [
    player.data?.buttons.zl,
    player.data?.buttons.zr,
    player.isConnected,
    player.data,
    isZlPressed,
    isZrPressed,
    player.useRightStick,
    floatInfo?.status,
    zlStartTime,
    zrStartTime,
    player.rotation,
    playerId,
    onCastFloat,
  ]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = ((player.rotation || 0) * Math.PI) / 180;
    }
  });

  // 浮きの位置計算（プレイヤーキューブの前方2.5単位）
  const floatPosition: [number, number, number] = [
    position[0] + Math.cos(((player.rotation || 0) * Math.PI) / 180) * 2.5,
    position[1] + Math.sin(((player.rotation || 0) * Math.PI) / 180) * 2.5,
    position[2],
  ];

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
      {/* チャージ中の表示 */}
      {(isZlPressed || isZrPressed) && floatInfo?.status === "idle" && (
        <Text
          position={[0, 1, 0.6]}
          fontSize={0.15}
          color="red"
          anchorX="center"
          anchorY="middle"
        >
          Charging... {isZrPressed ? "(ZR)" : "(ZL)"}
        </Text>
      )}

      {/* デバイス情報表示 */}
      {player.isConnected && (
        <Text
          position={[0, -0.5, 0.6]}
          fontSize={0.1}
          color="yellow"
          anchorX="center"
          anchorY="middle"
        >
          {player.deviceType === "left"
            ? "Left Joy-Con (ZL)"
            : player.deviceType === "right"
            ? "Right Joy-Con (ZR)"
            : player.deviceType === "pro"
            ? "Pro Controller"
            : player.useRightStick
            ? "Right Stick"
            : "Left Stick"}
        </Text>
      )}

      {/* 方向矢印 */}
      {/* {hasLeftRightInput && currentDirection && (
        <group position={[0, 0, 0.8]}>
          <mesh rotation={[0, 0, currentDirection === "right" ? 0 : Math.PI]}>
            <coneGeometry args={[0.1, 0.3, 3]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>
      )} */}
    </group>
  );
};
