import { Canvas } from "@react-three/fiber";
import "./App.css";
import CpuFish from "./components/CpuFish";

function App() {
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
        <CpuFish
          initialPosition={[0, 0, 0]}
          scale={1}
          animationName="swim"
          speed={1}
        />
      </Canvas>
    </>
  );
}

export default App;
