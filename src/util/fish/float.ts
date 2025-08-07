import { exp } from "three/tsl";
import type { Float } from "../../types/float";
import type { Position } from "../../types/three";

const calcFloatFishDist = (fishPos: Position, float: Float): number => {
  const dx = fishPos[0] - float.position.x;
  const dy = fishPos[1] - float.position.y;
  const dz = fishPos[2] - float.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export { calcFloatFishDist };
