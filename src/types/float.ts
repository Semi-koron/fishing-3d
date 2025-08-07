type Float = {
  status: // 浮きの状態
  | "idle" //浮きが投げ込まれていない状態
    | "float" //浮きが浮いている状態
    | "moving" //浮きが移動している状態
    | "biting"; //魚が食いついている状態
  position: {
    // 浮きの位置
    x: number;
    y: number;
    z: number;
  };
  fishermanPosition: {
    // 浮きの回収場所
    x: number;
    y: number;
    z: number;
  };
};

export type { Float };
