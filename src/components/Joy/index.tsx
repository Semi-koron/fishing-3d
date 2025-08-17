import { useJoyCon } from "../../hooks/useJoycon";

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

// 6軸センサーの詳細表示コンポーネント（3サンプル表示）
const SixAxisSensorDisplay = ({
  accelerometerSamples,
  gyroscopeSamples,
}: {
  accelerometerSamples: Array<{ x: number; y: number; z: number }>;
  gyroscopeSamples: Array<{ x: number; y: number; z: number }>;
}) => {
  const timeLabels = ["0ms", "5ms", "10ms"];

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "15px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h4 style={{ margin: "0 0 15px 0", color: "#2c5aa0" }}>
        📊 6-Axis Sensor
      </h4>

      {/* 加速度センサー 3サンプル */}
      <div style={{ marginBottom: "20px" }}>
        <h5 style={{ margin: "0 0 10px 0", color: "#d63384" }}>
          Accelerometer [G]
        </h5>
        {accelerometerSamples.map((sample, index) => (
          <div
            key={index}
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              marginBottom: "5px",
              padding: "5px",
              backgroundColor: "#fff",
              borderRadius: "4px",
              border: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
              ({timeLabels[index]})
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <span>X: {sample.x.toFixed(6)}</span>
              <span>Y: {sample.y.toFixed(6)}</span>
              <span>Z: {sample.z.toFixed(6)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ジャイロスコープ 3サンプル */}
      <div>
        <h5 style={{ margin: "0 0 10px 0", color: "#198754" }}>
          Gyroscope [dps]
        </h5>
        {gyroscopeSamples.map((sample, index) => (
          <div
            key={index}
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              marginBottom: "5px",
              padding: "5px",
              backgroundColor: "#fff",
              borderRadius: "4px",
              border: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
              ({timeLabels[index]})
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <span>X: {sample.x.toFixed(5)}</span>
              <span>Y: {sample.y.toFixed(5)}</span>
              <span>Z: {sample.z.toFixed(5)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
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

      {/* 数値表示 - aka256形式に合わせて精度向上 */}
      <div
        style={{
          fontSize: "14px",
          fontFamily: "monospace",
          marginBottom: "15px",
        }}
      >
        <div>
          X:{" "}
          <span
            style={{
              fontWeight: "bold",
              color: getIntensityColor(accelerometer.x),
            }}
          >
            {accelerometer.x.toFixed(6)}
          </span>
        </div>
        <div>
          Y:{" "}
          <span
            style={{
              fontWeight: "bold",
              color: getIntensityColor(accelerometer.y),
            }}
          >
            {accelerometer.y.toFixed(6)}
          </span>
        </div>
        <div>
          Z:{" "}
          <span
            style={{
              fontWeight: "bold",
              color: getIntensityColor(accelerometer.z),
            }}
          >
            {accelerometer.z.toFixed(6)}
          </span>
        </div>
      </div>

      {/* 3Dキューブ表示 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          perspective: "200px",
        }}
      >
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
            const value = [accelerometer.x, accelerometer.y, accelerometer.z][
              index
            ];
            const width = Math.min(100, Math.abs(value) * 25); // 4gで100%
            return (
              <div key={axis} style={{ marginBottom: "5px" }}>
                <div style={{ fontSize: "11px", marginBottom: "2px" }}>
                  {axis}軸: {value.toFixed(4)}g
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
            {stick.x.toFixed(6)}
          </span>{" "}
          (生値: {stick.rawX})
        </div>
        <div>
          Y:{" "}
          <span style={{ fontWeight: "bold", color: "#198754" }}>
            {stick.y.toFixed(6)}
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

export function JoyConDemo() {
  const joycon = useJoyCon();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>🎮 Joy-Con 完全デモ (aka256形式対応)</h2>

      {/* 接続状態 */}
      <div style={{ marginBottom: "20px" }}>
        <p>接続状態: {joycon.isConnected ? "✅ 接続中" : "❌ 未接続"}</p>
        {joycon.deviceName && <p>デバイス: {joycon.deviceName}</p>}
        {joycon.lastError && (
          <p style={{ color: "red" }}>エラー: {joycon.lastError}</p>
        )}
      </div>

      {/* 操作ボタン */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={joycon.connect} disabled={joycon.isConnected}>
          接続
        </button>
        <button
          onClick={joycon.disconnect}
          disabled={!joycon.isConnected}
          style={{ marginLeft: "10px" }}
        >
          切断
        </button>
        <button
          onClick={() => joycon.sendRumble(1000)}
          disabled={!joycon.isConnected}
          style={{ marginLeft: "10px" }}
        >
          振動
        </button>
      </div>

      {/* 全Joy-Conデータ表示 */}
      {joycon.data && (
        <div>
          <h3>🎮 Joy-Con データ（リアルタイム）</h3>

          {/* バッテリー情報 */}
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              backgroundColor: "#f0f0f0",
              borderRadius: "5px",
            }}
          >
            <strong>バッテリー: {joycon.data.batteryLevel}/8</strong>
            <div
              style={{
                width: "200px",
                height: "10px",
                backgroundColor: "#ddd",
                borderRadius: "5px",
                marginTop: "5px",
              }}
            >
              <div
                style={{
                  width: `${(joycon.data.batteryLevel / 8) * 100}%`,
                  height: "100%",
                  backgroundColor:
                    joycon.data.batteryLevel > 2 ? "#28a745" : "#dc3545",
                  borderRadius: "5px",
                }}
              />
            </div>
          </div>

          {/* メインセンサーセクション */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            {/* 6軸センサー詳細表示 */}
            {joycon.data.accelerometerSamples &&
              joycon.data.gyroscopeSamples && (
                <SixAxisSensorDisplay
                  accelerometerSamples={joycon.data.accelerometerSamples}
                  gyroscopeSamples={joycon.data.gyroscopeSamples}
                />
              )}

            {/* 加速度センサー（ビジュアル版） */}
            {joycon.data.accelerometer && (
              <AccelerometerVisualizer
                accelerometer={joycon.data.accelerometer}
              />
            )}

            {/* ジャイロスコープ - aka256形式で精度向上 */}
            {joycon.data.gyroscope && (
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
                      {joycon.data.gyroscope.x.toFixed(5)}
                    </span>
                  </div>
                  <div>
                    Y:{" "}
                    <span style={{ fontWeight: "bold", color: "#198754" }}>
                      {joycon.data.gyroscope.y.toFixed(5)}
                    </span>
                  </div>
                  <div>
                    Z:{" "}
                    <span style={{ fontWeight: "bold", color: "#0d6efd" }}>
                      {joycon.data.gyroscope.z.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* ジャイロ回転視覚化 */}
                <div style={{ marginTop: "15px", textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginBottom: "10px",
                    }}
                  >
                    回転速度可視化
                  </div>
                  {["X", "Y", "Z"].map((axis, index) => {
                    const value = [
                      joycon.data!.gyroscope!.x,
                      joycon.data!.gyroscope!.y,
                      joycon.data!.gyroscope!.z,
                    ][index];
                    const rotation = Math.min(180, Math.abs(value) * 5); // 36°/sで180度回転（適度な感度）
                    const color = ["#d63384", "#198754", "#0d6efd"][index];

                    return (
                      <div key={axis} style={{ marginBottom: "8px" }}>
                        <div style={{ fontSize: "11px", marginBottom: "3px" }}>
                          {axis}軸回転: {value.toFixed(2)}°/s
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              border: `4px solid ${color}`,
                              borderRadius: "50%",
                              borderTopColor: "transparent",
                              borderRightColor: "rgba(0,0,0,0.1)",
                              transform: `rotate(${rotation}deg)`,
                              transition: "transform 0.05s ease-out",
                              marginBottom: "5px",
                            }}
                          />
                          <div style={{ fontSize: "10px", color: "#888" }}>
                            {rotation.toFixed(0)}°
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
              stick={{
                x: joycon.getLeftStick()?.x ?? 0,
                y: joycon.getLeftStick()?.y ?? 0,
                rawX: joycon.getLeftStick()?.rawX ?? 0,
                rawY: joycon.getLeftStick()?.rawY ?? 0,
                direction: joycon.getLeftStickDirection() as StickDirection,
              }}
              title="左スティック"
            />

            {/* 右アナログスティック */}
            <StickVisualizer
              stick={{
                x: joycon.getRightStick()?.x ?? 0,
                y: joycon.getRightStick()?.y ?? 0,
                rawX: joycon.getRightStick()?.rawX ?? 0,
                rawY: joycon.getRightStick()?.rawY ?? 0,
                direction: joycon.getRightStickDirection() as StickDirection,
              }}
              title="右スティック"
            />
          </div>

          {/* 全ボタン状態 */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "15px",
              backgroundColor: "#f9f9f9",
              marginBottom: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#2c5aa0" }}>
              🎮 全ボタン状態
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              {Object.entries(joycon.data.buttons || {}).map(
                ([key, pressed]) => (
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
                )
              )}
            </div>
          </div>

          {/* Raw値表示セクション - aka256互換 */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "15px",
              backgroundColor: "#f9f9f9",
              marginBottom: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#2c5aa0" }}>
              🔢 Raw値（aka256互換表示）
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              <div>
                <h5>加速度センサー (G)</h5>
                <div>
                  X: {joycon.data.accelerometer?.x.toFixed(6) || "0.000000"}
                </div>
                <div>
                  Y: {joycon.data.accelerometer?.y.toFixed(6) || "0.000000"}
                </div>
                <div>
                  Z: {joycon.data.accelerometer?.z.toFixed(6) || "0.000000"}
                </div>
              </div>
              <div>
                <h5>ジャイロスコープ (DPS)</h5>
                <div>X: {joycon.data.gyroscope?.x.toFixed(5) || "0.00000"}</div>
                <div>Y: {joycon.data.gyroscope?.y.toFixed(5) || "0.00000"}</div>
                <div>Z: {joycon.data.gyroscope?.z.toFixed(5) || "0.00000"}</div>
              </div>
            </div>
          </div>

          {/* デバッグ情報 */}
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              🔍 詳細データ（デバッグ用）
            </summary>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                marginTop: "10px",
              }}
            >
              <div>
                <h4>左スティック</h4>
                <pre style={{ fontSize: "12px", overflow: "auto" }}>
                  {JSON.stringify(joycon.getLeftStick(), null, 2)}
                </pre>
              </div>
              <div>
                <h4>右スティック</h4>
                <pre style={{ fontSize: "12px", overflow: "auto" }}>
                  {JSON.stringify(joycon.getRightStick(), null, 2)}
                </pre>
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <h4>全データ</h4>
              <pre
                style={{
                  fontSize: "10px",
                  overflow: "auto",
                  maxHeight: "300px",
                }}
              >
                {JSON.stringify(joycon.data, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
