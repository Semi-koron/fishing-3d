/// <reference types="w3c-web-hid" />
import { useState, useCallback, useEffect, useRef } from "react";

// Nintendo製品ID
export const NintendoVendorId = 0x057e;
export const JoyConLProductId = 0x2006;
export const JoyConRProductId = 0x2007;
export const ProConProductId = 0x2009;

// デフォルトランブルデータ
export const DefaultRumble = [0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40];

// スティックの方向型
export type StickDirection =
  | "neutral"
  | "up"
  | "up-right"
  | "right"
  | "down-right"
  | "down"
  | "down-left"
  | "left"
  | "up-left";

// Joy-Conのセンサーデータ型
export interface JoyConSensorData {
  timer: number;
  batteryLevel: number;
  buttons: { [key: string]: boolean };
  leftStick: {
    x: number;
    y: number;
    rawX: number;
    rawY: number;
    direction: StickDirection;
  };
  rightStick: {
    x: number;
    y: number;
    rawX: number;
    rawY: number;
    direction: StickDirection;
  };
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
}

export interface JoyConPlayer {
  id: number;
  isConnected: boolean;
  deviceName: string | null;
  data: JoyConSensorData | null;
  device: HIDDevice | null;
  rotation: number;
  useRightStick: boolean;
  deviceType: "left" | "right" | "pro" | null;
}

// パケット番号管理
let packetNum = 0;
const getPacketNum = () => packetNum++;

// Output Report送信
const sendOutputReport = async (
  device: HIDDevice,
  reportId: number,
  packetNumber: number,
  rumbleData: number[],
  ...args: number[]
) => {
  try {
    const data = new Uint8Array(49);
    data[0] = packetNumber & 0xff;

    // ランブルデータ
    for (let i = 0; i < 8; i++) {
      data[1 + i] = rumbleData[i] || 0;
    }

    // 追加引数
    for (let i = 0; i < args.length; i++) {
      data[9 + i] = args[i];
    }

    await device.sendReport(reportId, data);
  } catch (error) {
    console.error("Failed to write the report:", error);
    throw error;
  }
};

// スティック方向判定
const getStickDirection = (x: number, y: number): StickDirection => {
  const th = 0.4;
  if (Math.abs(x) < th && Math.abs(y) < th) return "neutral";
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  const deg = (angle + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return "right";
  if (deg >= 22.5 && deg < 67.5) return "up-right";
  if (deg >= 67.5 && deg < 112.5) return "up";
  if (deg >= 112.5 && deg < 157.5) return "up-left";
  if (deg >= 157.5 && deg < 202.5) return "left";
  if (deg >= 202.5 && deg < 247.5) return "down-left";
  if (deg >= 247.5 && deg < 292.5) return "down";
  if (deg >= 292.5 && deg < 337.5) return "down-right";
  return "neutral";
};

// Joy-Con標準レポート解析
const parseStandardReport = (data: Uint8Array): JoyConSensorData | null => {
  if (data.length < 48) return null;

  const timer = data[0];
  const batteryLevel = (data[1] >> 4) & 0x0f;

  // ボタン状態
  const rightButtons = data[2];
  const sharedButtons = data[3];
  const leftButtons = data[4];

  const buttons = {
    // 右ボタン
    a: !!(rightButtons & 0x08),
    b: !!(rightButtons & 0x04),
    x: !!(rightButtons & 0x02),
    y: !!(rightButtons & 0x01),
    r: !!(rightButtons & 0x40),
    zr: !!(rightButtons & 0x80),
    sr_r: !!(rightButtons & 0x10),
    sl_r: !!(rightButtons & 0x20),

    // 共有ボタン
    minus: !!(sharedButtons & 0x01),
    plus: !!(sharedButtons & 0x02),
    rightStick: !!(sharedButtons & 0x04),
    leftStick: !!(sharedButtons & 0x08),
    home: !!(sharedButtons & 0x10),
    capture: !!(sharedButtons & 0x20),

    // 左ボタン
    down: !!(leftButtons & 0x01),
    up: !!(leftButtons & 0x02),
    right: !!(leftButtons & 0x04),
    left: !!(leftButtons & 0x08),
    l: !!(leftButtons & 0x40),
    zl: !!(leftButtons & 0x80),
    sr_l: !!(leftButtons & 0x10),
    sl_l: !!(leftButtons & 0x20),
  };

  // スティックデータ
  const leftStickRawX = data[5] | ((data[6] & 0x0f) << 8);
  const leftStickRawY = (data[6] >> 4) | (data[7] << 4);
  const rightStickRawX = data[8] | ((data[9] & 0x0f) << 8);
  const rightStickRawY = (data[9] >> 4) | (data[10] << 4);

  // スティック正規化 (中心値2048として-1〜1に正規化)
  const normalizeStick = (raw: number) =>
    Math.max(-1, Math.min(1, (raw - 2048) / 2048));

  const leftStickNorm = {
    x: normalizeStick(leftStickRawX),
    y: normalizeStick(leftStickRawY),
  };

  const rightStickNorm = {
    x: normalizeStick(rightStickRawX),
    y: normalizeStick(rightStickRawY),
  };

  // IMUデータ（最初のサンプルのみ使用）
  const accelX = (data[12] | (data[13] << 8)) - 350;
  const accelY = (data[14] | (data[15] << 8)) - 0;
  const accelZ = (data[16] | (data[17] << 8)) - 4081;

  const gyroX = data[18] | (data[19] << 8);
  const gyroY = data[20] | (data[21] << 8);
  const gyroZ = data[22] | (data[23] << 8);

  // 符号付き16bit整数に変換
  const int16 = (n: number) => (n > 0x7fff ? n - 0x10000 : n);

  return {
    timer,
    batteryLevel,
    buttons,
    leftStick: {
      x: leftStickNorm.x,
      y: leftStickNorm.y,
      rawX: leftStickRawX,
      rawY: leftStickRawY,
      direction: getStickDirection(leftStickNorm.x, leftStickNorm.y),
    },
    rightStick: {
      x: rightStickNorm.x,
      y: rightStickNorm.y,
      rawX: rightStickRawX,
      rawY: rightStickRawY,
      direction: getStickDirection(rightStickNorm.x, rightStickNorm.y),
    },
    accelerometer: {
      x: int16(accelX) * 0.000244,
      y: int16(accelY) * 0.000244,
      z: int16(accelZ) * 0.000244,
    },
    gyroscope: {
      x: int16(gyroX) * 0.06103,
      y: int16(gyroY) * 0.06103,
      z: int16(gyroZ) * 0.06103,
    },
  };
};

export function useJoyCon(floatStates?: (string | null)[]) {
  const [players, setPlayers] = useState<JoyConPlayer[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      isConnected: false,
      deviceName: null,
      data: null,
      device: null,
      rotation: 0,
      useRightStick: false,
      deviceType: null,
    }))
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const floatStatesRef = useRef<(string | null)[]>(floatStates || []);

  // floatStatesが更新されたらrefも更新
  useEffect(() => {
    floatStatesRef.current = floatStates || [];
  }, [floatStates]);

  // Joy-Con接続
  const connect = useCallback(async (playerId: number) => {
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: NintendoVendorId, productId: JoyConLProductId },
          { vendorId: NintendoVendorId, productId: JoyConRProductId },
          { vendorId: NintendoVendorId, productId: ProConProductId },
        ],
      });

      const device = devices[0];
      if (!device) throw new Error("Joy-Conが選択されませんでした");

      await device.open();

      // デバイスタイプを判定
      let deviceType: "left" | "right" | "pro" | null = null;
      let useRightStick = false;
      
      if (device.productId === JoyConLProductId) {
        deviceType = "left";
        useRightStick = false; // 左Joy-Conは左スティック使用
      } else if (device.productId === JoyConRProductId) {
        deviceType = "right";
        useRightStick = true; // 右Joy-Conは右スティック使用
      } else if (device.productId === ProConProductId) {
        deviceType = "pro";
        useRightStick = false; // Pro Controllerはデフォルトで左スティック
      }

      setPlayers((prev) =>
        prev.map((player) =>
          player.id === playerId
            ? {
                ...player,
                isConnected: true,
                deviceName: device.productName || "Joy-Con",
                device,
                deviceType,
                useRightStick,
              }
            : player
        )
      );
      setLastError(null);

      // 標準入力レポートモードに設定
      try {
        await sendOutputReport(
          device,
          0x01,
          getPacketNum(),
          DefaultRumble,
          0x03,
          0x30
        );
        await new Promise((r) => setTimeout(r, 100));

        // IMU有効化
        await sendOutputReport(
          device,
          0x01,
          getPacketNum(),
          DefaultRumble,
          0x40,
          0x01
        );
        await new Promise((r) => setTimeout(r, 100));

        // プレイヤーライト設定（プレイヤーIDに応じて）
        const lightValue = 1 << playerId;
        await sendOutputReport(
          device,
          0x01,
          getPacketNum(),
          DefaultRumble,
          0x30,
          lightValue
        );
      } catch (reportError) {
        console.warn("Output report failed, but continuing:", reportError);
        // 必須ではないので継続
      }

      // イベントリスナー設定
      const handler = (event: HIDInputReportEvent) => {
        if (event.reportId === 0x30) {
          const arr = new Uint8Array(event.data.buffer);
          const parsed = parseStandardReport(arr);
          if (parsed) {
            setPlayers((prev) =>
              prev.map((player) =>
                player.id === playerId && player.device === device
                  ? {
                      ...player,
                      data: parsed,
                      rotation: (() => {
                        // 浮きがidleの時のみ回転を許可
                        const currentFloatState = floatStatesRef.current[playerId] || "idle";
                        if (currentFloatState !== "idle") {
                          return player.rotation;
                        }

                        // 左右スティックどちらからでも回転判定
                        const leftDirection = parsed.leftStick.direction;
                        const rightDirection = parsed.rightStick.direction;
                        
                        // 左スティックの方向をチェック
                        if (leftDirection === "left" || leftDirection === "right") {
                          return (
                            player.rotation + (leftDirection === "right" ? 5 : -5)
                          );
                        }
                        // 右スティックの方向をチェック
                        if (rightDirection === "left" || rightDirection === "right") {
                          return (
                            player.rotation + (rightDirection === "right" ? 5 : -5)
                          );
                        }
                        return player.rotation;
                      })(),
                    }
                  : player
              )
            );
          }
        }
      };

      device.addEventListener("inputreport", handler);

      // デバイス切断時の処理
      device.addEventListener("disconnect", () => {
        setPlayers((prev) =>
          prev.map((player) =>
            player.device === device
              ? {
                  ...player,
                  isConnected: false,
                  deviceName: null,
                  data: null,
                  device: null,
                  rotation: 0,
                  deviceType: null,
                }
              : player
          )
        );
      });
    } catch (e: any) {
      setLastError(e.message);
    }
  }, []);

  // 切断
  const disconnect = useCallback(async (playerId: number) => {
    setPlayers((prev) =>
      prev.map((player) => {
        if (player.id === playerId && player.device) {
          try {
            player.device.close();
          } catch {}
          return {
            ...player,
            isConnected: false,
            deviceName: null,
            data: null,
            device: null,
            rotation: 0,
            useRightStick: false,
            deviceType: null,
          };
        }
        return player;
      })
    );
    setLastError(null);
  }, []);

  // 振動
  const sendRumble = useCallback(
    async (playerId: number, duration: number = 500) => {
      const player = players.find((p) => p.id === playerId);
      if (!player?.device) return;

      try {
        // 振動開始
        await sendOutputReport(
          player.device,
          0x01,
          getPacketNum(),
          DefaultRumble,
          0x48,
          0x01
        );

        // 指定時間後に振動停止
        setTimeout(async () => {
          if (player.device) {
            try {
              await sendOutputReport(
                player.device,
                0x01,
                getPacketNum(),
                DefaultRumble,
                0x48,
                0x00
              );
            } catch (error) {
              console.warn("Failed to stop rumble:", error);
            }
          }
        }, duration);
      } catch (error) {
        console.error("Failed to start rumble:", error);
        setLastError(`振動の開始に失敗しました: ${error}`);
      }
    },
    [players]
  );

  // スティック切り替え
  const toggleStick = useCallback((playerId: number) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId
          ? { ...player, useRightStick: !player.useRightStick }
          : player
      )
    );
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      players.forEach((player) => {
        if (player.device && player.isConnected) {
          try {
            player.device.close();
          } catch {}
        }
      });
    };
  }, []);

  return {
    players,
    lastError,
    connect,
    disconnect,
    sendRumble,
    toggleStick,
    // ユーティリティ関数
    getPlayer: (playerId: number) => players.find((p) => p.id === playerId),
    getPlayerData: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data,
    getLeftStick: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data?.leftStick,
    getRightStick: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data?.rightStick,
    getAccelerometer: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data?.accelerometer,
    getGyroscope: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data?.gyroscope,
    getLeftStickDirection: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data?.leftStick.direction ??
      "neutral",
    getRightStickDirection: (playerId: number) =>
      players.find((p) => p.id === playerId)?.data?.rightStick.direction ??
      "neutral",
    isButtonPressed: (playerId: number, btn: string) =>
      players.find((p) => p.id === playerId)?.data?.buttons[btn] ?? false,
  };
}
