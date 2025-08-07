import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import "./App.css";
import CpuFish from "./components/CpuFish";
import type { Float } from "./types/float";
import FloatModel from "./components/Float";

function App() {
  const [floatsInfo, setFloatsInfo] = useState<Float[]>([]);

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
    <>
      <Canvas>
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
    </>
  );
}

export default App;
