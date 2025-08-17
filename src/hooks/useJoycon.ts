/// <reference types="w3c-web-hid" />
import { useState, useEffect, useRef, useCallback } from "react";

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
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  accelerometerSamples: Array<{ x: number; y: number; z: number }>;
  gyroscopeSamples: Array<{ x: number; y: number; z: number }>;
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
  batteryLevel: number;
  timer: number;
}

interface JoyConPlayer {
  id: number;
  isConnected: boolean;
  deviceName: string | null;
  data: JoyConSensorData | null;
  device: HIDDevice | null;
  rotation: number;
  useRightStick: boolean;
}

export function useJoyCon() {
  const [players, setPlayers] = useState<JoyConPlayer[]>(() => 
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      isConnected: false,
      deviceName: null,
      data: null,
      device: null,
      rotation: 0,
      useRightStick: false,
    }))
  );
  const [lastError, setLastError] = useState<string | null>(null);

  // int16変換
  const int16 = (n: number) => (n > 0x7fff ? n - 0x10000 : n);

  // 加速度/ジャイロ変換（aka256式）
  const convertAccelerometer = (x: number, y: number, z: number) => ({
    x: int16(x) * 0.000244,
    y: int16(y) * 0.000244,
    z: int16(z) * 0.000244,
  });
  const convertGyroscope = (x: number, y: number, z: number) => ({
    x: int16(x) * 0.06103,
    y: int16(y) * 0.06103,
    z: int16(z) * 0.06103,
  });

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

  // Joy-Con標準レポート解析（aka256式）
  const parseReport = (data: Uint8Array): JoyConSensorData | null => {
    if (data.length < 48) return null;
    const timer = data[0];
    const batteryLevel = (data[1] >> 4) & 0x0f;
    const rightButtons = data[2],
      sharedButtons = data[3],
      leftButtons = data[4];
    const leftStickXRaw = data[5] | ((data[6] & 0x0f) << 8);
    const leftStickYRaw = (data[6] >> 4) | (data[7] << 4);
    const rightStickXRaw = data[8] | ((data[9] & 0x0f) << 8);
    const rightStickYRaw = (data[9] >> 4) | (data[10] << 4);

    // スティック正規化（aka256は生値中心2048・4095両端で±1に正規化）
    const norm = (raw: number) =>
      Math.max(-1, Math.min(1, (raw - 2048) / 2048));
    const leftStickNorm = { x: norm(leftStickXRaw), y: norm(leftStickYRaw) };
    const rightStickNorm = { x: norm(rightStickXRaw), y: norm(rightStickYRaw) };

    // ボタン定義（aka256流）
    const buttons = {
      a: !!(rightButtons & 0x01),
      b: !!(rightButtons & 0x02),
      x: !!(rightButtons & 0x04),
      y: !!(rightButtons & 0x08),
      r: !!(rightButtons & 0x40),
      zr: !!(rightButtons & 0x80),
      minus: !!(sharedButtons & 0x01),
      plus: !!(sharedButtons & 0x02),
      rightStick: !!(sharedButtons & 0x04),
      leftStick: !!(sharedButtons & 0x08),
      home: !!(sharedButtons & 0x10),
      capture: !!(sharedButtons & 0x20),
      down: !!(leftButtons & 0x01),
      up: !!(leftButtons & 0x02),
      right: !!(leftButtons & 0x04),
      left: !!(leftButtons & 0x08),
      l: !!(leftButtons & 0x40),
      zl: !!(leftButtons & 0x80),
    };

    // 3サンプル解析
    const accelSamples = [];
    const gyroSamples = [];
    for (let i = 0; i < 3; i++) {
      const offset = 11 + i * 12;
      const ax = data[offset] | (data[offset + 1] << 8);
      const ay = data[offset + 2] | (data[offset + 3] << 8);
      const az = data[offset + 4] | (data[offset + 5] << 8);
      accelSamples.push(convertAccelerometer(ax, ay, az));
      const gx = data[offset + 6] | (data[offset + 7] << 8);
      const gy = data[offset + 8] | (data[offset + 9] << 8);
      const gz = data[offset + 10] | (data[offset + 11] << 8);
      gyroSamples.push(convertGyroscope(gx, gy, gz));
    }

    // aka256はサンプル0を代表値に
    return {
      accelerometer: accelSamples[0],
      gyroscope: gyroSamples[0],
      accelerometerSamples: accelSamples,
      gyroscopeSamples: gyroSamples,
      buttons,
      leftStick: {
        x: leftStickNorm.x,
        y: leftStickNorm.y,
        rawX: leftStickXRaw,
        rawY: leftStickYRaw,
        direction: getStickDirection(leftStickNorm.x, leftStickNorm.y),
      },
      rightStick: {
        x: rightStickNorm.x,
        y: rightStickNorm.y,
        rawX: rightStickXRaw,
        rawY: rightStickYRaw,
        direction: getStickDirection(rightStickNorm.x, rightStickNorm.y),
      },
      batteryLevel,
      timer,
    };
  };

  // Joy-Con接続
  const connect = useCallback(async (playerId: number) => {
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x057e, productId: 0x2006 }, // Joy-Con L
          { vendorId: 0x057e, productId: 0x2007 }, // Joy-Con R
          { vendorId: 0x057e, productId: 0x2009 }, // Pro Controller
        ],
      });
      const device = devices[0];
      if (!device) throw new Error("Joy-Conが選択されませんでした");
      await device.open();
      
      setPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { 
              ...player, 
              isConnected: true, 
              deviceName: device.productName || "Joy-Con",
              device 
            }
          : player
      ));
      setLastError(null);

      // 標準レポート・IMU有効化
      await device.sendReport(0x01, new Uint8Array([0x00, 0x03, 0x30]));
      await new Promise((r) => setTimeout(r, 100));
      await device.sendReport(0x01, new Uint8Array([0x00, 0x40, 0x01]));

      // イベントリスナー設定
      const handler = (event: HIDInputReportEvent) => {
        if (event.reportId === 0x30) {
          const arr = new Uint8Array(event.data.buffer);
          const parsed = parseReport(arr);
          if (parsed) {
            setPlayers(prev => prev.map(player => 
              player.id === playerId && player.device === device
                ? { 
                    ...player, 
                    data: parsed,
                    rotation: (() => {
                      const stick = player.useRightStick ? parsed.rightStick : parsed.leftStick;
                      const direction = stick.direction;
                      if (direction === "left" || direction === "right") {
                        return player.rotation + (direction === "right" ? 5 : -5);
                      }
                      return player.rotation;
                    })()
                  }
                : player
            ));
          }
        }
      };
      device.addEventListener("inputreport", handler);
    } catch (e: any) {
      setLastError(e.message);
    }
  }, []);

  // 切断
  const disconnect = useCallback(async (playerId: number) => {
    setPlayers(prev => prev.map(player => {
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
        };
      }
      return player;
    }));
    setLastError(null);
  }, []);


  // 振動
  const sendRumble = useCallback(async (playerId: number, duration: number = 500) => {
    const player = players.find(p => p.id === playerId);
    if (!player?.device) return;
    await player.device.sendReport(
      0x01,
      new Uint8Array([0x00, 0x48, 0x01])
    );
    setTimeout(() => {
      player.device?.sendReport(0x01, new Uint8Array([0x00, 0x48, 0x00]));
    }, duration);
  }, [players]);

  const toggleStick = useCallback((playerId: number) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, useRightStick: !player.useRightStick }
        : player
    ));
  }, []);

  return {
    players,
    lastError,
    connect,
    disconnect,
    sendRumble,
    toggleStick,
    // 追加ユーティリティ
    getPlayer: (playerId: number) => players.find(p => p.id === playerId),
    getPlayerData: (playerId: number) => players.find(p => p.id === playerId)?.data,
    getLeftStick: (playerId: number) => players.find(p => p.id === playerId)?.data?.leftStick,
    getRightStick: (playerId: number) => players.find(p => p.id === playerId)?.data?.rightStick,
    getAccelerometer: (playerId: number) => players.find(p => p.id === playerId)?.data?.accelerometer,
    getGyroscope: (playerId: number) => players.find(p => p.id === playerId)?.data?.gyroscope,
    getLeftStickDirection: (playerId: number) => players.find(p => p.id === playerId)?.data?.leftStick.direction ?? "neutral",
    getRightStickDirection: (playerId: number) => players.find(p => p.id === playerId)?.data?.rightStick.direction ?? "neutral",
    isButtonPressed: (playerId: number, btn: string) => players.find(p => p.id === playerId)?.data?.buttons[btn] ?? false,
  };
}
