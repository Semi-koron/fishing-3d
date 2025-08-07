import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import type { Group } from "three";
import "./index.module.css";

interface FishState {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface CameraOffset {
  x: number;
  y: number;
  z: number;
}

const CircularSwimmingFish = ({
  onFishStateChange,
  fishState,
}: {
  onFishStateChange?: (state: FishState) => void;
  fishState?: FishState;
}) => {
  const group = useRef<Group>(null);
  const timeRef = useRef(0);
  const radius = 7;

  const { animations, scene } = useGLTF("/smallfish.glb");
  const { actions, names } = useAnimations(animations, group);

  useFrame(() => {
    if (!fishState) {
      timeRef.current += 0.02;

      if (group.current) {
        const x = radius * Math.cos(timeRef.current);
        const y = radius * Math.sin(timeRef.current);
        const rotationY = timeRef.current + Math.PI / 2;

        const position: [number, number, number] = [x, 0, y];
        const rotation: [number, number, number] = [
          Math.PI / 2,
          Math.PI,
          -Math.PI / 2 - rotationY,
        ];

        group.current.position.set(...position);
        group.current.rotation.set(...rotation);

        onFishStateChange?.({ position, rotation });
      }
    } else {
      if (group.current) {
        group.current.position.set(...fishState.position);
        group.current.rotation.set(...fishState.rotation);
      }
    }

    if (actions && names[0] && !actions[names[0]]?.isRunning()) {
      actions[names[0]]?.play();
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} scale={1} />
    </group>
  );
};

const CameraController = ({ offset }: { offset: CameraOffset }) => {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(offset.x, offset.y, 10 + offset.z);
    camera.updateProjectionMatrix();
  });

  return null;
};

const Test = () => {
  const [childWindow, setChildWindow] = useState<Window | null>(null);
  const [isChild, setIsChild] = useState(false);
  const [receivedFishState, setReceivedFishState] = useState<FishState | null>(
    null
  );
  const [cameraOffset, setCameraOffset] = useState<CameraOffset>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [receivedCameraOffset, setReceivedCameraOffset] =
    useState<CameraOffset>({
      x: 0,
      y: 0,
      z: 0,
    });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsChild(urlParams.get("child") === "true");

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "FISH_STATE_UPDATE") {
        setReceivedFishState(event.data.fishState);
      }
      if (event.data.type === "CAMERA_OFFSET_UPDATE") {
        setReceivedCameraOffset(event.data.cameraOffset);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const openChildWindow = () => {
    const newWindow = window.open(
      `${window.location.pathname}?child=true`,
      "_blank",
      "width=800,height=600"
    );
    setChildWindow(newWindow);
  };

  const handleFishStateChange = (newFishState: FishState) => {
    if (childWindow && !childWindow.closed) {
      childWindow.postMessage(
        {
          type: "FISH_STATE_UPDATE",
          fishState: newFishState,
        },
        window.location.origin
      );
    }
  };

  const handleCameraOffsetChange = (newOffset: CameraOffset) => {
    console.log("Updating camera offset:", newOffset);
    setCameraOffset(newOffset);
    if (childWindow && !childWindow.closed) {
      const childOffset = {
        x: -newOffset.x,
        y: newOffset.y,
        z: newOffset.z,
      };
      childWindow.postMessage(
        {
          type: "CAMERA_OFFSET_UPDATE",
          cameraOffset: childOffset,
        },
        window.location.origin
      );
    }
  };

  const currentCameraOffset = isChild ? receivedCameraOffset : cameraOffset;

  return (
    <div>
      {!isChild && (
        <>
          <button
            onClick={openChildWindow}
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 1000,
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            子ウィンドウを開く
          </button>
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "10px",
              zIndex: 1000,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "15px",
              borderRadius: "5px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ marginBottom: "10px" }}>カメラ位置調整</div>
            <div style={{ marginBottom: "8px" }}>
              X: {cameraOffset.x.toFixed(1)}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={cameraOffset.x}
                onChange={(e) =>
                  handleCameraOffsetChange({
                    ...cameraOffset,
                    x: parseFloat(e.target.value),
                  })
                }
                style={{ marginLeft: "10px" }}
              />
            </div>
            <div style={{ marginBottom: "8px" }}>
              Y: {cameraOffset.y.toFixed(1)}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={cameraOffset.y}
                onChange={(e) =>
                  handleCameraOffsetChange({
                    ...cameraOffset,
                    y: parseFloat(e.target.value),
                  })
                }
                style={{ marginLeft: "10px" }}
              />
            </div>
            <div>
              Z: {cameraOffset.z.toFixed(1)}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={cameraOffset.z}
                onChange={(e) =>
                  handleCameraOffsetChange({
                    ...cameraOffset,
                    z: parseFloat(e.target.value),
                  })
                }
                style={{ marginLeft: "10px" }}
              />
            </div>
          </div>
        </>
      )}
      <Canvas>
        <CameraController offset={currentCameraOffset} />
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <CircularSwimmingFish
          onFishStateChange={!isChild ? handleFishStateChange : undefined}
          fishState={isChild ? receivedFishState || undefined : undefined}
        />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="lightblue" />
        </mesh>
      </Canvas>
    </div>
  );
};

export default Test;
