import { useJoyCon } from "../../hooks/useJoycon";
import type { StickDirection } from "../../hooks/useJoycon";

// 加速度センサーの3D表示コンポーネント
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

// プレイヤー別Joy-Con表示コンポーネント
const PlayerJoyConDisplay = ({ playerId }: { playerId: number }) => {
  const { players, connect, disconnect, sendRumble, toggleStick } = useJoyCon();
  const player = players[playerId];
  
  if (!player) return null;

  const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];

  return (
    <div
      style={{
        border: `3px solid ${colors[playerId]}`,
        borderRadius: "12px",
        padding: "20px",
        margin: "10px",
        backgroundColor: "#f8f9fa",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
        <h3 style={{ margin: 0, color: colors[playerId] }}>
          🎮 プレイヤー {playerId + 1}
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => connect(playerId)}
            disabled={player.isConnected}
            style={{
              padding: "8px 16px",
              backgroundColor: player.isConnected ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: player.isConnected ? "not-allowed" : "pointer",
            }}
          >
            {player.isConnected ? "接続済み" : "接続"}
          </button>
          {player.isConnected && (
            <>
              <button
                onClick={() => disconnect(playerId)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                切断
              </button>
              <button
                onClick={() => sendRumble(playerId, 500)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#fd7e14",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                振動
              </button>
              <button
                onClick={() => toggleStick(playerId)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6610f2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {player.useRightStick ? "右" : "左"}スティック
              </button>
            </>
          )}
        </div>
      </div>

      {!player.isConnected && (
        <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
          Joy-Conを接続してください
        </div>
      )}

      {player.isConnected && player.data && (
        <div>
          {/* 基本情報 */}
          <div style={{ marginBottom: "20px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <strong>デバイス:</strong> {player.deviceName}
            </div>
            <div>
              <strong>バッテリー:</strong> {player.data.batteryLevel}/8
              <div
                style={{
                  width: "100px",
                  height: "8px",
                  backgroundColor: "#ddd",
                  borderRadius: "4px",
                  marginTop: "2px",
                  display: "inline-block",
                  marginLeft: "8px",
                }}
              >
                <div
                  style={{
                    width: `${(player.data.batteryLevel / 8) * 100}%`,
                    height: "100%",
                    backgroundColor: player.data.batteryLevel > 2 ? "#28a745" : "#dc3545",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>
            <div>
              <strong>回転:</strong> {player.rotation.toFixed(1)}°
            </div>
          </div>

          {/* センサーとスティック */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            {/* 加速度センサー */}
            <AccelerometerVisualizer accelerometer={player.data.accelerometer} />

            {/* アクティブスティック */}
            <StickVisualizer
              stick={player.useRightStick ? player.data.rightStick : player.data.leftStick}
              title={`${player.useRightStick ? "右" : "左"}スティック (アクティブ)`}
            />

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
                    {player.data.gyroscope.x.toFixed(5)}
                  </span>
                </div>
                <div>
                  Y:{" "}
                  <span style={{ fontWeight: "bold", color: "#198754" }}>
                    {player.data.gyroscope.y.toFixed(5)}
                  </span>
                </div>
                <div>
                  Z:{" "}
                  <span style={{ fontWeight: "bold", color: "#0d6efd" }}>
                    {player.data.gyroscope.z.toFixed(5)}
                  </span>
                </div>
              </div>
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
            <h4 style={{ margin: "0 0 15px 0", color: "#2c5aa0" }}>
              🎮 ボタン状態
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              {Object.entries(player.data.buttons).map(([key, pressed]) => (
                <div
                  key={key}
                  style={{
                    padding: "8px 4px",
                    borderRadius: "4px",
                    backgroundColor: pressed ? "#28a745" : "#e9ecef",
                    color: pressed ? "white" : "#495057",
                    textAlign: "center",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    border: pressed ? "2px solid #1e7e34" : "2px solid #dee2e6",
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
    </div>
  );
};

export function JoyConDemo() {
  const { players, lastError } = useJoyCon();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>🎮 Joy-Con マルチプレイヤーデモ</h2>

      {/* エラー表示 */}
      {lastError && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            border: "1px solid #f5c6cb",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <strong>エラー:</strong> {lastError}
        </div>
      )}

      {/* 接続状況サマリー */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "30px",
          padding: "15px",
          backgroundColor: "#e7f3ff",
          borderRadius: "8px",
          border: "1px solid #b8daff",
        }}
      >
        {players.map((player, index) => (
          <div
            key={player.id}
            style={{
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: player.isConnected ? "#d4edda" : "#f8d7da",
              border: player.isConnected ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
              minWidth: "120px",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              プレイヤー {index + 1}
            </div>
            <div style={{ fontSize: "12px" }}>
              {player.isConnected ? (
                <>
                  <div style={{ color: "#155724" }}>✅ 接続済み</div>
                  <div>{player.deviceName}</div>
                  <div>バッテリー: {player.data?.batteryLevel || 0}/8</div>
                </>
              ) : (
                <div style={{ color: "#721c24" }}>❌ 未接続</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 各プレイヤーの詳細表示 */}
      <div>
        {players.map((_, index) => (
          <PlayerJoyConDisplay key={index} playerId={index} />
        ))}
      </div>

      {/* 使用方法 */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        <h3>📝 使用方法</h3>
        <ul style={{ lineHeight: "1.6" }}>
          <li><strong>接続:</strong> 各プレイヤーの「接続」ボタンをクリックしてJoy-Conを選択</li>
          <li><strong>スティック切り替え:</strong> 「左スティック」/「右スティック」ボタンで制御対象を変更</li>
          <li><strong>振動テスト:</strong> 「振動」ボタンでコントローラーを振動させる</li>
          <li><strong>方向制御:</strong> スティックを左右に動かすとキューブが回転します</li>
          <li><strong>切断:</strong> 「切断」ボタンでJoy-Conを切断</li>
        </ul>
      </div>
    </div>
  );
}