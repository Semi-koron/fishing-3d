/// <reference types="w3c-web-hid" />
import React, { useState, useEffect, useCallback } from "react";

// スティックの方向を表す型
type StickDirection =
  | "neutral" // 無方向（中心）
  | "up" // 上
  | "up-right" // 右上
  | "right" // 右
  | "down-right" // 右下
  | "down" // 下
  | "down-left" // 左下
  | "left" // 左
  | "up-left"; // 左上

// Joy-Conのセンサーデータの型定義（修正版）
interface JoyConSensorData {
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope: {
    x: number;
    y: number;
    z: number;
  };
  buttons: {
    a: boolean;
    b: boolean;
    x: boolean;
    y: boolean;
    l: boolean;
    r: boolean;
    zl: boolean;
    zr: boolean;
    plus: boolean;
    minus: boolean;
    home: boolean;
    capture: boolean;
    leftStick: boolean;
    rightStick: boolean;
    // 左Joy-Con固有のボタン
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  // 左右のスティックを分離
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
}

export const JoyConController: React.FC = () => {
  // 接続されたデバイスの状態を管理
  const [device, setDevice] = useState<HIDDevice | null>(null);
  // センサーデータの状態を管理
  const [sensorData, setSensorData] = useState<JoyConSensorData | null>(null);
  // コントローラーからのログを管理
  const [log, setLog] = useState<string[]>([]);

  // ログを追加するヘルパー関数
  const addLog = useCallback((message: string) => {
    console.log(message);
    setLog((prev) => [...prev.slice(-10), message]); // 最新10件のみ保持
  }, []);

  // アナログスティックの値を正規化する関数
  const normalizeStick = useCallback(
    (rawValue: number, center: number = 2048, deadzone: number = 150) => {
      const offset = rawValue - center;

      // デッドゾーン処理
      if (Math.abs(offset) < deadzone) {
        return 0;
      }

      // -1から1の範囲に正規化
      if (offset > 0) {
        // 正の方向（4095まで）
        const maxRange = 4095 - center - deadzone;
        return Math.min(1, (offset - deadzone) / maxRange);
      } else {
        // 負の方向（0まで）
        const minRange = center - deadzone;
        return Math.max(-1, (offset + deadzone) / minRange);
      }
    },
    []
  );

  // スティックの方向を8方向+無方向で判定する関数
  const getStickDirection = useCallback(
    (x: number, y: number, threshold: number = 0.3): StickDirection => {
      // 閾値以下なら無方向（中心）
      if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
        return "neutral";
      }

      // 角度を計算（atan2は-π～πの範囲）
      const angle = Math.atan2(y, x);
      // 度数に変換（0～360度）
      const degrees = ((angle * 180) / Math.PI + 360) % 360;

      // 8方向に分割（各45度）
      // 上を0度として時計回りに判定
      const adjustedDegrees = (90 - degrees + 360) % 360;

      if (adjustedDegrees >= 337.5 || adjustedDegrees < 22.5) {
        return "up";
      } else if (adjustedDegrees >= 22.5 && adjustedDegrees < 67.5) {
        return "up-right";
      } else if (adjustedDegrees >= 67.5 && adjustedDegrees < 112.5) {
        return "right";
      } else if (adjustedDegrees >= 112.5 && adjustedDegrees < 157.5) {
        return "down-right";
      } else if (adjustedDegrees >= 157.5 && adjustedDegrees < 202.5) {
        return "down";
      } else if (adjustedDegrees >= 202.5 && adjustedDegrees < 247.5) {
        return "down-left";
      } else if (adjustedDegrees >= 247.5 && adjustedDegrees < 292.5) {
        return "left";
      } else {
        return "up-left";
      }
    },
    []
  );

  // Joy-Conのデータを解析する関数（標準フル入力レポート 0x30 に対応）
  const parseJoyConData = useCallback(
    (data: Uint8Array): JoyConSensorData | null => {
      if (data.length < 48) return null; // 48バイト必要
      console.log("Received data:", data);

      try {
        // 一般情報
        const timer = data[0]; // タイマー（0-255の循環）
        const batteryConnection = data[1]; // バッテリー・接続情報

        // バッテリー残量（上位4ビット）
        const batteryLevel = (batteryConnection >> 4) & 0x0f;
        addLog(`タイマー: ${timer}, バッテリー: ${batteryLevel}/8`);

        // ボタンデータの解析（正しいバイト位置）
        const rightButtons = data[2]; // 右Joy-Conのボタン (Y,X,B,A,SR,SL,R,ZR)
        const sharedButtons = data[3]; // 中央のボタン (-,+,Rstick,Lstick,HOME,Capture)
        const leftButtons = data[4]; // 左Joy-Conのボタン (Down,Up,Right,Left,SR,SL,L,ZL)

        // アナログスティックの解析
        // 左スティック (バイト 5-7)
        const leftStickXRaw = data[5] | ((data[6] & 0x0f) << 8);
        const leftStickYRaw = (data[6] >> 4) | (data[7] << 4);

        // 右スティック (バイト 8-10)
        const rightStickXRaw = data[8] | ((data[9] & 0x0f) << 8);
        const rightStickYRaw = (data[9] >> 4) | (data[10] << 4);

        // スティックの値を正規化
        const leftStickX = normalizeStick(leftStickXRaw);
        const leftStickY = normalizeStick(leftStickYRaw);
        const rightStickX = normalizeStick(rightStickXRaw);
        const rightStickY = normalizeStick(rightStickYRaw);

        // 方向を判定
        const leftStickDirection = getStickDirection(leftStickX, leftStickY);
        const rightStickDirection = getStickDirection(rightStickX, rightStickY);

        // 6軸モーションセンサーの解析（最初のセット：バイト11-22を使用）
        // 加速度センサー (Accelerometer) - バイト 11-16
        const accelXRaw = data[11] | (data[12] << 8);
        const accelYRaw = data[13] | (data[14] << 8);
        const accelZRaw = data[15] | (data[16] << 8);

        // 16bitの符号付き整数に変換
        const accelX = accelXRaw > 32767 ? accelXRaw - 65536 : accelXRaw;
        const accelY = accelYRaw > 32767 ? accelYRaw - 65536 : accelYRaw;
        const accelZ = accelZRaw > 32767 ? accelZRaw - 65536 : accelZRaw;

        // ジャイロセンサー (Gyroscope) - バイト 17-22
        const gyroXRaw = data[17] | (data[18] << 8);
        const gyroYRaw = data[19] | (data[20] << 8);
        const gyroZRaw = data[21] | (data[22] << 8);

        // 16bitの符号付き整数に変換
        const gyroX = gyroXRaw > 32767 ? gyroXRaw - 65536 : gyroXRaw;
        const gyroY = gyroYRaw > 32767 ? gyroYRaw - 65536 : gyroYRaw;
        const gyroZ = gyroZRaw > 32767 ? gyroZRaw - 65536 : gyroZRaw;

        return {
          accelerometer: {
            x: accelX * 0.000244, // Joy-Conの加速度スケール（約4G範囲）
            y: accelY * 0.000244,
            z: accelZ * 0.000244,
          },
          gyroscope: {
            x: gyroX * 0.06103515625, // Joy-Conのジャイロスケール（度/秒）
            y: gyroY * 0.06103515625,
            z: gyroZ * 0.06103515625,
          },
          buttons: {
            // 右Joy-Conのボタン (data[2])
            a: !!(rightButtons & 0x01), // A
            b: !!(rightButtons & 0x02), // B
            x: !!(rightButtons & 0x04), // X
            y: !!(rightButtons & 0x08), // Y
            r: !!(rightButtons & 0x40), // R
            zr: !!(rightButtons & 0x80), // ZR

            // 中央のボタン (data[3])
            minus: !!(sharedButtons & 0x01), // -
            plus: !!(sharedButtons & 0x02), // +
            rightStick: !!(sharedButtons & 0x04), // 右スティック押し込み
            leftStick: !!(sharedButtons & 0x08), // 左スティック押し込み
            home: !!(sharedButtons & 0x10), // HOME
            capture: !!(sharedButtons & 0x20), // Capture

            // 左Joy-Conのボタン (data[4])
            down: !!(leftButtons & 0x01), // Down
            up: !!(leftButtons & 0x02), // Up
            right: !!(leftButtons & 0x04), // Right
            left: !!(leftButtons & 0x08), // Left
            l: !!(leftButtons & 0x40), // L
            zl: !!(leftButtons & 0x80), // ZL
          },
          // 左右のスティックを分離
          leftStick: {
            x: leftStickX,
            y: leftStickY,
            rawX: leftStickXRaw,
            rawY: leftStickYRaw,
            direction: leftStickDirection,
          },
          rightStick: {
            x: rightStickX,
            y: rightStickY,
            rawX: rightStickXRaw,
            rawY: rightStickYRaw,
            direction: rightStickDirection,
          },
        };
      } catch (error) {
        addLog(`データ解析エラー: ${(error as Error).message}`);
        return null;
      }
    },
    [addLog, normalizeStick, getStickDirection]
  );

  // 🔌 接続処理
  const handleConnect = async () => {
    try {
      addLog("デバイスの選択を待っています...");
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 1406, productId: 8198 }, // 左Joy-Con
          { vendorId: 1406, productId: 8199 }, // 右Joy-Con
          { vendorId: 1406, productId: 8201 }, // Pro Controller
        ],
      });

      const selectedDevice = devices[0];
      if (!selectedDevice) {
        addLog("デバイスが選択されませんでした。");
        return;
      }

      await selectedDevice.open();
      setDevice(selectedDevice);
      addLog(`接続成功: ${selectedDevice.productName}`);
    } catch (error) {
      addLog(`エラー: ${(error as Error).message}`);
    }
  };

  // 🔌 切断処理
  const handleDisconnect = async () => {
    if (device) {
      await device.close();
      setDevice(null);
      setSensorData(null);
      addLog("デバイスを切断しました。");
    }
  };

  // 振動コマンドを送信する例
  const sendRumble = async () => {
    if (!device) {
      addLog("デバイスが接続されていません。");
      return;
    }
    // 簡単な振動コマンドのデータ (1秒間、弱い振動)
    const command = new Uint8Array([
      0x01, // Report ID
      0x00,
      0x01,
      0x40,
      0x40,
      0x00,
      0x01,
      0x40,
      0x40, // Rumble data
    ]);

    try {
      await device.sendReport(command[0], command.slice(1));
      addLog("振動コマンドを送信しました。");
    } catch (error) {
      addLog(`コマンド送信エラー: ${(error as Error).message}`);
    }
  };

  // 👂 イベントリスナーの登録と解除
  useEffect(() => {
    if (device) {
      const handleInputReport = (event: HIDInputReportEvent) => {
        const { data } = event;
        const dataArray = new Uint8Array(data.buffer);

        // データを解析してセンサー値を取得
        const parsedData = parseJoyConData(dataArray);
        if (parsedData) {
          setSensorData(parsedData);
        }
      };

      device.addEventListener("inputreport", handleInputReport);
      addLog("入力レポートの待機を開始しました。");

      // 🧹 クリーンアップ関数: コンポーネントのアンマウント時やdeviceが変わった時に実行
      return () => {
        device.removeEventListener("inputreport", handleInputReport);
        addLog("入力レポートの待機を停止しました。");
      };
    }
  }, [device, addLog, parseJoyConData]);

  // 方向表示の色とアイコンを取得する関数
  const getDirectionStyle = (direction: StickDirection) => {
    const styles = {
      neutral: { color: "#6c757d", icon: "●", name: "中心" },
      up: { color: "#0d6efd", icon: "↑", name: "上" },
      "up-right": { color: "#6610f2", icon: "↗", name: "右上" },
      right: { color: "#dc3545", icon: "→", name: "右" },
      "down-right": { color: "#fd7e14", icon: "↘", name: "右下" },
      down: { color: "#ffc107", icon: "↓", name: "下" },
      "down-left": { color: "#198754", icon: "↙", name: "左下" },
      left: { color: "#20c997", icon: "←", name: "左" },
      "up-left": { color: "#0dcaf0", icon: "↖", name: "左上" },
    };
    return styles[direction];
  };

  // 加速度センサーの3Dビジュアル表示コンポーネント
  const AccelerometerVisualizer = ({
    accelerometer,
  }: {
    accelerometer: { x: number; y: number; z: number };
  }) => {
    // 加速度値を色の強度に変換（-4g〜+4gの範囲を想定）
    const getIntensityColor = (value: number) => {
      const intensity = Math.min(1, Math.abs(value) / 2); // 2gを最大強度とする
      const hue = value >= 0 ? 120 : 0; // 正の値は緑、負の値は赤
      return `hsla(${hue}, 70%, 50%, ${intensity})`;
    };

    // 3D表示用のキューブ
    const cubeSize = 80;
    const tiltX = accelerometer.y * 30; // X軸周りの回転（ピッチ）
    const tiltZ = accelerometer.x * 30; // Z軸周りの回転（ロール）

    return (
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#2c5aa0" }}>
          📱 加速度センサー (g)
        </h4>
        
        {/* 数値表示 */}
        <div style={{ fontSize: "14px", fontFamily: "monospace", marginBottom: "15px" }}>
          <div>
            X:{" "}
            <span style={{ fontWeight: "bold", color: getIntensityColor(accelerometer.x) }}>
              {accelerometer.x.toFixed(3)}
            </span>
          </div>
          <div>
            Y:{" "}
            <span style={{ fontWeight: "bold", color: getIntensityColor(accelerometer.y) }}>
              {accelerometer.y.toFixed(3)}
            </span>
          </div>
          <div>
            Z:{" "}
            <span style={{ fontWeight: "bold", color: getIntensityColor(accelerometer.z) }}>
              {accelerometer.z.toFixed(3)}
            </span>
          </div>
        </div>

        {/* 3Dキューブ表示 */}
        <div style={{ display: "flex", justifyContent: "center", perspective: "200px" }}>
          <div
            style={{
              width: `${cubeSize}px`,
              height: `${cubeSize}px`,
              backgroundColor: "#4a90e2",
              border: "2px solid #357abd",
              borderRadius: "8px",
              transform: `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)`,
              transition: "transform 0.1s ease",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
              color: "white",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            Joy-Con
            {/* 上面表示 */}
            <div
              style={{
                position: "absolute",
                top: "-2px",
                left: "-2px",
                width: `${cubeSize}px`,
                height: `${cubeSize}px`,
                backgroundColor: "#5ba0f2",
                border: "2px solid #357abd",
                borderRadius: "8px",
                transform: "rotateX(90deg) translateZ(40px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "white",
              }}
            >
              TOP
            </div>
          </div>
        </div>

        {/* 方向インジケーター */}
        <div style={{ marginTop: "15px" }}>
          <div style={{ textAlign: "center", fontSize: "12px", color: "#666" }}>
            <div>前後傾斜: {tiltX.toFixed(1)}°</div>
            <div>左右傾斜: {tiltZ.toFixed(1)}°</div>
          </div>
          
          {/* XYZ軸の強度バー */}
          <div style={{ marginTop: "10px" }}>
            {["X", "Y", "Z"].map((axis, index) => {
              const value = [accelerometer.x, accelerometer.y, accelerometer.z][index];
              const width = Math.min(100, Math.abs(value) * 25); // 4gで100%
              return (
                <div key={axis} style={{ marginBottom: "5px" }}>
                  <div style={{ fontSize: "11px", marginBottom: "2px" }}>
                    {axis}軸: {value.toFixed(2)}g
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "#eee",
                      borderRadius: "4px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${width}%`,
                        height: "100%",
                        backgroundColor: getIntensityColor(value),
                        borderRadius: "4px",
                        transition: "width 0.1s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // スティックの視覚表示コンポーネント
  const StickVisualizer = ({
    stick,
    title,
  }: {
    stick: {
      x: number;
      y: number;
      rawX: number;
      rawY: number;
      direction: StickDirection;
    };
    title: string;
  }) => {
    const directionStyle = getDirectionStyle(stick.direction);

    return (
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#2c5aa0" }}>🕹️ {title}</h4>
        <div style={{ fontSize: "14px", fontFamily: "monospace" }}>
          <div>
            X:{" "}
            <span style={{ fontWeight: "bold", color: "#d63384" }}>
              {stick.x.toFixed(3)}
            </span>{" "}
            (生値: {stick.rawX})
          </div>
          <div>
            Y:{" "}
            <span style={{ fontWeight: "bold", color: "#198754" }}>
              {stick.y.toFixed(3)}
            </span>{" "}
            (生値: {stick.rawY})
          </div>
          <div
            style={{
              marginTop: "8px",
              padding: "8px",
              backgroundColor: "#fff",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px", color: directionStyle.color }}>
              {directionStyle.icon}
            </span>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: directionStyle.color,
              }}
            >
              {directionStyle.name}
            </div>
          </div>
        </div>
        {/* スティックの視覚的表示 */}
        <div
          style={{
            width: "100px",
            height: "100px",
            border: "2px solid #ccc",
            borderRadius: "50%",
            position: "relative",
            margin: "10px auto",
            backgroundColor: "#fff",
          }}
        >
          {/* 中心十字線 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "0",
              width: "1px",
              height: "100%",
              backgroundColor: "#ddd",
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "0",
              top: "50%",
              width: "100%",
              height: "1px",
              backgroundColor: "#ddd",
              transform: "translateY(-50%)",
            }}
          />
          {/* 8方向の目盛り */}
          {[
            "up",
            "up-right",
            "right",
            "down-right",
            "down",
            "down-left",
            "left",
            "up-left",
          ].map((dir, index) => {
            const angle = index * 45;
            const isCurrentDirection = stick.direction === dir;
            return (
              <div
                key={dir}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "2px",
                  height: "15px",
                  backgroundColor: isCurrentDirection
                    ? directionStyle.color
                    : "#ccc",
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-35px)`,
                  transformOrigin: "center bottom",
                }}
              />
            );
          })}
          {/* スティック位置 */}
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: directionStyle.color,
              borderRadius: "50%",
              position: "absolute",
              left: `${50 + stick.x * 40}%`,
              top: `${50 - stick.y * 40}%`,
              transform: "translate(-50%, -50%)",
              transition: "all 0.1s ease",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h2>WebHID + React + Joy-Con Demo (改良版)</h2>
      {device ? (
        <div>
          <p>
            ✅ 接続中: <strong>{device.productName}</strong>
          </p>
          <button onClick={handleDisconnect}>切断</button>
          <button onClick={sendRumble} style={{ marginLeft: "8px" }}>
            振動させる
          </button>
        </div>
      ) : (
        <div>
          <p>❌ 未接続</p>
          <button onClick={handleConnect}>Joy-Conに接続</button>
        </div>
      )}

      {/* Joy-Con 全データ表示 */}
      {device && sensorData && (
        <div style={{ marginTop: "20px" }}>
          <h3>🎮 Joy-Con データ（リアルタイム）</h3>

          {/* メインセンサーセクション */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            {/* 加速度センサー（ビジュアル版） */}
            <AccelerometerVisualizer accelerometer={sensorData.accelerometer} />

            {/* ジャイロスコープ */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#2c5aa0" }}>
                🌀 ジャイロスコープ (°/s)
              </h4>
              <div style={{ fontSize: "14px", fontFamily: "monospace" }}>
                <div>
                  X:{" "}
                  <span style={{ fontWeight: "bold", color: "#d63384" }}>
                    {sensorData.gyroscope.x.toFixed(1)}
                  </span>
                </div>
                <div>
                  Y:{" "}
                  <span style={{ fontWeight: "bold", color: "#198754" }}>
                    {sensorData.gyroscope.y.toFixed(1)}
                  </span>
                </div>
                <div>
                  Z:{" "}
                  <span style={{ fontWeight: "bold", color: "#0d6efd" }}>
                    {sensorData.gyroscope.z.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {/* ジャイロ回転視覚化 */}
              <div style={{ marginTop: "15px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                  回転速度可視化
                </div>
                {["X", "Y", "Z"].map((axis, index) => {
                  const value = [sensorData.gyroscope.x, sensorData.gyroscope.y, sensorData.gyroscope.z][index];
                  const rotation = Math.min(180, Math.abs(value) * 2); // 90°/sで180度回転
                  const color = ["#d63384", "#198754", "#0d6efd"][index];
                  
                  return (
                    <div key={axis} style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: "11px", marginBottom: "3px" }}>
                        {axis}軸回転: {value.toFixed(1)}°/s
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            border: `3px solid ${color}`,
                            borderRadius: "50%",
                            borderTopColor: "transparent",
                            transform: `rotate(${rotation}deg)`,
                            transition: "transform 0.1s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* スティックセクション */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            {/* 左アナログスティック */}
            <StickVisualizer
              stick={sensorData.leftStick}
              title="左スティック"
            />

            {/* 右アナログスティック */}
            <StickVisualizer
              stick={sensorData.rightStick}
              title="右スティック"
            />
          </div>

          {/* ボタン状態 */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "15px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#2c5aa0" }}>
              🎮 ボタン状態
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              {Object.entries(sensorData.buttons).map(([key, pressed]) => (
                <div
                  key={key}
                  style={{
                    padding: "10px 6px",
                    borderRadius: "6px",
                    backgroundColor: pressed ? "#28a745" : "#e9ecef",
                    color: pressed ? "white" : "#495057",
                    textAlign: "center",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    border: pressed
                      ? "2px solid #1e7e34"
                      : "2px solid #dee2e6",
                    transition: "all 0.1s ease",
                    transform: pressed ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {key}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <h3>📝 システムログ</h3>
      <pre
        style={{
          background: "#f4f4f4",
          border: "1px solid #ddd",
          padding: "10px",
          height: "150px",
          overflowY: "scroll",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontSize: "12px",
        }}
      >
        {log.join("\n")}
      </pre>
    </div>
  );
};
