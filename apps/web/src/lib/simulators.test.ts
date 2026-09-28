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
    months: 36,
    financingPct: 70,
  };

  test("without subsidy the whole down payment is saved over the months", () => {
    const plan = downPaymentPlan({ ...base, subsidy: 0 });
    assert.equal(plan.downPayment, 90_000_000);
    assert.equal(plan.subsidy, 0);
    assert.equal(plan.pending, 90_000_000);
    assert.equal(plan.financed, 210_000_000);
    assert.equal(Math.round(plan.monthlySaving), Math.round(90_000_000 / 36));
    assert.equal(plan.minDownPct, 30);
  });

  test("the client's worked example: (157.582.000 × 0,30 − 20.000.000) ÷ 36", () => {
    const plan = downPaymentPlan({
      price: 157_582_000,
      downPct: 30,
      subsidy: 20_000_000,
      months: 36,
      financingPct: 70,
    });
    assert.equal(Math.round(plan.downPayment), 47_274_600);
    assert.equal(Math.round(plan.monthlySaving), 757_628);
    assert.equal(Math.round(plan.financed), 110_307_400);
  });

  test("the subsidy is taken off the down payment, so less is pending", () => {
    const plan = downPaymentPlan({ ...base, subsidy: 35_018_100 });
    assert.equal(plan.subsidy, 35_018_100);
    assert.equal(plan.pending, 90_000_000 - 35_018_100);
    assert.equal(plan.financed, 210_000_000);
  });

  test("a subsidy larger than the down payment leaves nothing to save and the loan untouched", () => {
    const plan = downPaymentPlan({ ...base, price: 120_000_000, downPct: 20, subsidy: 52_527_150 });
    assert.equal(plan.downPayment, 24_000_000);
    assert.equal(plan.pending, 0);
    assert.equal(plan.monthlySaving, 0);
    assert.equal(plan.financed, 96_000_000);
  });

  test("never divides by zero months", () => {
    const plan = downPaymentPlan({ ...base, subsidy: 0, months: 0 });
    assert.equal(plan.monthlySaving, 90_000_000);
  });
});
