import { describe, expect, it } from "vitest";
import { assessPinCompatibility } from "./connectionRules.js";
import { connect, placeComponent } from "./testUtils.js";

describe("connection rules", () => {
  it("rejects direct power-to-ground connections", () => {
    const power = placeComponent("power-5v", { x: 0, y: 0 }, "Power");
    const ground = placeComponent("ground", { x: 100, y: 0 }, "Ground");

    const result = assessPinCompatibility(power, power.pins[0], ground, ground.pins[0], []);

    expect(result.valid).toBe(false);
    expect(result.level).toBe("invalid");
  });

  it("rejects duplicate connections and warns on analog-digital pairings", () => {
    const uno = placeComponent("arduino-uno", { x: 0, y: 0 }, "Uno");
    const nano = placeComponent("arduino-nano", { x: 240, y: 0 }, "Nano");
    const pot = placeComponent("potentiometer", { x: 100, y: 0 }, "Pot");
    const existing = connect(uno.id, "a0", pot.id, "signal");

    const duplicate = assessPinCompatibility(
      uno,
      uno.pins.find((pin) => pin.id === "a0")!,
      pot,
      pot.pins.find((pin) => pin.id === "signal")!,
      [existing],
    );
    expect(duplicate.valid).toBe(false);

    const warning = assessPinCompatibility(
      uno,
      uno.pins.find((pin) => pin.id === "d13")!,
      nano,
      nano.pins.find((pin) => pin.id === "a0")!,
      [],
    );
    expect(warning.level).toBe("warning");
  });
});
