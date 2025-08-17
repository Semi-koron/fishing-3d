import "./App.css";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import CpuFish from "./components/CpuFish";
import type { Float } from "./types/float";
import FloatModel from "./components/Float";
import { useJoyCon } from "./hooks/useJoycon";

function PlayerCube({ player, playerId, onConnect }: { 
  player: any, 
  playerId: number, 
  onConnect: (id: number) => void 
}) {
  const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
  
  return (
    <div 
      style={{
        width: 80,
        height: 80,
        backgroundColor: colors[playerId],
        border: player.isConnected ? '3px solid #fff' : '3px solid #666',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        margin: '0 10px',
        position: 'relative',
        transform: `rotateZ(${player.rotation}deg)`,
        transition: 'transform 0.1s ease',
      }}
      onClick={() => !player.isConnected && onConnect(playerId)}
    >
      <div style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>
        P{playerId + 1}
      </div>
      {player.isConnected && (
        <div style={{ fontSize: 10, color: '#fff' }}>
          {player.deviceName}
        </div>
      )}
      {!player.isConnected && (
        <div style={{ fontSize: 10, color: '#fff' }}>
          Click to Connect
        </div>
      )}
      {player.data?.leftStick && (
        <div style={{
          position: 'absolute',
          top: -30,
          fontSize: 20,
          color: '#fff',
          transform: `rotate(${Math.atan2(player.data.leftStick.y, player.data.leftStick.x) * 180 / Math.PI}deg)`
        }}>
          ➤
        </div>
      )}
    </div>
  );
}

function App() {
  const [floatsInfo, setFloatsInfo] = useState<Float[]>([]);
  const { players, connect, lastError } = useJoyCon();

  const handleCanvasClick = (event: any) => {
    const newFloat: Float = {
      status: "float",
      position: {
        x: event.point.x,
        y: event.point.y,
        z: event.point.z,
      },
      fishermanPosition: {
        x: 0,
        y: 0,
        z: 0,
      },
    };

    setFloatsInfo([newFloat]);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
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
        <CpuFish
          initialPosition={[0, 0, 0]}
          scale={1}
          animationName="swim"
          speed={1}
          floatsInfo={floatsInfo}
        />
        {floatsInfo[0] && (
          <FloatModel
            position={[
              floatsInfo[0].position.x,
              floatsInfo[0].position.y,
              floatsInfo[0].position.z,
            ]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        )}
      </Canvas>
      
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
        borderRadius: 10,
      }}>
        {players.map((player, index) => (
          <PlayerCube 
            key={player.id} 
            player={player} 
            playerId={index} 
            onConnect={connect}
          />
        ))}
      </div>
      
      {lastError && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: 10,
          borderRadius: 5,
        }}>
          Error: {lastError}
        </div>
      )}
    </div>
  );
}

export default App;
