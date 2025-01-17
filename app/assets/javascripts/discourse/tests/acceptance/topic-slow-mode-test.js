import {
  acceptance,
  exists,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import I18n from "I18n";
import { cloneJSON } from "discourse-common/lib/object";
import topicFixtures from "discourse/tests/fixtures/topic";

acceptance("Topic - Slow Mode - enabled", function (needs) {
  needs.user();
  needs.pretender((server, helper) => {
    server.get("/t/130.json", () => {
      const json = cloneJSON(topicFixtures["/t/130.json"]);
      json.slow_mode_seconds = 600;
      json.slow_mode_enabled_until = "2040-01-01T04:00:00.000Z";

      return helper.response(json);
    });
  });

  test("the slow mode dialog loads settings of currently enabled slow mode ", async function (assert) {
    updateCurrentUser({ moderator: true });
    await visit("/t/slow-mode-testing/130");
    await click(".toggle-admin-menu");
    await click(".topic-admin-slow-mode button");

    await click(".future-date-input-selector-header");

    assert.equal(
      query(".future-date-input-selector-header").getAttribute("aria-expanded"),
      "true",
      "selector is expanded"
    );

    assert.equal(
      query("div.slow-mode-type span.name").innerText,
      I18n.t("topic.slow_mode_update.durations.10_minutes"),
      "slow mode interval is rendered"
    );

    // unfortunately we can't check exact date and time
    // but at least we can make sure that components for choosing date and time are rendered
    // (in case of inactive slow mode it would be only a combo box with text "Select a timeframe",
    // and date picker and time picker wouldn't be rendered)
    assert.equal(
      query("div.enabled-until span.name").innerText,
      I18n.t("topic.auto_update_input.pick_date_and_time"),
      "enabled until combobox is switched to the option Pick Date and Time"
    );

    assert.ok(exists("input.date-picker"), "date picker is rendered");
    assert.ok(exists("input.time-input"), "time picker is rendered");
  });
});
