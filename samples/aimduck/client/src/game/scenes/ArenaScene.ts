// SPDX-License-Identifier: Apache-2.0

import Phaser from "phaser";
import type { ArenaSnapshot } from "../game-state.js";
import { SnapshotInterpolator } from "../rendering/snapshot-interpolator.js";

export type ArenaInput = {
  move_x: number;
  move_y: number;
  throw: boolean;
  aim_x: number;
  aim_y: number;
};

const INPUT_INTERVAL_MS = 50;

export class ArenaScene extends Phaser.Scene {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private arena: ArenaSnapshot = { players: [], projectiles: [] };
  private readonly interpolator = new SnapshotInterpolator();
  private playerId = "";
  private role: "shooter" | "duck" = "duck";
  private onInput: (input: ArenaInput) => void = () => {};
  private lastInputAt = 0;
  private lastInput: ArenaInput | null = null;
  private pendingThrow: { x: number; y: number } | null = null;
  private keyboardAim = { x: 0.75, y: 0.5 };

  constructor() {
    super("AimduckArena");
  }

  configure(
    playerId: string,
    role: "shooter" | "duck",
    arena: ArenaSnapshot,
    serverTick: number,
    onInput: (input: ArenaInput) => void,
  ): void {
    this.playerId = playerId;
    this.role = role;
    this.updateArena(role, arena, serverTick);
    this.onInput = onInput;
  }

  updateArena(role: "shooter" | "duck", arena: ArenaSnapshot, serverTick: number): void {
    this.role = role;
    this.arena = arena;
    this.interpolator.push(serverTick, arena, performance.now());
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;
    const keyboard = this.input.keyboard;
    if (keyboard !== null) {
      this.keys = {
        w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.setAttribute("role", "application");
    this.game.canvas.setAttribute(
      "aria-label",
      "Aimduck arena. Ducks move from the left start zone to the right safe zone. Focus this arena to play.",
    );
  }

  getCurrentAim(): { x: number; y: number } {
    const keyboardAiming =
      this.cursors !== null &&
      (this.cursors.left.isDown ||
        this.cursors.right.isDown ||
        this.cursors.up.isDown ||
        this.cursors.down.isDown ||
        this.keys.a?.isDown ||
        this.keys.d?.isDown ||
        this.keys.w?.isDown ||
        this.keys.s?.isDown);
    if (keyboardAiming) {
      return { ...this.keyboardAim };
    }
    const pointer = this.input.activePointer;
    return {
      x: Phaser.Math.Clamp(pointer.worldX / 1_000, 0, 1),
      y: Phaser.Math.Clamp(pointer.worldY / 600, 0, 1),
    };
  }

  queueThrow(aim: { x: number; y: number }): void {
    this.pendingThrow = aim;
  }

  override update(time: number, delta: number): void {
    this.drawArena();
    if (time - this.lastInputAt < INPUT_INTERVAL_MS) {
      return;
    }
    const keyboardX =
      Number(Boolean(this.cursors?.right.isDown || this.keys.d?.isDown)) -
      Number(Boolean(this.cursors?.left.isDown || this.keys.a?.isDown));
    const keyboardY =
      Number(Boolean(this.cursors?.down.isDown || this.keys.s?.isDown)) -
      Number(Boolean(this.cursors?.up.isDown || this.keys.w?.isDown));
    const pointer = this.input.activePointer;
    const aim = {
      x: Phaser.Math.Clamp(pointer.worldX / 1_000, 0, 1),
      y: Phaser.Math.Clamp(pointer.worldY / 600, 0, 1),
    };
    const keyboardAiming = keyboardX !== 0 || keyboardY !== 0;
    if (this.role === "shooter") {
      const step = Math.min(delta, 50) * 0.00045;
      this.keyboardAim.x = Phaser.Math.Clamp(this.keyboardAim.x + keyboardX * step, 0, 1);
      this.keyboardAim.y = Phaser.Math.Clamp(this.keyboardAim.y + keyboardY * step, 0, 1);
    }
    const input: ArenaInput = {
      move_x: this.role === "duck" ? keyboardX : 0,
      move_y: this.role === "duck" ? keyboardY : 0,
      throw: this.pendingThrow !== null,
      aim_x:
        this.pendingThrow?.x ??
        (this.role === "shooter" && !keyboardAiming ? aim.x : this.keyboardAim.x),
      aim_y:
        this.pendingThrow?.y ??
        (this.role === "shooter" && !keyboardAiming ? aim.y : this.keyboardAim.y),
    };
    if (
      this.lastInput !== null &&
      this.lastInput.move_x === input.move_x &&
      this.lastInput.move_y === input.move_y &&
      this.lastInput.throw === input.throw &&
      this.lastInput.aim_x === input.aim_x &&
      this.lastInput.aim_y === input.aim_y
    ) {
      this.pendingThrow = null;
      this.lastInputAt = time;
      return;
    }
    this.pendingThrow = null;
    this.lastInputAt = time;
    this.lastInput = input;
    this.onInput(input);
  }

  private drawArena(): void {
    const graphics = this.graphics;
    if (graphics === null) {
      return;
    }
    const arena = this.interpolator.sample(performance.now() - 100);
    graphics.clear();
    graphics.fillStyle(0xdcefeb);
    graphics.fillRect(0, 0, 1_000, 600);
    graphics.fillStyle(0xd8f2e4);
    graphics.fillRect(0, 0, 140, 600);
    graphics.fillStyle(0xc8e6d3);
    graphics.fillRect(940, 0, 60, 600);
    graphics.lineStyle(3, 0x879b96);
    graphics.lineBetween(0, 560, 1_000, 560);
    graphics.fillStyle(0x6d5a46);
    graphics.fillRoundedRect(370, 310, 100, 115, 12);
    graphics.fillRoundedRect(700, 190, 115, 100, 12);
    graphics.fillStyle(0x735846);
    graphics.fillRoundedRect(452, 82, 96, 24, 8);
    if (this.role === "shooter") {
      const shooter = arena.players.find(
        (player) => player !== null && player.playerId === this.playerId,
      );
      if (shooter !== undefined && shooter !== null) {
        graphics.lineStyle(2, 0x274d77, 0.55);
        graphics.lineBetween(
          shooter.position.x,
          shooter.position.y,
          this.input.activePointer.worldX,
          this.input.activePointer.worldY,
        );
      }
    }
    for (const player of arena.players) {
      if (player === null) {
        continue;
      }
      const color =
        player.outcome === "hit"
          ? 0x9f4343
          : player.playerId === this.playerId
            ? 0x126b5b
            : 0x274d77;
      graphics.fillStyle(color);
      graphics.fillCircle(player.position.x, player.position.y, 20);
      graphics.fillStyle(0xffcf5a);
      graphics.fillTriangle(
        player.position.x + 15,
        player.position.y - 4,
        player.position.x + 30,
        player.position.y,
        player.position.x + 15,
        player.position.y + 4,
      );
      if (player.outcome === "crossed") {
        graphics.lineStyle(3, 0x267343);
        graphics.strokeCircle(player.position.x, player.position.y, 25);
      }
    }
    for (const projectile of arena.projectiles) {
      graphics.fillStyle(0x30353c);
      graphics.fillCircle(projectile.position.x, projectile.position.y, 9);
    }
  }
}
