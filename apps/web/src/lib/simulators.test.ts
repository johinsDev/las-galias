import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { downPaymentPlan, subsidyInCOP } from "./simulators.ts";

// Run with: node --test apps/web/src/lib/simulators.test.ts

describe("subsidyInCOP", () => {
  test("multiplies the tier by the minimum wage", () => {
    assert.equal(subsidyInCOP(20, 1_750_905), 35_018_100);
    assert.equal(subsidyInCOP(30, 1_750_905), 52_527_150);
  });

  test("no tier is no subsidy", () => {
    assert.equal(subsidyInCOP(0, 1_750_905), 0);
  });
});

describe("downPaymentPlan", () => {
  const base = {
    price: 300_000_000,
    downPct: 30,
    savings: 20_000_000,
    months: 36,
    financingPct: 70,
  };

  test("without subsidy the pending amount is what savings do not cover", () => {
    const plan = downPaymentPlan({ ...base, subsidy: 0 });
    assert.equal(plan.downPayment, 90_000_000);
    assert.equal(plan.subsidy, 0);
    assert.equal(plan.pending, 70_000_000);
    assert.equal(plan.financed, 210_000_000);
    assert.equal(Math.round(plan.monthlySaving), Math.round(70_000_000 / 36));
    assert.equal(plan.minDownPct, 30);
  });

  test("the subsidy is taken off the down payment, so less is pending", () => {
    const plan = downPaymentPlan({ ...base, subsidy: 35_018_100 });
    assert.equal(plan.subsidy, 35_018_100);
    assert.equal(plan.pending, 90_000_000 - 20_000_000 - 35_018_100);
    assert.equal(plan.financed, 210_000_000);
  });

  test("savings plus subsidy can cover the whole down payment", () => {
    const plan = downPaymentPlan({ ...base, savings: 40_000_000, subsidy: 52_527_150 });
    assert.equal(plan.pending, 0);
    assert.equal(plan.monthlySaving, 0);
  });

  test("a subsidy larger than the down payment lowers the loan instead", () => {
    const plan = downPaymentPlan({
      ...base,
      price: 120_000_000,
      downPct: 20,
      savings: 0,
      subsidy: 52_527_150,
    });
    assert.equal(plan.downPayment, 24_000_000);
    assert.equal(plan.subsidy, 52_527_150);
    assert.equal(plan.pending, 0);
    assert.equal(plan.financed, 120_000_000 - 52_527_150);
  });

  test("never divides by zero months", () => {
    const plan = downPaymentPlan({ ...base, subsidy: 0, months: 0 });
    assert.equal(plan.monthlySaving, 70_000_000);
  });
});
