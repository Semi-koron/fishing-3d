import React, { useState, useEffect, useCallback } from "react";

// Joy-Conのセンサーデータの型定義
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
    stick: boolean;
  };
  stick: {
    x: number;
    y: number;
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

  // Joy-Conのデータを解析する関数（標準フル入力レポート 0x30 に対応）
  const parseJoyConData = useCallback(
    (data: Uint8Array): JoyConSensorData | null => {
      if (data.length < 48) return null; // 48バイト必要
      console.log("Received data:", data);

      // レポートIDが0x30（標準フル入力レポート）であることを確認
      if (data[0] !== 0x30) {
        addLog(
          `未対応のレポートID: 0x${data[0].toString(16).padStart(2, "0")}`
        );
        return null;
      }

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
        const leftStickX = data[5] | ((data[6] & 0x0f) << 8);
        const leftStickY = (data[6] >> 4) | (data[7] << 4);

        // 右スティック (バイト 8-10)
        const rightStickX = data[8] | ((data[9] & 0x0f) << 8);
        const rightStickY = (data[9] >> 4) | (data[10] << 4);

        // スティックの値を-1.0から1.0に正規化（中央値約2048）
        const leftX = Math.max(-1, Math.min(1, (leftStickX - 2048) / 2048.0));
        const leftY = Math.max(-1, Math.min(1, (leftStickY - 2048) / 2048.0));
        const rightX = Math.max(-1, Math.min(1, (rightStickX - 2048) / 2048.0));
        const rightY = Math.max(-1, Math.min(1, (rightStickY - 2048) / 2048.0));

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
            home: !!(sharedButtons & 0x10), // HOME
            capture: !!(sharedButtons & 0x20), // Capture
            stick: !!(sharedButtons & 0x04) || !!(sharedButtons & 0x08), // スティック押し込み

            // 左Joy-Conのボタン (data[4])
            l: !!(leftButtons & 0x40), // L
            zl: !!(leftButtons & 0x80), // ZL
          },
          stick: {
            x: Math.round((leftX + rightX) * 50) / 100, // 左右スティックの平均
            y: Math.round((leftY + rightY) * 50) / 100,
          },
        };
      } catch (error) {
        addLog(`データ解析エラー: ${(error as Error).message}`);
        return null;
      }
    },
    [addLog]
  );

  // 🔌 接続処理
  const handleConnect = async () => {
    try {
      addLog("デバイスの選択を待っています...");
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 1406, productId: 8198 },
          { vendorId: 1406, productId: 8199 },
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
        // ここでボタン入力などを処理できます
        const { data } = event;
        const dataArray = new Uint8Array(data.buffer);

        // データを解析してセンサー値を取得
        const parsedData = parseJoyConData(dataArray);
        if (parsedData) {
          setSensorData(parsedData);
        }

        // 生データのログも残す（デバッグ用）
        // addLog(
        //   `入力レポート受信: [${Array.from(dataArray).join(", ")}]`
        // );
      };

      device.addEventListener("inputreport", handleInputReport);
      addLog("入力レポートの待機を開始しました。");

      // 🧹 クリーンアップ関数: コンポーネントのアンマウント時やdeviceが変わった時に実行
      return () => {
        device.removeEventListener("inputreport", handleInputReport);
        addLog("入力レポートの待機を停止しました。");
      };
    }
  }, [device, addLog, parseJoyConData]); // device stateが変更されたときにのみ、このeffectを実行

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h2>WebHID + React + Joy-Con Demo</h2>
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

      {/* センサーデータのリアルタイム表示 */}
      {device && sensorData && (
        <div style={{ marginTop: "20px" }}>
          <h3>📊 センサーデータ（リアルタイム）</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {/* 加速度センサー */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#2c5aa0" }}>
                🏃 加速度センサー (g)
              </h4>
              <div style={{ fontSize: "14px", fontFamily: "monospace" }}>
                <div>
                  X:{" "}
                  <span style={{ fontWeight: "bold", color: "#d63384" }}>
                    {sensorData.accelerometer.x.toFixed(3)}
                  </span>
                </div>
                <div>
                  Y:{" "}
                  <span style={{ fontWeight: "bold", color: "#198754" }}>
                    {sensorData.accelerometer.y.toFixed(3)}
                  </span>
                </div>
                <div>
                  Z:{" "}
                  <span style={{ fontWeight: "bold", color: "#0d6efd" }}>
                    {sensorData.accelerometer.z.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

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
            </div>

            {/* アナログスティック */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#2c5aa0" }}>
                🕹️ アナログスティック
              </h4>
              <div style={{ fontSize: "14px", fontFamily: "monospace" }}>
                <div>
                  X:{" "}
                  <span style={{ fontWeight: "bold", color: "#d63384" }}>
                    {sensorData.stick.x.toFixed(2)}
                  </span>
                </div>
                <div>
                  Y:{" "}
                  <span style={{ fontWeight: "bold", color: "#198754" }}>
                    {sensorData.stick.y.toFixed(2)}
                  </span>
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
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#dc3545",
                    borderRadius: "50%",
                    position: "absolute",
                    left: `${50 + sensorData.stick.x * 40}%`,
                    top: `${50 - sensorData.stick.y * 40}%`,
                    transform: "translate(-50%, -50%)",
                    transition: "all 0.1s ease",
                  }}
                ></div>
              </div>
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
              <h4 style={{ margin: "0 0 10px 0", color: "#2c5aa0" }}>
                🎮 ボタン状態
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "5px",
                  fontSize: "12px",
                }}
              >
                {Object.entries(sensorData.buttons).map(([key, pressed]) => (
                  <div
                    key={key}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: pressed ? "#28a745" : "#e9ecef",
                      color: pressed ? "white" : "#495057",
                      textAlign: "center",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {key}
                  </div>
                ))}
              </div>
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
