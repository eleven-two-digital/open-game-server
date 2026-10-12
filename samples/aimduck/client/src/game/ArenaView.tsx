// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import Phaser from "phaser";
import { ArenaScene, type ArenaInput } from "./scenes/ArenaScene.js";
import type { ArenaSnapshot } from "./game-state.js";

type ArenaViewProps = {
  playerId: string;
  role: "shooter" | "duck";
  arena: ArenaSnapshot;
  serverTick: number;
  onInput(input: ArenaInput): void;
};

export function ArenaView({ playerId, role, arena, serverTick, onInput }: ArenaViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ArenaScene | null>(null);
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;

  useEffect(() => {
    if (hostRef.current === null) {
      return;
    }
    const scene = new ArenaScene();
    scene.configure(playerId, role, arena, serverTick, (input) => onInputRef.current(input));
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1_000,
      height: 600,
      parent: hostRef.current,
      backgroundColor: "#dcefeb",
      scene,
      render: { antialias: true, pixelArt: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [playerId]);

  useEffect(() => {
    sceneRef.current?.updateArena(role, arena, serverTick);
  }, [arena, role, serverTick]);

  function throwAtPointer(event: PointerEvent<HTMLDivElement>): void {
    if (role !== "shooter" || !(event.target instanceof HTMLCanvasElement)) {
      return;
    }
    const bounds = event.target.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }
    sceneRef.current?.queueThrow({
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    });
  }

  function throwAtKeyboardAim(event: KeyboardEvent<HTMLDivElement>): void {
    if (role !== "shooter" || event.code !== "Space") {
      return;
    }
    event.preventDefault();
    const aim = sceneRef.current?.getCurrentAim() ?? { x: 0.75, y: 0.5 };
    sceneRef.current?.queueThrow(aim);
  }

  return (
    <div
      ref={hostRef}
      className="arena-host"
      aria-describedby="arena-controls"
      aria-label="Aimduck arena"
      onPointerDown={throwAtPointer}
      onKeyDown={throwAtKeyboardAim}
    />
  );
}
