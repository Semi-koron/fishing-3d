import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import CpuFish from "../../CpuFish";
import type { Float } from "../../../types/float";
import FloatModel from "../../Float";
import type { ObjectState } from "../../../types/multWindow";
import TestFish from "../../TestFish";
interface CameraOffset {
  x: number;
  y: number;
  z: number;
}

const CameraController = ({ offset }: { offset: CameraOffset }) => {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(offset.x, offset.y, 10 + offset.z);
    camera.updateProjectionMatrix();
  });

  return null;
};

export default function Game() {
  const [floatsInfo, setFloatsInfo] = useState<Float[]>([]);
  const [receivedFishState, setReceivedFishState] =
    useState<ObjectState | null>(null);
  const [receivedFloatState, setReceivedFloatState] =
    useState<ObjectState | null>(null);

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
    childWindow?.postMessage({
      type: "FLOAT_STATE_UPDATE",
      objectState: {
        position: [event.point.x, event.point.y, event.point.z],
        rotation: [0, 0, 0],
      },
    });
  };

  const [childWindow, setChildWindow] = useState<Window | null>(null);
  const [isChild, setIsChild] = useState(false);
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

  //マルチウィンドウの処理
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsChild(urlParams.get("child") === "true");

    const handleMessage = (event: MessageEvent) => {
      // 魚の状態を受信
      if (event.data.type === "OBJECT_STATE_UPDATE") {
        setReceivedFishState(event.data.objectState);
      }
      // 浮きの状態を受信
      if (event.data.type === "FLOAT_STATE_UPDATE") {
        setReceivedFloatState(event.data.objectState);
      }
      // カメラのオフセットを受信
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

  const handleFishStateChange = (newFishState: ObjectState) => {
    if (childWindow && !childWindow.closed) {
      childWindow.postMessage(
        {
          type: "OBJECT_STATE_UPDATE",
          objectState: newFishState,
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
    <>
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
        <mesh onClick={handleCanvasClick} visible={false}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial />
        </mesh>
        {!isChild && (
          <CpuFish
            initialPosition={[0, 0, 0]}
            scale={1}
            animationName="swim"
            speed={1}
            handleFishStateChange={handleFishStateChange}
            floatsInfo={floatsInfo}
          />
        )}
        {isChild && receivedFishState && (
          <TestFish
            position={receivedFishState?.position}
            rotation={receivedFishState?.rotation}
          />
        )}
        {isChild
          ? receivedFloatState && (
              <FloatModel
                position={receivedFloatState.position}
                rotation={[Math.PI / 2, 0, 0]}
              />
            )
          : floatsInfo[0] && (
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
